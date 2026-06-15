# Dakwah

Dakwah adalah aplikasi web full-stack untuk membantu ustaz, khatib, dai, dan pengelola kegiatan keislaman membuat naskah khutbah, ceramah, kultum, dan materi dakwah dengan bantuan AI. Aplikasi ini memiliki backend Hono di bawah path `/api`, database SQLite melalui Drizzle ORM, export PDF/DOCX, penyimpanan file ke RustFS yang kompatibel S3, autentikasi session, role Admin/User, serta frontend React + Tailwind.

## Fitur

- Generate naskah untuk 6 jenis konten: Khutbah Jumat, Idul Fitri, Idul Adha, Khutbah Nikah, Ceramah Umum, dan Kultum.
- Streaming pratinjau hasil AI secara real-time.
- Simpan naskah ke SQLite via Drizzle ORM.
- Riwayat naskah, template parameter favorit, dan export PDF/DOCX.
- Editor riwayat dengan autosave draft, status draft/final, snapshot versi, restore versi, dan revisi AI dari naskah tersimpan.
- Quality guard untuk menandai panjang naskah, struktur wajib, bahasa target, konteks, harakat Arab, referensi dalil hasil retrieval, dan kebutuhan tinjauan dai.
- Retrieval dalil dari database curated, myQuran API untuk ayat Al-Qur'an dan Ensiklopedia Hadis, dengan cache SQLite dan fallback dalil tematik lokal.
- Database dalil curated otomatis di-seed dari paket dalil tematik aplikasi. Admin dapat menambahkan tag tema manual, status kurasi `draft/reviewed/approved/archived`, dan mengaktifkan/nonaktifkan dalil.
- Generator hanya memakai dalil curated berstatus `approved`; jika belum ada, sistem mencoba myQuran lalu fallback lokal.
- Pipeline generate bertahap: retrieval dalil, kerangka internal, generate, validasi quality guard, repair otomatis saat dalil/struktur bermasalah, lalu natural rewrite tanpa mengubah dalil.
- Upload file export ke RustFS/S3-compatible storage.
- Login berbasis session dengan role Admin dan User, registrasi mandiri dengan captcha, serta lupa/reset kata sandi via email.
- Dashboard statistik, monitoring admin, quota generate harian per user, dark mode, dan tampilan responsif.
- Rate limit untuk endpoint auth dan generate.
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

## Publish Image ke GHCR

Workflow `.github/workflows/docker-publish.yml` otomatis build Docker image dan push ke GitHub Container Registry saat ada push ke branch `main` atau tag `v*.*.*`.

Image default:

```text
ghcr.io/aantriono82/dakwah:latest
```

Tag yang dibuat:

- `latest` untuk branch default.
- `main` untuk push ke branch `main`.
- `sha-<commit>` untuk rollback spesifik.
- `vX.Y.Z` untuk release tag.

Untuk pull image private dari VPS, login dulu ke GHCR memakai GitHub token yang punya akses package:

```bash
docker login ghcr.io
```

Siapkan file `.env` di VPS dari contoh production:

```bash
cp .env.prod.example .env
```

Contoh deploy di VPS dengan compose production:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Untuk rollback ke commit tertentu:

```bash
APP_IMAGE=ghcr.io/aantriono82/dakwah:sha-<commit> docker compose -f docker-compose.prod.yml up -d
```

## Deploy ke Arcane dengan 2 Project

Untuk VPS yang menjalankan Arcane, struktur yang direkomendasikan adalah:

- `dakwah-app`: aplikasi full-stack satu container
- `dakwah-rustfs`: storage export

Port yang dipakai:

- app: `127.0.0.1:3100 -> 3000`
- rustfs: `127.0.0.1:9100 -> 9000`

File deploy final sudah disiapkan di [`deploy/arcane/README.md`](/home/aantriono/Dev/dakwah/deploy/arcane/README.md), termasuk:

- compose terpisah untuk `dakwah-app` dan `dakwah-rustfs`
- template env wajib
- urutan deploy
- catatan reverse proxy dan rollback

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

Untuk menjalankan quality gate lokal:

```bash
bun run check
```

## QA Browser

Setelah aplikasi berjalan, jalankan smoke test UI:

```bash
bun run qa:ui
```

Default test memakai `http://localhost:3000`, akun `admin/admin123`, dan menyimpan screenshot di `/tmp/dakwah-ui-smoke`.
Override jika perlu:

```bash
UI_SMOKE_URL=http://localhost:3000 \
UI_SMOKE_USERNAME=admin \
UI_SMOKE_PASSWORD=password-admin \
UI_SMOKE_SCREENSHOT_DIR=/tmp/dakwah-ui-smoke \
bun run qa:ui
```

