import { memo, useCallback, useEffect, useState } from "react";
import { IconChevronDown, IconChevronUp, IconTrash } from "../components/icons";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import { completePageTransition, getFrontendPerfMetrics, isFrontendPerfDebugEnabled, type FrontendPerfMetric } from "../lib/perf";
import { api } from "../lib/utils";
import type { User } from "../types";

type AdminMonitoring = {
  todayGenerates: number;
  todayExports: number;
  blockedGenerates: number;
  streamHealth: {
    sampleCount: number;
    avgFirstChunkMs: number;
    validationWarningRate: number;
    fallbackRate: number;
    policyPassRate: {
      stream: number;
      firstPass: number;
      final: number;
    };
  };
  streamHealthByModel: Array<{
    streamProvider: string;
    streamModel: string;
    sampleCount: number;
    avgFirstChunkMs: number;
    validationWarningRate: number;
    fallbackRate: number;
    policyPassRate: {
      stream: number;
      firstPass: number;
      final: number;
    };
  }>;
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
type MonitoringView = "overview" | "usage" | "performance" | "metrics";
type MonitoringPanelId =
  | "stats-today-generates"
  | "stats-today-exports"
  | "stats-blocked-generates"
  | "stats-stream-first-chunk"
  | "stats-stream-validation-warning"
  | "stats-stream-fallback"
  | "stream-health-breakdown"
  | "frontend-aggregate-summary"
  | "frontend-session-summary"
  | "usage-monitoring"
  | "metrics-highlights"
  | "metrics-summary";

const adminMonitoringRefreshIntervalMs = 60_000;
const metricsPageSize = 12;
const monitoringHiddenPanelsStorageKey = "admin-monitoring-hidden-panels";

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
  const [hiddenPanels, setHiddenPanels] = useState<MonitoringPanelId[]>([]);
  const [activeView, setActiveView] = useState<MonitoringView>("overview");

  useEffect(() => {
    completePageTransition("AdminMonitoring");
    setFrontendPerfEnabled(isFrontendPerfDebugEnabled());
    setFrontendPerfMetrics(getFrontendPerfMetrics());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedPanels = window.localStorage.getItem(monitoringHiddenPanelsStorageKey);
    if (!savedPanels) return;
    try {
      const parsed = JSON.parse(savedPanels);
      if (Array.isArray(parsed)) {
        setHiddenPanels(parsed.filter((item): item is MonitoringPanelId => typeof item === "string"));
      }
    } catch {
      window.localStorage.removeItem(monitoringHiddenPanelsStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(monitoringHiddenPanelsStorageKey, JSON.stringify(hiddenPanels));
  }, [hiddenPanels]);

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

  const hidePanel = useCallback((panelId: MonitoringPanelId) => {
    setHiddenPanels((current) => (current.includes(panelId) ? current : [...current, panelId]));
  }, []);

  const restorePanels = useCallback(() => {
    setHiddenPanels([]);
  }, []);

  const isHidden = useCallback((panelId: MonitoringPanelId) => hiddenPanels.includes(panelId), [hiddenPanels]);
  const statCards = [
    { id: "stats-today-generates" as const, label: "Generate hari ini", value: monitoring?.todayGenerates ?? 0 },
    { id: "stats-today-exports" as const, label: "Export hari ini", value: monitoring?.todayExports ?? 0 },
    { id: "stats-blocked-generates" as const, label: "Generate diblokir", value: monitoring?.blockedGenerates ?? 0 },
    {
      id: "stats-stream-first-chunk" as const,
      label: `Avg first chunk (${perfWindowLabel(perfWindow)})`,
      value: monitoring ? `${monitoring.streamHealth.avgFirstChunkMs}ms` : "0ms"
    },
    {
      id: "stats-stream-validation-warning" as const,
      label: `Validation warning (${perfWindowLabel(perfWindow)})`,
      value: monitoring ? `${monitoring.streamHealth.validationWarningRate}%` : "0%"
    },
    {
      id: "stats-stream-fallback" as const,
      label: `Fallback rate (${perfWindowLabel(perfWindow)})`,
      value: monitoring ? `${monitoring.streamHealth.fallbackRate}%` : "0%"
    }
  ].filter((item) => !isHidden(item.id));
  const monitoringViews: Array<{ id: MonitoringView; label: string; meta: string }> = [
    { id: "overview", label: "Overview", meta: "KPI dan highlight" },
    { id: "usage", label: "Usage", meta: "Pemakaian dan event" },
    { id: "performance", label: "Performance", meta: "Frontend timing" },
    { id: "metrics", label: "Metrics", meta: "Agregat dan filter" }
  ];

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
          {hiddenPanels.length ? (
            <Button type="button" className="h-8 bg-secondary px-3 text-xs text-secondary-foreground" onClick={restorePanels}>
              Reset tampilan
            </Button>
          ) : null}
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="h-fit p-3">
          <div className="mb-3 border-b border-border pb-3">
            <p className="text-sm font-semibold">Workspace monitoring</p>
            <p className="mt-1 text-xs text-muted-foreground">Masuk ke domain observability yang relevan, bukan melihat semua kartu sekaligus.</p>
          </div>
          <nav className="grid gap-2">
            {monitoringViews.map((item) => (
              <MonitoringNavButton
                key={item.id}
                active={activeView === item.id}
                label={item.label}
                meta={item.meta}
                onClick={() => setActiveView(item.id)}
              />
            ))}
          </nav>
        </Card>
        <div className="grid gap-4 min-w-0">
          {message ? <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
          {activeView === "overview" ? (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Monitoring overview</h3>
                    <p className="mt-1 text-sm text-muted-foreground">KPI utama dan highlight sistem untuk penilaian cepat.</p>
                  </div>
                  <Badge>Overview</Badge>
                </div>
              </Card>
              {statCards.length ? (
                <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                  {statCards.map((item) => (
                    <Stat key={item.id} label={item.label} value={item.value} onDismiss={() => hidePanel(item.id)} />
                  ))}
                </section>
              ) : null}
              {monitoring && monitoring.streamHealth.sampleCount > 0 ? (
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Stream generate health</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {monitoring.streamHealth.sampleCount} sampel stream generate tercatat pada window {perfWindowLabel(perfWindow)}.
                      </p>
                    </div>
                    <Badge>{monitoring.streamHealth.sampleCount} sampel</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border border-border px-3 py-3">
                      <p className="text-sm text-muted-foreground">Avg first chunk</p>
                      <p className="mt-2 text-lg font-semibold">{monitoring.streamHealth.avgFirstChunkMs}ms</p>
                    </div>
                    <div className="rounded-md border border-border px-3 py-3">
                      <p className="text-sm text-muted-foreground">Validation warning rate</p>
                      <p className="mt-2 text-lg font-semibold">{monitoring.streamHealth.validationWarningRate}%</p>
                    </div>
                    <div className="rounded-md border border-border px-3 py-3">
                      <p className="text-sm text-muted-foreground">Fallback rate</p>
                      <p className="mt-2 text-lg font-semibold">{monitoring.streamHealth.fallbackRate}%</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border border-border px-3 py-3">
                      <p className="text-sm text-muted-foreground">Policy pass: stream</p>
                      <p className="mt-2 text-lg font-semibold">{monitoring.streamHealth.policyPassRate.stream}%</p>
                    </div>
                    <div className="rounded-md border border-border px-3 py-3">
                      <p className="text-sm text-muted-foreground">Policy pass: first pass</p>
                      <p className="mt-2 text-lg font-semibold">{monitoring.streamHealth.policyPassRate.firstPass}%</p>
                    </div>
                    <div className="rounded-md border border-border px-3 py-3">
                      <p className="text-sm text-muted-foreground">Policy pass: final</p>
                      <p className="mt-2 text-lg font-semibold">{monitoring.streamHealth.policyPassRate.final}%</p>
                    </div>
                  </div>
                </Card>
              ) : null}
              {monitoring?.streamHealthByModel?.length && !isHidden("stream-health-breakdown") ? (
                <StreamHealthBreakdown
                  items={monitoring.streamHealthByModel}
                  windowLabel={perfWindowLabel(perfWindow)}
                  onDismiss={() => hidePanel("stream-health-breakdown")}
                />
              ) : null}
              {monitoring?.metrics?.length && !isHidden("metrics-highlights") ? (
                <MetricsHighlights metrics={monitoring.metrics} onDismiss={() => hidePanel("metrics-highlights")} />
              ) : null}
            </>
          ) : null}
          {activeView === "usage" ? (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Usage monitoring</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Lihat pemakaian per user dan event terbaru dalam area khusus.</p>
                  </div>
                  <Badge>{monitoring?.recentUsage.length ?? 0} event</Badge>
                </div>
              </Card>
              {monitoring && !isHidden("usage-monitoring") ? <UsageMonitoring stats={monitoring} onDismiss={() => hidePanel("usage-monitoring")} /> : null}
            </>
          ) : null}
          {activeView === "performance" ? (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Performance monitoring</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Pisahkan analisis performa frontend dari data usage dan metrics agregat.</p>
                  </div>
                  <Badge>{perfWindowLabel(perfWindow)}</Badge>
                </div>
              </Card>
              {monitoring?.frontendPerfSummary?.length && !isHidden("frontend-aggregate-summary") ? (
                <FrontendPerfAggregateSummary items={monitoring.frontendPerfSummary} windowLabel={perfWindowLabel(perfWindow)} onDismiss={() => hidePanel("frontend-aggregate-summary")} />
              ) : null}
              {frontendPerfEnabled && !isHidden("frontend-session-summary") ? (
                <FrontendPerfSummary metrics={frontendPerfMetrics} onRefresh={() => setFrontendPerfMetrics(getFrontendPerfMetrics())} onDismiss={() => hidePanel("frontend-session-summary")} />
              ) : null}
            </>
          ) : null}
          {activeView === "metrics" ? (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Metrics explorer</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Fokuskan filter dan agregasi metric pada workspace tersendiri.</p>
                  </div>
                  <Badge>{monitoring?.metrics.length ?? 0} agregat</Badge>
                </div>
              </Card>
              {monitoring?.metrics?.length && !isHidden("metrics-summary") ? (
                <MetricsSummary
                  metrics={monitoring.metrics}
                  query={metricQuery}
                  onQueryChange={setMetricQuery}
                  slowOnly={slowOnly}
                  onSlowOnlyChange={setSlowOnly}
                  onDismiss={() => hidePanel("metrics-summary")}
                />
              ) : null}
            </>
          ) : null}
          {hiddenPanels.length >= 8 ? (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Semua panel monitoring disembunyikan.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const FrontendPerfSummary = memo(function FrontendPerfSummary({
  metrics,
  onRefresh,
  onDismiss
}: {
  metrics: FrontendPerfMetric[];
  onRefresh: () => void;
  onDismiss: () => void;
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
        <div className="flex items-center gap-2">
          <Button type="button" className="h-8 bg-secondary px-3 text-xs text-secondary-foreground" onClick={onRefresh}>
            Refresh snapshot
          </Button>
          <DismissPanelButton onClick={onDismiss} label="Hapus card frontend timing" />
        </div>
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
  windowLabel,
  onDismiss
}: {
  items: AdminMonitoring["frontendPerfSummary"];
  windowLabel: string;
  onDismiss: () => void;
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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Frontend page load summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">Agregat sampling backend untuk {windowLabel} terakhir.</p>
        </div>
        <DismissPanelButton onClick={onDismiss} label="Hapus card frontend summary" />
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

const UsageMonitoring = memo(function UsageMonitoring({ stats, onDismiss }: { stats: AdminMonitoring; onDismiss: () => void }) {
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Generate per user hari ini</h2>
          <DismissPanelButton onClick={onDismiss} label="Hapus section usage monitoring" />
        </div>
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
  onSlowOnlyChange,
  onDismiss
}: {
  metrics: AdminMonitoring["metrics"];
  query: string;
  onQueryChange: (value: string) => void;
  slowOnly: boolean;
  onSlowOnlyChange: (value: boolean) => void;
  onDismiss: () => void;
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
        <div className="flex items-center gap-2">
          <Badge>{filteredMetrics.length}/{metrics.length} agregat</Badge>
          <DismissPanelButton onClick={onDismiss} label="Hapus card metric summary" />
        </div>
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

const MetricsHighlights = memo(function MetricsHighlights({ metrics, onDismiss }: { metrics: AdminMonitoring["metrics"]; onDismiss: () => void }) {
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
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">Hit rate cache dalil</p>
          <DismissPanelButton onClick={onDismiss} label="Hapus section metrics highlights" />
        </div>
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

const StreamHealthBreakdown = memo(function StreamHealthBreakdown({
  items,
  windowLabel,
  onDismiss
}: {
  items: AdminMonitoring["streamHealthByModel"];
  windowLabel: string;
  onDismiss: () => void;
}) {
  const sortedItems = [...items].sort((left, right) => {
    if (right.sampleCount !== left.sampleCount) return right.sampleCount - left.sampleCount;
    return right.avgFirstChunkMs - left.avgFirstChunkMs;
  });

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Breakdown stream per provider/model</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sampel stream generate untuk {windowLabel} terakhir.</p>
        </div>
        <DismissPanelButton onClick={onDismiss} label="Hapus card breakdown stream" />
      </div>
      <div className="grid gap-2">
        {sortedItems.map((item) => (
          <div key={`${item.streamProvider}-${item.streamModel}`} className="rounded-md border border-border px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.streamModel}</p>
                <p className="text-xs text-muted-foreground">{item.streamProvider}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{item.sampleCount}x</Badge>
                <Badge>{item.avgFirstChunkMs}ms</Badge>
                <Badge>{item.validationWarningRate}% warning</Badge>
                <Badge>{item.fallbackRate}% fallback</Badge>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <p>stream pass {item.policyPassRate.stream}%</p>
              <p>first pass {item.policyPassRate.firstPass}%</p>
              <p>final pass {item.policyPassRate.final}%</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

function Stat({ label, value, onDismiss }: { label: string; value: string | number; onDismiss: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <DismissPanelButton onClick={onDismiss} label={`Hapus card ${label}`} />
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function DismissPanelButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-destructive"
    >
      <IconTrash className="size-4" />
    </button>
  );
}

function MonitoringNavButton({
  active,
  label,
  meta,
  onClick
}: {
  active: boolean;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-[72px] w-full flex-col items-start justify-center rounded-md border px-3 py-2 text-left transition",
        active ? "border-primary/30 bg-primary/10 text-foreground" : "border-transparent bg-background text-foreground hover:bg-accent"
      ].join(" ")}
    >
      <span className="font-medium text-sm">{label}</span>
      <span className="mt-1 text-xs text-muted-foreground">{meta}</span>
    </button>
  );
}
