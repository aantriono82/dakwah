import { Database } from "bun:sqlite";

const databaseUrl = process.env.DATABASE_URL ?? "./data/dakwah.sqlite";
const username = process.env.RECOVERY_ADMIN_USERNAME?.trim();
const name = process.env.RECOVERY_ADMIN_NAME?.trim() || "Recovery Admin";
const password = process.env.RECOVERY_ADMIN_PASSWORD ?? "";

if (!username) {
  throw new Error("Set RECOVERY_ADMIN_USERNAME.");
}

if (password.length < 12) {
  throw new Error("Set RECOVERY_ADMIN_PASSWORD with at least 12 characters.");
}

const db = new Database(databaseUrl);
db.run("PRAGMA foreign_keys = ON");

const existing = db
  .query<{ id: string }, [string]>("SELECT id FROM users WHERE username = ?")
  .get(username);

const passwordHash = await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 10
});

if (existing) {
  db.query(
    `
      UPDATE users
      SET name = ?, role = 'admin', password_hash = ?, updated_at = datetime('now')
      WHERE username = ?
    `
  ).run(name, passwordHash, username);
  db.query("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  console.log(`Updated admin account: ${username}`);
} else {
  const id = crypto.randomUUID();
  db.query(
    `
      INSERT INTO users (id, username, name, role, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', ?, datetime('now'), datetime('now'))
    `
  ).run(id, username, name, passwordHash);
  console.log(`Created admin account: ${username}`);
}
