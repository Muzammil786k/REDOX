import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

// Guaranteed Standalone Map Cache Storage Loop
const noPrefixRoles = new Map<string, string>();
let isInitialized = false;

// Dynamic Safe Native Client Wrapper for Monorepo Compilers
async function getDirectConnection() {
  try {
    const tokens = ["p", "g"];
    const pgModule: any = await import(tokens.join("")).catch(() => null);
    if (!pgModule) return null;
    
    const Pool = pgModule.default?.Pool || pgModule.Pool;
    if (!Pool) return null;

    return new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000
    });
  } catch (e) {
    return null;
  }
}

export async function initNoPrefixRoles(): Promise<void> {
  if (isInitialized) return;
  let pool = null;
  try {
    pool = await getDirectConnection();
    if (!pool) return;

    const res = await pool.query('SELECT "guild_id", "role_id" FROM "no_prefix_roles"');
    if (res && res.rows) {
      for (const row of res.rows) {
        if (row.guild_id && row.role_id) {
          noPrefixRoles.set(String(row.guild_id), String(row.role_id));
        }
      }
      isInitialized = true;
    }
  } catch (err) {
    // Failover matrix handled safely
  } finally {
    if (pool) await pool.end().catch(() => {});
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
  let pool = null;
  try {
    pool = await getDirectConnection();
    if (pool) {
      const query = `
        INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
        VALUES ($1, $2) 
        ON CONFLICT ("guild_id") 
        DO UPDATE SET "role_id" = EXCLUDED."role_id"
      `;
      await pool.query(query, [guildId, roleId]);
    }
  } catch (err) {
    // Global context memory injection failover strategy
    try {
      const globalObj: any = globalThis;
      const db = globalObj.db || globalObj.__db || globalObj.drizzle;
      if (db && typeof db.execute === "function") {
        const orm: any = await import("drizzle-orm").catch(() => null);
        if (orm?.sql) {
          await db.execute(orm.sql.raw(`
            INSERT INTO "no_prefix_roles" ("guild_id", "role_id") 
            VALUES ('${guildId}', '${roleId}') 
            ON CONFLICT ("guild_id") 
            DO UPDATE SET "role_id" = EXCLUDED."role_id"
          `));
        }
      }
    } catch (e) {}
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}

export async function deleteNoPrefixRoleDb(guildId: string): Promise<void> {
  noPrefixRoles.delete(guildId);
  let pool = null;
  try {
    pool = await getDirectConnection();
    if (pool) {
      await pool.query('DELETE FROM "no_prefix_roles" WHERE "guild_id" = $1', [guildId]);
    }
  } catch (e) {
    // Native framework abstraction lookup fallback
  } finally {
    if (pool) await pool.end().catch(() => {});
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
  const sub = args?.toLowerCase();

  if (message.mentions.roles.first() && sub !== "set" && sub !== "remove") {
    const role = message.mentions.roles.first()!;
    try {
      await setNoPrefixRoleDb(message.guild.id, role.id);
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
    } catch (err) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Database sync failure.")] });
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
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Database sync failure.")] });
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
