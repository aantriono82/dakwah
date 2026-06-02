import { SendToBack, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { Button, Card, IconButton } from "../components/ui";
import { api, jenisOptions } from "../lib/utils";
import type { Template } from "../types";

export function Templates({ onUse }: { onUse: (template: Template) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api<{ data: Template[] }>("/api/templates");
      setTemplates(data.data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat template.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Hapus template ini?")) return;
    try {
      await api(`/api/templates/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus template.");
    }
  }

  return (
    <section className="grid gap-3">
      {message && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{jenisOptions.find((jenis) => jenis.id === item.jenis)?.label}</p>
              </div>
              <IconButton onClick={() => remove(item.id)} aria-label="Hapus template">
                <Trash2 className="size-4" />
              </IconButton>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              {Object.entries(item.parameters).slice(0, 5).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3 border-t border-border pt-2">
                  <dt className="truncate text-muted-foreground">{key}</dt>
                  <dd className="truncate text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <Button className="mt-4 w-full bg-secondary text-secondary-foreground" onClick={() => onUse(item)}>
              <SendToBack className="size-4" />
              Pakai template
            </Button>
          </Card>
        ))}
        {templates.length === 0 && <EmptyState text="Template favorit belum disimpan." />}
      </div>
    </section>
  );
}
