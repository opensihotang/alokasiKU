# AlokasiKu — React + Vite

Aplikasi pembukuan progres pembayaran rumah tangga. Seluruh proses berjalan di browser tanpa backend/database.

## Menjalankan lokal

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

## Deploy ke Vercel

1. Push folder project ini ke GitHub.
2. Import repository di Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

`vercel.json` sudah menyertakan rewrite untuk SPA.

## Penyimpanan data

Data disimpan otomatis ke LocalStorage browser. Gunakan Backup JSON secara berkala untuk memindahkan/menyelamatkan data. LocalStorage tidak tersinkron antar-browser/perangkat dan dapat terhapus jika data situs dibersihkan.

## Struktur

- `src/App.jsx`: UI, state, interaksi, dan alur aplikasi.
- `src/data.js`: data awal, konstanta, validasi, dan kalkulasi.
- `src/styles.css`: Tailwind directives dan responsive overrides.
- `src/main.jsx`: React entry point.
