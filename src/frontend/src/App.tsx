import type React from "react";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import {
  IconChevronDown,
  IconUser,
  IconEye,
  IconEyeOff,
  IconGithub,
  IconHeart,
  IconLock,
  IconLogout,
  IconMail,
  IconMoon,
  IconRefresh,
  IconSearch,
  IconSun,
  IconX,
  IconMosque,
  IconScroll,
  IconHistory,
  IconBookmark,
  IconInfo,
  IconShield,
  IconCrescentStar,
  IconAdmin,
  IconDakwahLogo,
} from "./components/icons";
import { Badge, Button, Card, IconButton, Input } from "./components/ui";
import { beginPageTransition } from "./lib/perf";
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
type CaptchaChallenge = { token: string; question: string; noise: Array<{ left: number; top: number; width: number; rotate: number }> };

const authCardClass =
  "relative w-full max-w-[590px] rounded-lg border border-border bg-card px-5 py-8 text-card-foreground shadow-2xl sm:px-9 sm:py-11";

const khutbahItems: Array<{ label: string; jenis: JenisId }> = [
  { label: "Jumat", jenis: "khutbah-jumat" },
  { label: "Idul Fitri", jenis: "idul-fitri" },
  { label: "Idul Adha", jenis: "idul-adha" },
  { label: "Nikah", jenis: "nikah" }
];

const khutbahJenis = new Set<JenisId>(khutbahItems.map((item) => item.jenis));
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

function pushPath(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState(null, "", path);
  }
}