Smoke test UI saat ini juga memverifikasi flow quick fix:
- `Riwayat` menampilkan tombol quick fix saat quality guard mendeteksi masalah editorial.
- Klik `Perbaiki fokus tema` membuat versi baru dengan label `Quick fix: fokus tema`.
- Halaman `Generate` dapat menjalankan quick fix draft tanpa harus menyimpan naskah terlebih dahulu.

Screenshot utama yang perlu dicek:
- `history-quick-fix-before.png`
- `history-quick-fix-after.png`
- `generate-quick-fix-before.png`
- `generate-quick-fix-after.png`

Jika ingin menjalankan smoke test pada build production lokal yang terpisah:

```bash
bun run build
PORT=3021 bun dist/server/index.js
UI_SMOKE_URL=http://localhost:3021 bun run qa:ui
```

Troubleshooting QA:
- Jika provider AI seperti Gemini/OpenAI kena quota, smoke test quick fix masih bisa lolos karena backend akan fallback ke konten saat ini. Dalam kondisi itu, yang divalidasi adalah wiring UI, request API, status loading, pesan sukses/error, snapshot versi, dan panel quality.
- Jika `PORT=3021` sudah dipakai proses lain, gunakan port lain lalu samakan nilai `UI_SMOKE_URL`.
- Jika screenshot tidak muncul, cek apakah Chrome headless tersedia di `google-chrome`. Override dengan `UI_SMOKE_CHROME_PATH` jika binary ada di lokasi lain.
- Jika login smoke test gagal, pastikan akun seed masih sesuai atau override `UI_SMOKE_USERNAME` dan `UI_SMOKE_PASSWORD`.
- Jika flow quick fix gagal muncul di UI, cek kembali data smoke: quick fix hanya tampil bila `qualityReport` memang memiliki warning editorial/dalil/bahasa yang relevan.

## Konfigurasi Environment

