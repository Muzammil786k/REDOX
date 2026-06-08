import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";
import { sql } from "drizzle-orm";

let dbInstance: any = null;
const noPrefixRoles = new Map<string, string>();

async function getDb() {
  if (dbInstance) return dbInstance;
  const dbPath = "#workspace/db";
  const dbModule: any = await import(dbPath);
  dbInstance = dbModule.db;
  return dbInstance;
}

export async function initNoPrefixRoles(): Promise<void> {
  try {
    const db = await getDb();
    const res = await db.execute(sql`SELECT "guild_id" as "guildId", "role_id" as "roleId" FROM "no_prefix_roles"`);
    const rows = res.rows || res;
    for (const row of rows) {
      noPrefixRoles.set(row.guildId || row.guild_id, row.roleId || row.role_id);
    }
  } catch (err) {
    console.error("Failed to init no-prefix roles natively:", err);
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
  const db = await getDb();
  await db.execute(sql`
    INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
    VALUES (${guildId}, ${roleId}) 
    ON CONFLICT ("guild_id") 
    DO UPDATE SET "role_id" = EXCLUDED."role_id"
  `);
}

export async function deleteNoPrefixRoleDb(guildId: string): Promise<void> {
  noPrefixRoles.delete(guildId);
  const db = await getDb();
  await db.execute(sql`DELETE FROM "no_prefix_roles" WHERE "guild_id" = ${guildId}`);
}

export async function handleNoPrefix(message: Message): Promise<void> {
  if (!message.guild) return;
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ You need Manage Server permission to use this command.")] });
    return;
  }

  const args = message.content.trim().split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

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
      console.error(err);
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Failed to save data to PostgreSQL.")] });
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
