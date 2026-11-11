import { $, h, uKey, uLabel, get, set, watch, push, tx, toast, tabs, db, dbm } from "./fb.js";
import { STREAMER_NAME, FEATURES, LIMITS } from "./config.js";
import { getKey, setKey, clearKey, moderate } from "./moderation.js";
import { processImage, sha1, uploadCloudinary, mediaDuration } from "./media.js";

$("#sub").textContent = "Streamer: " + STREAMER_NAME;
let me = localStorage.getItem("cl_user") || "";   // userKey
let verified = false, unlocked = {}, voteS = null, gifts = {};

// ---------- Daftar & verifikasi ----------
const code6 = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
async function enter(key) {
  me = key; localStorage.setItem("cl_user", key);
  let u = await get("users/" + key);
  if (!u) { u = { verified: false, verify_code: code6(), created_at: Date.now() }; await set("users/" + key, u); }
  $("#uname").value = uLabel(key);
  $("#regBox").hidden = false; $("#code").textContent = u.verify_code;
  watch("users/" + key, (v) => {
    verified = !!(v && v.verified);
    $("#vstat").className = verified ? "ok" : "warn";
    $("#vstat").textContent = verified ? "✅ Terverifikasi" : "⏳ Menunggu verifikasi… (ketik kode di chat live)";
    $("#code").hidden = verified;
    renderAll();
  });
  watch("unlocked/" + key, (v) => { unlocked = v || {}; renderAll(); });
  watch("perintah_queue", () => renderStatus());
  watch("custom_effects/" + key, () => renderStatus());
}
$("#btnReg").onclick = async () => {
  const k = uKey($("#uname").value);
  if (!/^[a-z0-9_,]{2,30}$/.test(k)) return toast("Username tidak valid", true);
  try { await enter(k); } catch (e) { toast(e.message, true); }
};
const keyState = () => ($("#keyState").textContent = getKey() ? "✅ API key tersimpan di browser ini" : "Belum ada key → upload menunggu approve manual");
$("#keySave").onclick = () => { setKey($("#key").value); $("#key").value = ""; keyState(); };
$("#keyDel").onclick = () => { clearKey(); keyState(); };
keyState();

// ---------- Efek custom ----------
const MODES = [["crop", "Crop tengah (aman buat muka)"], ["fit", "Utuh + latar blur"], ["stretch", "Tarik paksa (hanya background)"]];
const TYPES = {
  fake_call: { label: "Fake Call", img: { f: "profile_url", w: 500, h: 500, modes: true, label: "Foto profil (1:1)" },
    fields: [{ k: "caller_name", label: "Nama (maks 15, emoji = 2)", max: LIMITS.nameMax }] },
  error_screen: { label: "Layar Error", img: { f: "meme_url", w: 720, h: 720, modes: true, opt: true, label: "Foto meme (khusus mode meme)" },
    fields: [{ k: "error_mode", label: "Mode", opts: ["blue", "black", "meme"] }] },
  dvd: { label: "DVD", img: { f: "image_url", w: 300, h: 300, keep: true, label: "Gambar transparan (maks 300x300)" },
    fields: [{ k: "speed", label: "Kecepatan", opts: ["slow", "normal", "fast"] }] },
  wa_notif: { label: "Notifikasi WA", img: { f: "profile_url", w: 500, h: 500, modes: true, opt: true, label: "Foto profil (opsional)" },
    fields: [{ k: "name", label: "Nama (maks 16)", max: LIMITS.waNameMax }, { k: "message", label: "Pesan (maks 80)", max: LIMITS.waMsgMax }] },
  sticker: { label: "Stiker", img: { f: "sticker_url", w: 300, h: 300, keep: true, label: "Stiker transparan (maks 300x300)" }, fields: [],
    sound: true },
};
if (FEATURES.video) TYPES.jj = { label: "JJ (premium)", video: true, fields: [] };
const etype = $("#etype");
Object.entries(TYPES).forEach(([k, v]) => etype.append(h("option", { value: k }, v.label)));
etype.onchange = () => { $("#variants").replaceChildren(); addVariant(); };

