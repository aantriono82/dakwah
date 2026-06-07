import { sqlite } from "../db/client";
import {
  selectedDalilFor,
  topicFromParameters,
  type DalilText,
  type PromptDalilContext,
  type PromptDalilItem
} from "../utils/content";
import { logInfo } from "../utils/observability";
import { classifyThemeSemantically } from "../utils/themeClassifier";

type MyQuranApiEnvelope<T> = {
  status?: boolean;
  message?: string;
  data?: T;
};

type MyQuranVerse = {
  id?: number;
  surah_number?: number;
  ayah_number?: number;
  arab?: string;
  translation?: string;
  tafsir?: {
    kemenag?: {
      short?: string;
      long?: string;
    };
    quraish?: string;
    jalalayn?: string;
  };
};

type MyQuranHadith = {
  id?: number;
  text?: {
    ar?: string;
    id?: string;
  };
  grade?: string;
  takhrij?: string;
  hikmah?: string;
};

type MyQuranHadithSearchData = {
  keyword?: string;
  hadis?: MyQuranHadith[];
};

type QuranReference = {
  surah: number;
  ayahStart: number;
  ayahEnd: number;
};

type CuratedDalilRow = {
  id: string;
  kind: "quran" | "hadith";
  reference: string;
  arab: string | null;
  translation: string;
  source: string;
  grade: string | null;
  takhrij: string | null;
  tafsir: string | null;
  tags: string;
  status: "draft" | "reviewed" | "approved" | "archived";
  is_active: number;
};

const defaultBaseUrl = "https://api.myquran.com/v3";
const defaultCacheTtlSeconds = 30 * 24 * 60 * 60;
const defaultTimeoutMs = 2500;
const dalilContextCacheTtlMs = 5 * 60 * 1000;
const myQuranEnabled = parseBooleanEnv(process.env.MYQURAN_ENABLED, true);
const myQuranBaseUrl = String(process.env.MYQURAN_API_BASE_URL ?? defaultBaseUrl).replace(/\/+$/, "");
const myQuranTimeoutMs = positiveIntegerEnv(process.env.MYQURAN_TIMEOUT_MS, defaultTimeoutMs);
const myQuranCacheTtlSeconds = positiveIntegerEnv(process.env.MYQURAN_CACHE_TTL_SECONDS, defaultCacheTtlSeconds);
const dalilContextCache = new Map<string, { expiresAt: number; value: PromptDalilContext }>();
const dalilContextInflight = new Map<string, Promise<PromptDalilContext>>();

const surahNumbers: Record<string, number> = {
  alankabut: 29,
  alashr: 103,
  alahzab: 33,
  alanfal: 8,
  albaqarah: 2,
  albayyinah: 98,
  alhajj: 22,
  alhujurat: 49,
  alisra: 17,
  alkahf: 18,
  almaidah: 5,
  almuminun: 23,
  alqalam: 68,
  aliimran: 3,
  annahl: 16,
  annisa: 4,
  annur: 24,
  arrad: 13,
  arrum: 30,
  attaghabun: 64,
  attawbah: 9,
  aththalaq: 65,
  azzumar: 39,
  fussilat: 41,
  ibrahim: 14,
  luqman: 31,
  qaf: 50
};

const stopwords = new Set([
  "agar",
  "akan",
  "atau",
  "bagi",
  "bahwa",
  "dalam",
  "dari",
  "dengan",
  "hendaklah",
  "karena",
  "kepada",
  "maka",
  "mereka",
  "orang",
  "pada",
  "saat",
  "sebagai",
  "secara",
  "setiap",
  "siapa",
  "suatu",
  "tidak",
  "untuk",
  "yang"
]);

