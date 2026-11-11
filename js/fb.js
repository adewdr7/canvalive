import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import * as dbm from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import * as authm from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { FIREBASE_CONFIG } from "./config.js";

export const app = initializeApp(FIREBASE_CONFIG);
export const db = dbm.getDatabase(app);
export const auth = authm.getAuth(app);
export { dbm, authm };

// username TikTok -> key Firebase (sama dengan aplikasi Android)
export const uKey = (s) => s.trim().toLowerCase().replace(/^@/, "").replace(/\./g, ",");
export const uLabel = (k) => "@" + k.replace(/,/g, ".");

export const R = (path) => dbm.ref(db, path);
export const get = async (path) => (await dbm.get(R(path))).val();
export const set = (path, v) => dbm.set(R(path), v);
export const watch = (path, cb) => dbm.onValue(R(path), (s) => cb(s.val()));
export const push = (path, v) => dbm.push(R(path), v);
export const tx = (path, fn) => dbm.runTransaction(R(path), fn);

export const $ = (s, el = document) => el.querySelector(s);
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
export function toast(msg, bad = false) {
  const t = h("div", { class: "toast" + (bad ? " bad" : "") }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}
export function tabs(names, onShow) {
  const nav = $("nav.tabs");
  names.forEach(([id, label]) => {
    nav.append(h("button", { "data-t": id, onclick: () => show(id) }, label));
  });
  function show(id) {
    document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === id));
    document.querySelectorAll("section.tab").forEach((s) => (s.hidden = s.id !== "t-" + id));
    onShow && onShow(id);
  }
  show(names[0][0]);
}