watch("gift_catalog", (v) => {
  gifts = v || {};
  const sel = $("#egift"); sel.replaceChildren();
  const names = [...new Set(Object.values(gifts).map((g) => g.gift_name))].sort();
  (names.length ? names : ["(streamer belum mencatat gift)"]).forEach((n) => sel.append(h("option", { value: n }, n)));
});

function addVariant() {
  const t = TYPES[etype.value], box = $("#variants");
  if (box.children.length >= LIMITS.maxVariants) return toast("Maksimal " + LIMITS.maxVariants + " varian", true);
  const els = { fields: {} };
  const card = h("div", { class: "variant" }, h("b", {}, "Varian " + (box.children.length + 1)));
  for (const f of t.fields) {
    const input = f.opts ? h("select", {}, f.opts.map((o) => h("option", { value: o }, o))) : h("input", { maxlength: f.max, placeholder: f.label });
    els.fields[f.k] = input; card.append(h("label", {}, f.label), input);
  }
  if (t.img) {
    els.file = h("input", { type: "file", accept: "image/png,image/webp,image/jpeg" });
    card.append(h("label", {}, t.img.label), els.file);
    if (t.img.modes) { els.mode = h("select", {}, MODES.map(([v, l]) => h("option", { value: v }, l))); card.append(h("label", {}, "Cara pas 1:1"), els.mode); }
  }
  if (t.video) { els.file = h("input", { type: "file", accept: "video/mp4,video/webm" }); card.append(h("label", {}, "Video (mp4/webm, maks 10 dtk, 8 MB, tanpa lagu artis)"), els.file); }
  if (t.sound && FEATURES.sound) { els.sound = h("input", { type: "file", accept: "audio/mpeg,audio/mp4" }); card.append(h("label", {}, "Suara (maks 5 dtk, 1 MB)"), els.sound); }
  card._els = els; box.append(card);
}
$("#addVar").onclick = addVariant;

$("#sendFx").onclick = async () => {
  if (!me) return toast("Daftar dulu", true);
  const type = etype.value, t = TYPES[type], gift = $("#egift").value, btn = $("#sendFx");
  const cards = [...$("#variants").children];
  btn.disabled = true; const msg = (s) => ($("#fxMsg").textContent = s);
  try {
    const variants = {}; let manual = false, n = 0;
    for (const card of cards) {
      n++; msg(`Memproses varian ${n}/${cards.length}…`);
      const e = card._els, v = { id: "v" + n, enabled: true };
      let blob = null, kind = "image";
      for (const [k, el] of Object.entries(e.fields)) {
        v[k] = el.value.trim();
        if (el.maxLength > 0 && el.value.length > el.maxLength) throw new Error("Teks terlalu panjang");
      }
      if (type === "fake_call" && !v.caller_name) throw new Error("Nama wajib diisi");
      if (e.file && e.file.files[0]) {
        const f = e.file.files[0];
        if (t.video) {
          kind = "video";
          if (f.size > LIMITS.videoMaxKB * 1024) throw new Error("Video > 8 MB");
          const d = await mediaDuration(f); if (d > LIMITS.videoMaxSec) throw new Error("Video > 10 detik");
          v.duration = Math.ceil(d); blob = f;
        } else blob = await processImage(f, { w: t.img.w, h: t.img.h, mode: t.img.keep ? "keep" : e.mode.value });
      } else if (t.img && !t.img.opt) throw new Error("Varian " + n + ": file wajib dipilih");
      const texts = Object.values(v).filter((x) => typeof x === "string").join(" | ");
      if (blob || texts) {
        msg(`Cek moderasi varian ${n}…`);
        const r = await moderate({ text: texts, blob, kind: "efek " + type });
        if (r.skipped) manual = true; else if (!r.allowed) throw new Error("Varian " + n + " ditolak AI: " + r.reason);
      }
      if (blob) {
        msg(`Upload varian ${n}…`);
        v.hash = await sha1(blob);
        const url = await uploadCloudinary(blob, kind);
        v[t.video ? "video_url" : t.img.f] = url;
      }
      if (e.sound && e.sound.files[0]) {
        const s = e.sound.files[0], d = await mediaDuration(s);
        if (d > 5 || s.size > LIMITS.soundMaxKB * 1024) throw new Error("Suara maks 5 dtk / 1 MB");
        const r = await moderate({ blob: s, kind: "sound" }); if (r.skipped) manual = true; else if (!r.allowed) throw new Error("Suara ditolak AI: " + r.reason);
        v.sound_url = await uploadCloudinary(s, "audio");
      }
      variants["v" + n] = v;
    }
    await set(`custom_effects/${me}/${type}`, { effect_type: type, trigger_gift: gift, pick_mode: "random", status: "pending", verified: false, needs_manual: manual, variants, created_at: Date.now() });
    msg("✅ Terkirim. Menunggu approve streamer."); toast("Terkirim!");
  } catch (e) { msg("❌ " + e.message); toast(e.message, true); }
  btn.disabled = false;
};
addVariant();

