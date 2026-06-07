import { memo, useCallback, useEffect, useState } from "react";
import { IconChevronDown, IconChevronUp } from "../components/icons";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import { completePageTransition, getFrontendPerfMetrics, isFrontendPerfDebugEnabled, type FrontendPerfMetric } from "../lib/perf";
import { api } from "../lib/utils";
import type { User } from "../types";

type AdminMonitoring = {
  todayGenerates: number;
  todayExports: number;
  blockedGenerates: number;
  frontendPerfWindow: "24h" | "7d" | "30d";
  frontendPerfSummary: Array<{
    page: string | null;
    count: number;
    avgDurationMs: number;
    minDurationMs: number;
    maxDurationMs: number;
    previousAvgDurationMs: number | null;
    previousCount: number;
  }>;
  usageByUser: { userId: string | null; username: string | null; name: string | null; total: number }[];
  metrics: Array<{
    event: string;
    windowMs: number;
    count: number;
    dimensions: Record<string, string | number | boolean | null | undefined>;
    averages: Record<string, number>;
  }>;
  recentUsage: Array<{
    id: string;
    eventType: string;
    status: string;
    jenis?: string | null;
    route?: string | null;
    durationMs?: number | null;
    createdAt: string;
    user?: User | null;
  }>;
};

type MetricsSortMode = "slowest" | "most-frequent" | "event";

const adminMonitoringRefreshIntervalMs = 60_000;
const metricsPageSize = 12;

