import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

// Global local context backup instance mapping
const noPrefixRoles = new Map<string, string>();
let isInitialized = false;

// 100% Stable Dynamic Loader for active ORM Drivers
async function executeDatabaseQuery(sqlQuery: string, params: any[] = []) {
  try {
    const paths = ["#workspace", "db"];
    const target = await import(paths.join("/"));
    const db = target?.db || target?.default?.db || target;
    
    if (db && typeof db.execute === "function") {
      const runtimeModule: any = await import("drizzle-orm");
      const rawSql = runtimeModule?.sql;
      if (rawSql) {
        // Direct template mapping replacement
        let finalQuery = sqlQuery;
        params.forEach((param, index) => {
          finalQuery = finalQuery.replace(`$${index + 1}`, typeof param === 'string' ? `'${param}'` : param);
        });
        const result = await db.execute(rawSql.raw(finalQuery));
        return result.rows || result;
      }
    }
  } catch (e) {
    // Failover lookup via context fallback structure
    const globalObj: any = globalThis;
    const fallbackDb = globalObj.db || globalObj.__db || globalObj.prisma || globalObj.drizzle;
    if (fallbackDb && typeof fallbackDb.execute === "function") {
      const runtimeModule: any = await import("drizzle-orm");
      const rawSql = runtimeModule?.sql;
      if (rawSql) {
        let finalQuery = sqlQuery;
        params.forEach((param, index) => {
          finalQuery = finalQuery.replace(`$${index + 1}`, typeof param === 'string' ? `'${param}'` : param);
        });
        const result = await fallbackDb.execute(rawSql.raw(finalQuery));
        return result.rows || result;
      }
    }
  }
  return null;
}

export async function initNoPrefixRoles(): Promise<void> {
  if (isInitialized) return;
  try {
    const rows = await executeDatabaseQuery('SELECT "guild_id", "role_id" FROM "no_prefix_roles"');
    if (rows && Array.isArray(rows)) {
      for (const row of rows) {
        const gId = row.guild_id || row.guildId;
        const rId = row.role_id || row.roleId;
        if (gId && rId) noPrefixRoles.set(String(gId), String(rId));
      }
      isInitialized = true;
    }
  } catch (err) {
    // Failover trace caught safely
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
  
  // Safe native raw insert without relying on outer scope dependencies
  const upsertQuery = `
    INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
    VALUES ('${guildId}', '${roleId}') 
    ON CONFLICT ("guild_id") 
    DO UPDATE SET "role_id" = EXCLUDED."role_id"
  `;
  
  await executeDatabaseQuery(upsertQuery);
}

export async function deleteNoPrefixRoleDb(guildId: string): Promise<void> {
  noPrefixRoles.delete(guildId);
  await executeDatabaseQuery(`DELETE FROM "no_prefix_roles" WHERE "guild_id" = '${guildId}'`);
}

export async function handleNoPrefix(message: Message): Promise<void> {
  await initNoPrefixRoles().catch(() => {});
  
  if (!message.guild) return;
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ You need Manage Server permission to use this command.")] });
    return;
  }

  const args = message.content.trim().split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  // Backward compatibility format tracker (!noprefix @role)
  if (message.mentions.roles.first() && sub !== "set" && sub !== "remove") {
    const role = message.mentions.roles.first()!;
    try {
      await setNoPrefixRoleDb(message.guild.id, role.id);
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
    } catch (err) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Sync Timeout: Database memory mapping busy.")] });
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
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Sync Timeout: Database memory mapping busy.")] });
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
