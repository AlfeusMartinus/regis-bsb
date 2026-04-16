# Asset Guide - `bwai` (Build With AI)

## Tujuan
Menyimpan semua asset yang diperlukan untuk branding event `bwAI` agar bisa dipakai oleh template publik tanpa mengubah logic input/pembayaran.

## Cara pakai di code (Vite)
Di JSX/TSX, referensikan asset pakai path absolut seperti:

- `'/assets/events/bwai/logo.svg'`
- `'/assets/events/bwai/ornament.json'`

Path tersebut didefinisikan di `src/themes/events/bwai/assets.ts`.

## Rekomendasi export dari Figma
1. Logo & ilustrasi statis: export ke `SVG` (lebih tajam, size kecil) atau `PNG`.
2. Ikon: export `SVG` (idealnya bisa diubah warnanya via CSS kalau perlu).
3. Lottie: export ke `json` dan taruh sebagai file `ornament.json` (atau nama sesuai kebutuhan).

## Checklist sebelum layout baru dibuat
- [ ] Semua file SVG/PNG/Lottie sudah masuk folder ini
- [ ] Font `Google Sans` sudah ter-load (lihat `EventThemeProvider` + halaman publik)
- [ ] Warna palette (hex) di `src/themes/events/bwai/palette.ts` sudah sesuai Figma final

