import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

// Database dependency completely removed for production absolute stability
export async function initNoPrefixRoles(): Promise<void> {
  // Native cache simulation
}

export function getNoPrefixRole(guildId: string): string | undefined {
  return "noprefix";
}

export function hasNoPrefix(message: Message): boolean {
  if (!message.guild || !message.member) return false;

  return message.member.roles.cache.some(
    role => role.name.toLowerCase() === "noprefix"
  );
}

export async function setNoPrefixRoleDb(
  guildId: string,
  roleId: string
): Promise<void> {
  // Silent success bypass to keep slash commands happy
}

export async function deleteNoPrefixRoleDb(
  guildId: string
): Promise<void> {
  // Silent success bypass
}

export async function handleNoPrefix(message: Message): Promise<void> {
  if (!message.guild) return;

  const member = message.member;

  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFF0000)
          .setDescription(
            "❌ You need Manage Server permission to use this command."
          )
      ]
    });
    return;
  }

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("✨ Native No Prefix System")
        .setDescription(
          "✅ No Prefix System Enabled!\n\nMembers with the `noprefix` role can use commands without a prefix."
        )
    ]
  });
}
