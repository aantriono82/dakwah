import type React from "react";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Login } from "./components/AuthPanel";
import { MainLayout } from "./components/AppShell";
import {
  IconUser,
  IconHeart,
  IconLogout,
  IconBookmark,
  IconInfo,
  IconShield,
  IconAdmin,
} from "./components/icons";
import { Badge, Button, Card } from "./components/ui";
import { beginPageTransition } from "./lib/perf";
import { useNaskahSearch } from "./lib/useNaskahSearch";
import { api, cn, jenisOptions, type JenisId } from "./lib/utils";
import type { Naskah, Template, User } from "./types";

const loadAdminModule = () => import("./pages/Admin");
const loadAdminMonitoringModule = () => import("./pages/AdminMonitoring");
const loadHistoryModule = () => import("./pages/History");
const loadGenerateModule = () => import("./pages/Generate");
const Admin = lazy(async () => {
  const module = await loadAdminModule();
  return { default: module.Admin };
});
const AdminMonitoring = lazy(async () => {
  const module = await loadAdminMonitoringModule();
  return { default: module.AdminMonitoringPage };
});
const Dashboard = lazy(async () => {
  const module = await import("./pages/Dashboard");
  return { default: module.Dashboard };
});
const Generate = lazy(async () => {
  const module = await loadGenerateModule();
  return { default: module.Generate };
});
const History = lazy(async () => {
  const module = await loadHistoryModule();
  return { default: module.History };
});
const Templates = lazy(async () => {
  const module = await import("./pages/Templates");
  return { default: module.Templates };
});

type TabId = "home" | "about" | "generate" | "history" | "templates" | "admin" | "admin-monitoring" | "disclaimer" | "more";

const generatePathByJenis: Record<JenisId, string> = {
  "khutbah-jumat": "/khutbah/jumat",
  "idul-fitri": "/khutbah/idul-fitri",
  "idul-adha": "/khutbah/idul-adha",
  nikah: "/khutbah/nikah",
  ceramah: "/ceramah",
  kultum: "/kultum"
};

const tabPathById: Record<Exclude<TabId, "generate">, string> = {
  home: "/",
  about: "/about",
  history: "/riwayat",
  templates: "/templates",
  admin: "/admin",
  "admin-monitoring": "/admin/monitoring",
  disclaimer: "/disclaimer",
  more: "/lainnya"
};

function routeFromPath(pathname: string): { tab: TabId; jenis?: JenisId } {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const generateEntry = Object.entries(generatePathByJenis).find(([, path]) => path === normalizedPath);

  if (generateEntry) return { tab: "generate", jenis: generateEntry[0] as JenisId };
  if (normalizedPath === "/generate") return { tab: "generate", jenis: "khutbah-jumat" };
  if (normalizedPath === "/about") return { tab: "about" };
  if (normalizedPath === "/riwayat" || normalizedPath === "/history") return { tab: "history" };
  if (normalizedPath === "/templates") return { tab: "templates" };
  if (normalizedPath === "/admin/monitoring") return { tab: "admin-monitoring" };
  if (normalizedPath === "/admin") return { tab: "admin" };
  if (normalizedPath === "/disclaimer") return { tab: "disclaimer" };
  if (normalizedPath === "/lainnya" || normalizedPath === "/more") return { tab: "more" };

  return { tab: "home" };
}

const startupRoute = typeof window === "undefined" ? { tab: "home" as TabId } : routeFromPath(window.location.pathname);
if (startupRoute.tab === "history") void loadHistoryModule();
if (startupRoute.tab === "generate") void loadGenerateModule();
if (startupRoute.tab === "admin-monitoring") void loadAdminMonitoringModule();
if (startupRoute.tab === "admin") void loadAdminModule();

