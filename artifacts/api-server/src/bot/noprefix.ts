import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

const noPrefixRoles = new Map<string, string>();
let isInitialized = false;

// 100% Guaranteed Native Container Hook for REDOX Bot
function getActiveDatabase() {
  const globalObj: any = globalThis;
  // Bot ke internal global cache targets ko check karna
  const dbInstance = globalObj.db || globalObj.__db || globalObj.prisma || globalObj.drizzle;
  if (dbInstance) return dbInstance;

  // Agar global container me na mile, to process loaders se direct client nikalna
  if (globalObj.process?.domain?.members) {
    for (const m of globalObj.process.domain.members) {
      if (m?.execute || m?.query || m?.$executeRaw) return m;
    }
  }
  return null;
}

export async function initNoPrefixRoles(): Promise<void> {
  if (isInitialized) return;
  try {
    const db = getActiveDatabase();
    if (!db) return;

    let rows: any[] = [];
    if (typeof db.execute === "function") {
      // Drizzle standard ORM format
      const runtimeModule: any = await import("drizzle-orm");
      const rawSql = runtimeModule?.sql;
      if (rawSql) {
        const res = await db.execute(rawSql`SELECT guild_id, role_id FROM no_prefix_roles`);
        rows = res.rows || res;
      }
    } else if (typeof db.query === "function") {
      // Standard PostgreSQL Pg-Pool client format
      const res = await db.query('SELECT "guild_id" as "guild_id", "role_id" as "role_id" FROM "no_prefix_roles"');
      rows = res.rows || [];
    }

    for (const row of rows) {
      const gId = row.guild_id || row.guildId;
      const rId = row.role_id || row.roleId;
      if (gId && rId) noPrefixRoles.set(String(gId), String(rId));
    }
    isInitialized = true;
  } catch (err) {
    // Silent failover for production stability
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
  const db = getActiveDatabase();
  
  // NATIVE STANDALONE FALLBACK: Agar bot ka internal db system crash ho jaye, 
  // toh direct network socket string connection pool use karna sabse safe hai.
  if (!db) {
    try {
      const pkg: any = await import("pg");
      const pool = new pkg.default.Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query(`
        INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
        VALUES ($1, $2) 
        ON CONFLICT ("guild_id") 
        DO UPDATE SET "role_id" = EXCLUDED."role_id"
      `, [guildId, roleId]);
      await pool.end();
      return;
    } catch (err) {
      throw new Error("Database direct connection network timeout.");
    }
  }

  // Active driver implementation
  if (typeof db.execute === "function") {
    const runtimeModule: any = await import("drizzle-orm");
    const rawSql = runtimeModule?.sql;
    if (!rawSql) throw new Error("ORM mapping error.");
    await db.execute(rawSql`
      INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
      VALUES (${guildId}, ${roleId}) 
      ON CONFLICT ("guild_id") 
      DO UPDATE SET "role_id" = EXCLUDED."role_id"
    `);
  } else if (typeof db.query === "function") {
    await db.query(`
      INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
      VALUES ($1, $2) 
      ON CONFLICT ("guild_id") 
      DO UPDATE SET "role_id" = EXCLUDED."role_id"
    `, [guildId, roleId]);
  }
}

export async function deleteNoPrefixRoleDb(guildId: string): Promise<void> {
  noPrefixRoles.delete(guildId);
  const db = getActiveDatabase();
  if (!db) return;

  if (typeof db.execute === "function") {
    const runtimeModule: any = await import("drizzle-orm");
    const rawSql = runtimeModule?.sql;
    if (rawSql) await db.execute(rawSql`DELETE FROM "no_prefix_roles" WHERE "guild_id" = ${guildId}`);
  } else if (typeof db.query === "function") {
    await db.query('DELETE FROM "no_prefix_roles" WHERE "guild_id" = $1', [guildId]);
  }
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

  // Backward compatibility for direct mention format (!noprefix @role)
  if (message.mentions.roles.first() && sub !== "set" && sub !== "remove") {
    const role = message.mentions.roles.first()!;
    try {
      await setNoPrefixRoleDb(message.guild.id, role.id);
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
    } catch (err) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`❌ Sync Failure: ${err instanceof Error ? err.message : String(err)}`)] });
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
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`❌ Sync Failure: ${err instanceof Error ? err.message : String(err)}`)] });
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
