import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
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
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdx: index("naskah_user_idx").on(table.userId),
    jenisIdx: index("naskah_jenis_idx").on(table.jenis)
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

export const usersRelations = relations(users, ({ many }) => ({
  naskah: many(naskah),
  templates: many(templates),
  sessions: many(sessions)
}));

export const naskahRelations = relations(naskah, ({ one }) => ({
  user: one(users, {
    fields: [naskah.userId],
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Naskah = typeof naskah.$inferSelect;
export type Template = typeof templates.$inferSelect;