// ---------- Perintah (TTS) ----------
const TPL = { in_game: ["Next match wajib Layla", "Wajib Miya", "Ban Fanny"], fisikal: ["Push-up 5x", "Minum air", "Squat 5x"] };
function renderSlots() {
  const box = $("#slots"); box.replaceChildren(h("h2", {}, "Perintah untuk streamer"));
  if (!me) return box.append(h("p", { class: "muted" }, "Daftar dulu di tab Daftar."));
  if (!verified) return box.append(h("p", { class: "warn" }, "Verifikasi dulu (kode di chat live)."));
  const types = ["in_game", "fisikal"].filter((t) => (unlocked[t + "_slots"] || 0) > 0);
  if (voteS && voteS.active) return box.append(h("p", { class: "warn" }, "Mode vote aktif, buka tab Vote."));
  if (!types.length) return box.append(h("p", { class: "muted" }, "Belum ada slot. Kirim gift yang ditentukan streamer (1 gift = 1 slot = 1 perintah, tidak ada refund jika ditolak streamer)."));
  for (const t of types) {
    const inp = h("input", { maxlength: LIMITS.perintahMax, placeholder: t === "in_game" ? "Perintah next match" : "Perintah fisikal" });
    box.append(h("label", {}, (t === "in_game" ? "In-Game (Next Match)" : "Fisikal (Sekarang)") + " • slot " + unlocked[t + "_slots"]), inp,
      h("div", { class: "chips" }, TPL[t].map((x) => h("button", { class: "chip", onclick: () => (inp.value = x) }, x))),
      h("button", { class: "b", onclick: (ev) => sendPerintah(t, inp, ev.target) }, "Kirim"));
  }
}
async function sendPerintah(type, inp, btn) {
  const text = inp.value.trim(); if (!text) return;
  if (!getKey()) return toast("Perintah wajib lewat cek AI: isi API key di tab Daftar", true);
  btn.disabled = true;
  try {
    const r = await moderate({ text, kind: "perintah " + type });
    if (!r.allowed) throw new Error("Ditolak AI: " + r.reason + " (slot tetap utuh)");
    const res = await tx(`unlocked/${me}/${type}_slots`, (n) => (n > 0 ? n - 1 : undefined));
    if (!res.committed) throw new Error("Slot habis");
    await push("perintah_queue", { username: me, type, text, status: "queued", ts: Date.now() });
    inp.value = ""; toast("Terkirim ke streamer!");
  } catch (e) { toast(e.message, true); }
  btn.disabled = false;
}

