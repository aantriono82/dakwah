# Deploy Arcane

Struktur split service untuk VPS/Arcane:

- `dakwah-rustfs`
- `dakwah-db`
- `dakwah-api`
- `dakwah-web`

SQLite tetap dipakai sebagai file database. Service `dakwah-db` bukan database server TCP, melainkan sidecar maintenance/backup yang mount volume SQLite yang sama dengan `dakwah-api`.

Semua service memakai external Docker network yang sama:

- `dakwah-net`

## Port dan volume

### `dakwah-rustfs`

- Container port: `9000`
- Host bind: `127.0.0.1:9100:9000`
- Volume persisten: `dakwah-rustfs-data -> /data`

### `dakwah-db`

- Tidak expose port
- Volume SQLite: `dakwah-sqlite-data -> /data`
- Volume backup: `dakwah-sqlite-backups -> /backups`
- Backup default: setiap 24 jam, retensi 14 hari

### `dakwah-api`

- Container port: `3000`
- Host bind: `127.0.0.1:3200:3000`
- Volume SQLite: `dakwah-sqlite-data -> /app/data`
- Database SQLite: `/app/data/dakwah.sqlite`
- `SERVE_FRONTEND=false`, sehingga container ini hanya melayani API

### `dakwah-web`

- Container port: `80`
- Host bind: `127.0.0.1:3100:80`
- Serve static frontend dari Nginx
- Proxy `/api/*` ke `http://dakwah-api:3000`

## File yang dipakai

- Compose web: [`deploy/arcane/dakwah-web.compose.yml`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-web.compose.yml)
- Compose api: [`deploy/arcane/dakwah-api.compose.yml`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-api.compose.yml)
- Compose db: [`deploy/arcane/dakwah-db.compose.yml`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-db.compose.yml)
- Compose rustfs: [`deploy/arcane/dakwah-rustfs.compose.yml`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-rustfs.compose.yml)
- Env web: [`deploy/arcane/dakwah-web.env.example`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-web.env.example)
- Env api: [`deploy/arcane/dakwah-api.env.example`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-api.env.example)
- Env db: [`deploy/arcane/dakwah-db.env.example`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-db.env.example)
- Env rustfs: [`deploy/arcane/dakwah-rustfs.env.example`](/home/aantriono/Dev/dakwah/deploy/arcane/dakwah-rustfs.env.example)

Dockerfile tambahan:

- API: [`Dockerfile.api`](/home/aantriono/Dev/dakwah/Dockerfile.api)
- Web: [`Dockerfile.web`](/home/aantriono/Dev/dakwah/Dockerfile.web)
- SQLite maintenance: [`Dockerfile.sqlite-db`](/home/aantriono/Dev/dakwah/Dockerfile.sqlite-db)

Image default yang dipakai Arcane:

- `ghcr.io/aantriono82/dakwah-api:latest`
- `ghcr.io/aantriono82/dakwah-web:latest`
- `ghcr.io/aantriono82/dakwah-sqlite-db:latest`

Pastikan workflow Docker sudah publish image tersebut ke GHCR sebelum deploy. Jika package GHCR masih private, login dulu di VPS:

```bash
docker login ghcr.io
```

## Troubleshooting Dokploy/Arcane pull image

Jika redeploy gagal dengan pesan seperti:

```text
failed to pull image dakwah-api:local: pull access denied
```

berarti project sedang memakai image lokal (`dakwah-api:local`) sebagai nilai `API_IMAGE` atau fallback compose. Untuk deploy registry, pastikan env project berisi:

```env
API_IMAGE=ghcr.io/aantriono82/dakwah-api:latest
```

atau tag immutable yang sudah dipublish oleh GitHub Actions:

```env
API_IMAGE=ghcr.io/aantriono82/dakwah-api:sha-<commit>
```

Jangan pakai `dakwah-api:local` kecuali image tersebut memang sudah dibuild langsung di VPS dengan nama yang sama.

## Env wajib

### `dakwah-rustfs`

- `RUSTFS_SECRET_KEY`

Samakan dengan env API:

- `RUSTFS_ACCESS_KEY` == `S3_ACCESS_KEY_ID`
- `RUSTFS_SECRET_KEY` == `S3_SECRET_ACCESS_KEY`

### `dakwah-api`

