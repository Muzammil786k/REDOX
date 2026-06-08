import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";

export async function initNoPrefixRoles(): Promise<void> {
  // Database/File dependency completely removed for 100% uptime stability
}

export function getNoPrefixRole(guildId: string): string {
  return "noprefix";
}

export function hasNoPrefix(message: Message): boolean {
  if (!message.guild) return false;
  const member = message.member;
  if (!member) return false;

  // SYSTEM BYPASS: Bot direct check karega ki user ke paas server me
  // 'noprefix' naam ka koi role physically assigned hai ya nahi.
  return member.roles.cache.some(role => role.name.toLowerCase() === "noprefix");
}

export async function handleNoPrefix(message: Message): Promise<void> {
  if (!message.guild) return;
  const member = message.member;
  
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ You need Manage Server permission to use this command.")] });
    return;
  }

  // Pure automated role configuration instruction embed
  await message.reply({
    embeds: [
      new EmbedBuilder().setColor(0x5865F2).setTitle("✨ No Prefix System Active")
        .setDescription(
          "🔒 **Database & File restrictions have been bypassed for 100% uptime.**\n\n" +
          "?? **Isko use kaise karein?**\n" +
          "1. Apne Discord Server ki settings me jayein.\n" +
          "2. Ek naya role banayein aur uska naam exact **`noprefix`** (saare small letters me) rakhein.\n" +
          "3. Jis member ya khud ko bina prefix ke commands chalani hain, use yeh role de dein.\n\n" +
          "?? *Ab bot bina kisi data reset ke, hamesha ke liye bina prefix ke reply dega!*"
        )
    ]
  });
}
