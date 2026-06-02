# Ringkasan Aplikasi: KhutbahAI 🕌

## Gambaran Umum

Aplikasi web full-stack yang membantu ustaz, khatib, dan dai dalam membuat naskah khutbah, ceramah, dan kultum secara otomatis menggunakan AI. Dilengkapi penyimpanan file menggunakan RustFS (kompatibel S3) dan database SQLite via Drizzle ORM, serta dapat dijalankan sepenuhnya dengan Docker.

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
| AI Engine          | **OpenAI API**             |

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

### 3. Generate & Pratinjau
- Streaming output secara real-time dari Claude API
- Pratinjau naskah langsung saat teks dihasilkan
- Opsi regenerate jika hasil kurang sesuai

### 4. Simpan & Export
- Simpan naskah ke database SQLite via Drizzle ORM
- Upload dokumen PDF/DOCX ke RustFS
- Bagikan link atau unduh file

---

## 6 Jenis Konten & Parameternya

### 🕌 Khutbah Jumat
- Tema utama & sub-tema
- Ayat Al-Quran referensi
- Durasi (pendek / sedang / panjang)
- Bahasa (Indonesia / Jawa / Sunda / Arab)
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
| **AI Generate** | Streaming real-time naskah via Claude API |
| **Template System** | Simpan parameter favorit sebagai template yang bisa dipakai ulang |
| **Riwayat** | Semua naskah tersimpan di database dan bisa diakses kembali kapan saja |
| **Export** | Unduh naskah dalam format PDF atau DOCX |
| **File Storage** | Naskah & dokumen disimpan di RustFS (S3-compatible) |

### 🛠️ Technical Features
| Fitur | Deskripsi |
|---|---|
| **Autentikasi** | Login dengan username & password (session-based) |
| **Multi-role** | 2 role: Admin dan User (lihat tabel di bawah) |
| **Multi-bahasa** | Dukungan output dalam Bahasa Indonesia, Jawa, dan Sunda |
| **Responsive UI** | Tampilan mobile-friendly, nyaman dibaca langsung di mimbar |
| **Dark Mode** | Mode gelap untuk kemudahan membaca di malam hari |
| **Docker Ready** | Satu perintah `docker compose up` untuk menjalankan seluruh stack |

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
│   │   ├── generate.ts       # Endpoint AI generate (streaming)
│   │   ├── naskah.ts         # CRUD naskah
│   │   └── export.ts         # PDF/DOCX export & RustFS upload
│   ├── services/
│   │   ├── openai.ts         # OpenAI API client
│   │   └── storage.ts        # RustFS S3 client
│   └── frontend/
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Generate.tsx
│       │   └── History.tsx
│       └── components/
│           ├── JenisCard.tsx
│           ├── FormKhutbah.tsx
│           └── NaskahPreview.tsx
└── public/
```

---

## Roadmap Pengembangan

- [ ] Setup project & Docker Compose
- [ ] Konfigurasi Drizzle + SQLite schema
- [ ] Integrasi RustFS (S3 client)
- [ ] Backend Hono: auth, generate (streaming), CRUD naskah
- [ ] Frontend ShadcnUI: dashboard, form per jenis, pratinjau, riwayat
- [ ] Fitur export PDF/DOCX
- [ ] Template system
- [ ] Dark mode & responsive polish
- [ ] Testing & deployment
