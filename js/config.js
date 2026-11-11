// ================= PLACEHOLDER: ISI SEMUA NILAI "GANTI" =================
// 1) Firebase Console > Project settings > Your apps (Web) > salin firebaseConfig
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCOFLGtj5qEfk1bMviuywQz5k7sJ633Cq8",
    authDomain: "canvalivetiktok.firebaseapp.com",
    databaseURL: "https://canvalivetiktok-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "canvalivetiktok",
    storageBucket: "canvalivetiktok.firebasestorage.app",
    messagingSenderId: "1090669725027",
    appId: "1:1090669725027:web:b6c66d2a538d9cab7b3f56"
  };

// 2) Cloudinary > Settings > Upload > Upload presets (mode Unsigned)
//    Buat 3 preset (batasi ukuran & format di dashboard, lihat README):
export const CLOUDINARY = {
  cloudName: "GANTI-CLOUD-NAME",
  presetImage: "GANTI-preset-gambar",   // max 2 MB, format png/webp
  presetAudio: "GANTI-preset-suara",    // resource type video, max 1 MB, max 5 dtk
  presetVideo: "GANTI-preset-video",    // max 8 MB, max 10 dtk
};

// 3) Nama TikTok streamer (tampil di halaman viewer)
export const STREAMER_NAME = "GANTI-USERNAME-STREAMER";

// 4) Saran MVP: stiker/gambar dulu. Aktifkan suara & video setelah stabil (konsep bagian 19).
export const FEATURES = { image: true, sound: false, video: false };

// 5) Model AI untuk moderasi BYOK (key milik viewer sendiri, disimpan di browser mereka)
export const GEMINI_MODEL = "gemini-2.0-flash";

// Batas (jangan diubah tanpa mengubah aplikasi Android juga)
export const LIMITS = {
  maxVariants: 5, perintahMax: 60, nameMax: 15, waNameMax: 16, waMsgMax: 80,
  imageMaxKB: 500, soundMaxKB: 1024, videoMaxKB: 8192, videoMaxSec: 10,
};

export const INTERACTIONS = [
  ["lottie", "Lottie"], ["fake_call", "Fake Call"], ["error_screen", "Layar Error"],
  ["jj", "JJ (premium)"], ["dvd", "DVD"], ["wa_notif", "Notifikasi WA"],
  ["close_game", "Close Game"], ["sticker", "Stiker"],
  ["perintah_in_game", "Perintah In-Game"], ["perintah_fisikal", "Perintah Fisikal"],
];

export const LOTTIE_CATEGORIES = [
  "cuaca_alam", "ekspresi_wajah", "gestur_tangan", "hati_cinta",
  "hewan", "makanan_minuman", "olahraga_permainan", "simbol_umum", "zodiak",
];
