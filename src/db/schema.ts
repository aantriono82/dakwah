import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type QualityCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: "info" | "warning" | "critical";
};

export type QualityMetric = {
  id: string;
  label: string;
  score: number;
  detail: string;
};

export type QualityReport = {
  score: number;
  wordCount: number;
  reviewRequired: boolean;
  checks: QualityCheck[];
  metrics?: QualityMetric[];
  generatedAt: string;
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
    dailyGenerateLimit: integer("daily_generate_limit"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username)
  })
);

export const naskah = sqliteTable(
  "naskah",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    jenis: text("jenis").notNull(),
    bahasa: text("bahasa").notNull().default("Indonesia"),
    duration: text("duration"),
    parameters: text("parameters", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    content: text("content").notNull(),
    fileUrl: text("file_url"),
    fileKey: text("file_key"),
    status: text("status", { enum: ["draft", "final"] }).notNull().default("draft"),
    version: integer("version").notNull().default(1),
    autosavedAt: text("autosaved_at"),
    qualityScore: integer("quality_score"),
    qualityReport: text("quality_report", { mode: "json" }).$type<QualityReport>(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdx: index("naskah_user_idx").on(table.userId),
    jenisIdx: index("naskah_jenis_idx").on(table.jenis)
  })
);

export const naskahVersions = sqliteTable(
  "naskah_versions",
  {
    id: text("id").primaryKey(),
    naskahId: text("naskah_id")
      .notNull()
      .references(() => naskah.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    parameters: text("parameters", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    qualityScore: integer("quality_score"),
    qualityReport: text("quality_report", { mode: "json" }).$type<QualityReport>(),
    changeSummary: text("change_summary").notNull().default("Simpan naskah"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    naskahIdx: index("naskah_versions_naskah_idx").on(table.naskahId),
    userIdx: index("naskah_versions_user_idx").on(table.userId)
  })
);

export const templates = sqliteTable(
  "templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    jenis: text("jenis").notNull(),
    parameters: text("parameters", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdx: index("templates_user_idx").on(table.userId)
  })
);

export const usageEvents = sqliteTable(
  "usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("ok"),
    jenis: text("jenis"),
    route: text("route"),
    durationMs: integer("duration_ms"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdx: index("usage_events_user_idx").on(table.userId),
    eventTypeIdx: index("usage_events_event_type_idx").on(table.eventType),
    createdAtIdx: index("usage_events_created_at_idx").on(table.createdAt)
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
    expiresIdx: index("sessions_expires_idx").on(table.expiresAt)
  })
);

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdx: index("password_reset_tokens_user_idx").on(table.userId),
    tokenHashIdx: index("password_reset_tokens_token_hash_idx").on(table.tokenHash),
    expiresIdx: index("password_reset_tokens_expires_idx").on(table.expiresAt)
  })
);

export const myQuranCache = sqliteTable(
  "myquran_cache",
  {
    cacheKey: text("cache_key").primaryKey(),
    url: text("url").notNull(),
    payload: text("payload").notNull(),
    status: integer("status").notNull().default(200),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    expiresIdx: index("myquran_cache_expires_idx").on(table.expiresAt)
  })
);

export const curatedDalil = sqliteTable(
  "curated_dalil",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["quran", "hadith"] }).notNull(),
    reference: text("reference").notNull(),
    arab: text("arab"),
    translation: text("translation").notNull(),
    source: text("source").notNull().default("Database dalil terkurasi"),
    grade: text("grade"),
    takhrij: text("takhrij"),
    tafsir: text("tafsir"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    status: text("status", { enum: ["draft", "reviewed", "approved", "archived"] }).notNull().default("draft"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    kindIdx: index("curated_dalil_kind_idx").on(table.kind),
    activeIdx: index("curated_dalil_active_idx").on(table.isActive),
    statusIdx: index("curated_dalil_status_idx").on(table.status),
    referenceIdx: index("curated_dalil_reference_idx").on(table.reference)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  naskah: many(naskah),
  naskahVersions: many(naskahVersions),
  templates: many(templates),
  sessions: many(sessions),
  usageEvents: many(usageEvents),
  passwordResetTokens: many(passwordResetTokens)
}));

export const naskahRelations = relations(naskah, ({ one }) => ({
  user: one(users, {
    fields: [naskah.userId],
    references: [users.id]
  })
}));

export const naskahVersionsRelations = relations(naskahVersions, ({ one }) => ({
  naskah: one(naskah, {
    fields: [naskahVersions.naskahId],
    references: [naskah.id]
  }),
  user: one(users, {
    fields: [naskahVersions.userId],
    references: [users.id]
  })
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, {
    fields: [templates.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, {
    fields: [usageEvents.userId],
    references: [users.id]
  })
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Naskah = typeof naskah.$inferSelect;
export type NaskahVersion = typeof naskahVersions.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type MyQuranCache = typeof myQuranCache.$inferSelect;
export type CuratedDalil = typeof curatedDalil.$inferSelect;
