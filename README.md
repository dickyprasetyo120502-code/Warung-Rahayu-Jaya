# Warung Rahayu Jaya - Sistem Kasir POS & Administrasi Keuangan (Fullstack)

Proyek ini telah dipisahkan secara bersih menjadi dua folder modular: **`frontend/`** dan **`backend/`**.

---

## 📁 Struktur Folder Proyek

```
warung-rahayu-jaya-main/
├── backend/                  # 🖥️ REST API & Database
│   ├── prisma/
│   │   ├── schema.prisma     # Model PostgreSQL (User, Category, MenuItem, Order, OrderItem)
│   │   └── seed.ts           # Seeder akun admin/kasir & 13 menu makanan/minuman
│   ├── src/
│   │   ├── config/           # Konfigurasi PrismaClient
│   │   ├── controllers/      # Controller Auth, Menu, Order, Report
│   │   ├── middlewares/      # Middleware JWT & Validasi Zod
│   │   ├── routes/           # Endpoint REST API Express
│   │   └── server.ts         # Entry point server Express.js
│   ├── .env                  # Konfigurasi database PostgreSQL & JWT
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # 🌐 Web Kasir POS & Admin Portal
│   ├── public/
│   │   └── images/           # Seluruh aset gambar menu & favicon.jpg
│   ├── src/
│   │   ├── components/       # Komponen UI POS & Admin (TypeScript .tsx)
│   │   ├── context/          # React Context API (AuthContext & CartContext)
│   │   ├── data/             # menuData.ts
│   │   ├── lib/              # Axios API client & utils
│   │   ├── schemas/          # Skema Validasi Zod (auth, menu, order)
│   │   ├── utils/            # authStorage.ts, stockStorage.ts, pdf generator
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css         # Tailwind CSS & Tema Kasir/Admin
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── package.json              # Skrip orkestrasi untuk menjalankan keduanya
└── README.md
```

---

## 🚀 Panduan Menjalankan Sistem

### 1. Menyiapkan Database PostgreSQL Lokal
1. Pastikan service **PostgreSQL 18** aktif di laptop (`services.msc` -> start `postgresql-x64-18`).
2. Buat tabel dan isi data awal:
   ```bash
   npm run prisma:push
   npm run prisma:seed
   ```

### 2. Menjalankan Backend (Express API - Port 5000)
```bash
npm run dev:backend
```
*Atau masuk ke folder backend:*
```bash
cd backend
npm run dev
```

### 3. Menjalankan Frontend (React Vite - Port 5173)
```bash
npm run dev:frontend
```
*Atau masuk ke folder frontend:*
```bash
cd frontend
npm run dev
```

---

## 🔑 Akun Default
- **Admin**: Username: `admin` | Password: `admin123`
- **Kasir**: Username: `kasir` | Password: `kasir123`
