# KhutbahAI

KhutbahAI adalah aplikasi web full-stack untuk membantu ustaz, khatib, dan dai membuat naskah khutbah, ceramah, dan kultum dengan bantuan AI. Aplikasi ini memiliki backend Hono di bawah path `/api`, database SQLite melalui Drizzle ORM, export PDF/DOCX, penyimpanan file ke RustFS yang kompatibel S3, autentikasi session, role Admin/User, serta frontend React + Tailwind.

## Fitur

- Generate naskah untuk 6 jenis konten: Khutbah Jumat, Idul Fitri, Idul Adha, Khutbah Nikah, Ceramah Umum, dan Kultum.
- Streaming pratinjau hasil AI secara real-time.
- Simpan naskah ke SQLite via Drizzle ORM.
- Riwayat naskah, template parameter favorit, dan export PDF/DOCX.
- Upload file export ke RustFS/S3-compatible storage.
- Login berbasis session dengan role Admin dan User.
- Dashboard statistik, dark mode, dan tampilan responsif.
- API seluruhnya tersedia di prefix `/api`.

## Akun Awal

Database otomatis membuat dua akun saat aplikasi pertama dijalankan:

| Role | Username | Password default |
|---|---|---|
| Admin | `admin` | `admin123` |
| User | `user` | `user123` |

Untuk deployment baru, override password seed dengan `SEED_ADMIN_PASSWORD` dan `SEED_USER_PASSWORD` sebelum aplikasi pertama kali membuat database. Jika akun sudah terlanjur dibuat, ubah password lewat menu Admin.

## Menjalankan dengan Docker

Pastikan Docker dan Docker Compose sudah tersedia, lalu jalankan:

```bash
docker compose up --build
```

Aplikasi tersedia di:

```text
http://localhost:3000
```

RustFS tersedia di port `9000` dan digunakan otomatis oleh aplikasi untuk menyimpan hasil export.

## Menjalankan Lokal dengan Bun

Install dependency:

```bash
bun install
```

Jalankan migrasi/seed database:

```bash
bun run db:migrate
```

Untuk build production dan menjalankan aplikasi di port 3000:

```bash
bun run build
PORT=3000 bun run start
```

Untuk pengembangan, backend dapat dijalankan di port 3000:

```bash
PORT=3000 bun run dev
```

Frontend Vite untuk mode pengembangan:

```bash
bunx vite --host 0.0.0.0
```

Mode production adalah cara paling sederhana untuk memakai frontend dan backend dari satu port `3000`.

## Konfigurasi Environment

Variabel penting:

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port aplikasi |
| `DATABASE_URL` | `./data/khutbah-ai.sqlite` | Lokasi file SQLite |
| `AI_PROVIDER` | `openai` | Provider AI: `openai` untuk OpenAI/OpenRouter atau `gemini` untuk Google AI Studio |
| `OPENAI_API_KEY` | kosong | API key OpenAI/OpenRouter. Jika kosong saat `AI_PROVIDER=openai`, aplikasi memakai generator fallback lokal |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model OpenAI untuk generate |
| `OPENAI_MODELS` | kosong | Opsional. Daftar model prioritas dipisah koma; jika diisi, aplikasi mencoba model berurutan sebelum fallback lokal |
| `OPENAI_BASE_URL` | kosong | Base URL provider kompatibel OpenAI, misalnya OpenRouter |
| `OPENAI_MAX_TOKENS` | `5500` | Plafon global token output AI. Request tetap dibatasi lagi secara dinamis berdasarkan jenis naskah dan durasi |
| `OPENAI_TIMEOUT_MS` | `30000` | Timeout request provider AI dalam milidetik |
| `GEMINI_API_KEY` | kosong | API key Google AI Studio. Dipakai saat `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model Gemini utama |
| `GEMINI_MODELS` | kosong | Opsional. Daftar model Gemini prioritas dipisah koma |
| `SEED_ADMIN_PASSWORD` | `admin123` | Password awal admin saat database kosong |
| `SEED_USER_PASSWORD` | `user123` | Password awal user saat database kosong |
| `S3_ENDPOINT` | `http://localhost:9000` | Endpoint RustFS/S3 |
| `S3_ACCESS_KEY_ID` | `khutbahai` | Access key storage |
| `S3_SECRET_ACCESS_KEY` | `khutbahai-secret` | Secret key storage |
| `S3_BUCKET` | `khutbahai` | Bucket export |
| `S3_PUBLIC_URL` | `http://localhost:9000/khutbahai` | URL publik file export |
| `S3_SIGNED_URL_EXPIRES` | `604800` | Masa berlaku signed link export dalam detik |

Contoh `.env` lokal:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
# GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite

# Untuk OpenAI/OpenRouter, ubah AI_PROVIDER=openai lalu isi konfigurasi berikut:
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# OPENAI_MODELS=model-utama,model-cadangan-1,model-cadangan-2
OPENAI_MAX_TOKENS=5500
OPENAI_TIMEOUT_MS=30000
# Untuk OpenRouter/provider kompatibel:
# OPENAI_BASE_URL=https://openrouter.ai/api/v1
DATABASE_URL=./data/khutbah-ai.sqlite
PORT=3000
SEED_ADMIN_PASSWORD=password-admin-kuat
SEED_USER_PASSWORD=password-user-kuat
```

## Endpoint API

Semua endpoint berada di bawah `/api`.

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | User aktif |
| `POST` | `/api/generate` | Generate non-streaming |
| `POST` | `/api/generate/stream` | Generate streaming |
| `GET` | `/api/naskah` | Riwayat naskah |
| `POST` | `/api/naskah` | Simpan naskah |
| `GET` | `/api/naskah/:id` | Detail naskah |
| `PUT` | `/api/naskah/:id` | Update naskah |
| `DELETE` | `/api/naskah/:id` | Hapus naskah |
| `GET` | `/api/templates` | Daftar template |
| `POST` | `/api/templates` | Simpan template |
| `DELETE` | `/api/templates/:id` | Hapus template |
| `POST` | `/api/export/:id/pdf` | Export PDF |
| `POST` | `/api/export/:id/docx` | Export DOCX |
| `GET` | `/api/stats` | Statistik user |
| `GET` | `/api/admin/stats` | Statistik admin |
| `GET` | `/api/admin/users` | Daftar user |
| `POST` | `/api/admin/users` | Tambah user |
| `PUT` | `/api/admin/users/:id` | Edit user |
| `DELETE` | `/api/admin/users/:id` | Hapus user |

## Struktur Proyek

```text
.
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── src
│   ├── index.ts
│   ├── db
│   ├── routes
│   ├── services
│   ├── utils
│   └── frontend
└── README.md
```

## Catatan Produksi

- Set `OPENAI_API_KEY` agar generate memakai OpenAI. Tanpa key, aplikasi tetap berjalan dengan contoh naskah fallback.
- Untuk OpenRouter/provider kompatibel OpenAI, set juga `OPENAI_BASE_URL` dan gunakan nama model dari provider tersebut.
- Aplikasi tidak memakai satu `max_tokens` besar untuk semua generate. Batas efektif mengikuti durasi: kultum sekitar 1200-2000 token, ceramah 2500-4000 token, dan khutbah Jumat/Id 2500-4500 token, lalu tetap dipotong oleh `OPENAI_MAX_TOKENS`.
- Set `SEED_ADMIN_PASSWORD` dan `SEED_USER_PASSWORD` sebelum database pertama dibuat.
- Pastikan RustFS/S3 bisa diakses dari container `app`.
