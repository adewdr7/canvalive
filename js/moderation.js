import { GEMINI_MODEL } from "./config.js";

const KEY = "canvalive_gemini_key";
export const getKey = () => localStorage.getItem(KEY) || "";
export const setKey = (k) => localStorage.setItem(KEY, k.trim());
export const clearKey = () => localStorage.removeItem(KEY);

// System prompt DIKUNCI di kode (viewer hanya mengisi API key).
const SYSTEM = `Kamu moderator ketat untuk overlay live TikTok game MLBB.
TOLAK jika ada: porn, vulgar, kekerasan, darah, SARA, politik, ujaran kebencian, judi, rokok, alkohol, narkoba.
TOLAK jika ada promosi: QR code, link, "follow aku", "cek bio", username lain, iklan.
TOLAK jika ada foto wajah orang asli selain pengguna, foto artis, logo brand besar, potongan lagu artis / musik berhak cipta.
Untuk perintah fisikal: tolak jika bahaya, berlebihan, atau membuat tidak nyaman. Batas push-up/squat maks 10x, minum maks 1 gelas. Tolak jika menyuruh buka baju.
Untuk perintah in-game: tolak jika menghina, SARA, atau jorok.
Balas HANYA JSON: {"allowed": true|false, "reason": "alasan singkat bahasa Indonesia"}`;

const b64 = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

/** return {skipped:true} jika tidak ada key; else {allowed, reason} */
export async function moderate({ text = "", blob = null, kind = "teks" }) {
  const key = getKey();
  if (!key) return { skipped: true };
  const parts = [{ text: `Jenis konten: ${kind}\n${text ? "Teks: " + text : ""}` }];
  if (blob) parts.push({ inline_data: { mime_type: blob.type || "application/octet-stream", data: await b64(blob) } });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error("AI error " + res.status + " (cek API key)");
  const j = await res.json();
  const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  let o = {};
  try { o = JSON.parse(raw.replace(/```json|```/g, "")); } catch { o = {}; }
  return { skipped: false, allowed: o.allowed === true, reason: o.reason || "Ditolak AI" };
}
