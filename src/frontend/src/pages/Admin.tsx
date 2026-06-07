import type React from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { IconBookOpen, IconPencil, IconSave, IconTrash, IconUsers, IconX } from "../components/icons";
import { Badge, Button, Card, Field, IconButton, Input, Modal, Notice, Select, Textarea } from "../components/ui";
import { api } from "../lib/utils";
import type { CuratedDalil, User } from "../types";

type AdminOverview = {
  users: number;
  naskah: number;
  templates: number;
  dalil: number;
  byJenis: { jenis: string; total: number }[];
};

type DalilListResponse = {
  data: CuratedDalil[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

const adminRefreshIntervalMs = 30_000;

export function Admin({ onOpenMonitoring, onPrefetchMonitoring }: { onOpenMonitoring: () => void; onPrefetchMonitoring: () => void }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
  const [editingUserId, setEditingUserId] = useState("");
  const [editForm, setEditForm] = useState({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
  const [message, setMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));
  const [lastLoadedAt, setLastLoadedAt] = useState<string>("");

  const loadStats = useCallback(async () => {
    try {
      const statsData = await api<{ data: AdminOverview }>("/api/admin/stats?scope=overview");
      setOverview(statsData.data);
      setLastLoadedAt(new Date().toISOString());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data admin.");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await api<{ data: User[] }>("/api/admin/users");
      setUsers(usersData.data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat daftar user.");
    }
  }, []);

  const loadAdminPage = useCallback(async () => {
    await Promise.all([loadStats(), loadUsers()]);
  }, [loadStats, loadUsers]);

  useEffect(() => {
    void loadAdminPage();
  }, [loadAdminPage]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setPageVisible(visible);
      if (visible && autoRefresh) {
        void loadStats();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [autoRefresh, loadStats]);

  useEffect(() => {
    if (!autoRefresh || !pageVisible) return;
    const timer = window.setInterval(() => {
      void loadStats();
    }, adminRefreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadStats, pageVisible]);

  const createUser = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(userPayload(form)) });
      setForm({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
      await Promise.all([loadStats(), loadUsers()]);
      setMessage("User berhasil ditambahkan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menambah user.");
    }
  }, [form, loadStats, loadUsers]);

  const startEdit = useCallback((user: User) => {
    setEditingUserId(user.id);
    setEditForm({
      username: user.username,
      name: user.name,
      password: "",
      role: user.role,
      dailyGenerateLimit: user.dailyGenerateLimit === null || user.dailyGenerateLimit === undefined ? "" : String(user.dailyGenerateLimit)
    });
    setMessage("");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingUserId("");
    setEditForm({ username: "", name: "", password: "", role: "user", dailyGenerateLimit: "" });
  }, []);

  const updateUser = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUserId) return;

    try {
      const payload: { username: string; name: string; role: string; dailyGenerateLimit: number | null; password?: string } = userPayload(editForm);
      if (editForm.password.trim()) payload.password = editForm.password;
      else delete payload.password;
      await api(`/api/admin/users/${editingUserId}`, { method: "PUT", body: JSON.stringify(payload) });
      cancelEdit();
      await Promise.all([loadStats(), loadUsers()]);
      setMessage("User berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memperbarui user.");
    }
  }, [cancelEdit, editForm, editingUserId, loadStats, loadUsers]);

  const removeUser = useCallback(async (id: string) => {
    if (!confirm("Hapus user ini?")) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      await Promise.all([loadStats(), loadUsers()]);
      setMessage("User berhasil dihapus.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus user.");
    }
  }, [loadStats, loadUsers]);

  return (
    <div className="grid gap-6">
      <section>
        <Badge>Admin</Badge>
        <h2 className="mt-3 text-2xl font-semibold">Kelola aplikasi</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Kelola akun pengguna, database dalil terkurasi, dan ringkasan struktur data aplikasi.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <input checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} type="checkbox" />
            Auto-refresh overview
          </label>
          <span>{pageVisible ? "Tab aktif" : "Tab background"}</span>
          {lastLoadedAt && <span>Update terakhir: {new Date(lastLoadedAt).toLocaleTimeString("id-ID")}</span>}
          <Button type="button" className="h-8 bg-secondary px-3 text-xs text-secondary-foreground" onClick={() => void loadAdminPage()}>
            Refresh sekarang
          </Button>
          <Button
            type="button"
            className="h-8 px-3 text-xs"
            onClick={onOpenMonitoring}
            onMouseEnter={onPrefetchMonitoring}
            onFocus={onPrefetchMonitoring}
            onTouchStart={onPrefetchMonitoring}
          >
            Buka monitoring
          </Button>
        </div>
      </section>
      {message && <Notice>{message}</Notice>}
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="User" value={overview?.users ?? 0} />
        <Stat label="Semua naskah" value={overview?.naskah ?? 0} />
        <Stat label="Semua template" value={overview?.templates ?? 0} />
        <Stat label="Dalil curated" value={overview?.dalil ?? 0} />
      </section>
      {overview?.byJenis?.length ? (
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Distribusi naskah</h2>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {overview.byJenis.map((item) => (
              <div key={item.jenis} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">{item.jenis}</span>
                <Badge>{item.total}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      <MemoDalilManagement />
      <MemoUserManagementSection
        users={users}
        form={form}
        editingUserId={editingUserId}
        editForm={editForm}
        onFormChange={setForm}
        onEditFormChange={setEditForm}
        onCreateUser={createUser}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onUpdateUser={updateUser}
        onRemoveUser={removeUser}
      />
    </div>
  );
}

const DalilManagement = memo(function DalilManagement() {
  const [items, setItems] = useState<CuratedDalil[]>([]);
  const [form, setForm] = useState<DalilFormState>(emptyDalilForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<DalilFormState>(emptyDalilForm);
  const [filter, setFilter] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function load(q = filter, nextPage = page) {
    try {
      const search = new URLSearchParams({ status: "all", page: String(nextPage), pageSize: String(pageSize) });
      if (q.trim()) search.set("q", q.trim());
      const data = await api<DalilListResponse>(`/api/admin/dalil?${search.toString()}`);
      setItems(data.data);
      setPage(data.pagination.page);
      setTotal(data.pagination.total);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat database dalil.");
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  useEffect(() => {
    const nextFilter = filterInput.trim();
    const currentFilter = filter.trim();
    if (nextFilter === currentFilter) return;

    const timer = window.setTimeout(() => {
      setFilter(nextFilter);
      void load(nextFilter, 1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filterInput]);

  async function createDalil(event: React.FormEvent) {
    event.preventDefault();
    try {
      const created = await api<{ data: CuratedDalil }>("/api/admin/dalil", { method: "POST", body: JSON.stringify(dalilPayload(form)) });
      setForm(emptyDalilForm);
      if (matchesDalilFilter(created.data, filter)) {
        setTotal((current) => current + 1);
        if (page === 1) {
          setItems((current) => [created.data, ...current].slice(0, pageSize));
        }
      }
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
      const updated = await api<{ data: CuratedDalil }>(`/api/admin/dalil/${editingId}`, { method: "PUT", body: JSON.stringify(dalilPayload(editForm)) });
      setItems((current) => {
        const next = current
          .map((item) => (item.id === editingId ? updated.data : item))
          .filter((item) => matchesDalilFilter(item, filter));
        if (!next.some((item) => item.id === updated.data.id) && matchesDalilFilter(updated.data, filter)) {
          return page === 1 ? [updated.data, ...next].slice(0, pageSize) : next;
        }
        return next;
      });
      cancelEdit();
      setMessage("Dalil berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memperbarui dalil.");
    }
  }

  async function removeDalil(id: string) {
    if (!confirm("Hapus dalil ini dari database curated?")) return;
    try {
      await api(`/api/admin/dalil/${id}`, { method: "DELETE" });
      const nextTotal = Math.max(0, total - 1);
      const nextPage = nextTotal > 0 ? Math.min(page, Math.ceil(nextTotal / pageSize)) : 1;
      setTotal(nextTotal);
      await load(filter, nextPage);
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
              value={filterInput}
              onChange={(event) => setFilterInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const nextFilter = event.currentTarget.value.trim();
                  setFilter(nextFilter);
                  void load(nextFilter, 1);
                }
              }}
              placeholder="sabar, sedekah, QS. Al-Baqarah"
            />
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => {
                const nextFilter = filterInput.trim();
                setFilter(nextFilter);
                void load(nextFilter, 1);
              }}
            >
              Cari
            </Button>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Daftar dalil</h2>
          <Badge>{total} item</Badge>
        </div>
        <div className="grid gap-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Belum ada dalil curated.</p>}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3">
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
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
          <span>
            Halaman {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button type="button" className="bg-secondary text-secondary-foreground" disabled={page <= 1} onClick={() => void load(filter, page - 1)}>
              Sebelumnya
            </Button>
            <Button type="button" className="bg-secondary text-secondary-foreground" disabled={page >= totalPages} onClick={() => void load(filter, page + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      </Card>
      <Modal open={Boolean(editingId)} onClose={cancelEdit} title="Edit dalil curated">
        <DalilForm form={editForm} onChange={setEditForm} onSubmit={updateDalil} submitLabel="Simpan perubahan" onCancel={cancelEdit} />
      </Modal>
    </section>
  );
});

const MemoDalilManagement = DalilManagement;

const UserManagementSection = memo(function UserManagementSection({
  users,
  form,
  editingUserId,
  editForm,
  onFormChange,
  onEditFormChange,
  onCreateUser,
  onStartEdit,
  onCancelEdit,
  onUpdateUser,
  onRemoveUser
}: {
  users: User[];
  form: { username: string; name: string; password: string; role: string; dailyGenerateLimit: string };
  editingUserId: string;
  editForm: { username: string; name: string; password: string; role: string; dailyGenerateLimit: string };
  onFormChange: React.Dispatch<React.SetStateAction<{ username: string; name: string; password: string; role: string; dailyGenerateLimit: string }>>;
  onEditFormChange: React.Dispatch<React.SetStateAction<{ username: string; name: string; password: string; role: string; dailyGenerateLimit: string }>>;
  onCreateUser: (event: React.FormEvent) => void | Promise<void>;
  onStartEdit: (user: User) => void;
  onCancelEdit: () => void;
  onUpdateUser: (event: React.FormEvent) => void | Promise<void>;
  onRemoveUser: (id: string) => void | Promise<void>;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[400px_1fr]">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Tambah user</h2>
        <form onSubmit={onCreateUser} className="grid gap-3">
          <Field label="Username">
            <Input value={form.username} onChange={(event) => onFormChange({ ...form, username: event.target.value })} required />
          </Field>
          <Field label="Nama">
            <Input value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={form.password} onChange={(event) => onFormChange({ ...form, password: event.target.value })} required />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(event) => onFormChange({ ...form, role: event.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Quota generate harian">
            <Input
              type="number"
              min={0}
              value={form.dailyGenerateLimit}
              onChange={(event) => onFormChange({ ...form, dailyGenerateLimit: event.target.value })}
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
                <form onSubmit={onUpdateUser} className="grid flex-1 gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Nama">
                      <Input value={editForm.name} onChange={(event) => onEditFormChange({ ...editForm, name: event.target.value })} required />
                    </Field>
                    <Field label="Username">
                      <Input value={editForm.username} onChange={(event) => onEditFormChange({ ...editForm, username: event.target.value })} required />
                    </Field>
                    <Field label="Role">
                      <Select value={editForm.role} onChange={(event) => onEditFormChange({ ...editForm, role: event.target.value })}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </Field>
                    <Field label="Quota generate harian">
                      <Input
                        type="number"
                        min={0}
                        value={editForm.dailyGenerateLimit}
                        onChange={(event) => onEditFormChange({ ...editForm, dailyGenerateLimit: event.target.value })}
                        placeholder="Kosong = default"
                      />
                    </Field>
                    <Field label="Password baru">
                      <Input
                        type="password"
                        value={editForm.password}
                        onChange={(event) => onEditFormChange({ ...editForm, password: event.target.value })}
                        placeholder="Kosongkan jika tidak diubah"
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button>
                      <IconSave className="size-4" />
                      Simpan
                    </Button>
                    <Button type="button" className="bg-secondary text-secondary-foreground" onClick={onCancelEdit}>
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
                    <IconButton onClick={() => onStartEdit(item)} aria-label="Edit user">
                      <IconPencil className="size-4" />
                    </IconButton>
                    <IconButton onClick={() => onRemoveUser(item.id)} aria-label="Hapus user">
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
  );
});

const MemoUserManagementSection = UserManagementSection;

function matchesDalilFilter(item: CuratedDalil, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [item.reference, item.translation, item.source, item.kind, item.status, ...item.tags].join(" ").toLowerCase().includes(normalizedQuery);
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

function Stat({ label, value }: { label: string | number; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
