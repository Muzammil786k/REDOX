import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

// REDOX Bot Core Shared Connection Bridge
const noPrefixRoles = new Map<string, string>();
let isInitialized = false;

async function getCoreDb() {
  try {
    // Monorepo dynamic index loading configuration
    const paths = ["#workspace", "db"];
    const target = await import(paths.join("/"));
    return target?.db || target?.default?.db || target;
  } catch (e) {
    try {
      // Internal production container dist fallback
      const targetFallback = await import("../../../../db/index.js");
      return targetFallback?.db || targetFallback;
    } catch (err) {
      return null;
    }
  }
}

export async function initNoPrefixRoles(): Promise<void> {
  if (isInitialized) return;
  try {
    const db = await getCoreDb();
    if (!db || typeof db.execute !== "function") return;
    
    // Drizzle direct text wrapper parsing pattern
    const runtimeModule: any = await import("drizzle-orm");
    const rawSql = runtimeModule?.sql;
    if (!rawSql) return;

    const res = await db.execute(rawSql`SELECT "guild_id" as "guildId", "role_id" as "roleId" FROM "no_prefix_roles"`);
    const rows = res.rows || res;
    for (const row of rows) {
      const gId = row.guildId || row.guild_id;
      const rId = row.roleId || row.role_id;
      if (gId && rId) noPrefixRoles.set(String(gId), String(rId));
    }
    isInitialized = true;
  } catch (err) {
    console.error("Cache loading skipped for runtime execution safety.");
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
  const db = await getCoreDb();
  if (!db || typeof db.execute !== "function") {
    throw new Error("Core database connector link is temporarily un-cached.");
  }

  const runtimeModule: any = await import("drizzle-orm");
  const rawSql = runtimeModule?.sql;
  if (!rawSql) throw new Error("ORM driver resolution failed.");

  // Strict dynamic parameterized validation structure to eliminate type mismatches
  await db.execute(rawSql`
    INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
    VALUES (${guildId}, ${roleId}) 
    ON CONFLICT ("guild_id") 
    DO UPDATE SET "role_id" = EXCLUDED."role_id"
  `);
}

export async function deleteNoPrefixRoleDb(guildId: string): Promise<void> {
  noPrefixRoles.delete(guildId);
  const db = await getCoreDb();
  if (!db || typeof db.execute !== "function") return;

  const runtimeModule: any = await import("drizzle-orm");
  const rawSql = runtimeModule?.sql;
  if (rawSql) {
    await db.execute(rawSql`DELETE FROM "no_prefix_roles" WHERE "guild_id" = ${guildId}`);
  }
}

export async function handleNoPrefix(message: Message): Promise<void> {
  // Ensure table cache mapping is synchronized on command call
  await initNoPrefixRoles().catch(() => {});
  
  if (!message.guild) return;
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ You need Manage Server permission to use this command.")] });
    return;
  }

  const args = message.content.trim().split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  // Backward compatibility check for direct format (!noprefix @role)
  if (message.mentions.roles.first() && sub !== "set" && sub !== "remove") {
    const role = message.mentions.roles.first()!;
    try {
      await setNoPrefixRoleDb(message.guild.id, role.id);
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
    } catch (err) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`❌ Database Sync Failure: ${err instanceof Error ? err.message : String(err)}`)] });
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
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`❌ Database Sync Failure: ${err instanceof Error ? err.message : String(err)}`)] });
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