Variabel penting:

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port aplikasi |
| `DATABASE_URL` | `./data/dakwah.sqlite` | Lokasi file SQLite |
| `APP_PUBLIC_URL` | `http://localhost:3000` | URL publik aplikasi untuk link reset password |
| `CORS_ORIGINS` | kosong | Allowlist origin dipisah koma. Jika kosong, development menerima origin request dan production hanya menerima `APP_PUBLIC_URL` |
| `AUTH_COOKIE_SECURE` | mengikuti `NODE_ENV` | Pakai cookie secure. Set `true` jika production memakai HTTPS |
| `AUTH_COOKIE_SAMESITE` | `Lax` | Nilai SameSite cookie session: `Lax`, `Strict`, atau `None` |
| `AUTH_COOKIE_DOMAIN` | kosong | Domain cookie session jika aplikasi berjalan di subdomain tertentu |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | Window rate limit auth dalam milidetik |
| `AUTH_RATE_LIMIT_MAX` | `30` | Maksimal request auth per window per IP |
| `GOOGLE_OAUTH_CLIENT_ID` | kosong | Client ID Google OAuth. Jika ini dan secret diisi, tombol Google aktif |
| `GOOGLE_OAUTH_CLIENT_SECRET` | kosong | Client secret Google OAuth |
| `GOOGLE_OAUTH_REDIRECT_URL` | `${APP_PUBLIC_URL}/api/auth/google/callback` | Redirect URI yang harus didaftarkan di Google Cloud Console |
| `AUTH_CAPTCHA_PROVIDER` | `manual` | Provider captcha registrasi: `manual` atau `turnstile` |
| `TURNSTILE_SITE_KEY` | kosong | Site key Cloudflare Turnstile. Dipakai hanya jika `AUTH_CAPTCHA_PROVIDER=turnstile` |
| `TURNSTILE_SECRET_KEY` | kosong | Secret key Cloudflare Turnstile untuk verifikasi token backend jika provider `turnstile` |
| `GENERATE_RATE_LIMIT_WINDOW_MS` | `60000` | Window rate limit generate dalam milidetik |
| `GENERATE_RATE_LIMIT_MAX` | `6` | Maksimal request generate per window per user |
| `DEFAULT_DAILY_GENERATE_LIMIT` | `50` | Quota generate harian default per user. `0` berarti unlimited |
| `MYQURAN_ENABLED` | `true` | Aktifkan retrieval dalil dari myQuran sebelum generate AI |
| `MYQURAN_API_BASE_URL` | `https://api.myquran.com/v3` | Base URL myQuran API v3 |
| `MYQURAN_TIMEOUT_MS` | `2500` | Timeout request myQuran dalam milidetik. Jika gagal, aplikasi memakai fallback lokal |
| `MYQURAN_CACHE_TTL_SECONDS` | `2592000` | TTL cache respons myQuran di SQLite |
| `AI_PROVIDER` | `openai` | Provider AI: `openai` untuk OpenAI/OpenRouter atau `gemini` untuk Google AI Studio |
| `OPENAI_API_KEY` | kosong | API key OpenAI/OpenRouter. Jika kosong saat `AI_PROVIDER=openai`, aplikasi memakai generator fallback lokal |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model OpenAI untuk generate |
| `OPENAI_MODELS` | kosong | Opsional. Daftar model prioritas dipisah koma; jika diisi, aplikasi mencoba model berurutan sebelum fallback lokal |
| `OPENAI_BASE_URL` | kosong | Base URL provider kompatibel OpenAI, misalnya OpenRouter |
| `OPENAI_MAX_TOKENS` | `9000` | Plafon global token output AI. Request tetap dibatasi lagi secara dinamis berdasarkan jenis naskah dan durasi |
| `OPENAI_TIMEOUT_MS` | `30000` | Timeout request provider AI dalam milidetik |
| `OPENAI_WEB_SEARCH_ENABLED` | `true` untuk OpenAI resmi | Izinkan web search native OpenAI Responses API ketika user memilih mode `Web search otomatis`. Fitur native ini hanya dipakai saat `OPENAI_BASE_URL` kosong |
| `OPENAI_WEB_SEARCH_CONTEXT_SIZE` | `medium` | Ukuran konteks web search: `low`, `medium`, atau `high` |
| `WEB_RESEARCH_ENABLED` | `true` | Aktifkan pencarian/crawl server-side untuk provider kompatibel seperti DeepSeek saat user memilih mode `Web search otomatis` |
| `WEB_RESEARCH_SEARCH_ENABLED` | `true` | Izinkan backend melakukan pencarian web bila user tidak memberi URL langsung |
| `WEB_RESEARCH_MAX_RESULTS` | `4` | Jumlah maksimum halaman yang diringkas untuk dikirim sebagai konteks AI |
| `WEB_RESEARCH_TIMEOUT_MS` | `7000` | Timeout per request pencarian/crawl web dalam milidetik |
| `GEMINI_API_KEY` | kosong | API key Google AI Studio. Dipakai saat `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model Gemini utama |
| `GEMINI_MODELS` | kosong | Opsional. Daftar model Gemini prioritas dipisah koma |
| `RESEND_API_KEY` | kosong | API key Resend untuk email reset password. Jika kosong, link reset dicetak ke log server |
| `EMAIL_FROM` | `Dakwah <onboarding@resend.dev>` | Sender email reset password |
| `RESET_PASSWORD_DEBUG_LINK` | `false` | Jika `true` di non-production, API forgot password mengembalikan link reset untuk testing |
| `SEED_ADMIN_PASSWORD` | `admin123` | Password awal admin saat database kosong |
| `SEED_USER_PASSWORD` | `user123` | Password awal user saat database kosong |
| `S3_ENDPOINT` | `http://localhost:9000` | Endpoint RustFS/S3 |
| `S3_ACCESS_KEY_ID` | `dakwah` | Access key storage |
| `S3_SECRET_ACCESS_KEY` | `dakwah-secret` | Secret key storage |
| `S3_BUCKET` | `dakwah` | Bucket export |
| `S3_PUBLIC_URL` | `http://localhost:9000/dakwah` | URL publik file export |
| `S3_SIGNED_URL_EXPIRES` | `604800` | Masa berlaku signed link export dalam detik |
| `S3_REQUIRED` | `false` | Jika `true`, export gagal dengan error jelas saat upload ke RustFS/S3 gagal. Docker Compose mengaktifkan ini. |

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
OPENAI_MAX_TOKENS=9000
OPENAI_TIMEOUT_MS=30000
OPENAI_WEB_SEARCH_ENABLED=true
OPENAI_WEB_SEARCH_CONTEXT_SIZE=medium
WEB_RESEARCH_ENABLED=true
WEB_RESEARCH_SEARCH_ENABLED=true
WEB_RESEARCH_MAX_RESULTS=4
WEB_RESEARCH_TIMEOUT_MS=7000
# Untuk OpenRouter/provider kompatibel:
# OPENAI_BASE_URL=https://openrouter.ai/api/v1
DATABASE_URL=./data/dakwah.sqlite
PORT=3000
APP_PUBLIC_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
DEFAULT_DAILY_GENERATE_LIMIT=50
SEED_ADMIN_PASSWORD=password-admin-kuat
SEED_USER_PASSWORD=password-user-kuat
```

## Endpoint API

Semua endpoint berada di bawah `/api`.

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/health/storage` | Health check RustFS/S3 dan bucket export |
| `GET` | `/api/config` | Konfigurasi publik untuk frontend |
| `GET` | `/api/auth/captcha` | Captcha registrasi |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/register` | Registrasi user baru |
| `POST` | `/api/auth/forgot-password` | Kirim instruksi reset password |
| `POST` | `/api/auth/reset-password` | Simpan password baru dari token reset |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | User aktif |
| `POST` | `/api/generate` | Generate non-streaming |
| `POST` | `/api/generate/stream` | Generate streaming |
| `POST` | `/api/generate/review` | Hitung quality report untuk draft hasil generate |
| `POST` | `/api/generate/refine` | Revisi draft hasil generate tanpa menyimpan ke riwayat |
| `GET` | `/api/dalil/search?jenis=ceramah&tema=Sabar` | Cek retrieval dalil tematik |
| `POST` | `/api/dalil/search` | Cek retrieval dalil dengan body `{ jenis, parameters }` |
| `GET` | `/api/naskah` | Riwayat naskah |
| `POST` | `/api/naskah` | Simpan naskah |
| `GET` | `/api/naskah/:id` | Detail naskah |
| `PUT` | `/api/naskah/:id` | Update naskah |
| `GET` | `/api/naskah/:id/versions` | Daftar snapshot versi naskah |
| `POST` | `/api/naskah/:id/versions/:versionId/restore` | Restore naskah dari versi lama |
| `POST` | `/api/naskah/:id/refine` | Revisi naskah tersimpan dengan AI dan simpan versi baru |
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
| `GET` | `/api/admin/dalil` | Daftar database dalil curated |
| `POST` | `/api/admin/dalil` | Tambah dalil curated dan tag tema |
| `PUT` | `/api/admin/dalil/:id` | Edit dalil curated |
| `DELETE` | `/api/admin/dalil/:id` | Hapus dalil curated |

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
- Web search tersedia untuk OpenAI resmi ketika `OPENAI_WEB_SEARCH_ENABLED=true`, `OPENAI_BASE_URL` kosong, dan user memilih mode `Web search otomatis` di kartu parameter.
- Untuk DeepSeek/OpenRouter/provider kompatibel, aplikasi memakai crawler server-side `WEB_RESEARCH_*`: backend mencari/membuka halaman web, mengambil ringkasan, lalu mengirim ringkasan itu sebagai konteks ke model. Mode manual tidak membuka URL; field sumber internet hanya memakai teks/ringkasan yang ditulis user.
- Untuk OpenRouter/provider kompatibel OpenAI, set juga `OPENAI_BASE_URL` dan gunakan nama model dari provider tersebut. Native OpenAI web search tidak dipakai pada mode ini; gunakan `WEB_RESEARCH_*` untuk pencarian/crawl server-side.
- Aplikasi tidak memakai satu `max_tokens` besar untuk semua generate. Batas efektif mengikuti durasi: kultum sekitar 1600-2800 token, ceramah 3600-7000 token, dan khutbah Jumat/Id 3600-7200 token, lalu tetap dipotong oleh `OPENAI_MAX_TOKENS`.
- Set `SEED_ADMIN_PASSWORD` dan `SEED_USER_PASSWORD` sebelum database pertama dibuat.
- Set `APP_PUBLIC_URL`, `CORS_ORIGINS`, dan konfigurasi cookie sesuai domain/HTTPS production.
- Isi `RESEND_API_KEY` dan `EMAIL_FROM` jika fitur reset password harus benar-benar mengirim email.
- Atur `DEFAULT_DAILY_GENERATE_LIMIT` dan override quota per user dari menu Admin jika diperlukan.
- Pastikan RustFS/S3 bisa diakses dari container `app`. Cek dengan `GET /api/health/storage`.
- Untuk production, set `S3_REQUIRED=true` agar kegagalan upload export tidak diam-diam menghasilkan URL kosong.

Checklist sebelum production:

- Ganti `SEED_ADMIN_PASSWORD` dan `SEED_USER_PASSWORD` sebelum database pertama dibuat.
- Set `S3_REQUIRED=true` dan cek `GET /api/health/storage`.
- Set provider AI dan API key yang benar.
- Biarkan `MYQURAN_ENABLED=true` agar prompt AI memakai dalil hasil retrieval. Retrieval memprioritaskan database dalil curated berstatus `approved` yang dikelola Admin, lalu myQuran, lalu fallback dalil tematik lokal.
- Jalankan `bun run check` dan `bun run qa:ui`.
- Pastikan file `.env` tidak ikut dipublish.
