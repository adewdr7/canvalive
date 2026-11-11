import { $, h, uKey, uLabel, get, set, watch, push, toast, tabs, auth, authm } from "./fb.js";
import { INTERACTIONS, LOTTIE_CATEGORIES } from "./config.js";

$("#go").onclick = async () => {
  try { await authm.signInWithEmailAndPassword(auth, $("#em").value, $("#pw").value); }
  catch (e) { toast("Gagal masuk: " + e.code, true); }
};
let started = false;
authm.onAuthStateChanged(auth, (u) => {
  $("#login").hidden = !!u; $("#app").hidden = !u; $("nav.tabs").hidden = !u;
  $("#who").textContent = u ? u.email : "Belum masuk";
  if (u && !started) { started = true; start(); }
});

function start() {
  tabs([["gift", "🎁 Gift"], ["approve", "✅ Approve"], ["ctrl", "⚙ Kontrol"]]);
  watch("gift_catalog", (c) => watchMap(c || {}));
  watch("custom_effects", renderApprove);
  renderCtrl();
}

// ---------- Atur Gift ----------
let catalog = {}, gmap = {}, rules = {};
function watchMap(c) { catalog = c; Promise.all([get("gift_map"), get("lottie_per_gift")]).then(([m, r]) => { gmap = m || {}; rules = r || {}; renderGifts(); }); }
function renderGifts() {
  const box = $("#giftbox"); box.replaceChildren();
  box.append(h("div", { class: "card" }, h("h2", {}, "Atur Gift"),
    h("p", { class: "muted" }, "Gift muncul otomatis setelah live pertama (mode catat di Termux). Ubah mapping kapan saja, berlaku langsung tanpa rebuild APK."),
    h("div", { class: "row" }, h("input", { id: "mid", placeholder: "gift_id manual" }), h("input", { id: "mnm", placeholder: "nama gift" })),
    h("button", { class: "b g", onclick: async () => { const id = $("#mid").value.trim(), n = $("#mnm").value.trim(); if (!id || !n) return; await set("gift_catalog/" + id, { gift_name: n, coin_value: 0, first_seen: Date.now(), manual: true }); } }, "+ Tambah gift manual")));
  box.append(lottieDefaultCard());
  const ids = Object.keys(catalog).sort((a, b) => (catalog[a].coin_value || 0) - (catalog[b].coin_value || 0));
  if (!ids.length) box.append(h("p", { class: "muted" }, "Belum ada gift tercatat."));
  ids.forEach((id) => box.append(giftCard(id, catalog[id])));
}
function catsBox(sel) { const w = h("div", { class: "cats" }); LOTTIE_CATEGORIES.forEach((c) => w.append(h("label", {}, h("input", { type: "checkbox", value: c, checked: sel.includes(c) }), c))); return w; }
const picked = (w) => [...w.querySelectorAll("input:checked")].map((i) => i.value);
function lottieFields(cur, scope) {
  const cats = catsBox(cur.categories || []);
  const cnt = h("input", { type: "number", min: 1, max: 5, value: cur.max_count || 3 });
  const dur = h("input", { type: "number", min: 1, max: 6, value: cur.max_duration || 4 });
  scope.append(h("label", {}, "Kategori Lottie yang boleh"), cats, h("div", { class: "row" }, h("div", {}, h("label", {}, "Maks jumlah (1-5)"), cnt), h("div", {}, h("label", {}, "Durasi dtk (1-6)"), dur)));
  return () => ({ categories: picked(cats), max_count: Math.min(5, Math.max(1, +cnt.value || 1)), max_duration: Math.min(6, Math.max(1, +dur.value || 4)) });
}
function lottieDefaultCard() {
  const card = h("div", { class: "card" }, h("h2", {}, "Lottie default (gift belum di-mapping)"));
  const read = lottieFields(rules.default || { categories: ["simbol_umum"], max_count: 2, max_duration: 4 }, card);
  card.append(h("button", { class: "b g", onclick: async () => { await set("lottie_per_gift/default", read()); toast("Tersimpan"); } }, "Simpan default"));
  return card;
}
function giftCard(id, g) {
  const m = gmap[id] || { interaction: "", enabled: true, min_count: 1, params: {} };
  const card = h("div", { class: "card" }, h("h2", {}, `${g.gift_name} • ${g.coin_value || 0} koin • ${g.count || 0}x`));
  const sel = h("select", {}, h("option", { value: "" }, "(default umum / belum dipetakan)"), INTERACTIONS.map(([v, l]) => h("option", { value: v, selected: m.interaction === v }, l)));
  const det = h("div"); let readL = null;
  const minc = h("input", { type: "number", min: 1, value: m.min_count || 1 });
  const en = h("input", { type: "checkbox", checked: m.enabled !== false });
  const draw = () => {
    det.replaceChildren(); readL = null;
    if (sel.value === "lottie") readL = lottieFields(rules[g.gift_name] || {}, det);
    if (sel.value.startsWith("perintah")) det.append(h("label", {}, "Min jumlah gift (combo dihitung 1 slot)"), minc);
  };
  sel.onchange = draw; draw();
  card.append(h("label", {}, "Interaksi"), sel, det, h("label", {}, h("span", {}, "Aktif "), en),
    h("button", { class: "b", onclick: async () => {
      if (!sel.value) { await set("gift_map/" + id, null); return toast("Mapping dihapus"); }
      const p = readL ? readL() : {};
      await set("gift_map/" + id, { gift_name: g.gift_name, interaction: sel.value, params: p, min_count: +minc.value || 1, enabled: en.checked });
      if (readL) await set("lottie_per_gift/" + g.gift_name, p);
      toast("Tersimpan, langsung berlaku");
    } }, "Simpan"));
  return card;
}

