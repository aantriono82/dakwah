import type React from "react";
import { useEffect, useState } from "react";
import { Pencil, Save, Trash2, Users, X } from "lucide-react";
import { Badge, Button, Card, Field, IconButton, Input, Notice, Select } from "../components/ui";
import { api } from "../lib/utils";
import type { User } from "../types";

type AdminStats = {
  users: number;
  naskah: number;
  templates: number;
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
              <Users className="size-4" />
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
                        <Save className="size-4" />
                        Simpan
                      </Button>
                      <Button type="button" className="bg-secondary text-secondary-foreground" onClick={cancelEdit}>
                        <X className="size-4" />
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
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton onClick={() => removeUser(item.id)} aria-label="Hapus user">
                        <Trash2 className="size-4" />
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
