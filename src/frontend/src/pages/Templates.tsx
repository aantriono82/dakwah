import { IconSearch, IconSendToBack, IconTrash } from "../components/icons";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { Badge, Button, Card, IconButton, Input, Notice } from "../components/ui";
import { api, jenisOptions } from "../lib/utils";
import type { Template } from "../types";

export function Templates({ onUse }: { onUse: (template: Template) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTemplates = templates.filter((item) => {
    const label = jenisOptions.find((jenis) => jenis.id === item.jenis)?.label ?? item.jenis;
    const searchable = [item.name, label, ...Object.values(item.parameters)].join(" ").toLowerCase();
    return !normalizedQuery || searchable.includes(normalizedQuery);
  });

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge>Template</Badge>
          <h2 className="mt-3 text-2xl font-semibold">Parameter favorit</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pakai ulang kombinasi tema, bahasa, durasi, dan konteks yang sering digunakan.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <IconSearch className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari template" />
        </div>
      </div>
      {message && <Notice>{message}</Notice>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredTemplates.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{jenisOptions.find((jenis) => jenis.id === item.jenis)?.label}</Badge>
                  {item.parameters.bahasa && <Badge>{item.parameters.bahasa}</Badge>}
                </div>
              </div>
              <IconButton onClick={() => remove(item.id)} aria-label="Hapus template">
                <IconTrash className="size-4" />
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
              <IconSendToBack className="size-4" />
              Pakai template
            </Button>
          </Card>
        ))}
        {templates.length === 0 && <EmptyState text="Template favorit belum disimpan." />}
        {templates.length > 0 && filteredTemplates.length === 0 && <EmptyState text="Tidak ada template yang cocok." />}
      </div>
    </section>
  );
}
