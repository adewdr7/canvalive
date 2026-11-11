import { CLOUDINARY, LIMITS } from "./config.js";

const loadImg = (file) =>
  new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); res(i); };
    i.onerror = () => rej(new Error("Gambar tidak bisa dibuka"));
    i.src = url;
  });

const toBlob = (cv, q) => new Promise((r) => cv.toBlob(r, "image/webp", q));

/**
 * Kompres gambar di browser (WebP, tanpa EXIF karena digambar ulang ke canvas).
 * mode: "crop" (potong tengah) | "fit" (utuh + latar blur) | "stretch" | "keep" (jaga rasio, maks w x h, alpha aman)
 */
export async function processImage(file, { w, h, mode = "crop", quality = 0.75 }) {
  if (!/^image\/(png|webp|jpeg)$/.test(file.type)) throw new Error("Format harus PNG / WebP / JPG");
  const img = await loadImg(file);
  const cv = document.createElement("canvas");
  let ctx;
  if (mode === "keep") {
    const s = Math.min(w / img.width, h / img.height, 1);
    cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
  } else {
    cv.width = w; cv.height = h;
    ctx = cv.getContext("2d");
    if (mode === "crop") {
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else if (mode === "fit") {
      const sb = Math.max(w / img.width, h / img.height);
      ctx.filter = "blur(18px)";
      ctx.drawImage(img, (w - img.width * sb) / 2, (h - img.height * sb) / 2, img.width * sb, img.height * sb);
      ctx.filter = "none";
      const s = Math.min(w / img.width, h / img.height);
      ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
    } else {
      ctx.drawImage(img, 0, 0, w, h);
    }
  }
  let blob = await toBlob(cv, quality);
  if (blob.size > LIMITS.imageMaxKB * 1024) blob = await toBlob(cv, 0.5);
  if (blob.size > LIMITS.imageMaxKB * 1024) throw new Error("Gambar masih > " + LIMITS.imageMaxKB + " KB, pakai gambar lebih sederhana");
  return blob;
}

export async function sha1(blob) {
  const d = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function mediaDuration(file) {
  return new Promise((res, rej) => {
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => { URL.revokeObjectURL(el.src); res(el.duration); };
    el.onerror = () => rej(new Error("Media tidak bisa dibaca"));
    el.src = URL.createObjectURL(file);
  });
}

/** kind: "image" | "audio" | "video". Mengembalikan secure_url. */
export async function uploadCloudinary(blob, kind) {
  const preset = kind === "image" ? CLOUDINARY.presetImage : kind === "audio" ? CLOUDINARY.presetAudio : CLOUDINARY.presetVideo;
  const type = kind === "image" ? "image" : "video"; // audio juga lewat resource "video"
  const fd = new FormData();
  fd.append("file", blob);
  fd.append("upload_preset", preset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${type}/upload`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Upload gagal (" + r.status + ")");
  const j = await r.json();
  return j.secure_url;
}
