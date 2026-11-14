# DATABASE ARCHITECTURE & ENVIRONMENT SPECIFICATIONS (FOR AI AGENTS & DEVELOPERS)

> **PENTING UNTUK AI AGENT / DEVELOPER**:
> Dokumen ini menjelaskan aturan pembagian database multi-environment pada project **WSystem**. 
> Jangan mencampuradukkan schema data atau mengubah konfigurasi database URL tanpa membaca panduan ini.

---

## 1. Ringkasan Pembagian Database (Multi-Environment)

Project ini menggunakan arsitektur **3-Tier Database Separation** untuk memastikan data operasional warteg di Production aman 100% dari perubahan atau uji coba di Development/Staging:

| Environment | Lokasi Database | Engine / Driver | Schema | Scope & URL |
| :--- | :--- | :--- | :--- | :--- |
| **Local Development** | Lokal (`backend/prisma/dev.db`) | SQLite (`file:./dev.db`) | `main` | `http://localhost:5173` |
| **Online Dev / Staging** | Supabase Cloud (`warteg system`) | PostgreSQL 17 (Pooler 6543) | **`dev`** | `https://dev--wsystem-warteg.netlify.app` |
| **Production** | Supabase Cloud (`warteg system`) | PostgreSQL 17 (Pooler 6543) | **`public`** | `https://wsystem-warteg.netlify.app` |

---

## 2. Detail Database Supabase Cloud (`warteg system`)

- **Project Name**: `warteg system`
- **Project Ref / ID**: `vqwblfhfitbciiolicfq`
- **Region**: `ap-south-1`
- **Host**: `aws-0-ap-south-1.pooler.supabase.com`

### Pembagian Schema PostgreSQL:
1. **Schema `public` (Production)**:
   - Digunakan **HANYA** oleh branch `main` pada live production (`wsystem-warteg.netlify.app`).
   - Berisi data transaksi riil kasir warteg.
   - Tabel: `public."User"`, `public."Transaction"`, `public."AppSetting"`.
   - Parameter URL: `.../postgres?pgbouncer=true&schema=public`

2. **Schema `dev` (Online Staging)**:
   - Digunakan oleh branch `dev` pada staging URL (`dev--wsystem-warteg.netlify.app`).
   - Tempat aman untuk testing fitur, migration test, atau dummy transaction.
   - Tabel: `dev."User"`, `dev."Transaction"`, `dev."AppSetting"`.
   - Parameter URL: `.../postgres?pgbouncer=true&schema=dev`

---

## 3. Akun Login Default & Kredensial Awal

Kedua schema di Supabase (`public` dan `dev`) serta database lokal telah disiapkan akun awal:

* **Username**: `admin`
* **Default Password**: `admin123`
* **Role**: `owner`
* **Algoritma Password**: `bcrypt` (kompatibel dengan modul backend `bcryptjs` dan fungsi PostgreSQL `crypt('admin123', gen_salt('bf', 10))`).

---

## 4. Konfigurasi di Netlify (Context-Scoped Variables)

Netlify secara otomatis menginjeksi environment variable database sesuai branch yang di-build:

* **Deploy Context `production` (Branch `main`)**:
  - `DATABASE_URL`: mengarah ke schema `public`.
  - `DIRECT_URL`: mengarah ke schema `public`.
  - `VITE_APP_ENV`: `production` (menampilkan badge **PRODUCTION** di sidebar).

* **Deploy Context `branch-deploy` (Branch `dev`)**:
  - `DATABASE_URL`: mengarah ke schema `dev`.
  - `DIRECT_URL`: mengarah ke schema `dev`.
  - `VITE_APP_ENV`: `staging` (menampilkan badge **STAGING** di sidebar).

---

## 5. Instruksi Khusus untuk AI Agent

1. **Aturan Git Branch**:
   - Selalu commit dan push ke branch **`dev`**.
   - **DILARANG MERGE / PUSH KE BRANCH `main`** kecuali ada persetujuan eksplisit dari user (*"merge ke main"* / *"deploy production"*).
2. **Schema Migration**:
   - Jika membuat migrasi DDL baru via Supabase MCP, jalankan migrasi untuk schema `dev` terlebih dahulu untuk validasi sebelum menerapkannya ke schema `public`.
3. **Penyimpanan Secret**:
   - Jangan pernah meletakkan password database atau JWT secret di dalam file yang di-commit ke Git. Gunakan Netlify MCP / Supabase MCP untuk mengelola environment variables.
