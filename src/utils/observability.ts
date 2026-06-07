type LogValue = string | number | boolean | null | undefined;

const logLevels = ["off", "warn", "info"] as const;
type LogLevel = (typeof logLevels)[number];

function parseLogLevel(value: string | undefined): LogLevel {
  const normalized = String(value ?? "info").trim().toLowerCase();
  return logLevels.includes(normalized as LogLevel) ? (normalized as LogLevel) : "info";
}

const currentLogLevel = parseLogLevel(process.env.OBSERVABILITY_LOG_LEVEL);
const aggregateEnabled = !["0", "false", "off", "no"].includes(String(process.env.OBSERVABILITY_AGGREGATE ?? "true").trim().toLowerCase());
const aggregateWindowMs = Math.max(10_000, Number(process.env.OBSERVABILITY_AGGREGATE_WINDOW_MS ?? 60_000) || 60_000);
let aggregateWindowStartedAt = Date.now();
const aggregateStore = new Map<
  string,
  {
    event: string;
    dimensions: Record<string, LogValue>;
    count: number;
    numericSums: Record<string, number>;
  }
>();

export type MetricSummary = {
  event: string;
  windowMs: number;
  count: number;
  dimensions: Record<string, LogValue>;
  averages: Record<string, number>;
};

function shouldLog(level: LogLevel) {
  if (currentLogLevel === "off") return false;
  if (level === "warn") return currentLogLevel === "warn" || currentLogLevel === "info";
  return currentLogLevel === "info";
}

export function formatLogFields(fields: Record<string, string | number | boolean | null | undefined>) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
}

function flushAggregates(now: number) {
  if (!aggregateEnabled || aggregateStore.size === 0 || now - aggregateWindowStartedAt < aggregateWindowMs) return;

  for (const entry of aggregateStore.values()) {
    const averages = Object.fromEntries(
      Object.entries(entry.numericSums).map(([key, sum]) => [`avg${key[0].toUpperCase()}${key.slice(1)}`, Math.round((sum / entry.count) * 100) / 100])
    );
    if (shouldLog("info")) {
      console.info(
        `[metric.summary] ${formatLogFields({
          event: entry.event,
          windowMs: now - aggregateWindowStartedAt,
          count: entry.count,
          ...entry.dimensions,
          ...averages
        })}`
      );
    }
  }

  aggregateStore.clear();
  aggregateWindowStartedAt = now;
}

export function getMetricSummaries() {
  const now = Date.now();
  flushAggregates(now);
  return Array.from(aggregateStore.values()).map<MetricSummary>((entry) => ({
    event: entry.event,
    windowMs: now - aggregateWindowStartedAt,
    count: entry.count,
    dimensions: entry.dimensions,
    averages: Object.fromEntries(
      Object.entries(entry.numericSums).map(([key, sum]) => [`avg${key[0].toUpperCase()}${key.slice(1)}`, Math.round((sum / entry.count) * 100) / 100])
    )
  }));
}

function aggregateInfo(event: string, fields: Record<string, LogValue>) {
  if (!aggregateEnabled) return;

  const now = Date.now();
  flushAggregates(now);

  const dimensions = Object.fromEntries(Object.entries(fields).filter(([key, value]) => typeof value !== "number" || !key.endsWith("Ms")));
  const numericFields = Object.entries(fields).filter(([key, value]) => typeof value === "number" && key.endsWith("Ms"));
  if (numericFields.length === 0) return;

  const key = `${event}:${JSON.stringify(Object.entries(dimensions).sort(([a], [b]) => a.localeCompare(b)))}`;
  const existing = aggregateStore.get(key) ?? {
    event,
    dimensions,
    count: 0,
    numericSums: {}
  };
  existing.count += 1;
  for (const [field, value] of numericFields) {
    existing.numericSums[field] = (existing.numericSums[field] ?? 0) + Number(value);
  }
  aggregateStore.set(key, existing);
}

export function logInfo(event: string, fields: Record<string, LogValue>) {
  aggregateInfo(event, fields);
  if (!shouldLog("info")) return;
  console.info(`[${event}] ${formatLogFields(fields)}`);
}

export function logWarn(event: string, fields: Record<string, LogValue>) {
  if (!shouldLog("warn")) return;
  console.warn(`[${event}] ${formatLogFields(fields)}`);
}
