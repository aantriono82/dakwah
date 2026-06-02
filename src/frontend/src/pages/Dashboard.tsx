import { Plus } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { JenisCard } from "../components/JenisCard";
import { Button, Card } from "../components/ui";
import { api, jenisOptions, type JenisId } from "../lib/utils";
import type { Naskah, User } from "../types";
import { useEffect, useState } from "react";

export function Dashboard({ user, onCreate }: { user: User; onCreate: (jenis?: JenisId) => void }) {
  const [stats, setStats] = useState<{ naskah: number; templates: number; recent: Naskah[] } | null>(null);

  useEffect(() => {
    api<{ data: { naskah: number; templates: number; recent: Naskah[] } }>("/api/stats").then((data) => setStats(data.data));
  }, []);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Total naskah" value={stats?.naskah ?? 0} />
        <Stat label="Template tersimpan" value={stats?.templates ?? 0} />
        <Stat label="Role aktif" value={user.role === "admin" ? "Admin" : "User"} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Pilih jenis konten</h2>
          <Button onClick={() => onCreate()}>
            <Plus className="size-4" />
            Buat naskah
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {jenisOptions.map((item) => (
            <JenisCard key={item.id} item={item} active={false} onClick={onCreate} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Riwayat terbaru</h2>
        <div className="grid gap-3">
          {(stats?.recent ?? []).map((item) => (
            <Card key={item.id} className="p-4">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString("id-ID")}</p>
            </Card>
          ))}
          {stats?.recent?.length === 0 && <EmptyState text="Belum ada naskah yang tersimpan." />}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}