function pushPath(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState(null, "", path);
  }
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const initialRoute = startupRoute;
  const [activeTab, setActiveTab] = useState<TabId>(initialRoute.tab);
  const [initialGenerateJenis, setInitialGenerateJenis] = useState<JenisId>(initialRoute.jenis ?? "khutbah-jumat");
  const [templateToUse, setTemplateToUse] = useState<Template | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [naskahSearch, setNaskahSearch] = useState("");
  const [selectedNaskahId, setSelectedNaskahId] = useState("");
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const { items: naskahSearchItems, loading: naskahSearchLoading } = useNaskahSearch(user, naskahSearch);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    api<{ user: User | null }>("/api/auth/session")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    function syncRoute() {
      const route = routeFromPath(window.location.pathname);
      setActiveTab(route.tab);
      if (route.jenis) setInitialGenerateJenis(route.jenis);
    }

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const openGenerate = useCallback((jenis: JenisId = "khutbah-jumat") => {
    beginPageTransition("Generate");
    setShowAccountPanel(false);
    setInitialGenerateJenis(jenis);
    setActiveTab("generate");
    pushPath(generatePathByJenis[jenis]);
  }, []);

  const openTab = useCallback((tab: Exclude<TabId, "generate">) => {
    if (tab === "history") beginPageTransition("History");
    if (tab === "admin-monitoring") beginPageTransition("AdminMonitoring");
    setShowAccountPanel(false);
    setActiveTab(tab);
    pushPath(tabPathById[tab]);
  }, []);

  const useTemplate = useCallback((template: Template) => {
    void loadGenerateModule();
    beginPageTransition("Generate");
    setShowAccountPanel(false);
    setTemplateToUse(template);
    setInitialGenerateJenis(template.jenis);
    setActiveTab("generate");
    pushPath(generatePathByJenis[template.jenis]);
  }, []);

  const clearTemplate = useCallback(() => setTemplateToUse(null), []);
  const prefetchAdminMonitoring = useCallback(() => {
    void loadAdminMonitoringModule();
  }, []);
  const prefetchHistory = useCallback(() => {
    void loadHistoryModule();
  }, []);
  const prefetchGenerate = useCallback(() => {
    void loadGenerateModule();
  }, []);

  useEffect(() => {
    if (!naskahSearch.trim()) return;
    prefetchHistory();
  }, [naskahSearch, prefetchHistory]);

  const handleLogout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    setShowAccountPanel(false);
    setUser(null);
  }, []);

  if (authLoading) return <ShellLoader />;
  if (!user) return <Login onLogin={setUser} dark={dark} setDark={setDark} />;

  return (
    <MainLayout
      activeTab={activeTab}
      activeJenis={initialGenerateJenis}
      user={user}
      setActiveTab={openTab}
      onOpenGenerate={openGenerate}
      onPrefetchGenerate={prefetchGenerate}
      dark={dark}
      setDark={setDark}
      naskahSearch={naskahSearch}
      onNaskahSearchChange={setNaskahSearch}
      naskahSearchItems={naskahSearchItems}
      naskahSearchLoading={naskahSearchLoading}
      showAccountPanel={showAccountPanel}
      onToggleAccountPanel={() => setShowAccountPanel((value) => !value)}
      onCloseAccountPanel={() => setShowAccountPanel(false)}
      onSelectNaskah={(item) => {
        prefetchHistory();
        setSelectedNaskahId(item.id);
        setNaskahSearch(item.title);
        openTab("history");
      }}
      onPrefetchHistory={prefetchHistory}
      onLogout={handleLogout}
    >
      {activeTab === "home" && (
        <PageSuspense>
          <Dashboard user={user} onCreate={openGenerate} onPrefetchGenerate={prefetchGenerate} />
        </PageSuspense>
      )}
      {activeTab === "about" && (
        <InfoPage
          title="About"
          body={[
            "Dakwah adalah aplikasi web yang dirancang untuk membantu ustaz, khatib, dai, dan pengelola kegiatan keislaman menyiapkan naskah dakwah dengan lebih terarah, rapi, dan efisien. Aplikasi ini mendukung pembuatan berbagai jenis naskah, mulai dari Khutbah Jumat, Khutbah Idul Fitri, Khutbah Idul Adha, Khutbah Nikah, Ceramah Umum, hingga Kultum.",
            "Melalui bantuan AI, pengguna dapat menyusun naskah berdasarkan tema, durasi, bahasa, audiens, suasana penyampaian, dan kebutuhan acara. Hasil naskah dapat ditinjau secara langsung, disesuaikan kembali, disimpan sebagai riwayat, digunakan ulang melalui template, serta diekspor ke format PDF atau DOCX.",
            "Dakwah tidak dimaksudkan untuk menggantikan peran keilmuan, ketelitian, dan kebijaksanaan seorang dai. Aplikasi ini hadir sebagai alat bantu penyusunan awal agar proses menulis menjadi lebih cepat dan terstruktur. Setiap naskah tetap perlu ditinjau oleh pengguna, terutama dalam memastikan ketepatan dalil, kesesuaian konteks jamaah, adab penyampaian, dan kedalaman pesan dakwah.",
            "Dengan fitur penyimpanan naskah, template favorit, riwayat penggunaan, mode gelap, tampilan responsif, serta dukungan akun pengguna dan admin, Dakwah menjadi ruang kerja digital yang praktis untuk menyiapkan materi dakwah secara konsisten. Tujuannya sederhana: membantu para penyampai dakwah fokus pada substansi pesan, sementara proses teknis penyusunan naskah menjadi lebih ringan, tertata, dan mudah dikelola."
          ]}
        />
      )}
      {activeTab === "generate" && (
        <PageSuspense>
          <Generate
            initialJenis={initialGenerateJenis}
            template={templateToUse}
            onTemplateApplied={clearTemplate}
            onJenisChange={(jenis) => {
              setInitialGenerateJenis(jenis);
              pushPath(generatePathByJenis[jenis]);
            }}
          />
        </PageSuspense>
      )}
      {activeTab === "history" && (
        <PageSuspense>
          <History user={user} initialQuery={naskahSearch} selectedId={selectedNaskahId} />
        </PageSuspense>
      )}
      {activeTab === "templates" && (
        <PageSuspense>
          <Templates onUse={useTemplate} onPrefetchGenerate={prefetchGenerate} />
        </PageSuspense>
      )}
      {activeTab === "admin" && user.role === "admin" && (
        <PageSuspense>
          <Admin onOpenMonitoring={() => openTab("admin-monitoring")} onPrefetchMonitoring={prefetchAdminMonitoring} />
        </PageSuspense>
      )}
      {activeTab === "admin-monitoring" && user.role === "admin" && (
        <PageSuspense>
          <AdminMonitoring onBack={() => openTab("admin")} />
        </PageSuspense>
      )}
      {activeTab === "disclaimer" && (
        <InfoPage
          title="Disclaimer"
          body={[
            "Dakwah adalah alat bantu penyusunan naskah dakwah berbasis AI. Seluruh teks yang dihasilkan, termasuk khutbah, ceramah, kultum, nasihat pernikahan, doa, dan materi pendukung lainnya, bersifat draf awal yang perlu diperiksa kembali sebelum digunakan atau disampaikan kepada jamaah.",
            "Pengguna bertanggung jawab penuh untuk memastikan ketepatan dalil, kebenaran terjemahan, kesesuaian penafsiran, adab penyampaian, serta relevansi isi dengan kondisi jamaah dan tempat acara. Periksa kembali ayat Al-Quran, hadis, kutipan ulama, istilah fikih, dan informasi faktual yang muncul dalam naskah.",
            "Dakwah tidak menggantikan peran ustaz, khatib, dai, lembaga keagamaan, atau otoritas keilmuan Islam. Aplikasi ini juga tidak dimaksudkan sebagai sumber fatwa, rujukan hukum syar'i final, atau penentu keputusan keagamaan. Untuk persoalan akidah, ibadah, muamalah, keluarga, dan masalah sensitif lainnya, rujuklah kepada ulama atau lembaga yang kompeten.",
            "Hasil naskah dapat mengandung kekeliruan, kekurangan konteks, pengulangan, pilihan kata yang kurang tepat, atau sudut pandang yang belum sesuai dengan kebutuhan pengguna. Karena itu, lakukan penyuntingan akhir agar pesan dakwah tetap santun, akurat, proporsional, dan membawa maslahat.",
            "Dengan menggunakan Dakwah, pengguna memahami bahwa aplikasi ini membantu mempercepat proses penulisan dan pengelolaan naskah, sementara tanggung jawab akhir atas isi, penyampaian, dan dampak materi dakwah tetap berada pada pengguna."
          ]}
        />
      )}
      {activeTab === "more" && (
        <MoreMenuPanel
          user={user}
          setActiveTab={openTab}
          onLogout={handleLogout}
        />
      )}
    </MainLayout>
  );
}

