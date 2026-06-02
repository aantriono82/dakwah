import type React from "react";
import { useEffect, useState } from "react";
import { Trash2, Users } from "lucide-react";
import { Button, Card, Field, IconButton, Input, Select } from "../components/ui";
import { api } from "../lib/utils";
import type { User } from "../types";

export function Admin() {
  const [stats, setStats] = useState<{ users: number; naskah: number; templates: number; byJenis: { jenis: string; total: number }[] } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "user" });
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [statsData, usersData] = await Promise.all([
        api<{ data: typeof stats }>("/api/admin/stats"),
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
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ username: "", name: "", password: "", role: "user" });
      await load();
      setMessage("User berhasil ditambahkan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menambah user.");
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
      {message && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="User" value={stats?.users ?? 0} />
        <Stat label="Semua naskah" value={stats?.naskah ?? 0} />
        <Stat label="Semua template" value={stats?.templates ?? 0} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
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
            <Button>
              <Users className="size-4" />
              Simpan user
            </Button>
          </form>
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Daftar user</h2>
          <div className="grid gap-2">
            {users.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.username} - {item.role}
                  </p>
                </div>
                <IconButton onClick={() => removeUser(item.id)} aria-label="Hapus user">
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            ))}
          </div>
        </Card>
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
