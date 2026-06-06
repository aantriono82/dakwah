import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sqlite } from "./client";
import { db } from "./client";
import { users } from "./schema";
import { hashPassword } from "../utils/password";

export async function migrate() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      daily_generate_limit INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

    CREATE TABLE IF NOT EXISTS naskah (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      jenis TEXT NOT NULL,
      bahasa TEXT NOT NULL DEFAULT 'Indonesia',
      duration TEXT,
      parameters TEXT NOT NULL,
      content TEXT NOT NULL,
      file_url TEXT,
      file_key TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      autosaved_at TEXT,
      quality_score INTEGER,
      quality_report TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS naskah_user_idx ON naskah(user_id);
    CREATE INDEX IF NOT EXISTS naskah_jenis_idx ON naskah(jenis);

    CREATE TABLE IF NOT EXISTS naskah_versions (
      id TEXT PRIMARY KEY NOT NULL,
      naskah_id TEXT NOT NULL REFERENCES naskah(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      parameters TEXT NOT NULL,
      quality_score INTEGER,
      quality_report TEXT,
      change_summary TEXT NOT NULL DEFAULT 'Simpan naskah',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS naskah_versions_naskah_idx ON naskah_versions(naskah_id);
    CREATE INDEX IF NOT EXISTS naskah_versions_user_idx ON naskah_versions(user_id);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      jenis TEXT NOT NULL,
      parameters TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS templates_user_idx ON templates(user_id);

    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ok',
      jenis TEXT,
      route TEXT,
      duration_ms INTEGER,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS usage_events_user_idx ON usage_events(user_id);
    CREATE INDEX IF NOT EXISTS usage_events_event_type_idx ON usage_events(event_type);
    CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON usage_events(created_at);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS password_reset_tokens_token_hash_idx ON password_reset_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx ON password_reset_tokens(expires_at);
  `);

  ensureColumn("users", "daily_generate_limit", "INTEGER");
  ensureColumn("naskah", "status", "TEXT NOT NULL DEFAULT 'draft'");
  ensureColumn("naskah", "version", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("naskah", "autosaved_at", "TEXT");
  ensureColumn("naskah", "quality_score", "INTEGER");
  ensureColumn("naskah", "quality_report", "TEXT");

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const userPassword = process.env.SEED_USER_PASSWORD ?? "user123";

  if (process.env.NODE_ENV === "production" && (adminPassword === "admin123" || userPassword === "user123")) {
    console.warn("[security] SEED_ADMIN_PASSWORD dan SEED_USER_PASSWORD masih memakai default. Ganti sebelum database production pertama dibuat.");
  }

  await seedUser("admin", "Administrator", "admin", adminPassword);
  await seedUser("user", "Pengguna", "user", userPassword);
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === columnName)) return;
  sqlite.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function seedUser(username: string, name: string, role: "admin" | "user", password: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (existing) return;

  await db.insert(users).values({
    id: nanoid(),
    username,
    name,
    role,
    passwordHash: await hashPassword(password)
  });
}

if (import.meta.main) {
  await migrate();
  console.log("Database siap digunakan.");
}
