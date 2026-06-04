import type React from "react";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, FileText, Mail, MapPin, Megaphone, MoonStar, Phone } from "lucide-react";
import { Badge, Button } from "../components/ui";
import { api, jenisOptions, type JenisId } from "../lib/utils";
import type { Naskah, Template, User } from "../types";
import mosqueHero from "../assets/dashboard-mosque-hero.png";

const featureCards: Array<{
  title: string;
  body: string;
  cta: string;
  jenis: JenisId;
  icon: React.ComponentType<{ className?: string }>;
  overlay: string;
  position: string;
}> = [
  {
    title: "Khutbah",
    body: "Naskah Jumat, Idul Fitri, Idul Adha, dan nikah dengan struktur yang tertata.",
    cta: "Mulai Khutbah",
    jenis: "khutbah-jumat",
    icon: BookOpen,
    overlay: "from-zinc-950/70 via-zinc-900/60 to-zinc-950/55",
    position: "object-left-bottom"
  },
  {
    title: "Ceramah",
    body: "Materi ceramah lengkap untuk masjid, majelis, kajian, dan kegiatan komunitas.",
    cta: "Buat Ceramah",
    jenis: "ceramah",
    icon: Megaphone,
    overlay: "from-primary/85 via-primary/70 to-emerald-500/65",
    position: "object-center"
  },
  {
    title: "Kultum",
    body: "Draft singkat, padat, dan mudah disampaikan untuk pengingat harian.",
    cta: "Buat Kultum",
    jenis: "kultum",
    icon: MoonStar,
    overlay: "from-zinc-950/75 via-zinc-900/60 to-primary/45",
    position: "object-right-bottom"
  }
];

export function Dashboard({
  user,
  onCreate
}: {
  user: User;
  onCreate: (jenis?: JenisId) => void;
}) {
  const [stats, setStats] = useState<{ naskah: number; templates: number; recent: Naskah[] } | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    api<{ data: { naskah: number; templates: number; recent: Naskah[] } }>("/api/stats").then((data) => setStats(data.data));
    api<{ data: Template[] }>("/api/templates")
      .then((data) => setTemplates(data.data.slice(0, 3)))
      .catch(() => setTemplates([]));
  }, []);

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="relative isolate -mx-4 min-h-[520px] overflow-hidden bg-slate-100 text-zinc-900 lg:mx-0 lg:min-h-[560px]">
        <img src={mosqueHero} alt="" className="absolute inset-0 h-full w-full object-cover object-left-bottom" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/20 to-white/70" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white/70 to-transparent" />

        <div className="relative ml-auto flex min-h-[520px] w-full max-w-2xl flex-col items-start justify-center px-6 pb-10 pt-12 text-left sm:px-10 lg:min-h-[560px] lg:items-start lg:px-16">
          <Badge className="border-primary/20 bg-white/80 text-primary shadow-sm">QS. An-Nahl: 125</Badge>
          <h2 className="font-amiri mt-5 max-w-xl text-3xl font-semibold leading-relaxed tracking-normal sm:text-4xl" lang="ar" dir="rtl">
            ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-700">
            Artinya: "Serulah manusia kepada jalan Tuhanmu dengan hikmah dan pengajaran yang baik."
          </p>
        </div>
      </section>

      <section className="pt-2 lg:pt-4">
        <div className="mx-auto mb-7 max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">Mulai dari kebutuhan dakwah</h2>
          <p className="mt-3 text-lg text-muted-foreground">Pilih jenis naskah, lengkapi tema, lalu siapkan draft yang siap ditinjau.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {featureCards.map((item) => (
            <FeatureCard key={item.title} item={item} onCreate={onCreate} />
          ))}
        </div>
      </section>

      <HomeFooter user={user} templates={templates} recent={stats?.recent ?? []} onCreate={onCreate} />
    </div>
  );
}

function FeatureCard({
  item,
  onCreate
}: {
  item: (typeof featureCards)[number];
  onCreate: (jenis?: JenisId) => void;
}) {
  const Icon = item.icon;

  return (
    <div className="relative min-h-[330px] overflow-hidden bg-zinc-900 text-white">
      <img src={mosqueHero} alt="" className={`absolute inset-0 h-full w-full object-cover ${item.position}`} />
      <div className={`absolute inset-0 bg-gradient-to-br ${item.overlay}`} />
      <div className="relative flex min-h-[330px] flex-col items-center justify-center px-6 py-8 text-center">
        <Icon className="size-12 text-white" />
        <h3 className="mt-5 text-2xl font-semibold">{item.title}</h3>
        <p className="mt-5 text-sm font-medium leading-6 text-white/90">{item.body}</p>
        <button
          className="mt-7 inline-flex h-10 items-center justify-center bg-white px-5 text-xs font-extrabold uppercase text-zinc-950 transition hover:bg-secondary"
          onClick={() => onCreate(item.jenis)}
        >
          {item.cta}
        </button>
      </div>
    </div>
  );
}

function HomeFooter({
  user,
  templates,
  recent,
  onCreate
}: {
  user: User;
  templates: Template[];
  recent: Naskah[];
  onCreate: (jenis?: JenisId) => void;
}) {
  const featured = templates.slice(0, 2);
  const links: Array<{ label: string; onClick: () => void }> = [
    { label: "Khutbah Jumat", onClick: () => onCreate("khutbah-jumat") },
    { label: "Ceramah", onClick: () => onCreate("ceramah") },
    { label: "Kultum", onClick: () => onCreate("kultum") },
    { label: "Khutbah Nikah", onClick: () => onCreate("nikah") }
  ];

  return (
    <footer className="-mx-4 mt-1 bg-[#151f1c] text-white lg:mx-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary text-white">
              <MoonStar className="size-6" />
            </span>
            <div>
              <p className="text-xl font-black tracking-normal">Dakwah</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">Naskah Dakwah</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-7 text-white/75">
            Ruang kerja untuk menyiapkan khutbah, ceramah, dan kultum dengan alur yang rapi serta mudah digunakan kembali.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Template Pilihan</h3>
          <div className="mt-6 grid gap-4">
            {featured.map((item) => (
              <div key={item.id} className="flex gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center bg-white/10 text-primary">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-white/55">{jenisOptions.find((jenis) => jenis.id === item.jenis)?.label}</p>
                </div>
              </div>
            ))}
            {featured.length === 0 && <p className="text-sm leading-6 text-white/65">Belum ada template tersimpan untuk ditampilkan.</p>}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Link Cepat</h3>
          <div className="mt-6 grid gap-2">
            {links.map((link) => (
              <button key={link.label} className="flex items-center gap-2 text-left text-sm text-white/75 transition hover:text-white" onClick={link.onClick}>
                <span className="text-primary">&rsaquo;</span>
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Kontak</h3>
          <div className="mt-6 grid gap-4 text-sm text-white/75">
            <p className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              Hubungi admin untuk akun dan pengelolaan akses.
            </p>
            <p className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              Login sebagai {user.name}
            </p>
            <p className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              {recent.length} riwayat terbaru tersedia di ruang kerja.
            </p>
            <p className="flex gap-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
              Siapkan materi untuk jadwal dakwah berikutnya.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#0d1412] px-6 py-6 text-center text-xs text-white/55">
        Dakwah &copy; 2026. Gunakan naskah sebagai draft dan tinjau kembali sebelum disampaikan.
      </div>
    </footer>
  );
}
