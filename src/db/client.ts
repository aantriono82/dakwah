import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "./data/dakwah.sqlite";

if (!databaseUrl.startsWith(":memory:")) {
  mkdirSync(dirname(databaseUrl), { recursive: true });
}

const sqlite = new Database(databaseUrl);
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA synchronous = NORMAL");
sqlite.run("PRAGMA foreign_keys = ON");
sqlite.run("PRAGMA temp_store = MEMORY");
sqlite.run("PRAGMA busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });
export { sqlite };
