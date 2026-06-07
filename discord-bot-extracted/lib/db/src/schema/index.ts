import { pgTable, text, serial, integer, bigint, boolean, primaryKey } from "drizzle-orm/pg-core";

export const modCasesTable = pgTable("mod_cases", {
  rowId: serial("row_id").primaryKey(),
  caseId: integer("case_id").notNull(),
  guildId: text("guild_id").notNull(),
  type: text("type").notNull(),
  targetId: text("target_id").notNull(),
  targetTag: text("target_tag").notNull(),
  moderatorId: text("moderator_id").notNull(),
  reason: text("reason").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const modlogChannelsTable = pgTable("modlog_channels", {
  guildId: text("guild_id").primaryKey(),
  channelId: text("channel_id").notNull(),
});

export const warningsTable = pgTable("warnings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  moderatorId: text("moderator_id").notNull(),
  reason: text("reason").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const lbStatsTable = pgTable("lb_stats", {
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  messagesDaily: integer("messages_daily").notNull().default(0),
  messagesWeekly: integer("messages_weekly").notNull().default(0),
  messagesMonthly: integer("messages_monthly").notNull().default(0),
  messagesLifetime: integer("messages_lifetime").notNull().default(0),
  voiceMsDaily: bigint("voice_ms_daily", { mode: "number" }).notNull().default(0),
  voiceMsWeekly: bigint("voice_ms_weekly", { mode: "number" }).notNull().default(0),
  voiceMsMonthly: bigint("voice_ms_monthly", { mode: "number" }).notNull().default(0),
  voiceMsLifetime: bigint("voice_ms_lifetime", { mode: "number" }).notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.userId] }),
}));

export const lbResetsTable = pgTable("lb_resets", {
  guildId: text("guild_id").primaryKey(),
  lastDaily: bigint("last_daily", { mode: "number" }).notNull().default(0),
  lastWeekly: bigint("last_weekly", { mode: "number" }).notNull().default(0),
  lastMonthly: bigint("last_monthly", { mode: "number" }).notNull().default(0),
});

export const liveLbConfigsTable = pgTable("live_lb_configs", {
  guildId: text("guild_id").primaryKey(),
  channelId: text("channel_id").notNull(),
  stat: text("stat").notNull().default("chat"),
  period: text("period").notNull().default("daily"),
  messageId: text("message_id"),
});

export const welcomeConfigsTable = pgTable("welcome_configs", {
  guildId: text("guild_id").primaryKey(),
  channelId: text("channel_id").notNull(),
  message: text("message").notNull(),
});

export const leaveConfigsTable = pgTable("leave_configs", {
  guildId: text("guild_id").primaryKey(),
  channelId: text("channel_id").notNull(),
  message: text("message").notNull(),
});

export const noPrefixRolesTable = pgTable("no_prefix_roles", {
  guildId: text("guild_id").primaryKey(),
  roleId: text("role_id").notNull(),
});

export const vanityRoleConfigsTable = pgTable("vanity_role_configs", {
  guildId: text("guild_id").primaryKey(),
  roleId: text("role_id").notNull(),
  code: text("code"),
});

export const autoTriggersTable = pgTable("auto_triggers", {
  triggerId: text("trigger_id").notNull(),
  guildId: text("guild_id").notNull(),
  keyword: text("keyword").notNull(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  exact: boolean("exact").notNull().default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.triggerId] }),
}));

export const reactionRolesTable = pgTable("reaction_roles", {
  messageId: text("message_id").notNull(),
  emoji: text("emoji").notNull(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  roleId: text("role_id").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.messageId, t.emoji] }),
}));

export const ticketConfigsTable = pgTable("ticket_configs", {
  guildId: text("guild_id").primaryKey(),
  panelChannelId: text("panel_channel_id").notNull().default(""),
  panelMessageId: text("panel_message_id").notNull().default(""),
  categoryId: text("category_id"),
  supportRoleId: text("support_role_id"),
  logChannelId: text("log_channel_id"),
  count: integer("count").notNull().default(0),
});

export const wordbombWinsTable = pgTable("wordbomb_wins", {
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  wins: integer("wins").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.userId] }),
}));

export const guildSettingsTable = pgTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  prefix: text("prefix").notNull().default("!"),
});

export const autoRolesTable = pgTable("auto_roles", {
  guildId: text("guild_id").notNull(),
  roleId: text("role_id").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.roleId] }),
}));

export const stickyMessagesTable = pgTable("sticky_messages", {
  channelId: text("channel_id").primaryKey(),
  guildId: text("guild_id").notNull(),
  content: text("content").notNull(),
  messageId: text("message_id"),
});

export const autoReactTable = pgTable("auto_react", {
  channelId: text("channel_id").notNull(),
  emoji: text("emoji").notNull(),
  guildId: text("guild_id").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.channelId, t.emoji] }),
}));