Wajib diisi:

- `APP_PUBLIC_URL`
- `CORS_ORIGINS`
- `SEED_ADMIN_PASSWORD`
- `SEED_USER_PASSWORD`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_URL`

Opsional tapi umum dipakai di production:

- `AUTH_COOKIE_DOMAIN`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `AUTH_CAPTCHA_PROVIDER` (`manual` default, `turnstile` untuk Cloudflare Turnstile)
- `TURNSTILE_SITE_KEY` jika `AUTH_CAPTCHA_PROVIDER=turnstile`
- `TURNSTILE_SECRET_KEY` jika `AUTH_CAPTCHA_PROVIDER=turnstile`
- `OPENAI_API_KEY` atau `DEEPSEEK_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`

### `dakwah-web`

- `API_UPSTREAM=http://dakwah-api:3000`

### `dakwah-db`

Default sudah cukup untuk backup lokal:

- `DATABASE_PATH=/data/dakwah.sqlite`
- `BACKUP_DIR=/backups`
- `BACKUP_INTERVAL_SECONDS=86400`
- `BACKUP_RETENTION_DAYS=14`

## Urutan deploy di Arcane

1. Buat external Docker network `dakwah-net` di VPS.
2. Buat project `dakwah-rustfs`.
3. Pakai `deploy/arcane/dakwah-rustfs.compose.yml`.
4. Isi env dari `deploy/arcane/dakwah-rustfs.env.example`.
5. Deploy `dakwah-rustfs`.
6. Buat project `dakwah-db`.
7. Pakai `deploy/arcane/dakwah-db.compose.yml`.
8. Isi env dari `deploy/arcane/dakwah-db.env.example`.
9. Deploy `dakwah-db`.
10. Buat project `dakwah-api`.
11. Pakai `deploy/arcane/dakwah-api.compose.yml`.
12. Isi env dari `deploy/arcane/dakwah-api.env.example`.
13. Pastikan `S3_ENDPOINT=http://dakwah-rustfs:9000`.
14. Pastikan `S3_PUBLIC_URL=https://dakwah-storage.aantriono.com/dakwah`.
15. Deploy `dakwah-api`.
16. Buat project `dakwah-web`.
17. Pakai `deploy/arcane/dakwah-web.compose.yml`.
18. Isi env dari `deploy/arcane/dakwah-web.env.example`.
19. Pastikan `API_UPSTREAM=http://dakwah-api:3000`.
20. Deploy `dakwah-web`.
21. Arahkan reverse proxy domain app ke `127.0.0.1:3100`.
22. Jika file export harus bisa diunduh user, arahkan subdomain storage ke `127.0.0.1:9100`.

## Reverse proxy

Konfigurasi minimum:

- `dakwah.aantriono.com` -> `127.0.0.1:3100`
- `dakwah-storage.aantriono.com` -> `127.0.0.1:9100`

Browser hanya mengakses domain app. Nginx di `dakwah-web` akan proxy `/api/*` ke `dakwah-api`, jadi frontend tetap memakai path relatif `/api`.

## Network

Buat network sekali saja di VPS sebelum deploy:

```bash
docker network create dakwah-net
```

Semua compose memakai:

```yaml
networks:
  dakwah-net:
    external: true
```

Endpoint internal antar service:

- `dakwah-web` -> `http://dakwah-api:3000`
- `dakwah-api` -> `http://dakwah-rustfs:9000`

## Catatan SQLite

- Jangan scale `dakwah-api` ke lebih dari 1 replica.
- `dakwah-api` adalah satu-satunya writer utama ke SQLite.
- `dakwah-db` hanya menjalankan backup memakai SQLite `.backup`.
- Volume `dakwah-sqlite-data` diberi nama eksplisit agar bisa dipakai lintas project Arcane.

## Rollback

Jika memakai registry image, rollback cukup ganti tag image di env:

```env
API_IMAGE=ghcr.io/aantriono82/dakwah-api:sha-<commit>
WEB_IMAGE=ghcr.io/aantriono82/dakwah-web:sha-<commit>
SQLITE_DB_IMAGE=ghcr.io/aantriono82/dakwah-sqlite-db:sha-<commit>
```

Lalu redeploy project terkait. Volume SQLite dan data RustFS tetap dipertahankan.
