import { topicFromParameters, type PromptWebContext, type PromptWebResult } from "../utils/content";
import { logInfo } from "../utils/observability";

const defaultTimeoutMs = 7000;
const defaultMaxResults = 4;
const defaultMaxPageChars = 3500;
const defaultMaxTotalChars = 12000;
const webResearchEnabled = parseBooleanEnv(process.env.WEB_RESEARCH_ENABLED, true);
const webResearchSearchEnabled = parseBooleanEnv(process.env.WEB_RESEARCH_SEARCH_ENABLED, true);
const webResearchTimeoutMs = positiveIntegerEnv(process.env.WEB_RESEARCH_TIMEOUT_MS, defaultTimeoutMs);
const webResearchMaxResults = Math.min(8, positiveIntegerEnv(process.env.WEB_RESEARCH_MAX_RESULTS, defaultMaxResults));
const webResearchMaxPageChars = positiveIntegerEnv(process.env.WEB_RESEARCH_MAX_PAGE_CHARS, defaultMaxPageChars);
const webResearchMaxTotalChars = positiveIntegerEnv(process.env.WEB_RESEARCH_MAX_TOTAL_CHARS, defaultMaxTotalChars);
const webResearchUserAgent =
  process.env.WEB_RESEARCH_USER_AGENT ||
  "DakwahResearchBot/1.0 (+https://dakwah.aantriono.com; server-side source summarizer)";
const webResearchCacheTtlMs = positiveIntegerEnv(process.env.WEB_RESEARCH_CACHE_TTL_SECONDS, 10 * 60) * 1000;

const contextCache = new Map<string, { expiresAt: number; value: PromptWebContext }>();
const inflight = new Map<string, Promise<PromptWebContext>>();

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function positiveIntegerEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function requestWantsServerWebResearch(parameters: Record<string, unknown>) {
  void parameters;
  return true;
}

function cleanupCache(now: number) {
  for (const [key, entry] of contextCache) {
    if (entry.expiresAt <= now) contextCache.delete(key);
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractTitle(html: string, url: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const cleanTitle = title ? stripTags(title) : "";
  if (cleanTitle) return cleanTitle.slice(0, 160);
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function htmlToText(html: string) {
  return stripTags(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<\/(?:p|div|section|article|header|footer|main|li|h[1-6]|br)>/gi, "\n")
  );
}

function excerptFor(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, webResearchMaxPageChars);
}

function cleanUrlCandidate(value: string) {
  return value.replace(/[),.;\]}>]+$/g, "");
}

function extractUrls(value: string) {
  const urls = new Set<string>();
  for (const match of value.match(/https?:\/\/[^\s<>"'`]+/gi) ?? []) {
    urls.add(cleanUrlCandidate(match));
  }
  return [...urls];
}

function isPrivateIPv4(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIPv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized.includes(":")) return false;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return null;
    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchTextWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), webResearchTimeoutMs);
  try {
    let currentUrl = safeHttpUrl(url);
    if (!currentUrl) throw new Error("URL tidak aman.");

    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "User-Agent": webResearchUserAgent
        },
        signal: controller.signal,
        redirect: "manual"
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error(`Redirect tanpa Location: HTTP ${response.status}`);
        const nextUrl = safeHttpUrl(new URL(location, currentUrl).toString());
        if (!nextUrl) throw new Error("Redirect mengarah ke URL yang tidak aman.");
        currentUrl = nextUrl;
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (contentLength > 2_000_000) throw new Error("Halaman terlalu besar.");
      if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
        throw new Error(`Tipe konten tidak didukung: ${contentType || "unknown"}.`);
      }
      return { text: await response.text(), contentType, finalUrl: currentUrl };
    }

    throw new Error("Redirect terlalu banyak.");
  } finally {
    clearTimeout(timeout);
  }
}

