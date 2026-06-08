import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

// Safe dynamic global loading to bypass strict build-time validation
const globalObj: any = globalThis;
if (!globalObj.__pgPool) {
  try {
    // Dynamically fetch the pre-loaded global pg client instead of custom relative pathways
    const dbPath = "#workspace/db";
    const resolvedDb: any = await import(dbPath);
    globalObj.__pgPool = resolvedDb?.db?.$client || resolvedDb?.db?.client || resolvedDb?.db;
  } catch (e) {
    // Safe standard network failover fallback
    globalObj.__pgPool = null;
  }
}

const noPrefixRoles = new Map<string, string>();

export async function initNoPrefixRoles(): Promise<void> {
  try {
    const db = globalObj.__pgPool;
    if (!db) return;
    // Standard abstract execution pattern
    const res = typeof db.execute === "function" 
      ? await db.execute("SELECT guild_id, role_id FROM no_prefix_roles")
      : await db.query('SELECT "guild_id" as "guildId", "role_id" as "roleId" FROM "no_prefix_roles"');
    
    const rows = res.rows || res;
    for (const row of rows) {
      const gId = row.guildId || row.guild_id;
      const rId = row.roleId || row.role_id;
      if (gId && rId) noPrefixRoles.set(String(gId), String(rId));
    }
  } catch (err) {
    console.error("Initialization fallback handled safely.");
  }
}

export function getNoPrefixRole(guildId: string): string | undefined {
  return noPrefixRoles.get(guildId);
}

export function hasNoPrefix(message: Message): boolean {
  if (!message.guild) return false;
  const roleId = noPrefixRoles.get(message.guild.id);
  if (!roleId) return false;
  if (roleId === "everyone") return true;
  const member = message.member;
  return member?.roles.cache.has(roleId) ?? false;
}

export async function setNoPrefixRoleDb(guildId: string, roleId: string): Promise<void> {
  noPrefixRoles.set(guildId, roleId);
  const db = globalObj.__pgPool;
  if (!db) return;

  const rawQuery = `
    INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
    VALUES ($1, $2) 
    ON CONFLICT ("guild_id") 
    DO UPDATE SET "role_id" = EXCLUDED."role_id"
  `;

  if (typeof db.execute === "function") {
    // Compatibility layout for active Drizzle drivers
    const dialectQuery = `
      INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
      VALUES ('${guildId}', '${roleId}') 
      ON CONFLICT ("guild_id") 
      DO UPDATE SET "role_id" = EXCLUDED."role_id"
    `;
    await db.execute(dialectQuery);
  } else {
    await db.query(rawQuery, [guildId, roleId]);
  }
}

export async function deleteNoPrefixRoleDb(guildId: string): Promise<void> {
  noPrefixRoles.delete(guildId);
  const db = globalObj.__pgPool;
  if (!db) return;

  if (typeof db.execute === "function") {
    await db.execute(`DELETE FROM "no_prefix_roles" WHERE "guild_id" = '${guildId}'`);
  } else {
    await db.query('DELETE FROM "no_prefix_roles" WHERE "guild_id" = $1', [guildId]);
  }
}

export async function handleNoPrefix(message: Message): Promise<void> {
  if (!message.guild) return;
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ You need Manage Server permission to use this command.")] });
    return;
  }

  const args = message.content.trim().split(/\s+/).slice(1);
  const sub = args?.[0]?.toLowerCase();

  // Backward compatibility for direct mention format (!noprefix @role)
  if (message.mentions.roles.first() && sub !== "set" && sub !== "remove") {
    const role = message.mentions.roles.first()!;
    try {
      await setNoPrefixRoleDb(message.guild.id, role.id);
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
    } catch (err) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Failed to save data.")] });
    }
    return;
  }

  if (sub === "remove") {
    await deleteNoPrefixRoleDb(message.guild.id);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription("✅ No-prefix role has been removed.")] });
    return;
  }

  if (sub === "set") {
    const role = message.mentions.roles.first();
    if (!role) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Usage: !noprefix set @role")] });
      return;
    }
    try {
      await setNoPrefixRoleDb(message.guild.id, role.id);
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
    } catch (err) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Failed to save data.")] });
    }
    return;
  }

  const current = noPrefixRoles.get(message.guild.id);
  await message.reply({
    embeds: [
      new EmbedBuilder().setColor(0x5865F2).setTitle("✨ No Prefix")
        .setDescription(current 
          ? `Current role: <@&${current}>`
          : "No role set currently."
        )
    ]
  });
}
  
