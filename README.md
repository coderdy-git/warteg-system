# WSystem — Sistem Manajemen Kas & Keuangan Warteg

**WSystem** adalah aplikasi web *dashboard* keuangan modern yang dirancang khusus untuk operasional harian **Warteg (Warung Tegal)**. Dibangun dengan prinsip **Clean Architecture**, **KISS**, dan **YAGNI** agar ringan, cepat, aman, serta mudah digunakan baik melalui komputer maupun *smartphone* (PWA).

---

## ✨ Fitur Utama

1. **Dashboard Keuangan Terpadu**
   - Pemantauan **Total Saldo Kas** secara *real-time* yang terbagi ke dalam **4 Pos Kas (Sub-Wallet)**:
     - 💵 **Kas di Toko (Laci)** (`tunai_toko`) — Uang tunai operasional kasir harian.
     - 🏦 **Kas Besar (Brankas)** (`tunai_kas_besar`) — Cadangan uang tunai utama pemilik.
     - 📱 **QRIS DANA** (`qris_dana`) — Saldo penerimaan non-tunai via QRIS DANA.
     - 📱 **QRIS GoPay** (`qris_gopay`) — Saldo penerimaan non-tunai via QRIS GoPay.
   - Ringkasan **Pemasukan vs Pengeluaran 7 Hari Terakhir** beserta daftar mutasi terbaru.

2. **Manajemen Transaksi & Pindah Kas (Internal Transfer)**
   - Pencatatan **Pemasukan** dan **Pengeluaran** harian lengkap dengan fitur **Edit**, **Hapus**, **Filter Mutasi**, **Pencarian Cepat**, dan **Pagination**.
   - Fitur **Pindah Kas (Transfer Internal)** antar kantong kas (misalnya setoran malam dari *Kas di Toko* ke *Kas Besar* atau pencairan *QRIS*) secara atomik tanpa menggelembungkan laporan omset/pengeluaran mingguan.

3. **Laporan Keuangan & Ekspor CSV**
   - Filter laporan berdasarkan rentang tanggal (*Start Date* & *End Date*).
   - Ringkasan 3 pilar utama (**Total Pemasukan**, **Total Pengeluaran**, dan **Laba Bersih / Net Profit**).
   - Rincian arus kas bersih (*net cashflow*) per pos kas dan tabel rekapitulasi harian.
   - Unduh laporan langsung ke format **CSV** (siap dibuka di Microsoft Excel / Google Sheets).

4. **Asisten AI Keuangan (DeepSeek LLM)**
   - *Drawer* asisten pintar di sisi kanan layar yang terintegrasi dengan data kas **WSystem** secara langsung.
   - Membantu pemilik menganalisis tren pengeluaran, menghitung rasio profitabilitas, dan memberikan saran efisiensi operasional warteg.

5. **Keamanan & Multi-Environment**
   - Autentikasi berbasis **JWT** & **bcrypt**, dilindungi **Login Rate Limiter** (anti *brute-force*) dan *Security Headers*.
   - Manajemen kata sandi (*Ganti Password*) langsung dari halaman Pengaturan.
   - Indikator *environment* otomatis (**`DEV`**, **`STAGING`**, **`PRODUCTION`**) pada *sidebar*.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, FontAwesome Icons, Plus Jakarta Sans.
- **Backend**: Node.js, Express.js (Modular Clean Architecture), TypeScript, Zod Validation.
- **Database & ORM**:
  - **Development (Lokal)**: SQLite (`dev.db`) + Prisma ORM.
  - **Production (Cloud)**: Supabase PostgreSQL (dengan *Row Level Security*) + Prisma ORM.
- **Deployment**: Netlify (Frontend CDN + Serverless Functions `/api/*`).

---

## 🌿 Struktur Branch Git

Repository ini menggunakan alur kerja 2 *branch* utama:
- **`dev`** — Branch untuk pengembangan (*Development / Staging*). Semua penambahan fitur dan perbaikan kode di-*push* ke branch ini terlebih dahulu.
- **`main`** — Branch utama untuk rilis **Production**. Hanya diperbarui melalui *merge* / *Pull Request* dari branch `dev` yang sudah teruji stabil.

---

## 🚀 Cara Menjalankan di Lokal (Development)

### 1. Jalankan Backend (`http://localhost:3001`)
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### 2. Jalankan Frontend (`http://localhost:5173`)
```bash
cd frontend
npm install
npm run dev
```

> **Akun Login Default**:
> - **Username**: `admin`
> - **Password**: `admin123` *(Segera ubah melalui menu **Pengaturan** setelah login pertama kali)*

---

## ☁️ Konfigurasi Deployment (Netlify + Supabase)

Project ini sudah dilengkapi dengan konfigurasi [netlify.toml](./netlify.toml) dan skema PostgreSQL [schema.production.prisma](./backend/prisma/schema.production.prisma). Saat men-deploy ke **Netlify**, tambahkan *Environment Variables* berikut di dashboard Netlify Anda:

| Variabel | Keterangan |
| :--- | :--- |
| `DATABASE_URL` | URL **Transaction Pooler (Port 6543)** dari Supabase PostgreSQL (`?pgbouncer=true`) |
| `DIRECT_URL` | URL **Session Pooler (Port 5432)** dari Supabase PostgreSQL |
| `JWT_SECRET` | Kunci rahasia acak untuk enkripsi token login JWT |

---

Dibuat dan dikelola oleh **[@coderdy-git](https://github.com/coderdy-git)**.
