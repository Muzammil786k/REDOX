import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";
import { db } from "@workspace/db";
import { noPrefixRolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const noPrefixRoles = new Map<string, string>();

export async function initNoPrefixRoles(): Promise<void> {
  const rows = await db.select().from(noPrefixRolesTable);
  for (const row of rows) noPrefixRoles.set(row.guildId, row.roleId);
}

export function getNoPrefixRole(guildId: string): string | undefined {
  return noPrefixRoles.get(guildId);
}

export function hasNoPrefix(message: Message): boolean {
  if (!message.guild) return false;
  const roleId = noPrefixRoles.get(message.guild.id);
  if (!roleId) return false;
  const member = message.member;
  return member?.roles.cache.has(roleId) ?? false;
}

export async function setNoPrefixRoleDb(guildId: string, roleId: string): Promise<void> {
  noPrefixRoles.set(guildId, roleId);
  await db.insert(noPrefixRolesTable)
    .values({ guildId, roleId })
    .onConflictDoUpdate({ target: noPrefixRolesTable.guildId, set: { roleId } });
}

export async function deleteNoPrefixRoleDb(guildId: string): Promise<void> {
  noPrefixRoles.delete(guildId);
  await db.delete(noPrefixRolesTable).where(eq(noPrefixRolesTable.guildId, guildId));
}

export async function handleNoPrefix(message: Message): Promise<void> {
  if (!message.guild) return;
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription("❌ You need **Manage Server** permission to configure no-prefix.")] });
    return;
  }
  const args = message.content.trim().split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  if (sub === "remove") {
    await deleteNoPrefixRoleDb(message.guild.id);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription("✅ No-prefix role has been **removed**.")] });
    return;
  }

  if (sub === "set") {
    const role = message.mentions.roles.first();
    if (!role) {
      await message.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription("❌ Usage: `!noprefix set @role`")] });
      return;
    }
    await setNoPrefixRoleDb(message.guild.id, role.id);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ No-prefix role set to <@&${role.id}>.\nMembers with this role can use commands **without** the \`!\` prefix.`)] });
    return;
  }

  // No subcommand — show current status
  const role = message.mentions.roles.first();
  if (role) {
    // Still support old syntax: !noprefix @role
    await setNoPrefixRoleDb(message.guild.id, role.id);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ No-prefix role set to <@&${role.id}>.\nMembers with this role can use commands **without** the \`!\` prefix.`)] });
    return;
  }

  const current = noPrefixRoles.get(message.guild.id);
  await message.reply({
    embeds: [
      new EmbedBuilder().setColor(0x5865f2).setTitle("⚡ No Prefix")
        .setDescription(current
          ? `**Current no-prefix role:** <@&${current}>\n\nUsage:\n\`!noprefix set @role\` — set\n\`!noprefix remove\` — remove`
          : `No no-prefix role set.\n\nUsage:\n\`!noprefix set @role\` — set\n\`!noprefix remove\` — remove`),
    ],
  });
}