async function crawlUrl(url: string): Promise<PromptWebResult | null> {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return null;
  try {
    const fetched = await fetchTextWithTimeout(safeUrl);
    const isHtml = /html/i.test(fetched.contentType);
    const plainText = isHtml ? htmlToText(fetched.text) : fetched.text.replace(/\s+/g, " ").trim();
    const excerpt = excerptFor(plainText);
    if (excerpt.length < 160) return null;
    return {
      title: isHtml ? extractTitle(fetched.text, fetched.finalUrl) : new URL(fetched.finalUrl).hostname.replace(/^www\./, ""),
      url: fetched.finalUrl,
      excerpt
    };
  } catch (error) {
    console.warn(`[webResearch] crawl_failed url=${safeUrl} message=${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function normalizeDuckDuckGoUrl(value: string) {
  const decoded = decodeHtml(value);
  try {
    const url = new URL(decoded, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return url.toString();
  } catch {
    return decoded;
  }
}

function parseDuckDuckGoResults(html: string) {
  const results: Array<{ title: string; url: string }> = [];
  const patterns = [
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+rel="nofollow"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) && results.length < webResearchMaxResults * 2) {
      const url = safeHttpUrl(normalizeDuckDuckGoUrl(match[1]));
      const title = stripTags(match[2]);
      if (!url || !title || results.some((item) => item.url === url)) continue;
      results.push({ title: title.slice(0, 160), url });
    }
    if (results.length > 0) break;
  }

  return results.slice(0, webResearchMaxResults);
}

async function searchWeb(query: string) {
  if (!webResearchSearchEnabled) return [];
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const fetched = await fetchTextWithTimeout(searchUrl);
    return parseDuckDuckGoResults(fetched.text);
  } catch (error) {
    console.warn(`[webResearch] search_failed query=${JSON.stringify(query)} message=${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function queryText(jenis: string, parameters: Record<string, unknown>) {
  const topic = topicFromParameters(parameters);
  const sourceText = String(parameters.sumberInternet ?? "")
    .replace(/https?:\/\/[^\s<>"'`]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const label = jenis === "khutbah-jumat" ? "khutbah Jumat" : jenis;
  return `${topic} ${sourceText || "Islam dakwah artikel terpercaya"} ${label}`.replace(/\s+/g, " ").trim();
}

function trimResultsToBudget(results: PromptWebResult[]) {
  const output: PromptWebResult[] = [];
  let used = 0;
  for (const result of results) {
    const remaining = webResearchMaxTotalChars - used;
    if (remaining <= 0) break;
    const excerpt = result.excerpt.slice(0, Math.min(result.excerpt.length, remaining));
    output.push({ ...result, excerpt });
    used += excerpt.length;
  }
  return output;
}

export async function retrieveWebContext(jenis: string, parameters: Record<string, unknown>): Promise<PromptWebContext> {
  const query = queryText(jenis, parameters);
  if (!webResearchEnabled || !requestWantsServerWebResearch(parameters)) {
    return { query, source: "disabled", results: [], warnings: [] };
  }

  const now = Date.now();
  cleanupCache(now);
  const cacheKey = `${jenis}:${stableSerialize(parameters)}`;
  const cached = contextCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  const active = inflight.get(cacheKey);
  if (active) return active;

  const pending = (async () => {
    const startedAt = Date.now();
    const warnings: string[] = [];
    const directUrls = extractUrls(String(parameters.sumberInternet ?? "")).map(safeHttpUrl).filter((url): url is string => Boolean(url));
    const searchResults = directUrls.length > 0 ? [] : await searchWeb(query);
    const urls = [...new Set([...directUrls, ...searchResults.map((item) => item.url)])].slice(0, webResearchMaxResults);
    const crawled = (await Promise.all(urls.map((url) => crawlUrl(url)))).filter((item): item is PromptWebResult => Boolean(item));

    if (directUrls.length === 0 && searchResults.length === 0) warnings.push("Pencarian web tidak menemukan hasil yang bisa dipakai.");
    if (urls.length > 0 && crawled.length === 0) warnings.push("Hasil web ditemukan, tetapi tidak ada halaman yang berhasil diringkas.");

    const result: PromptWebContext = {
      query,
      source: directUrls.length > 0 ? "URL user + crawler server" : "DuckDuckGo HTML + crawler server",
      results: trimResultsToBudget(crawled),
      warnings
    };
    contextCache.set(cacheKey, { value: result, expiresAt: Date.now() + webResearchCacheTtlMs });
    logInfo("web_research.retrieve", {
      jenis,
      query,
      urls: urls.length,
      results: result.results.length,
      warnings: warnings.length,
      durationMs: Date.now() - startedAt
    });
    return result;
  })();

  inflight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    inflight.delete(cacheKey);
  }
}
