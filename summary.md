# Ringkasan Aplikasi: Dakwah

## Gambaran Umum

Aplikasi web full-stack yang membantu ustaz, khatib, dan dai membuat naskah khutbah, ceramah, kultum, dan materi dakwah dengan bantuan AI. Aplikasi ini memakai backend Hono, frontend React + Tailwind, database SQLite via Drizzle ORM, export PDF/DOCX, quality guard, retrieval dalil, snapshot versi naskah, dan storage RustFS/S3-compatible.

---

## Stack Teknologi

| Layer              | Teknologi                  |
|--------------------|----------------------------|
| Runtime            | **Bun**                    |
| Backend Framework  | **Hono**                   |
| Frontend Styling   | **Tailwind CSS + ShadcnUI** |
| ORM                | **Drizzle ORM**            |
| Database           | **SQLite**                 |
| File Storage       | **RustFS** (S3-compatible) |
| Containerisasi     | **Docker + Docker Compose** |
| AI Engine          | **OpenAI-compatible / Gemini + fallback lokal** |

---

## Alur Aplikasi

```
Pengguna → Pilih Jenis → Isi Form → Generate AI → Pratinjau → Simpan/Export
```

### 1. Halaman Utama (Dashboard)
- Kartu pilihan 6 jenis konten (Khutbah Jumat, Idul Fitri, Idul Adha, Nikah, Ceramah, Kultum)
- Riwayat naskah yang pernah dibuat
- Statistik penggunaan

### 2. Form Input (per jenis)
- Pengguna mengisi parameter yang relevan sesuai jenis konten yang dipilih
- Validasi input sebelum dikirim ke AI

### 3. Generate, Quality Guard, & Pratinjau
- Streaming output secara real-time dari provider AI
- Prompt memakai retrieval dalil, kerangka internal, dan repair otomatis bila struktur/dalil bermasalah
- Quality guard menilai struktur, bahasa, dalil, panjang, konteks, dan harakat Arab
- Pratinjau naskah tampil langsung saat teks dihasilkan
- Quick fix editorial tersedia untuk fokus tema, bahasa, dan dalil

### 4. Simpan & Export
- Simpan naskah ke database SQLite via Drizzle ORM
- Upload dokumen PDF/DOCX ke RustFS
- Bagikan link atau unduh file
- Snapshot versi tersimpan untuk restore dan audit revisi

---

## 6 Jenis Konten & Parameternya

### 🕌 Khutbah Jumat
- Tema utama & sub-tema
- Ayat Al-Quran referensi
- Durasi (pendek / sedang / panjang)
- Bahasa (Indonesia / Jawa / Sunda / Ogan (Baturaja) / Arab)
- **Output:** Khutbah 1 + Khutbah 2 + doa penutup

### 🌙 Khutbah Idul Fitri
- Tema (syukur, taqwa, silaturahmi, dll.)
- Nuansa (haru, semangat, reflektif)
- Momen spesifik (pasca pandemi, tahun politik, dll.)
- **Output:** Naskah lengkap + takbir pembuka

### 🐄 Khutbah Idul Adha
- Tema (pengorbanan, keikhlasan, haji, dll.)
- Kisah nabi sebagai referensi
- **Output:** Naskah lengkap + doa kurban

### 💍 Khutbah Nikah
- Nama mempelai (pria & wanita)
- Tema pesan pernikahan
- Hadits/ayat tentang pernikahan
- Nuansa (formal / hangat / puitis)
- **Output:** Khutbah nikah + nasihat mempelai

### 🎤 Ceramah Umum
- Topik bebas
- Target audiens (remaja, dewasa, lansia, campuran)
- Setting (masjid, kampus, kantor, online)
- Durasi ceramah
- **Output:** Naskah ceramah + poin-poin kunci

### ☀️ Kultum
- Topik singkat
- Waktu (subuh / maghrib / tarawih)
- **Output:** Naskah kultum 5–7 menit

---

## Fitur Utama