const hadithHintTerms: Array<{ pattern: RegExp; terms: string[] }> = [
  { pattern: /\b(amanah|khianat|jujur|kejujuran)\b/i, terms: ["amanah", "khianat", "jujur"] },
  { pattern: /\b(sabar|musibah|ujian)\b/i, terms: ["sabar", "mukmin", "musibah"] },
  { pattern: /\b(syukur|bersyukur|nikmat)\b/i, terms: ["syukur", "berterima kasih"] },
  { pattern: /\b(sedekah|infak|tetangga|berbagi)\b/i, terms: ["sedekah", "tetangga"] },
  { pattern: /\b(taubat|tobat|istighfar|ampunan)\b/i, terms: ["taubat", "ampunan"] },
  { pattern: /\b(ikhlas|niat|riya)\b/i, terms: ["niat", "ikhlas"] },
  { pattern: /\b(lisan|bicara|komunikasi|ucapan|diam)\b/i, terms: ["berkata baik", "diam"] },
  { pattern: /\b(nikah|pernikahan|keluarga|rumah tangga|istri|suami)\b/i, terms: ["wanita", "keluarga"] },
  { pattern: /\b(riba|muamalah|utang|hutang)\b/i, terms: ["riba"] },
  { pattern: /\b(judi|maisir|taruhan)\b/i, terms: ["judi"] },
  { pattern: /\b(ilmu|belajar|ngaji)\b/i, terms: ["ilmu", "agama"] },
  { pattern: /\b(tawakal|ikhtiar)\b/i, terms: ["tawakal"] },
  { pattern: /\b(istiqamah|konsisten)\b/i, terms: ["istiqamah"] }
];

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function positiveIntegerEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function isMyQuranEnabled() {
  return myQuranEnabled;
}