function jenisLabelById(jenis: JenisId) {
  return jenisOptions.find((item) => item.id === jenis)?.label ?? jenis;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const initialRoute = routeFromPath(window.location.pathname);
  const [activeTab, setActiveTab] = useState<TabId>(initialRoute.tab);
  const [initialGenerateJenis, setInitialGenerateJenis] = useState<JenisId>(initialRoute.jenis ?? "khutbah-jumat");
  const [templateToUse, setTemplateToUse] = useState<Template | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [naskahSearch, setNaskahSearch] = useState("");
  const [naskahSearchItems, setNaskahSearchItems] = useState<Naskah[]>([]);
  const [naskahSearchLoading, setNaskahSearchLoading] = useState(false);
  const [selectedNaskahId, setSelectedNaskahId] = useState("");
  const [showAccountPanel, setShowAccountPanel] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
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

  useEffect(() => {
    if (!user) {
      setNaskahSearchItems([]);
      setNaskahSearchLoading(false);
      return;
    }
    const query = naskahSearch.trim();
    if (!query) {
      setNaskahSearchItems([]);
      setNaskahSearchLoading(false);
      return;
    }

    let cancelled = false;
    setNaskahSearchLoading(true);
    const timer = window.setTimeout(() => {
      api<{ data: Naskah[] }>(`/api/naskah?summary=1&page=1&pageSize=6&q=${encodeURIComponent(query)}`)
        .then((data) => {
          if (cancelled) return;
          setNaskahSearchItems(data.data);
        })
        .catch(() => {
          if (cancelled) return;
          setNaskahSearchItems([]);
        })
        .finally(() => {
          if (!cancelled) setNaskahSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [naskahSearch, user]);

  const openGenerate = useCallback((jenis: JenisId = "khutbah-jumat") => {
    beginPageTransition("Generate");
    setInitialGenerateJenis(jenis);
    setActiveTab("generate");
    pushPath(generatePathByJenis[jenis]);
  }, []);

  const openTab = useCallback((tab: Exclude<TabId, "generate">) => {
    if (tab === "history") beginPageTransition("History");
    if (tab === "admin-monitoring") beginPageTransition("AdminMonitoring");
    setActiveTab(tab);
    pushPath(tabPathById[tab]);
  }, []);

  const useTemplate = useCallback((template: Template) => {
    void loadGenerateModule();
    beginPageTransition("Generate");
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
          setActiveTab={setActiveTab}
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
  setActiveTab: (tab: TabId) => void;
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
          >
            <div className="grid size-10 place-items-center rounded-full bg-indigo-500/10 text-indigo-500">
              <IconBookmark className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Template Naskah</p>
              <p className="text-xs text-muted-foreground truncate font-normal">Kelola dan gunakan template favorit Anda</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-foreground"
            type="button"
          >
            <div className="grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
              <IconInfo className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Tentang Aplikasi</p>
              <p className="text-xs text-muted-foreground truncate font-normal">Informasi umum mengenai platform Dakwah</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("disclaimer")}
            className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-foreground"
            type="button"
          >
            <div className="grid size-10 place-items-center rounded-full bg-amber-500/10 text-amber-500">
              <IconShield className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Disclaimer</p>
              <p className="text-xs text-muted-foreground truncate font-normal">Batasan tanggung jawab penggunaan AI</p>
            </div>
          </button>

          {user.role === "admin" && (
            <button
              onClick={() => setActiveTab("admin")}
              className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-foreground"
              type="button"
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
            onClick={onLogout}
            className="flex items-center gap-4 w-full rounded-lg p-3 text-left transition hover:bg-accent text-destructive"
            type="button"
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

function Login({
  onLogin,
  dark,
  setDark,
  variant = "page",
  onClose
}: {
  onLogin: (user: User) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  variant?: "page" | "modal";
  onClose?: () => void;
}) {
  const [username, setUsername] = useState(() => (import.meta.env.DEV ? "admin" : ""));
  const [password, setPassword] = useState(() => (import.meta.env.DEV ? "admin123" : ""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const initialResetToken =
    window.location.pathname === "/reset-password" ? new URLSearchParams(window.location.search).get("token") ?? "" : "";
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [authPanel, setAuthPanel] = useState<"login" | "register" | "forgot" | "reset" | "terms" | "privacy">(
    initialResetToken ? "reset" : "login"
  );
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onLogin(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  function showSocialLoginNotice(provider: "Google" | "GitHub") {
    setError("");
    setNotice(`Login dengan ${provider} belum dikonfigurasi. Gunakan email dan kata sandi, atau hubungi admin untuk mengaktifkan OAuth ${provider}.`);
  }

  const content =
    authPanel === "login" ? (
    <div className={authCardClass}>
      {onClose && (
        <button
          className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-md text-foreground transition hover:bg-accent"
          onClick={onClose}
          type="button"
          aria-label="Tutup"
        >
          <IconX className="size-6" />
        </button>
      )}
      <div className="mb-7 text-center">
        <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Masuk</h1>
        <p className="mt-3 text-base text-foreground sm:text-lg">Akses lebih banyak fitur pembelajaran</p>
        <p className="mt-5 text-base text-muted-foreground sm:text-lg">
          Belum punya akun?{" "}
          <button
            className="font-bold text-primary"
            onClick={() => {
              setError("");
              setNotice("");
              setAuthPanel("register");
            }}
            type="button"
          >
            Daftar
          </button>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Pilihan masuk cepat">
        <SocialLoginButton label="Google" onClick={() => showSocialLoginNotice("Google")}>
          <span className="text-3xl font-black">
            <span className="text-[#4285f4]">G</span>
          </span>
        </SocialLoginButton>
        <SocialLoginButton label="GitHub" onClick={() => showSocialLoginNotice("GitHub")}>
          <IconGithub className="size-9 text-foreground" />
        </SocialLoginButton>
      </div>

      {notice && <p className="mt-4 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p>}

      <div className="my-7 flex items-center gap-5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-lg text-foreground">atau</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <label className="relative block">
          <IconMail className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-16 rounded-md px-5 pl-16 text-lg"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Email"
            autoComplete="username"
          />
        </label>
        <label className="relative block">
          <IconLock className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-16 rounded-md px-5 pl-16 pr-16 text-lg"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Kata Sandi"
            autoComplete="current-password"
          />
          <button
            className="absolute right-5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground transition hover:bg-accent"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <IconEyeOff className="size-6" /> : <IconEye className="size-6" />}
          </button>
        </label>
        <button
          className="w-max text-base font-medium text-blue-600 hover:text-blue-700"
          onClick={() => {
            setError("");
            setNotice("");
            setAuthPanel("forgot");
          }}
          type="button"
        >
          Lupa kata sandi?
        </button>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button className="mt-2 h-16 rounded-md text-2xl font-bold" disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </Button>
      </form>
    </div>
  ) : authPanel === "register" ? (
	    <RegisterPanel
	      onRegister={onLogin}
	      onShowLogin={() => setAuthPanel("login")}
	      onShowTerms={() => setAuthPanel("terms")}
	      onShowPrivacy={() => setAuthPanel("privacy")}
	    />
  ) : authPanel === "forgot" ? (
    <ForgotPasswordPanel
      onBack={() => setAuthPanel("login")}
    />
  ) : authPanel === "reset" ? (
    <ResetPasswordPanel
      token={resetToken}
      onBack={() => setAuthPanel("login")}
      onSuccess={() => {
        setResetToken("");
        window.history.replaceState(null, "", "/");
        setAuthPanel("login");
      }}
    />
  ) : authPanel === "terms" ? (
    <LegalPanel
      title="Syarat Ketentuan"
      paragraphs={[
        "Dengan menggunakan Dakwah, pengguna setuju untuk memakai aplikasi ini sebagai alat bantu penyusunan awal naskah dakwah, bukan sebagai rujukan keagamaan final.",
        "Pengguna bertanggung jawab penuh untuk meninjau, menyunting, dan memastikan ketepatan isi naskah sebelum disampaikan kepada jamaah atau digunakan dalam kegiatan resmi.",
        "Pengguna tidak diperkenankan menggunakan layanan untuk membuat konten yang menyesatkan, merugikan pihak lain, melanggar hukum, atau bertentangan dengan adab penyampaian dakwah.",
        "Dakwah dapat melakukan pembaruan fitur, perbaikan layanan, atau perubahan ketentuan penggunaan sesuai kebutuhan pengembangan aplikasi."
      ]}
      onBack={() => setAuthPanel("register")}
    />
  ) : (
    <LegalPanel
      title="Kebijakan Privasi"
      paragraphs={[
        "Dakwah menggunakan data akun seperti nama, email, dan informasi autentikasi untuk menyediakan akses pengguna dan menjaga keamanan sesi penggunaan aplikasi.",
        "Naskah, template, dan riwayat penggunaan yang disimpan di aplikasi digunakan untuk mendukung fitur penyimpanan, pencarian, penggunaan ulang, serta pengelolaan dokumen pengguna.",
        "Data pengguna tidak ditampilkan kepada pengguna lain kecuali dibutuhkan untuk fitur administrasi, pemeliharaan layanan, atau kewajiban teknis yang relevan.",
        "Pengguna dapat menghubungi pengelola aplikasi untuk permintaan terkait akun, data tersimpan, atau pertanyaan mengenai penggunaan informasi pribadi."
      ]}
      onBack={() => setAuthPanel("register")}
    />
  );

  return (
    <main
      className={cn(
        "grid place-items-center overflow-y-auto px-4 py-6 text-foreground sm:py-10",
        variant === "page" ? "min-h-screen bg-background" : "fixed inset-0 z-50 bg-slate-950/95"
      )}
    >
      <div className="absolute right-4 top-4">
        <IconButton onClick={() => setDark(!dark)} aria-label="Ganti tema">
          {dark ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
        </IconButton>
      </div>
      {content}
    </main>
  );
}

function ForgotPasswordPanel({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await api<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage(data.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Permintaan reset kata sandi gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={authCardClass}>
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-normal text-foreground sm:text-3xl">Lupa Kata Sandi</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Masukkan email akun untuk menerima tautan reset kata sandi.</p>
      </div>

      <form className="mt-7 grid gap-4" onSubmit={submit}>
        <label className="relative block">
          <IconMail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        {message && <p className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button className="h-11 rounded-full bg-primary text-base font-bold hover:bg-primary/90" disabled={loading}>
          {loading ? "Mengirim..." : "Kirim Link Reset"}
        </Button>
        <button className="text-sm font-medium text-muted-foreground transition hover:text-foreground" onClick={onBack} type="button">
          Kembali ke Masuk
        </button>
      </form>
    </div>
  );
}

function ResetPasswordPanel({ token, onBack, onSuccess }: { token: string; onBack: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Token reset tidak tersedia.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi belum sama.");
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setMessage(data.message);
      window.setTimeout(onSuccess, 900);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Reset kata sandi gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={authCardClass}>
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-normal text-foreground sm:text-3xl">Kata Sandi Baru</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Buat kata sandi baru untuk akun Dakwah Anda.</p>
      </div>

      <form className="mt-7 grid gap-4" onSubmit={submit}>
        <label className="relative block">
          <IconLock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 pr-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="Kata sandi baru"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <button
            className="absolute right-4 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <IconEye className="size-5" /> : <IconEyeOff className="size-5" />}
          </button>
        </label>
        <label className="relative block">
          <IconLock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="Ulangi kata sandi baru"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        {message && <p className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button className="h-11 rounded-full bg-primary text-base font-bold hover:bg-primary/90" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Kata Sandi"}
        </Button>
        <button className="text-sm font-medium text-muted-foreground transition hover:text-foreground" onClick={onBack} type="button">
          Kembali ke Masuk
        </button>
      </form>
    </div>
  );
}

function RegisterPanel({
  onRegister,
  onShowLogin,
  onShowTerms,
  onShowPrivacy
}: {
  onRegister: (user: User) => void;
  onShowLogin: () => void;
  onShowTerms: () => void;
  onShowPrivacy: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const captchaIsReady = Boolean(captcha && captchaAnswer);

  const refreshCaptcha = useCallback(async () => {
    setCaptchaAnswer("");
    try {
      const challenge = await api<{ token: string; question: string }>("/api/auth/captcha");
      setCaptcha({ ...challenge, noise: createCaptchaNoise() });
    } catch (error) {
      setCaptcha(null);
      setError(error instanceof Error ? error.message : "Captcha gagal dimuat.");
    }
  }, []);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!captcha || !captchaAnswer) {
      setError("Lengkapi captcha terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, password, captchaToken: captcha.token, captchaAnswer })
      });
      onRegister(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registrasi gagal.");
      void refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(authCardClass, "my-auto max-h-[calc(100vh-3rem)] overflow-y-auto sm:max-h-[calc(100vh-5rem)]")}>
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-normal text-foreground sm:text-3xl">Daftar</h1>
        <div className="mx-auto mt-5 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground shadow-inner ring-4 ring-border sm:mt-6 sm:size-16">
          <IconUser className="size-10 sm:size-12" />
        </div>
      </div>

      <form className="mt-6 grid gap-4 sm:mt-7" onSubmit={submit}>
        <label className="relative block">
          <IconUser className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="Nama"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label className="relative block">
          <IconMail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="relative block">
          <IconLock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 pr-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="Kata sandi"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <button
            className="absolute right-4 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <IconEye className="size-5" /> : <IconEyeOff className="size-5" />}
          </button>
        </label>

        <div className="grid gap-2 rounded-2xl border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Verifikasi keamanan</p>
              <div className="relative mt-2 flex h-11 w-64 max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card px-3 sm:h-12" aria-label={captcha ? `Soal captcha ${captcha.question}` : "Memuat captcha"}>
                {captcha?.noise.map((line, index) => (
                  <span
                    key={`${line.left}-${index}`}
                    className="pointer-events-none absolute h-px rounded-full bg-muted-foreground/35"
                    style={{
                      left: `${line.left}%`,
                      top: `${line.top}%`,
                      width: `${line.width}px`,
                      transform: `rotate(${line.rotate}deg)`
                    }}
                  />
                ))}
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.22)_1px,transparent_0)] bg-[length:8px_8px] opacity-60" />
                <span className="relative select-none text-center font-mono text-sm font-black tracking-normal text-foreground sm:text-base">
                  {captcha?.question ?? "Memuat..."}
                </span>
              </div>
            </div>
            <button
              className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-accent"
              onClick={() => void refreshCaptcha()}
              type="button"
              aria-label="Ganti captcha"
              title="Ganti captcha"
            >
              <IconRefresh className="size-4" />
            </button>
          </div>
          <Input
            className="h-10 rounded-full border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground sm:h-11"
            value={captchaAnswer}
            onChange={(event) => setCaptchaAnswer(event.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="Masukkan hasil"
            aria-label="Jawaban captcha"
            inputMode="numeric"
          />
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="relative mt-1 flex items-center justify-center">
          <Button className="h-11 min-w-28 rounded-full bg-primary px-5 text-base font-bold hover:bg-primary/90" disabled={!captchaIsReady || loading}>
            {loading ? "Mendaftar..." : "Daftar"}
          </Button>
        </div>
      </form>

      <p className="mt-4 text-center text-sm text-foreground sm:text-base">
        Sudah punya akun?{" "}
        <button className="font-medium text-primary" onClick={onShowLogin} type="button">
          Masuk sekarang
        </button>
      </p>
      <p className="mx-auto mt-2 max-w-[300px] text-center text-[11px] leading-4 text-muted-foreground">
        Dengan menekan tombol daftar, Anda menyatakan telah membaca, memahami, dan menyetujui{" "}
        <button className="underline" onClick={onShowTerms} type="button">
          Syarat Ketentuan
        </button>{" "}
        serta{" "}
        <button className="underline" onClick={onShowPrivacy} type="button">
          Kebijakan Privasi
        </button>{" "}
        yang berlaku.
      </p>
    </div>
  );
}

function createCaptchaNoise() {
  return Array.from({ length: 5 }, () => ({
    left: Math.floor(Math.random() * 78),
    top: Math.floor(Math.random() * 78) + 10,
    width: Math.floor(Math.random() * 70) + 45,
    rotate: Math.floor(Math.random() * 121) - 60
  }));
}

function LegalPanel({
  title,
  paragraphs,
  backLabel = "Kembali ke Daftar",
  onBack
}: {
  title: string;
  paragraphs: string[];
  backLabel?: string;
  onBack: () => void;
}) {
  return (
    <div className="relative w-full max-w-[520px] rounded-2xl border border-border bg-card px-5 py-8 text-card-foreground shadow-2xl sm:px-8">
      <h1 className="text-center text-2xl font-black tracking-normal text-foreground">{title}</h1>
      <div className="mt-6 grid gap-4 text-sm leading-6 text-muted-foreground">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Button className="mt-7 h-11 w-full rounded-full bg-primary text-base font-bold hover:bg-primary/90" onClick={onBack} type="button">
        {backLabel}
      </Button>
    </div>
  );
}

function SocialLoginButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="flex h-16 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-accent"
      onClick={onClick}
      type="button"
      aria-label={`Masuk dengan ${label}`}
      title={label}
    >
      {children}
    </button>
  );
}

function MainLayout({
  activeTab,
  activeJenis,
  user,
  setActiveTab,
  onOpenGenerate,
  onPrefetchGenerate,
  dark,
  setDark,
  naskahSearch,
  onNaskahSearchChange,
  naskahSearchItems,
  naskahSearchLoading,
  showAccountPanel,
  onToggleAccountPanel,
  onCloseAccountPanel,
  onSelectNaskah,
  onPrefetchHistory,
  onLogout,
  children
}: {
  activeTab: string;
  activeJenis: JenisId;
  user: User;
  setActiveTab: (tab: Exclude<TabId, "generate">) => void;
  onOpenGenerate: (jenis?: JenisId) => void;
  onPrefetchGenerate: () => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  naskahSearch: string;
  onNaskahSearchChange: (value: string) => void;
  naskahSearchItems: Naskah[];
  naskahSearchLoading: boolean;
  showAccountPanel: boolean;
  onToggleAccountPanel: () => void;
  onCloseAccountPanel: () => void;
  onSelectNaskah: (item: Naskah) => void;
  onPrefetchHistory: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const isKhutbahActive = activeTab === "generate" && khutbahJenis.has(activeJenis);
  const normalizedNaskahSearch = naskahSearch.trim().toLowerCase();
  const naskahSearchResults = normalizedNaskahSearch ? naskahSearchItems.slice(0, 6) : [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:py-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 lg:h-24">
          <button className="flex items-center gap-2.5 text-left" onClick={() => setActiveTab("home")}>
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <IconDakwahLogo className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-black tracking-normal text-primary">Dakwah</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Naskah Dakwah</p>
            </div>
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            <DesktopTab active={activeTab === "home"} onClick={() => setActiveTab("home")} label="Home" />
            <DesktopTab active={activeTab === "about"} onClick={() => setActiveTab("about")} label="About" />
            <DesktopDropdown label="Khutbah" active={isKhutbahActive}>
              {khutbahItems.map((item) => (
                <DropdownItem
                  key={item.jenis}
                  active={activeTab === "generate" && activeJenis === item.jenis}
                  onClick={() => onOpenGenerate(item.jenis)}
                  onPrefetch={onPrefetchGenerate}
                >
                  {item.label}
                </DropdownItem>
              ))}
            </DesktopDropdown>
            <DesktopTab active={activeTab === "generate" && activeJenis === "ceramah"} onClick={() => onOpenGenerate("ceramah")} onPrefetch={onPrefetchGenerate} label="Ceramah" />
            <DesktopTab active={activeTab === "generate" && activeJenis === "kultum"} onClick={() => onOpenGenerate("kultum")} onPrefetch={onPrefetchGenerate} label="Kultum" />
            <DesktopTab active={activeTab === "history"} onClick={() => setActiveTab("history")} onPrefetch={onPrefetchHistory} label="Riwayat" />
            <DesktopTab active={activeTab === "templates"} onClick={() => setActiveTab("templates")} label="Template" />
            <DesktopTab active={activeTab === "disclaimer"} onClick={() => setActiveTab("disclaimer")} label="Disclaimer" />
            <div className="relative w-44 xl:w-56">
              <IconSearch className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 pl-9 text-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                value={naskahSearch}
                onChange={(event) => {
                  onNaskahSearchChange(event.target.value);
                }}
                placeholder="Cari naskah"
                aria-label="Cari naskah tersimpan"
              />
              {normalizedNaskahSearch && (
                <div className="absolute right-0 top-full z-20 mt-2 w-80 border border-border bg-card p-2 text-left shadow-lg">
                  {naskahSearchResults.map((item) => (
                    <button
                      key={item.id}
                      className="block w-full rounded-md px-3 py-2 text-left transition hover:bg-accent"
                      onMouseEnter={onPrefetchHistory}
                      onFocus={onPrefetchHistory}
                      onClick={() => onSelectNaskah(item)}
                      type="button"
                    >
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {jenisLabelById(item.jenis)} - {new Date(item.createdAt).toLocaleDateString("id-ID")}
                      </span>
                    </button>
                  ))}
                  {naskahSearchLoading && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Mencari naskah...</p>
                  )}
                  {!naskahSearchLoading && naskahSearchResults.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada naskah tersimpan yang cocok.</p>
                  )}
                </div>
              )}
            </div>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <IconButton onClick={() => setDark(!dark)} aria-label="Ganti tema">
              {dark ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
            </IconButton>
            <div className="relative">
              <IconButton type="button" onClick={onToggleAccountPanel} aria-label={`Akun ${user.name}`} title={user.name}>
                <IconUser className="size-5" />
              </IconButton>
              {showAccountPanel && <AccountPanel user={user} setActiveTab={setActiveTab} onClose={onCloseAccountPanel} onLogout={onLogout} />}
            </div>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <IconButton onClick={() => setDark(!dark)} aria-label="Ganti tema">
              {dark ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
            </IconButton>
            <div className="relative">
              <IconButton type="button" onClick={onToggleAccountPanel} aria-label={`Akun ${user.name}`} title={user.name}>
                <IconUser className="size-4" />
              </IconButton>
              {showAccountPanel && <AccountPanel user={user} setActiveTab={setActiveTab} onClose={onCloseAccountPanel} onLogout={onLogout} />}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:py-0">{children}</main>
      <FooterCredit />

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/90 pb-safe backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-around">
          {/* Beranda - Emerald */}
          <button
            onClick={() => setActiveTab("home")}
            className="flex flex-col items-center justify-center flex-1 py-1 gap-1 text-[10px] font-medium transition-all duration-200"
            type="button"
          >
            <div className={cn(
              "flex items-center justify-center size-10 rounded-full transition-all duration-200",
              activeTab === "home"
                ? "bg-emerald-500/10 text-emerald-600 scale-105"
                : "bg-transparent text-muted-foreground"
            )}>
              <IconMosque className="size-5" />
            </div>
            <span className={activeTab === "home" ? "font-semibold text-emerald-600" : "text-muted-foreground"}>Beranda</span>
          </button>

          {/* Buat - Indigo */}
          <button
            onClick={() => onOpenGenerate(activeJenis)}
            onMouseEnter={onPrefetchGenerate}
            onFocus={onPrefetchGenerate}
            onTouchStart={onPrefetchGenerate}
            className="flex flex-col items-center justify-center flex-1 py-1 gap-1 text-[10px] font-medium transition-all duration-200"
            type="button"
          >
            <div className={cn(
              "flex items-center justify-center size-10 rounded-full transition-all duration-200",
              activeTab === "generate"
                ? "bg-indigo-500/10 text-indigo-500 scale-105"
                : "bg-transparent text-muted-foreground"
            )}>
              <IconScroll className="size-5" />
            </div>
            <span className={activeTab === "generate" ? "font-semibold text-indigo-500" : "text-muted-foreground"}>Buat</span>
          </button>

          {/* Riwayat - Amber */}
          <button
            onClick={() => setActiveTab("history")}
            onMouseEnter={onPrefetchHistory}
            onFocus={onPrefetchHistory}
            onTouchStart={onPrefetchHistory}
            className="flex flex-col items-center justify-center flex-1 py-1 gap-1 text-[10px] font-medium transition-all duration-200"
            type="button"
          >
            <div className={cn(
              "flex items-center justify-center size-10 rounded-full transition-all duration-200",
              activeTab === "history"
                ? "bg-amber-500/10 text-amber-500 scale-105"
                : "bg-transparent text-muted-foreground"
            )}>
              <IconHistory className="size-5" />
            </div>
            <span className={activeTab === "history" ? "font-semibold text-amber-500" : "text-muted-foreground"}>Riwayat</span>
          </button>

          {/* Lainnya - Blue */}
          <button
            onClick={() => setActiveTab("more")}
            className="flex flex-col items-center justify-center flex-1 py-1 gap-1 text-[10px] font-medium transition-all duration-200"
            type="button"
          >
            <div className={cn(
              "flex items-center justify-center size-10 rounded-full transition-all duration-200",
              activeTab === "more"
                ? "bg-blue-500/10 text-blue-500 scale-105"
                : "bg-transparent text-muted-foreground"
            )}>
              <IconCrescentStar className="size-5" />
            </div>
            <span className={activeTab === "more" ? "font-semibold text-blue-500" : "text-muted-foreground"}>Lainnya</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function FooterCredit() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-1.5 border-t border-border bg-muted/30 px-6 py-6 text-center text-xs text-muted-foreground">
      <span>Dakwah &copy; 2026. Dibuat dengan</span>
      <IconHeart className="size-3.5 fill-[#800020] text-[#800020]" aria-label="cinta" />
      <span>oleh Aan Triono.</span>
    </footer>
  );
}

function AccountPanel({
  user,
  setActiveTab,
  onClose,
  onLogout
}: {
  user: User;
  setActiveTab: (tab: Exclude<TabId, "generate">) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-border bg-card p-4 text-left text-card-foreground shadow-xl">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <IconUser className="size-7" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user.username}</p>
          <Badge className={cn("mt-2", user.role === "admin" && "border-primary/30 bg-primary/10 text-primary")}>{user.role}</Badge>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {user.role === "admin" && (
          <Button
            className="h-10 justify-start"
            onClick={() => {
              setActiveTab("admin");
              onClose();
            }}
            type="button"
          >
            Buka Admin
          </Button>
        )}
        <Button
          className="h-10 justify-start bg-secondary text-secondary-foreground"
          onClick={() => {
            setActiveTab("about");
            onClose();
          }}
          type="button"
        >
          <IconInfo className="size-4 mr-2" />
          Tentang Aplikasi
        </Button>
        <Button
          className="h-10 justify-start bg-secondary text-secondary-foreground"
          onClick={() => {
            setActiveTab("disclaimer");
            onClose();
          }}
          type="button"
        >
          <IconShield className="size-4 mr-2" />
          Disclaimer
        </Button>
        <Button className="h-10 justify-start bg-secondary/80 text-secondary-foreground" onClick={onLogout} type="button">
          <IconLogout className="size-4 mr-2" />
          Keluar
        </Button>
      </div>
    </div>
  );
}

function DesktopTab({
  active,
  onClick,
  onPrefetch,
  label
}: {
  active: boolean;
  onClick: () => void;
  onPrefetch?: () => void;
  label: string;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center gap-1 text-xs font-extrabold uppercase text-foreground transition hover:text-primary",
        active && "text-primary"
      )}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      {label}
    </button>
  );
}

function DesktopDropdown({
  active,
  label,
  children
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <button
        className={cn(
          "inline-flex h-10 items-center gap-1 text-xs font-extrabold uppercase text-foreground transition hover:text-primary",
          active && "text-primary"
        )}
        type="button"
      >
        {label}
        <IconChevronDown className="size-3" />
      </button>
      <div className="invisible absolute left-0 top-full w-44 translate-y-2 border border-border bg-card p-1 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}

function DropdownItem({
  active,
  onClick,
  onPrefetch,
  children
}: {
  active: boolean;
  onClick: () => void;
  onPrefetch?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center px-3 text-left text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      type="button"
    >
      {children}
    </button>
  );
}

function MobileTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={cn(
        "h-9 whitespace-nowrap rounded-md border border-border px-3 text-sm",
        active && "border-primary bg-primary text-primary-foreground"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function InfoPage({ title, body }: { title: string; body: string | string[] }) {
  const paragraphs = Array.isArray(body) ? body : [body];

  return (
    <section className="grid min-h-[420px] place-items-center py-12">
      <Card className="w-full max-w-2xl p-6">
        <p className="text-sm font-medium uppercase text-primary">{title}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">{title}</h1>
        <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Card>
    </section>
  );
}