### ✨ Core Features
| Fitur | Deskripsi |
|---|---|
| **AI Generate** | Streaming real-time naskah via provider AI dengan fallback lokal |
| **Template System** | Simpan parameter favorit sebagai template yang bisa dipakai ulang |
| **Riwayat** | Semua naskah tersimpan di database dan bisa diakses kembali kapan saja |
| **Export** | Unduh naskah dalam format PDF atau DOCX |
| **File Storage** | Naskah & dokumen disimpan di RustFS (S3-compatible) |
| **Quick Fix** | Perbaiki fokus tema, bahasa, atau dalil langsung dari quality panel |

### 🛠️ Technical Features
| Fitur | Deskripsi |
|---|---|
| **Autentikasi** | Login dengan username & password (session-based) |
| **Multi-role** | 2 role: Admin dan User (lihat tabel di bawah) |
| **Multi-bahasa** | Dukungan output dalam Bahasa Indonesia, Jawa, Sunda, Ogan (Baturaja), dan Arab |
| **Responsive UI** | Tampilan mobile-friendly, nyaman dibaca langsung di mimbar |
| **Dark Mode** | Mode gelap untuk kemudahan membaca di malam hari |
| **Docker Ready** | Satu perintah `docker compose up` untuk menjalankan seluruh stack |
| **Quality Guard** | Laporan kualitas dengan metrik struktur, bahasa, dalil, konteks, dan editorial |
| **Dalil Retrieval** | Prioritas: curated dalil admin → myQuran → fallback tematik lokal |
| **Versioning** | Snapshot versi otomatis saat simpan manual, refine AI, restore, dan quick fix |
| **QA Browser** | Smoke test UI untuk flow dashboard, riwayat, admin, dan quick fix |

---

## Role & Hak Akses

| Fitur | Admin | User |
|---|:---:|:---:|
| Login & logout | ✅ | ✅ |
| Generate naskah | ✅ | ✅ |
| Lihat & kelola naskah sendiri | ✅ | ✅ |
| Export PDF / DOCX | ✅ | ✅ |
| Simpan template | ✅ | ✅ |
| Lihat semua naskah semua user | ✅ | ❌ |
| Kelola user (tambah, edit, hapus) | ✅ | ❌ |
| Monitoring penggunaan & statistik | ✅ | ❌ |
| Hapus naskah milik user lain | ✅ | ❌ |

---

## Struktur Docker Compose

```yaml
services:
  app:       # Bun + Hono (port 3000) — backend API & frontend serving
  rustfs:    # RustFS S3-compatible storage (port 9000) — penyimpanan file
```

> SQLite berjalan langsung di dalam container `app` sebagai file-based database, tanpa perlu service terpisah.

---

## Struktur Folder Proyek

```
khutbahAI/
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── src/
│   ├── index.ts              # Entry point Hono
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema (users, naskah, templates)
│   │   └── migrate.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── generate.ts       # Generate, review draft, refine draft
│   │   ├── naskah.ts         # CRUD naskah, versioning, refine tersimpan
│   │   └── export.ts         # PDF/DOCX export & RustFS upload
│   ├── services/
│   │   ├── openai.ts         # Provider AI, rewrite, repair, refine
│   │   └── storage.ts        # RustFS S3 client
│   ├── utils/
│   │   ├── content.ts        # Prompt builder, fallback naskah, dalil tematik
│   │   └── quality.ts        # Quality report dan validasi editorial
│   └── frontend/
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Generate.tsx
│       │   └── History.tsx
│       └── components/
│           ├── JenisCard.tsx
│           ├── FormKhutbah.tsx
│           ├── NaskahPreview.tsx
│           └── QualityPanel.tsx
├── scripts/
│   └── ui-smoke.ts           # Smoke test browser untuk flow utama dan quick fix
└── README.md
```

---

## Status Fitur

- [x] Generate 6 jenis naskah dengan streaming
- [x] Retrieval dalil dan fallback tematik lokal
- [x] Quality guard + quick fix editorial
- [x] CRUD naskah, versioning, restore, dan refine AI
- [x] Export PDF/DOCX + upload storage
- [x] Template system
- [x] Admin panel, user management, dan kurasi dalil
- [x] API test dan smoke test UI
