import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, History as HistoryIcon, LayoutDashboard, LogOut, Moon, Save, Shield, Sun } from "lucide-react";
import { Button, Card, Field, IconButton, Input } from "./components/ui";
import { Admin } from "./pages/Admin";
import { Dashboard } from "./pages/Dashboard";
import { Generate } from "./pages/Generate";
import { History } from "./pages/History";
import { Templates } from "./pages/Templates";
import { api, cn, type JenisId } from "./lib/utils";
import type { Template, User } from "./types";

type TabId = "dashboard" | "generate" | "history" | "templates" | "admin";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "generate", label: "Generate", icon: BookOpen },
  { id: "history", label: "Riwayat", icon: HistoryIcon },
  { id: "templates", label: "Template", icon: Save }
] as const;

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [initialGenerateJenis, setInitialGenerateJenis] = useState<JenisId>("khutbah-jumat");
  const [templateToUse, setTemplateToUse] = useState<Template | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

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

  const openGenerate = useCallback((jenis?: JenisId) => {
    if (jenis) setInitialGenerateJenis(jenis);
    setActiveTab("generate");
  }, []);

  const useTemplate = useCallback((template: Template) => {
    setTemplateToUse(template);
    setInitialGenerateJenis(template.jenis);
    setActiveTab("generate");
  }, []);

  const clearTemplate = useCallback(() => setTemplateToUse(null), []);

  if (authLoading) return <ShellLoader />;
  if (!user) return <Login onLogin={setUser} dark={dark} setDark={setDark} />;

  return (
    <MainLayout
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      dark={dark}
      setDark={setDark}
      onLogout={async () => {
        await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
        setUser(null);
      }}
    >
      {activeTab === "dashboard" && <Dashboard user={user} onCreate={openGenerate} />}
      {activeTab === "generate" && (
        <Generate initialJenis={initialGenerateJenis} template={templateToUse} onTemplateApplied={clearTemplate} />
      )}
      {activeTab === "history" && <History user={user} />}
      {activeTab === "templates" && <Templates onUse={useTemplate} />}
      {activeTab === "admin" && user.role === "admin" && <Admin />}
    </MainLayout>
  );
}

function ShellLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Memuat KhutbahAI...</div>;
}

function Login({
  onLogin,
  dark,
  setDark
}: {
  onLogin: (user: User) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
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

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <div className="absolute right-4 top-4">
        <IconButton onClick={() => setDark(!dark)} aria-label="Ganti tema">
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </IconButton>
      </div>
      <Card className="w-full max-w-md p-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary">KhutbahAI</p>
          <h1 className="mt-2 text-2xl font-semibold">Masuk ke aplikasi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Gunakan akun awal admin/admin123 atau user/user123.</p>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Username">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button disabled={loading}>{loading ? "Memproses..." : "Login"}</Button>
        </form>
      </Card>
    </main>
  );
}

function MainLayout({
  user,
  activeTab,
  setActiveTab,
  dark,
  setDark,
  onLogout,
  children
}: {
  user: User;
  activeTab: string;
  setActiveTab: (tab: TabId) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-card p-4 lg:block">
        <div className="mb-8">
          <p className="text-xl font-semibold">KhutbahAI</p>
          <p className="text-sm text-muted-foreground">Generator naskah dakwah</p>
        </div>
        <nav className="grid gap-2">
          {tabs.map((tab) => (
            <NavButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} icon={tab.icon} label={tab.label} />
          ))}
          {user.role === "admin" && (
            <NavButton active={activeTab === "admin"} onClick={() => setActiveTab("admin")} icon={Shield} label="Admin" />
          )}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Assalamu'alaikum, {user.name}</p>
              <h1 className="text-lg font-semibold">Ruang kerja naskah</h1>
            </div>
            <div className="flex items-center gap-2">
              <IconButton onClick={() => setDark(!dark)} aria-label="Ganti tema">
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </IconButton>
              <IconButton onClick={onLogout} aria-label="Logout">
                <LogOut className="size-4" />
              </IconButton>
            </div>
          </div>
          <nav className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-x-auto lg:hidden">
            {tabs.map((tab) => (
              <MobileTab key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} label={tab.label} />
            ))}
            {user.role === "admin" && <MobileTab active={activeTab === "admin"} onClick={() => setActiveTab("admin")} label="Admin" />}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground",
        active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
      )}
      onClick={onClick}
    >
      <Icon className="size-4" />
      {label}
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