let cacheTableReady = false;
function ensureCacheTable() {
  if (cacheTableReady) return;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS myquran_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      url TEXT NOT NULL,
      payload TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 200,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS myquran_cache_expires_idx ON myquran_cache(expires_at);
  `);
  cacheTableReady = true;
}

let curatedDalilTableReady = false;
function ensureCuratedDalilTable() {
  if (curatedDalilTableReady) return;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS curated_dalil (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      reference TEXT NOT NULL,
      arab TEXT,
      translation TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'Database dalil terkurasi',
      grade TEXT,
      takhrij TEXT,
      tafsir TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS curated_dalil_kind_idx ON curated_dalil(kind);
    CREATE INDEX IF NOT EXISTS curated_dalil_active_idx ON curated_dalil(is_active);
    CREATE INDEX IF NOT EXISTS curated_dalil_reference_idx ON curated_dalil(reference);
  `);

  ensureColumn("curated_dalil", "status", "TEXT NOT NULL DEFAULT 'approved'");
  sqlite.run("UPDATE curated_dalil SET status = 'approved' WHERE status IS NULL OR status = ''");
  sqlite.run("CREATE INDEX IF NOT EXISTS curated_dalil_status_idx ON curated_dalil(status)");
  curatedDalilTableReady = true;
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === columnName)) return;
  sqlite.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function cacheGet<T>(cacheKey: string) {
  ensureCacheTable();
  const row = sqlite
    .prepare("SELECT payload, expires_at FROM myquran_cache WHERE cache_key = ?")
    .get(cacheKey) as { payload: string; expires_at: number } | null;

  if (!row || row.expires_at <= Date.now()) return null;

  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

function cacheSet(cacheKey: string, url: string, payload: unknown, status: number) {
  ensureCacheTable();
  sqlite
    .prepare(
      `INSERT INTO myquran_cache (cache_key, url, payload, status, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         url = excluded.url,
         payload = excluded.payload,
         status = excluded.status,
         expires_at = excluded.expires_at,
         updated_at = CURRENT_TIMESTAMP`
    )
    .run(cacheKey, url, JSON.stringify(payload), status, Date.now() + myQuranCacheTtlSeconds * 1000);
}

async function cachedFetchJson<T>(path: string) {
  if (!isMyQuranEnabled()) return null;

  const url = `${myQuranBaseUrl}/${path.replace(/^\/+/, "")}`;
  const cacheKey = `GET ${url}`;
  const cached = cacheGet<T>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), myQuranTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const text = await response.text();
    const data = JSON.parse(text) as T;

    if (!response.ok) {
      console.warn(`[myquran] request_failed status=${response.status} path=${path}`);
      return null;
    }

    cacheSet(cacheKey, url, data, response.status);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[myquran] request_error path=${path} message=${message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSurahName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function dalilContextCacheKey(jenis: string, parameters: Record<string, unknown>) {
  return `${jenis}:${stableSerialize(parameters)}`;
}

function cleanupDalilContextCache(now: number) {
  for (const [key, entry] of dalilContextCache) {
    if (entry.expiresAt <= now) dalilContextCache.delete(key);
  }
}

export function parseQuranReference(reference: string): QuranReference | null {
  const match = reference.match(/QS\.\s*([^:]+):\s*(\d+)(?:\s*-\s*(\d+))?/i);
  if (!match) return null;

  const surah = surahNumbers[normalizeSurahName(match[1])];
  const ayahStart = Number(match[2]);
  const ayahEnd = Number(match[3] ?? match[2]);

  if (!surah || !Number.isInteger(ayahStart) || !Number.isInteger(ayahEnd) || ayahStart < 1 || ayahEnd < ayahStart) {
    return null;
  }

  return { surah, ayahStart, ayahEnd };
}

function localQuranItem(dalil: DalilText, label: string): PromptDalilItem {
  return {
    kind: "quran",
    reference: dalil.rujukan,
    arab: dalil.arab,
    translation: dalil.arti,
    source: "Paket dalil tematik lokal",
    relevance: `Dipilih dari paket tematik "${label}".`,
    fallback: true
  };
}

function localHadithItem(dalil: DalilText, label: string): PromptDalilItem {
  return {
    kind: "hadith",
    reference: dalil.rujukan,
    arab: dalil.arab,
    translation: dalil.arti,
    source: "Paket dalil tematik lokal",
    relevance: `Dipilih dari paket tematik "${label}".`,
    fallback: true
  };
}

function verseTafsir(verse: MyQuranVerse) {
  return verse.tafsir?.kemenag?.short || verse.tafsir?.quraish || verse.tafsir?.jalalayn || undefined;
}

async function fetchQuranItem(reference: string, fallback: DalilText, label: string): Promise<PromptDalilItem> {
  const parsed = parseQuranReference(reference);
  if (!parsed) return localQuranItem(fallback, label);

  const verses: MyQuranVerse[] = [];
  for (let ayah = parsed.ayahStart; ayah <= parsed.ayahEnd; ayah += 1) {
    const response = await cachedFetchJson<MyQuranApiEnvelope<MyQuranVerse>>(`/quran/${parsed.surah}/${ayah}`);
    if (!response?.status || !response.data) return localQuranItem(fallback, label);
    verses.push(response.data);
  }

  if (verses.length === 0) return localQuranItem(fallback, label);

  const arab = verses.map((verse) => verse.arab).filter(Boolean).join(" ");
  const translation = verses
    .map((verse) => {
      const number = verse.ayah_number ?? "";
      return `${number ? `${number}. ` : ""}${verse.translation ?? ""}`.trim();
    })
    .filter(Boolean)
    .join(" ");

  if (!arab || !translation) return localQuranItem(fallback, label);

  return {
    kind: "quran",
    reference,
    arab,
    translation,
    source: "myQuran Quran API",
    tafsir: verseTafsir(verses[0]),
    relevance: `Ayat ini dipilih dari paket tematik "${label}" lalu diverifikasi melalui myQuran.`
  };
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function tokenSet(value: string) {
  return new Set(
    normalizeSearchText(value)
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !stopwords.has(token))
  );
}

function curatedScore(row: CuratedDalilRow, theme: string) {
  const themeText = normalizeSearchText(theme);
  const themeTokens = tokenSet(theme);
  const tags = parseTags(row.tags);
  let score = 0;

  for (const tag of tags) {
    const normalizedTag = normalizeSearchText(tag);
    if (!normalizedTag) continue;
    if (themeText === normalizedTag) score += 18;
    else if (themeText.includes(normalizedTag) || normalizedTag.includes(themeText)) score += 12;
    else {
      const tagTokens = tokenSet(tag);
      for (const token of tagTokens) {
        if (themeTokens.has(token)) score += 5;
      }
    }
  }

  const body = normalizeSearchText(`${row.reference} ${row.translation} ${row.source} ${row.takhrij ?? ""} ${row.tafsir ?? ""}`);
  for (const token of themeTokens) {
    if (body.includes(token)) score += 1;
  }

  return score;
}

function curatedPromptItem(row: CuratedDalilRow, theme: string): PromptDalilItem {
  const tags = parseTags(row.tags);
  return {
    kind: row.kind,
    reference: row.reference,
    arab: row.arab ?? undefined,
    translation: row.translation,
    source: row.source || "Database dalil terkurasi",
    grade: row.grade ?? undefined,
    takhrij: row.takhrij ?? undefined,
    tafsir: row.tafsir ?? undefined,
    relevance: `Dipilih dari database dalil terkurasi untuk tema "${theme}"${tags.length ? ` dengan tag: ${tags.join(", ")}` : ""}.`
  };
}

function findCuratedDalil(theme: string) {
  ensureCuratedDalilTable();
  const rows = sqlite
    .prepare(
      `SELECT id, kind, reference, arab, translation, source, grade, takhrij, tafsir, tags, status, is_active
       FROM curated_dalil
       WHERE is_active = 1 AND status = 'approved'
       LIMIT 500`
    )
    .all() as CuratedDalilRow[];

  const best: Partial<Record<CuratedDalilRow["kind"], { row: CuratedDalilRow; score: number }>> = {};

  for (const row of rows) {
    const score = curatedScore(row, theme);
    if (score <= 0) continue;
    const current = best[row.kind];
    if (!current || score > current.score) best[row.kind] = { row, score };
  }

  return {
    quran: best.quran ? curatedPromptItem(best.quran.row, theme) : null,
    hadith: best.hadith ? curatedPromptItem(best.hadith.row, theme) : null
  };
}

function uniquePush(items: string[], value: string) {
  const trimmed = value.trim();
  if (trimmed.length >= 4 && !items.includes(trimmed)) items.push(trimmed);
}

function hadithSearchTerms(theme: string, fallback: DalilText) {
  const terms: string[] = [];

  for (const hint of hadithHintTerms) {
    if (hint.pattern.test(`${theme} ${fallback.arti}`)) {
      for (const term of hint.terms) uniquePush(terms, term);
    }
  }

  const tokens = normalizeSearchText(`${theme} ${fallback.arti}`)
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stopwords.has(token));

  for (const token of tokens) uniquePush(terms, token);
  return terms.slice(0, 6);
}

function scoreHadithResult(hadith: MyQuranHadith, theme: string, fallback: DalilText) {
  const grade = (hadith.grade ?? "").toLowerCase();
  const takhrij = (hadith.takhrij ?? "").toLowerCase();
  if (
    /dhaif|dhoif|dha'if|lemah|maudhu|mawdhu|palsu|munkar/i.test(grade) ||
    /dhaif|dhoif|dha'if|lemah|maudhu|mawdhu|palsu|munkar/i.test(takhrij)
  ) {
    return -100;
  }

  const haystack = normalizeSearchText(`${hadith.text?.id ?? ""} ${hadith.hikmah ?? ""} ${hadith.takhrij ?? ""}`);
  const tokens = normalizeSearchText(`${theme} ${fallback.arti}`)
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stopwords.has(token));
  const score = tokens.reduce((total, token) => (haystack.includes(token) ? total + 2 : total), 0);
  const gradeBoost = /sahih|shahih|hasan/i.test(hadith.grade ?? "") ? 2 : 0;
  const sourceBoost = /bukhari|muslim/i.test(hadith.takhrij ?? "") ? 1 : 0;
  return score + gradeBoost + sourceBoost;
}

