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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS naskah_user_idx ON naskah(user_id);
    CREATE INDEX IF NOT EXISTS naskah_jenis_idx ON naskah(jenis);

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

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
  `);

  await seedUser("admin", "Administrator", "admin", process.env.SEED_ADMIN_PASSWORD ?? "admin123");
  await seedUser("user", "Pengguna", "user", process.env.SEED_USER_PASSWORD ?? "user123");
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