export function AdminMonitoringPage({ onBack }: { onBack: () => void }) {
  const [monitoring, setMonitoring] = useState<AdminMonitoring | null>(null);
  const [message, setMessage] = useState("");
  const [metricQuery, setMetricQuery] = useState("");
  const [slowOnly, setSlowOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [perfWindow, setPerfWindow] = useState<AdminMonitoring["frontendPerfWindow"]>("7d");
  const [pageVisible, setPageVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));
  const [lastLoadedAt, setLastLoadedAt] = useState<string>("");
  const [frontendPerfEnabled, setFrontendPerfEnabled] = useState(() => isFrontendPerfDebugEnabled());
  const [frontendPerfMetrics, setFrontendPerfMetrics] = useState<FrontendPerfMetric[]>(() => getFrontendPerfMetrics());

  useEffect(() => {
    completePageTransition("AdminMonitoring");
    setFrontendPerfEnabled(isFrontendPerfDebugEnabled());
    setFrontendPerfMetrics(getFrontendPerfMetrics());
  }, []);

  const loadMonitoring = useCallback(async () => {
    try {
      const monitoringData = await api<{ data: AdminMonitoring }>(`/api/admin/stats?scope=monitoring&perfWindow=${perfWindow}`);
      setMonitoring(monitoringData.data);
      setPerfWindow(monitoringData.data.frontendPerfWindow);
      setLastLoadedAt(new Date().toISOString());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat monitoring admin.");
    }
  }, [perfWindow]);

  useEffect(() => {
    void loadMonitoring();
  }, [loadMonitoring]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setPageVisible(visible);
      if (visible && autoRefresh) {
        void loadMonitoring();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [autoRefresh, loadMonitoring]);

  useEffect(() => {
    if (!autoRefresh || !pageVisible) return;
    const timer = window.setInterval(() => {
      void loadMonitoring();
    }, adminMonitoringRefreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadMonitoring, pageVisible]);

  return (
    <div className="grid gap-6">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Observability</Badge>
          <Button type="button" className="h-8 bg-secondary px-3 text-xs text-secondary-foreground" onClick={onBack}>
            Kembali ke Admin
          </Button>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">Monitoring dan observability</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <input checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} type="checkbox" />
            Auto-refresh monitoring
          </label>
          <Select className="h-8 w-[120px]" value={perfWindow} onChange={(event) => setPerfWindow(event.target.value as AdminMonitoring["frontendPerfWindow"])}>
            <option value="24h">24 jam</option>
            <option value="7d">7 hari</option>
            <option value="30d">30 hari</option>
          </Select>
          <span>{pageVisible ? "Tab aktif" : "Tab background"}</span>
          {lastLoadedAt && <span>Update terakhir: {new Date(lastLoadedAt).toLocaleTimeString("id-ID")}</span>}
          <Button type="button" className="h-8 bg-secondary px-3 text-xs text-secondary-foreground" onClick={() => void loadMonitoring()}>
            Refresh sekarang
          </Button>
        </div>
      </section>
      {message ? <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Generate hari ini" value={monitoring?.todayGenerates ?? 0} />
        <Stat label="Export hari ini" value={monitoring?.todayExports ?? 0} />
        <Stat label="Generate diblokir" value={monitoring?.blockedGenerates ?? 0} />
      </section>
      {monitoring?.frontendPerfSummary?.length ? <FrontendPerfAggregateSummary items={monitoring.frontendPerfSummary} windowLabel={perfWindowLabel(perfWindow)} /> : null}
      {frontendPerfEnabled ? <FrontendPerfSummary metrics={frontendPerfMetrics} onRefresh={() => setFrontendPerfMetrics(getFrontendPerfMetrics())} /> : null}
      {monitoring ? <UsageMonitoring stats={monitoring} /> : null}
      {monitoring?.metrics?.length ? <MetricsHighlights metrics={monitoring.metrics} /> : null}
      {monitoring?.metrics?.length ? <MetricsSummary metrics={monitoring.metrics} query={metricQuery} onQueryChange={setMetricQuery} slowOnly={slowOnly} onSlowOnlyChange={setSlowOnly} /> : null}
    </div>
  );
}

const FrontendPerfSummary = memo(function FrontendPerfSummary({
  metrics,
  onRefresh
}: {
  metrics: FrontendPerfMetric[];
  onRefresh: () => void;
}) {
  const latestByPage = Array.from(
    metrics.reduce((map, metric) => {
      if (!map.has(metric.page)) map.set(metric.page, metric);
      return map;
    }, new Map<string, FrontendPerfMetric>())
  ).map(([, metric]) => metric);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Frontend page timing</h2>
          <p className="mt-1 text-sm text-muted-foreground">Snapshot client-side untuk transisi page lazy terbaru.</p>
        </div>
        <Button type="button" className="h-8 bg-secondary px-3 text-xs text-secondary-foreground" onClick={onRefresh}>
          Refresh snapshot
        </Button>
      </div>
      <div className="grid gap-2">
        {latestByPage.length === 0 && <p className="text-sm text-muted-foreground">Belum ada metric client-side yang tercatat pada sesi ini.</p>}
        {latestByPage.map((metric) => (
          <div key={`${metric.page}-${metric.recordedAt}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{metric.page}</p>
              <p className="text-xs text-muted-foreground">{new Date(metric.recordedAt).toLocaleTimeString("id-ID")}</p>
            </div>
            <Badge>{metric.durationMs}ms</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

const FrontendPerfAggregateSummary = memo(function FrontendPerfAggregateSummary({
  items,
  windowLabel
}: {
  items: AdminMonitoring["frontendPerfSummary"];
  windowLabel: string;
}) {
  const slowest = [...items].sort((left, right) => right.avgDurationMs - left.avgDurationMs)[0] ?? null;
  const busiest = [...items].sort((left, right) => right.count - left.count)[0] ?? null;
  const sortedItems = [...items].sort((left, right) => right.avgDurationMs - left.avgDurationMs);
  const keyPages = ["Generate", "History", "AdminMonitoring"]
    .map((page) => sortedItems.find((item) => item.page === page))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  function perfTone(avgDurationMs: number) {
    if (avgDurationMs >= 1200) return { label: "Lambat", className: "border-destructive/25 bg-destructive/10 text-destructive" };
    if (avgDurationMs >= 600) return { label: "Sedang", className: "border-amber-500/25 bg-amber-500/10 text-amber-600" };
    return { label: "Cepat", className: "border-primary/25 bg-primary/10 text-primary" };
  }

  function perfTrend(item: AdminMonitoring["frontendPerfSummary"][number]) {
    if (item.previousAvgDurationMs === null) {
      return { label: "Baru", className: "border-border bg-muted text-muted-foreground", detail: "Belum ada window pembanding", icon: null };
    }

    const delta = item.avgDurationMs - item.previousAvgDurationMs;
    if (Math.abs(delta) < 100) {
      return { label: "Stabil", className: "border-border bg-muted text-muted-foreground", detail: `${delta >= 0 ? "+" : ""}${delta}ms vs window sebelumnya`, icon: null };
    }
    if (delta < 0) {
      return { label: "Membaik", className: "border-primary/25 bg-primary/10 text-primary", detail: `${delta}ms vs window sebelumnya`, icon: IconChevronDown };
    }
    return { label: "Memburuk", className: "border-destructive/25 bg-destructive/10 text-destructive", detail: `+${delta}ms vs window sebelumnya`, icon: IconChevronUp };
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Frontend page load summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">Agregat sampling backend untuk {windowLabel} terakhir.</p>
      </div>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border px-3 py-3">
          <p className="text-sm text-muted-foreground">Page paling lambat</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-lg font-semibold">{slowest?.page ?? "-"}</p>
            {slowest ? <Badge className={perfTone(slowest.avgDurationMs).className}>{perfTone(slowest.avgDurationMs).label}</Badge> : null}
            {slowest ? <Badge className={perfTrend(slowest).className}>{perfTrend(slowest).label}</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{slowest ? `avg ${slowest.avgDurationMs}ms` : "Belum ada data"}</p>
        </div>
        <div className="rounded-md border border-border px-3 py-3">
          <p className="text-sm text-muted-foreground">Page paling sering</p>
          <p className="mt-2 text-lg font-semibold">{busiest?.page ?? "-"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{busiest ? `${busiest.count} sampel` : "Belum ada data"}</p>
        </div>
      </div>
      {keyPages.length ? (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {keyPages.map((item) => {
            const trend = perfTrend(item);
            const TrendIcon = trend.icon;
            return (
              <div key={`key-${item.page}`} className="rounded-md border border-border px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.page}</p>
                  <Badge>{item.count}x</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className={perfTone(item.avgDurationMs).className}>{perfTone(item.avgDurationMs).label}</Badge>
                  <Badge className={trend.className}>
                    {TrendIcon ? <TrendIcon className="size-3" /> : null}
                    {trend.label}
                  </Badge>
                </div>
                <p className="mt-3 text-lg font-semibold">{item.avgDurationMs}ms</p>
                <p className="mt-1 text-xs text-muted-foreground">{trend.detail}</p>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        {sortedItems.map((item) => (
          <div key={item.page ?? "unknown"} className="rounded-md border border-border px-3 py-3">
            {(() => {
              const trend = perfTrend(item);
              const TrendIcon = trend.icon;
              return (
                <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.page ?? "unknown"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={perfTone(item.avgDurationMs).className}>{perfTone(item.avgDurationMs).label}</Badge>
                <Badge className={trend.className}>
                  {TrendIcon ? <TrendIcon className="size-3" /> : null}
                  {trend.label}
                </Badge>
                <Badge>{item.count}x</Badge>
              </div>
            </div>
            <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
              <p>avg {item.avgDurationMs}ms</p>
              <p>min {item.minDurationMs}ms</p>
              <p>max {item.maxDurationMs}ms</p>
              <p>{trend.detail}</p>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </Card>
  );
});

function perfWindowLabel(window: AdminMonitoring["frontendPerfWindow"]) {
  if (window === "24h") return "24 jam";
  if (window === "30d") return "30 hari";
  return "7 hari";
}

const UsageMonitoring = memo(function UsageMonitoring({ stats }: { stats: AdminMonitoring }) {
  const [eventFilter, setEventFilter] = useState<"all" | "frontend_page_load" | "generate" | "blocked">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "blocked" | "error">("all");
  const filteredRecentUsage = stats.recentUsage.filter((event) => {
    const matchesEvent =
      eventFilter === "all" ||
      (eventFilter === "blocked" ? event.status === "blocked" : event.eventType === eventFilter);
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    return matchesEvent && matchesStatus;
  });

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Generate per user hari ini</h2>
        <div className="grid gap-2">
          {stats.usageByUser.length === 0 && <p className="text-sm text-muted-foreground">Belum ada generate hari ini.</p>}
          {stats.usageByUser.map((item) => (
            <div key={item.userId ?? "anonymous"} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <span className="min-w-0 truncate text-sm text-muted-foreground">{item.name || item.username || "User terhapus"}</span>
              <Badge>{item.total}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Event terbaru</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select className="h-8 w-[160px]" value={eventFilter} onChange={(event) => setEventFilter(event.target.value as typeof eventFilter)}>
              <option value="all">Semua event</option>
              <option value="frontend_page_load">Frontend perf</option>
              <option value="generate">Generate</option>
              <option value="blocked">Blocked</option>
            </Select>
            <Select className="h-8 w-[140px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">Semua status</option>
              <option value="ok">OK</option>
              <option value="blocked">Blocked</option>
              <option value="error">Error</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          {filteredRecentUsage.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada event yang cocok dengan filter saat ini.</p>}
          {filteredRecentUsage.slice(0, 8).map((event) => (
            <div key={event.id} className="grid gap-1 rounded-md border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {event.eventType} - {event.status}
                </span>
                <Badge>{event.jenis ?? event.route ?? "umum"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {event.user?.name ?? "User terhapus"} - {new Date(event.createdAt).toLocaleString("id-ID")}
                {event.durationMs ? ` - ${event.durationMs}ms` : ""}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
});

const MetricsSummary = memo(function MetricsSummary({
  metrics,
  query,
  onQueryChange,
  slowOnly,
  onSlowOnlyChange
}: {
  metrics: AdminMonitoring["metrics"];
  query: string;
  onQueryChange: (value: string) => void;
  slowOnly: boolean;
  onSlowOnlyChange: (value: boolean) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(metricsPageSize);
  const [sortMode, setSortMode] = useState<MetricsSortMode>("slowest");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMetrics = metrics.filter((metric) => {
    const haystack = [
      metric.event,
      ...Object.entries(metric.dimensions).map(([key, value]) => `${key} ${String(value)}`),
      ...Object.entries(metric.averages).map(([key, value]) => `${key} ${value}`)
    ]
      .join(" ")
      .toLowerCase();
    const maxAverage = Math.max(0, ...Object.values(metric.averages));
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesSlow = !slowOnly || maxAverage >= 100;
    return matchesQuery && matchesSlow;
  });
  const sortedMetrics = [...filteredMetrics].sort((left, right) => {
    if (sortMode === "most-frequent") return right.count - left.count;
    if (sortMode === "event") return left.event.localeCompare(right.event);
    const leftMaxAverage = Math.max(0, ...Object.values(left.averages));
    const rightMaxAverage = Math.max(0, ...Object.values(right.averages));
    return rightMaxAverage - leftMaxAverage;
  });
  const visibleMetrics = sortedMetrics.slice(0, visibleCount);
  const hasMore = filteredMetrics.length > visibleCount;

  useEffect(() => {
    setVisibleCount(metricsPageSize);
  }, [metrics, normalizedQuery, slowOnly]);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Metric summary</h2>
        <Badge>{filteredMetrics.length}/{metrics.length} agregat</Badge>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Filter event atau dimensi" />
        <div className="grid gap-3 md:grid-cols-[auto_auto] md:justify-end">
          <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as MetricsSortMode)}>
            <option value="slowest">Paling lambat</option>
            <option value="most-frequent">Paling sering</option>
            <option value="event">Nama event</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input checked={slowOnly} onChange={(event) => onSlowOnlyChange(event.target.checked)} type="checkbox" />
            Hanya yang lambat
          </label>
        </div>
      </div>
      <div className="grid gap-2">
        {filteredMetrics.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada metric yang cocok dengan filter saat ini.</p>}
        {visibleMetrics.map((metric, index) => (
          <div key={`${metric.event}-${index}`} className="grid gap-1 rounded-md border border-border px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{metric.event}</span>
              <Badge>{metric.count}x</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              window {Math.round(metric.windowMs / 1000)}s
              {Object.entries(metric.dimensions).length
                ? ` - ${Object.entries(metric.dimensions)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(", ")}`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {Object.entries(metric.averages)
                .map(([key, value]) => `${key}: ${value}ms`)
                .join(" - ")}
            </p>
          </div>
        ))}
        {hasMore ? (
          <Button type="button" className="mt-2 bg-secondary text-secondary-foreground" onClick={() => setVisibleCount((current) => current + metricsPageSize)}>
            Tampilkan lebih banyak
          </Button>
        ) : null}
      </div>
    </Card>
  );
});

const MetricsHighlights = memo(function MetricsHighlights({ metrics }: { metrics: AdminMonitoring["metrics"] }) {
  const slowest = [...metrics]
    .map((metric) => ({
      metric,
      totalMs:
        metric.averages.avgTotalMs ??
        metric.averages.avgGenerateMs ??
        metric.averages.avgReviseMs ??
        metric.averages.avgDalilMs ??
        0
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 3);

  const dalilMetrics = metrics.filter((metric) => metric.event === "dalil.retrieve");
  const dalilTotal = dalilMetrics.reduce((sum, metric) => sum + metric.count, 0);
  const dalilHits = dalilMetrics.filter((metric) => metric.dimensions.cache === "hit").reduce((sum, metric) => sum + metric.count, 0);
  const dalilInflight = dalilMetrics.filter((metric) => metric.dimensions.cache === "inflight").reduce((sum, metric) => sum + metric.count, 0);
  const dalilHitRate = dalilTotal > 0 ? Math.round((dalilHits / dalilTotal) * 100) : 0;

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Hit rate cache dalil</p>
        <p className="mt-2 text-3xl font-semibold">{dalilHitRate}%</p>
        <p className="mt-2 text-xs text-muted-foreground">
          hit {dalilHits} - inflight {dalilInflight} - total {dalilTotal}
        </p>
      </Card>
      <Card className="p-4 xl:col-span-2">
        <h2 className="mb-4 text-lg font-semibold">Jalur paling lambat</h2>
        <div className="grid gap-2">
          {slowest.length === 0 && <p className="text-sm text-muted-foreground">Belum ada snapshot metric yang cukup untuk diringkas.</p>}
          {slowest.map(({ metric, totalMs }, index) => (
            <div key={`${metric.event}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{metric.event}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {Object.entries(metric.dimensions)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(", ") || "tanpa dimensi"}
                </p>
              </div>
              <Badge>{totalMs}ms</Badge>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