async function fetchHadithItem(theme: string, fallback: DalilText, label: string): Promise<PromptDalilItem> {
  let best: { hadith: MyQuranHadith; score: number } | null = null;

  for (const term of hadithSearchTerms(theme, fallback)) {
    const response = await cachedFetchJson<MyQuranApiEnvelope<MyQuranHadithSearchData>>(
      `/hadis/enc/cari/${encodeURIComponent(term)}?page=1&limit=5`
    );
    if (!response) break;

    const results = response.data?.hadis ?? [];

    for (const hadith of results) {
      if (!hadith.text?.id && !hadith.text?.ar) continue;
      const score = scoreHadithResult(hadith, theme, fallback);
      if (score < 0) continue;
      if (!best || score > best.score) best = { hadith, score };
    }

    if (best && best.score >= 4) break;
  }

  if (!best) return localHadithItem(fallback, label);

  return {
    kind: "hadith",
    reference: best.hadith.takhrij || fallback.rujukan,
    arab: best.hadith.text?.ar,
    translation: best.hadith.text?.id || fallback.arti,
    source: "myQuran Ensiklopedia Hadis API",
    grade: best.hadith.grade,
    takhrij: best.hadith.takhrij,
    tafsir: best.hadith.hikmah,
    relevance: `Dipilih lewat pencarian myQuran untuk tema "${theme}" dan paket tematik "${label}".`
  };
}

