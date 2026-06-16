import type React from "react";
import {
  IconAdmin,
  IconChevronDown,
  IconCrescentStar,
  IconDakwahLogo,
  IconHistory,
  IconLogout,
  IconMoon,
  IconMosque,
  IconScroll,
  IconSearch,
  IconSun,
  IconUser
} from "./icons";
import { Badge, Button, IconButton } from "./ui";
import { cn, jenisOptions, type JenisId } from "../lib/utils";
import type { Naskah, User } from "../types";

const khutbahItems: Array<{ label: string; jenis: JenisId }> = [
  { label: "Jumat", jenis: "khutbah-jumat" },
  { label: "Idul Fitri", jenis: "idul-fitri" },
  { label: "Idul Adha", jenis: "idul-adha" },
  { label: "Nikah", jenis: "nikah" }
];

const khutbahJenis = new Set<JenisId>(khutbahItems.map((item) => item.jenis));

function jenisLabelById(jenis: JenisId) {
  return jenisOptions.find((item) => item.id === jenis)?.label ?? jenis;
}

export function MainLayout({
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
  setActiveTab: (tab: "home" | "about" | "history" | "templates" | "admin" | "admin-monitoring" | "disclaimer" | "more") => void;
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
    <div className="flex min-h-screen flex-col bg-background pb-20 text-foreground lg:pb-0">
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
                onChange={(event) => onNaskahSearchChange(event.target.value)}
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
                  {naskahSearchLoading && <p className="px-3 py-2 text-sm text-muted-foreground">Mencari naskah...</p>}
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

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/90 pb-safe backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-around">
          <button onClick={() => setActiveTab("home")} className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition" type="button" aria-label="Buka beranda">
            <div className={cn("flex size-10 items-center justify-center rounded-md transition", activeTab === "home" ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground")}>
              <IconMosque className="size-5" />
            </div>
            <span className={activeTab === "home" ? "font-semibold text-primary" : "text-muted-foreground"}>Beranda</span>
          </button>

          <button onClick={() => onOpenGenerate(activeJenis)} onMouseEnter={onPrefetchGenerate} onFocus={onPrefetchGenerate} onTouchStart={onPrefetchGenerate} className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition" type="button" aria-label="Buat naskah">
            <div className={cn("flex size-10 items-center justify-center rounded-md transition", activeTab === "generate" ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground")}>
              <IconScroll className="size-5" />
            </div>
            <span className={activeTab === "generate" ? "font-semibold text-primary" : "text-muted-foreground"}>Buat</span>
          </button>

          <button onClick={() => setActiveTab("history")} onMouseEnter={onPrefetchHistory} onFocus={onPrefetchHistory} onTouchStart={onPrefetchHistory} className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition" type="button" aria-label="Buka riwayat">
            <div className={cn("flex size-10 items-center justify-center rounded-md transition", activeTab === "history" ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground")}>
              <IconHistory className="size-5" />
            </div>
            <span className={activeTab === "history" ? "font-semibold text-primary" : "text-muted-foreground"}>Riwayat</span>
          </button>

          <button onClick={() => setActiveTab("more")} className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition" type="button" aria-label="Buka menu lainnya">
            <div className={cn("flex size-10 items-center justify-center rounded-md transition", activeTab === "more" ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground")}>
              <IconCrescentStar className="size-5" />
            </div>
            <span className={activeTab === "more" ? "font-semibold text-primary" : "text-muted-foreground"}>Lainnya</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function FooterCredit({ className = "" }: { className?: string }) {
  return (
    <footer className={cn("flex flex-wrap items-center justify-center gap-2 border-t border-border bg-muted/30 px-6 py-6 text-center text-sm text-muted-foreground sm:text-base", className)}>
      <span>Dakwah &copy; 2026. All Right Reserved</span>
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
  setActiveTab: (tab: "home" | "about" | "history" | "templates" | "admin" | "admin-monitoring" | "disclaimer" | "more") => void;
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
          <Button className="h-10 justify-start" onClick={() => { setActiveTab("admin"); onClose(); }} type="button">
            Buka Admin
          </Button>
        )}
        <Button className="h-10 justify-start bg-secondary/80 text-secondary-foreground" onClick={onLogout} type="button">
          <IconLogout className="mr-2 size-4" />
          Keluar
        </Button>
      </div>
    </div>
  );
}

function DesktopTab({ active, onClick, onPrefetch, label }: { active: boolean; onClick: () => void; onPrefetch?: () => void; label: string }) {
  return (
    <button
      className={cn("inline-flex h-10 items-center gap-1 text-xs font-extrabold uppercase text-foreground transition hover:text-primary", active && "text-primary")}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      {label}
    </button>
  );
}

function DesktopDropdown({ active, label, children }: { active: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      <button className={cn("inline-flex h-10 items-center gap-1 text-xs font-extrabold uppercase text-foreground transition hover:text-primary", active && "text-primary")} type="button">
        {label}
        <IconChevronDown className="size-3" />
      </button>
      <div className="invisible absolute left-0 top-full w-44 translate-y-2 border border-border bg-card p-1 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}

function DropdownItem({ active, onClick, onPrefetch, children }: { active: boolean; onClick: () => void; onPrefetch?: () => void; children: React.ReactNode }) {
  return (
    <button
      className={cn("flex h-10 w-full items-center px-3 text-left text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      type="button"
    >
      {children}
    </button>
  );
}