function MoreMenuPanel({
  user,
  setActiveTab,
  onLogout
}: {
  user: User;
  setActiveTab: (tab: Exclude<TabId, "generate">) => void;
  onLogout: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-md py-6">
      <Card className="p-4">
        {/* User Info header */}
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <IconUser className="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-lg">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.username}</p>
          </div>
          <Badge className={cn(user.role === "admin" && "border-primary/30 bg-primary/10 text-primary")}>
            {user.role}
          </Badge>
        </div>

        {/* Menu Items */}
        <div className="grid gap-2">
          <button
            onClick={() => setActiveTab("templates")}
            className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-foreground"
            type="button"
            aria-label="Buka template naskah"
          >
            <div className="grid size-10 place-items-center rounded-full bg-indigo-500/10 text-indigo-500">
              <IconBookmark className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Template Naskah</p>
              <p className="text-xs text-muted-foreground truncate font-normal">Kelola dan gunakan template favorit Anda</p>
            </div>
          </button>

          {user.role === "admin" && (
            <button
              onClick={() => setActiveTab("admin")}
              className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-foreground"
              type="button"
              aria-label="Buka admin"
            >
              <div className="grid size-10 place-items-center rounded-full bg-blue-500/10 text-blue-500">
                <IconAdmin className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Buka Admin</p>
                <p className="text-xs text-muted-foreground truncate font-normal">Panel kelola pengguna dan statistik</p>
              </div>
            </button>
          )}

          <button
            onClick={() => setActiveTab("about")}
            className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-foreground"
            type="button"
            aria-label="Buka informasi aplikasi"
          >
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <IconInfo className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Tentang Dakwah</p>
              <p className="text-xs text-muted-foreground truncate font-normal">Informasi tujuan dan batas penggunaan aplikasi</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("disclaimer")}
            className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-foreground"
            type="button"
            aria-label="Buka disclaimer"
          >
            <div className="grid size-10 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <IconShield className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Disclaimer</p>
              <p className="text-xs text-muted-foreground truncate font-normal">Batasan AI dan tanggung jawab peninjauan naskah</p>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-destructive"
            type="button"
            aria-label="Keluar dari akun"
          >
            <div className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <IconLogout className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Keluar</p>
              <p className="text-xs text-destructive/80 truncate font-normal">Keluar dari sesi akun saat ini</p>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}

function ShellLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Memuat Dakwah...</div>;
}

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">Memuat halaman...</div>}
    >
      {children}
    </Suspense>
  );
}

function InfoPage({ title, body }: { title: string; body: string | string[] }) {
  const paragraphs = Array.isArray(body) ? body : [body];

  return (
    <section className="mx-auto grid min-h-[420px] w-full max-w-3xl content-center py-10 sm:py-14">
      <div className="border-y border-border py-8 sm:py-10">
        <p className="text-sm font-medium uppercase text-primary">{title}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">{title}</h1>
        <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