export async function retrieveDalilContext(jenis: string, parameters: Record<string, unknown>): Promise<PromptDalilContext> {
  const now = Date.now();
  cleanupDalilContextCache(now);

  const cacheKey = dalilContextCacheKey(jenis, parameters);
  const cached = dalilContextCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    logInfo("dalil.retrieve", { jenis, cache: "hit", source: cached.value.source });
    return cached.value;
  }

  const inflight = dalilContextInflight.get(cacheKey);
  if (inflight) {
    logInfo("dalil.retrieve", { jenis, cache: "inflight" });
    return inflight;
  }

  const pending = (async () => {
    const startedAt = Date.now();
    const theme = topicFromParameters(parameters);
    const warnings: string[] = [];

    let queryTheme = theme;
    const semanticLabel = await classifyThemeSemantically(theme);
    if (semanticLabel) {
      logInfo("dalil.semantic_map", { jenis, theme, semanticLabel });
      queryTheme = semanticLabel;
    }

    const selected = selectedDalilFor(jenis, queryTheme, `${jenis}:${queryTheme}`);
    const curated = findCuratedDalil(queryTheme);

    if (!isMyQuranEnabled()) {
      const quran = curated.quran ?? localQuranItem(selected.ayat, selected.label);
      const hadith = curated.hadith ?? localHadithItem(selected.hadith, selected.label);

      if (!curated.quran || !curated.hadith) warnings.push("MYQURAN_ENABLED=false, memakai paket dalil tematik lokal untuk dalil yang belum ada di database curated.");
      const result = {
        theme,
        source: [...new Set([quran.source, hadith.source])].join(" + "),
        quran: [quran],
        hadith: [hadith],
        warnings
      };
      dalilContextCache.set(cacheKey, { value: result, expiresAt: Date.now() + dalilContextCacheTtlMs });
      logInfo("dalil.retrieve", {
        jenis,
        cache: "miss",
        source: result.source,
        warnings: result.warnings.length,
        durationMs: Date.now() - startedAt
      });
      return result;
    }

    const [quran, hadith] = await Promise.all([
      curated.quran ? Promise.resolve(curated.quran) : fetchQuranItem(selected.ayat.rujukan, selected.ayat, selected.label),
      curated.hadith ? Promise.resolve(curated.hadith) : fetchHadithItem(queryTheme, selected.hadith, selected.label)
    ]);

    if (quran.fallback) warnings.push("Ayat memakai fallback lokal karena rujukan tidak bisa diverifikasi dari myQuran.");
    if (hadith.fallback) warnings.push("Hadits memakai fallback lokal karena pencarian myQuran tidak menemukan hasil yang cukup relevan.");

    const result = {
      theme,
      source: [...new Set([quran.source, hadith.source])].join(" + "),
      quran: [quran],
      hadith: [hadith],
      warnings
    };
    dalilContextCache.set(cacheKey, { value: result, expiresAt: Date.now() + dalilContextCacheTtlMs });
    logInfo("dalil.retrieve", {
      jenis,
      cache: "miss",
      source: result.source,
      warnings: result.warnings.length,
      durationMs: Date.now() - startedAt
    });
    return result;
  })();

  dalilContextInflight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    dalilContextInflight.delete(cacheKey);
  }
}
