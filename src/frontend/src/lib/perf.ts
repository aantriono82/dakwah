export type FrontendPerfMetric = {
  page: string;
  durationMs: number;
  recordedAt: string;
};

declare global {
  interface Window {
    __DAKWAH_FRONTEND_PERF__?: FrontendPerfMetric[];
  }
}

const pendingPageTransitions = new Map<string, number>();
const maxStoredMetrics = 50;
const productionSampleRate = 0.25;

function shouldLogPerf() {
  if (typeof window === "undefined") return false;
  return import.meta.env.DEV || window.localStorage.getItem("dakwah:perf") === "1";
}

export function isFrontendPerfDebugEnabled() {
  return shouldLogPerf();
}

function shouldSendPerfMetric() {
  if (typeof window === "undefined") return false;
  if (shouldLogPerf()) return true;
  return Math.random() < productionSampleRate;
}

function sendFrontendPerfMetric(metric: FrontendPerfMetric) {
  if (typeof window === "undefined" || !shouldSendPerfMetric()) return;

  void fetch("/api/stats/frontend-perf", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(metric)
  }).catch(() => null);
}

export function beginPageTransition(page: string) {
  if (typeof performance === "undefined") return;
  pendingPageTransitions.set(page, performance.now());
}

export function completePageTransition(page: string) {
  if (typeof performance === "undefined" || typeof window === "undefined") return null;
  const startedAt = pendingPageTransitions.get(page);
  if (startedAt === undefined) return null;
  pendingPageTransitions.delete(page);

  const metric: FrontendPerfMetric = {
    page,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    recordedAt: new Date().toISOString()
  };

  const current = window.__DAKWAH_FRONTEND_PERF__ ?? [];
  window.__DAKWAH_FRONTEND_PERF__ = [metric, ...current].slice(0, maxStoredMetrics);

  if (shouldLogPerf()) {
    console.info(`[frontend.page] page=${metric.page} durationMs=${metric.durationMs}`);
  }

  sendFrontendPerfMetric(metric);

  return metric;
}

export function getFrontendPerfMetrics() {
  if (typeof window === "undefined") return [];
  return window.__DAKWAH_FRONTEND_PERF__ ?? [];
}
