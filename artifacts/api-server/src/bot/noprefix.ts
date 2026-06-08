import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

// Direct Local File-System Storage Bypass
const configPath = join(process.cwd(), "artifacts/api-server/src/bot/noprefix_config.json");
const noPrefixRoles = new Map<string, string>();
let isInitialized = false;

export function initNoPrefixRoles(): void {
  if (isInitialized) return;
  try {
    if (existsSync(configPath)) {
      const rawData = readFileSync(configPath, "utf-8");
      const data = JSON.parse(rawData || "{}");
      for (const [guildId, roleId] of Object.entries(data)) {
        noPrefixRoles.set(guildId, String(roleId));
      }
      isInitialized = true;
    }
  } catch (err) {
    console.error("Local config init skipped safely.");
  }
}

export function getNoPrefixRole(guildId: string): string | undefined {
  initNoPrefixRoles();
  return noPrefixRoles.get(guildId);
}

export function hasNoPrefix(message: Message): boolean {
  if (!message.guild) return false;
  initNoPrefixRoles();
  const roleId = noPrefixRoles.get(message.guild.id);
  if (!roleId) return false;
  if (roleId === "everyone") return true;
  const member = message.member;
  return member?.roles.cache.has(roleId) ?? false;
}

export function setNoPrefixRoleDb(guildId: string, roleId: string): void {
  initNoPrefixRoles();
  noPrefixRoles.set(guildId, roleId);
  try {
    const data: Record<string, string> = {};
    for (const [gId, rId] of noPrefixRoles.entries()) {
      data[gId] = rId;
    }
    writeFileSync(configPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to local config:", err);
  }
}

export function deleteNoPrefixRoleDb(guildId: string): void {
  initNoPrefixRoles();
  noPrefixRoles.delete(guildId);
  try {
    const data: Record<string, string> = {};
    for (const [gId, rId] of noPrefixRoles.entries()) {
      data[gId] = rId;
    }
    writeFileSync(configPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    // Fallback handling
  }
}

export async function handleNoPrefix(message: Message): Promise<void> {
  initNoPrefixRoles();
  
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
    setNoPrefixRoleDb(message.guild.id, role.id);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
    return;
  }

  if (sub === "remove") {
    deleteNoPrefixRoleDb(message.guild.id);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription("✅ No-prefix role has been removed.")] });
    return;
  }

  if (sub === "set") {
    const role = message.mentions.roles.first();
    if (!role) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Usage: !noprefix set @role")] });
      return;
    }
    setNoPrefixRoleDb(message.guild.id, role.id);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ No-prefix role set to <@&${role.id}>.`)] });
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
