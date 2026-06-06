import type React from "react";
import { useEffect, useState } from "react";
import { IconBookOpen, IconPencil, IconSave, IconTrash, IconUsers, IconX } from "../components/icons";
import { Badge, Button, Card, Field, IconButton, Input, Notice, Select, Textarea } from "../components/ui";
import { api } from "../lib/utils";
import type { CuratedDalil, User } from "../types";

type AdminStats = {
  users: number;
  naskah: number;
  templates: number;
  dalil: number;
  todayGenerates: number;
  todayExports: number;
  blockedGenerates: number;
  byJenis: { jenis: string; total: number }[];
  usageByUser: { userId: string | null; username: string | null; name: string | null; total: number }[];
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

type DalilFormState = {
  kind: "quran" | "hadith";
  reference: string;
  arab: string;
  translation: string;
  source: string;
  grade: string;
  takhrij: string;
  tafsir: string;
  tags: string;
  status: "draft" | "reviewed" | "approved" | "archived";
  isActive: boolean;
};

const emptyDalilForm: DalilFormState = {
  kind: "quran",
  reference: "",
  arab: "",
  translation: "",
  source: "Database dalil terkurasi",
  grade: "",
  takhrij: "",
  tafsir: "",
  tags: "",
  status: "draft",
  isActive: true
};

export function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
  const [editingUserId, setEditingUserId] = useState("");
  const [editForm, setEditForm] = useState({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [statsData, usersData] = await Promise.all([
        api<{ data: AdminStats }>("/api/admin/stats"),
        api<{ data: User[] }>("/api/admin/users")
      ]);
      setStats(statsData.data);
      setUsers(usersData.data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data admin.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(userPayload(form)) });
      setForm({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
      await load();
      setMessage("User berhasil ditambahkan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menambah user.");
    }
  }

  function startEdit(user: User) {
    setEditingUserId(user.id);
    setEditForm({
      username: user.username,
      name: user.name,
      password: "",
      role: user.role,
      dailyGenerateLimit: user.dailyGenerateLimit === null || user.dailyGenerateLimit === undefined ? "" : String(user.dailyGenerateLimit)
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingUserId("");
    setEditForm({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
  }

  async function updateUser(event: React.FormEvent) {
    event.preventDefault();
    if (!editingUserId) return;

    try {
      const payload: { username: string; name: string; role: string; dailyGenerateLimit: number | null; password?: string } = userPayload(editForm);
      if (editForm.password.trim()) payload.password = editForm.password;
      else delete payload.password;
      await api(`/api/admin/users/${editingUserId}`, { method: "PUT", body: JSON.stringify(payload) });
      cancelEdit();
      await load();
      setMessage("User berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memperbarui user.");
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Hapus user ini?")) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      await load();
      setMessage("User berhasil dihapus.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus user.");
    }
  }

  return (
    <div className="grid gap-6">
      <section>
        <Badge>Admin</Badge>
        <h2 className="mt-3 text-2xl font-semibold">Monitoring dan user</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pantau penggunaan aplikasi dan kelola akun yang boleh mengakses generator naskah.
        </p>
      </section>
      {message && <Notice>{message}</Notice>}
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="User" value={stats?.users ?? 0} />
        <Stat label="Semua naskah" value={stats?.naskah ?? 0} />
        <Stat label="Semua template" value={stats?.templates ?? 0} />
        <Stat label="Dalil curated" value={stats?.dalil ?? 0} />
        <Stat label="Generate hari ini" value={stats?.todayGenerates ?? 0} />
        <Stat label="Export hari ini" value={stats?.todayExports ?? 0} />
        <Stat label="Generate diblokir" value={stats?.blockedGenerates ?? 0} />
      </section>
      {stats ? <UsageMonitoring stats={stats} /> : null}
      {stats?.byJenis?.length ? (
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Distribusi naskah</h2>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {stats.byJenis.map((item) => (
              <div key={item.jenis} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">{item.jenis}</span>
                <Badge>{item.total}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      <DalilManagement />
      <section className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Tambah user</h2>
          <form onSubmit={createUser} className="grid gap-3">
            <Field label="Username">
              <Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
            </Field>
            <Field label="Nama">
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </Field>
            <Field label="Password">
              <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Field label="Quota generate harian">
              <Input
                type="number"
                min={0}
                value={form.dailyGenerateLimit}
                onChange={(event) => setForm({ ...form, dailyGenerateLimit: event.target.value })}
                placeholder="Kosong = default"
              />
            </Field>
            <Button>
              <IconUsers className="size-4" />
              Simpan user
            </Button>
          </form>
        </Card>
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Daftar user</h2>
            <Badge>{users.length} akun</Badge>
          </div>
          <div className="grid gap-2">
            {users.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                {editingUserId === item.id ? (
                  <form onSubmit={updateUser} className="grid flex-1 gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Nama">
                        <Input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required />
                      </Field>
                      <Field label="Username">
                        <Input value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} required />
                      </Field>
                      <Field label="Role">
                        <Select value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </Field>
                      <Field label="Quota generate harian">
                        <Input
                          type="number"
                          min={0}
                          value={editForm.dailyGenerateLimit}
                          onChange={(event) => setEditForm({ ...editForm, dailyGenerateLimit: event.target.value })}
                          placeholder="Kosong = default"
                        />
                      </Field>
                      <Field label="Password baru">
                        <Input
                          type="password"
                          value={editForm.password}
                          onChange={(event) => setEditForm({ ...editForm, password: event.target.value })}
                          placeholder="Kosongkan jika tidak diubah"
                        />
                      </Field>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button>
                        <IconSave className="size-4" />
                        Simpan
                      </Button>
                      <Button type="button" className="bg-secondary text-secondary-foreground" onClick={cancelEdit}>
                        <IconX className="size-4" />
                        Batal
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge>{item.username}</Badge>
                        <Badge className={item.role === "admin" ? "border-primary/30 bg-primary/10 text-primary" : undefined}>{item.role}</Badge>
                        <Badge>Quota: {item.dailyGenerateLimit ?? "default"}</Badge>
                        <Badge title="Password asli tidak dapat ditampilkan karena disimpan sebagai hash terenkripsi. Gunakan edit untuk reset password.">
                          Password: ********
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <IconButton onClick={() => startEdit(item)} aria-label="Edit user">
                        <IconPencil className="size-4" />
                      </IconButton>
                      <IconButton onClick={() => removeUser(item.id)} aria-label="Hapus user">
                        <IconTrash className="size-4" />
                      </IconButton>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function DalilManagement() {
  const [items, setItems] = useState<CuratedDalil[]>([]);
  const [form, setForm] = useState<DalilFormState>(emptyDalilForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<DalilFormState>(emptyDalilForm);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  async function load(q = filter) {
    try {
      const search = new URLSearchParams({ status: "all" });
      if (q.trim()) search.set("q", q.trim());
      const data = await api<{ data: CuratedDalil[] }>(`/api/admin/dalil?${search.toString()}`);
      setItems(data.data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat database dalil.");
    }
  }

  useEffect(() => {
    load("");
  }, []);

  async function createDalil(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api("/api/admin/dalil", { method: "POST", body: JSON.stringify(dalilPayload(form)) });
      setForm(emptyDalilForm);
      await load();
      setMessage("Dalil berhasil ditambahkan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menambah dalil.");
    }
  }

  function startEdit(item: CuratedDalil) {
    setEditingId(item.id);
    setEditForm(dalilFormFrom(item));
    setMessage("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm(emptyDalilForm);
  }

  async function updateDalil(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) return;

    try {
      await api(`/api/admin/dalil/${editingId}`, { method: "PUT", body: JSON.stringify(dalilPayload(editForm)) });
      cancelEdit();
      await load();
      setMessage("Dalil berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memperbarui dalil.");
    }
  }

  async function removeDalil(id: string) {
    if (!confirm("Hapus dalil ini dari database curated?")) return;
    try {
      await api(`/api/admin/dalil/${id}`, { method: "DELETE" });
      await load();
      setMessage("Dalil berhasil dihapus.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus dalil.");
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <IconBookOpen className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Database dalil terkurasi</h2>
        </div>
        {message && <Notice className="mb-4">{message}</Notice>}
        <DalilForm form={form} onChange={setForm} onSubmit={createDalil} submitLabel="Simpan dalil" />
      </Card>
      <Card className="p-4">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Cari dalil atau tag">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") load(event.currentTarget.value);
              }}
              placeholder="sabar, sedekah, QS. Al-Baqarah"
            />
          </Field>
          <div className="flex items-end">
            <Button type="button" onClick={() => load()}>
              Cari
            </Button>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Daftar dalil</h2>
          <Badge>{items.length} item</Badge>
        </div>
        <div className="grid gap-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Belum ada dalil curated.</p>}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3">
              {editingId === item.id ? (
                <DalilForm form={editForm} onChange={setEditForm} onSubmit={updateDalil} submitLabel="Simpan perubahan" onCancel={cancelEdit} />
              ) : (
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{item.kind === "quran" ? "Ayat" : "Hadits"}</Badge>
                        <Badge className={item.isActive ? "border-primary/25 bg-primary/10 text-primary" : "border-destructive/25 bg-destructive/10 text-destructive"}>
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                        <Badge className={item.status === "approved" ? "border-primary/25 bg-primary/10 text-primary" : undefined}>{item.status}</Badge>
                        {item.tags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                      <p className="mt-2 font-medium">{item.reference}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.translation}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.source}</p>
                    </div>
                    <div className="flex gap-2">
                      <IconButton onClick={() => startEdit(item)} aria-label="Edit dalil">
                        <IconPencil className="size-4" />
                      </IconButton>
                      <IconButton onClick={() => removeDalil(item.id)} aria-label="Hapus dalil">
                        <IconTrash className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function DalilForm({
  form,
  onChange,
  onSubmit,
  submitLabel,
  onCancel
}: {
  form: DalilFormState;
  onChange: (form: DalilFormState) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitLabel: string;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Jenis">
          <Select value={form.kind} onChange={(event) => onChange({ ...form, kind: event.target.value as DalilFormState["kind"] })}>
            <option value="quran">Ayat Al-Qur'an</option>
            <option value="hadith">Hadits</option>
          </Select>
        </Field>
        <Field label="Referensi">
          <Input value={form.reference} onChange={(event) => onChange({ ...form, reference: event.target.value })} placeholder="QS. Al-Baqarah: 153" required />
        </Field>
      </div>
      <Field label="Status kurasi">
        <Select value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as DalilFormState["status"] })}>
          <option value="draft">Draft</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <Field label="Tag tema">
        <Input value={form.tags} onChange={(event) => onChange({ ...form, tags: event.target.value })} placeholder="sabar, musibah, ujian" />
      </Field>
      <Field label="Teks Arab">
        <Textarea value={form.arab} onChange={(event) => onChange({ ...form, arab: event.target.value })} rows={3} dir="rtl" />
      </Field>
      <Field label="Terjemah atau isi">
        <Textarea value={form.translation} onChange={(event) => onChange({ ...form, translation: event.target.value })} rows={4} required />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Sumber">
          <Input value={form.source} onChange={(event) => onChange({ ...form, source: event.target.value })} />
        </Field>
        <Field label="Derajat hadits">
          <Input value={form.grade} onChange={(event) => onChange({ ...form, grade: event.target.value })} placeholder="Sahih, Hasan, ..." />
        </Field>
      </div>
      <Field label="Takhrij">
        <Input value={form.takhrij} onChange={(event) => onChange({ ...form, takhrij: event.target.value })} placeholder="HR. Bukhari dan Muslim" />
      </Field>
      <Field label="Tafsir atau catatan">
        <Textarea value={form.tafsir} onChange={(event) => onChange({ ...form, tafsir: event.target.value })} rows={3} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} />
        Aktif dipakai retrieval
      </label>
      <div className="flex flex-wrap gap-2">
        <Button>
          <IconSave className="size-4" />
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" className="bg-secondary text-secondary-foreground" onClick={onCancel}>
            <IconX className="size-4" />
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function dalilPayload(form: DalilFormState) {
  return {
    ...form,
    tags: form.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  };
}

function dalilFormFrom(item: CuratedDalil): DalilFormState {
  return {
    kind: item.kind,
    reference: item.reference,
    arab: item.arab ?? "",
    translation: item.translation,
    source: item.source,
    grade: item.grade ?? "",
    takhrij: item.takhrij ?? "",
    tafsir: item.tafsir ?? "",
    tags: item.tags.join(", "),
    status: item.status,
    isActive: item.isActive
  };
}

function userPayload(form: { username: string; name: string; password: string; role: string; dailyGenerateLimit: string }) {
  return {
    username: form.username,
    name: form.name,
    password: form.password,
    role: form.role,
    dailyGenerateLimit: form.dailyGenerateLimit.trim() === "" ? null : Number(form.dailyGenerateLimit)
  };
}

function UsageMonitoring({ stats }: { stats: AdminStats }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Generate per user hari ini</h2>
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
        <h2 className="mb-4 text-lg font-semibold">Event terbaru</h2>
        <div className="grid gap-2">
          {stats.recentUsage.length === 0 && <p className="text-sm text-muted-foreground">Belum ada event penggunaan.</p>}
          {stats.recentUsage.slice(0, 8).map((event) => (
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
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