// ---------- Vote ----------
watch("vote_session", (v) => { voteS = v; renderVote(); renderSlots(); });
setInterval(() => voteS && voteS.active && renderVote(), 1000);
function renderVote() {
  const box = $("#votebox"); box.replaceChildren(h("h2", {}, "Vote perintah"));
  const v = voteS;
  if (!v || !v.active) return box.append(h("p", { class: "muted" }, "Vote belum dibuka streamer." + (v && v.result && !v.result.none ? " Pemenang terakhir: " + v.result.text : "")));
  const left = Math.max(0, Math.round((v.phase_ends_at - Date.now()) / 1000));
  box.append(h("p", { class: "ok" }, (v.phase === "voting" ? "Voting" : "Kumpul kandidat") + " • " + left + " dtk"));
  if (!verified) return box.append(h("p", { class: "warn" }, "Verifikasi dulu."));
  const cands = v.candidates || {}, votes = v.votes || {};
  if (v.phase === "collect") {
    if (cands[me]) return box.append(h("p", {}, "Kandidatmu: " + cands[me].text));
    if (!((unlocked.in_game_slots || 0) + (unlocked.fisikal_slots || 0))) return box.append(h("p", { class: "muted" }, "Kandidat hanya dari yang punya slot gift."));
    const inp = h("input", { maxlength: LIMITS.perintahMax, placeholder: "Wajib Miya" });
    box.append(inp, h("button", { class: "b", onclick: async (ev) => {
      if (!getKey()) return toast("Isi API key dulu (tab Daftar)", true);
      ev.target.disabled = true;
      try {
        const r = await moderate({ text: inp.value, kind: "kandidat vote" });
        if (!r.allowed) throw new Error("Ditolak AI: " + r.reason);
        await set(`vote_session/candidates/${me}`, { username: me, text: inp.value.trim() });
      } catch (e) { toast(e.message, true); }
      ev.target.disabled = false;
    } }, "Ajukan kandidat"));
  } else {
    const cnt = {}; Object.values(votes).forEach((c) => (cnt[c] = (cnt[c] || 0) + 1));
    for (const [id, c] of Object.entries(cands)) {
      box.append(h("button", { class: "b" + (votes[me] === id ? "" : " g"), disabled: !!votes[me], onclick: async () => {
        try { await set(`vote_session/votes/${me}`, id); } catch (e) { toast("Gagal vote", true); }
      } }, `${c.text}  (${cnt[id] || 0})`));
    }
    if (votes[me]) box.append(h("p", { class: "muted" }, "Kamu sudah vote ✅"));
  }
}

// ---------- Status ----------
async function renderStatus() {
  const box = $("#statusbox"); box.replaceChildren();
  if (!me) return box.append(h("div", { class: "card" }, "Daftar dulu."));
  const fx = (await get("custom_effects/" + me)) || {};
  box.append(h("div", { class: "card" }, h("h2", {}, "Akun"), h("p", {}, uLabel(me) + (verified ? " ✅ terverifikasi" : " ⏳ belum verifikasi")),
    h("p", { class: "muted" }, `Slot: in-game ${unlocked.in_game_slots || 0}, fisikal ${unlocked.fisikal_slots || 0}`)));
  box.append(h("div", { class: "card" }, h("h2", {}, "Efek custom"),
    Object.keys(fx).length ? Object.entries(fx).map(([k, v]) => h("p", {}, `${k} → ${v.trigger_gift}: ${v.status === "active" ? "✅ aktif" : v.status === "rejected" ? "❌ ditolak" : "⏳ menunggu approve"}`)) : h("p", { class: "muted" }, "Belum ada")));
  const q = (await dbm.get(dbm.query(dbm.ref(db, "perintah_queue"), dbm.orderByChild("username"), dbm.equalTo(me)))).val() || {};
  box.append(h("div", { class: "card" }, h("h2", {}, "Perintahmu"),
    Object.values(q).sort((a, b) => b.ts - a.ts).slice(0, 8).map((p) => h("p", {}, `${p.text} — ${{ queued: "antri", active: "dibacakan", done: "selesai ✅", rejected: "ditolak streamer ❌" }[p.status] || p.status}`))));
}
function renderAll() { renderSlots(); renderStatus(); }

tabs([["daftar", "👤 Daftar"], ["efek", "🎨 Efek"], ["perintah", "🗣 Perintah"], ["vote", "🗳 Vote"], ["status", "📋 Status"]], (id) => { if (id === "status") renderStatus(); });
if (me) enter(me).catch((e) => toast(e.message, true));
