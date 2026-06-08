export async function handleNoPrefix(message: Message): Promise<void> {
  if (!message.guild) return;

  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFF0000)
          .setDescription("❌ You need Manage Server permission to use this command.")
      ]
    });
    return;
  }

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("✨ Native No Prefix System")
        .setDescription(
          "✅ No Prefix System Enabled!\n\nMembers with the `noprefix` role can use commands without a prefix."
        )
    ]
  });
}
