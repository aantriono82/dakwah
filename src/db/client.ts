import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "./data/khutbah-ai.sqlite";

if (!databaseUrl.startsWith(":memory:")) {
  mkdirSync(dirname(databaseUrl), { recursive: true });
}

const sqlite = new Database(databaseUrl);
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
