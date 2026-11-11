# CanvaLive - GitHub Pages (viewer + admin)

Frontend statis. Backend = Firebase Realtime Database + Cloudinary. Tanpa build step.

## Isi placeholder
| Di mana | Isi apa |
|---|---|
| `js/config.js` -> `FIREBASE_CONFIG` | Firebase Console > Project settings > Your apps > Web > `firebaseConfig` |
| `js/config.js` -> `CLOUDINARY.cloudName` | Cloud name di dashboard Cloudinary |
| `js/config.js` -> `presetImage / presetAudio / presetVideo` | Nama 3 *unsigned upload preset* (lihat bawah) |
| `js/config.js` -> `STREAMER_NAME` | Username TikTok streamer |
| `database.rules.json` | Ganti `GANTI-EMAIL-ADMIN@gmail.com` dengan email admin, lalu paste di Firebase > Realtime Database > Rules |

## Firebase
1. Buat Realtime Database (mode terkunci).
2. Authentication > Sign-in method > aktifkan **Email/Password**, lalu buat 1 user admin (email yang sama dengan di Rules).
3. Authentication > Settings > Authorized domains > tambahkan `USERNAME.github.io`.
4. Aplikasi Android & Termux menulis lewat REST memakai *database secret* (Project settings > Service accounts > Database secrets) di kolom Auth, otomatis melewati Rules.

## Cloudinary (3 unsigned preset)
- image: format png/webp, maks 2 MB. - audio (resource video): format mp3/m4a, maks 1 MB. - video: mp4/webm, maks 8 MB, maks 10 dtk.
- Batas juga dicek di browser (config.js `LIMITS`). File sudah dikompres ke WebP di browser sebelum upload.

## Deploy
Repo GitHub baru > upload semua isi zip > Settings > Pages > Deploy from branch `main` / root.
Viewer: `https://USERNAME.github.io/REPO/` - Admin: `.../admin.html`.

## Keputusan MVP (saran)
- Suara & video custom dimatikan dulu (`FEATURES.sound/video = false`); aktifkan setelah stiker stabil. Video tidak di-encode ulang (hanya cek ukuran/durasi); ffmpeg.wasm bisa ditambah nanti.
- Custom selalu `pending` sampai admin setujui di tab Approve (admin hanya bisa setujui user yang sudah verified).
- Perintah/kandidat wajib lewat cek AI (API key viewer). Upload efek tanpa key -> approve manual.
- BYOK hanya filter awal; benteng akhirnya approve manual + verifikasi chat live + ban username.
- Halaman Status dijadikan tab di halaman viewer.
- Paket gratis Firebase: 100 koneksi simultan; HP 3 memakai 6, Termux beberapa, tiap viewer 1+.