// ---------- Approve ----------
async function renderApprove(all) {
  const box = $("#apprbox"); box.replaceChildren(h("h2", {}, "Menunggu persetujuan"));
  let any = false;
  for (const [u, types] of Object.entries(all || {})) for (const [t, n] of Object.entries(types)) {
    if (n.status !== "pending") continue; any = true;
    const prev = Object.values(n.variants || {}).map((v) => h("div", { class: "row" },
      Object.entries(v).filter(([k]) => k.endsWith("_url")).map(([k, url]) => (k === "video_url" || k === "sound_url") ? h("a", { href: url, target: "_blank" }, k) : h("img", { class: "pv", src: url })),
      h("span", { class: "muted" }, [v.caller_name, v.name, v.message, v.error_mode, v.speed].filter(Boolean).join(" • "))));
    box.append(h("div", { class: "card" }, h("b", {}, `${uLabel(u)} • ${t} → ${n.trigger_gift}`), n.needs_manual ? h("p", { class: "warn" }, "Tanpa cek AI, periksa manual") : "", prev,
      h("div", { class: "row" },
        h("button", { class: "b ok", onclick: async () => {
          const usr = await get("users/" + u);
          if (!usr || !usr.verified) return toast("User belum terverifikasi lewat chat live", true);
          await set(`custom_effects/${u}/${t}/status`, "active"); await set(`custom_effects/${u}/${t}/verified`, true);
        } }, "Setujui"),
        h("button", { class: "b r", onclick: () => set(`custom_effects/${u}/${t}/status`, "rejected") }, "Tolak"))));
  }
  if (!any) box.append(h("p", { class: "muted" }, "Tidak ada yang menunggu."));
}

// ---------- Kontrol ----------
function renderCtrl() {
  const box = $("#ctrlbox");
  const kill = h("div", { class: "card" }), vote = h("div", { class: "card" });
  watch("settings/kill_switch", (k) => {
    kill.replaceChildren(h("h2", {}, "Tombol darurat"), h("p", { class: k ? "bad" : "ok" }, k ? "Interaksi DIMATIKAN" : "Interaksi menyala"),
      h("button", { class: "b " + (k ? "ok" : "r"), onclick: () => set("settings/kill_switch", !k) }, k ? "Nyalakan lagi" : "Matikan semua interaksi"));
  });
  watch("vote_session", (v) => {
    const on = v && v.active;
    vote.replaceChildren(h("h2", {}, "Vote perintah"), h("p", { class: "muted" }, on ? `Aktif: ${v.phase}` : "Tidak aktif. Fase dimajukan otomatis oleh aplikasi HP 3 (harus berjalan)."),
      h("button", { class: "b " + (on ? "r" : ""), onclick: () => on ? set("vote_session", { active: false, phase: "stopped" })
        : set("vote_session", { active: true, phase: "collect", topic: "Perintah Next Match", collect_ms: 60000, vote_ms: 30000, started_at: Date.now(), phase_ends_at: Date.now() + 60000 }) }, on ? "Stop Vote" : "Mulai Vote"));
  });
  const un = uKey, slotU = h("input", { placeholder: "@username" }), slotT = h("select", {}, h("option", { value: "in_game_slots" }, "in-game"), h("option", { value: "fisikal_slots" }, "fisikal"));
  const slots = h("div", { class: "card" }, h("h2", {}, "Beri slot manual (tes tanpa Termux)"), slotU, slotT,
    h("button", { class: "b g", onclick: async () => { const k = un(slotU.value); if (!k) return; const cur = (await get(`unlocked/${k}/${slotT.value}`)) || 0; await set(`unlocked/${k}/${slotT.value}`, cur + 1); toast("Slot +1"); } }, "Tambah 1 slot"));
  box.append(kill, vote, slots);
}
