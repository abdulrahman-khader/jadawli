// التخزين: Firebase عند وجود الإعدادات، وإلا وضع تجريبي محلي على الجهاز
import { FIREBASE_CONFIG } from "../firebase-config.js";
import { uid, toast, DEFAULT_SETTINGS } from "./util.js";

const COLLS = ["classes", "students", "tests", "meta"];
const empty = () => ({ classes: {}, students: {}, tests: {}, meta: {} });
export const mode = FIREBASE_CONFIG.apiKey ? "cloud" : "local";

export const db = { data: empty(), user: null, version: 0 };
const listeners = new Set();
const emit = () => { db.version++; listeners.forEach((f) => f(db.version)); };
export const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f); };

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
async function sha(s) {
  try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  catch { return "p:" + s; }
}

let fb = null, onUserCb = null, pendingName = null;

export async function boot(onUser) {
  onUserCb = onUser;
  if (mode === "cloud") {
    const m = await import("./fb.js");
    fb = m.init(FIREBASE_CONFIG);
    m.api.onAuthStateChanged(fb.auth, (u) => handleUser(u ? { uid: u.uid, email: u.email, name: u.displayName || "" } : null));
  } else {
    handleUser(LS.get("mt_session", null));
  }
}
async function handleUser(u) {
  if (!u) { db.user = null; db.data = empty(); onUserCb(null); emit(); return; }
  onUserCb("loading");
  db.user = u;
  try { db.data = await load(); }
  catch { db.data = empty(); toast("تعذّر تحميل البيانات. تحقّق من الاتصال وقواعد Firestore"); }
  if (pendingName && !db.data.meta.profile) put("meta", { id: "profile", name: pendingName });
  pendingName = null;
  onUserCb(u); emit();
}

export async function register(name, email, pass) {
  email = email.trim().toLowerCase(); pendingName = name;
  if (mode === "cloud") {
    const c = await fb.api.createUserWithEmailAndPassword(fb.auth, email, pass);
    try { await fb.api.updateProfile(c.user, { displayName: name }); } catch { /* ignore */ }
    return;
  }
  if (pass.length < 6) throw { code: "auth/weak-password" };
  const acc = LS.get("mt_accounts", {});
  if (acc[email]) throw { code: "auth/email-already-in-use" };
  const u = { uid: uid(), email, name };
  acc[email] = { ...u, hash: await sha(pass) }; LS.set("mt_accounts", acc);
  LS.set("mt_session", u); handleUser(u);
}
export async function login(email, pass) {
  email = email.trim().toLowerCase();
  if (mode === "cloud") { await fb.api.signInWithEmailAndPassword(fb.auth, email, pass); return; }
  const a = LS.get("mt_accounts", {})[email];
  if (!a || a.hash !== (await sha(pass))) throw { code: "auth/invalid-credential" };
  const u = { uid: a.uid, email: a.email, name: a.name }; LS.set("mt_session", u); handleUser(u);
}
export async function resetPassword(email) {
  if (mode === "cloud") { await fb.api.sendPasswordResetEmail(fb.auth, email.trim()); return; }
  throw { code: "local/reset" };
}
export async function logout() {
  if (mode === "cloud") { await fb.api.signOut(fb.auth); return; }
  LS.del("mt_session"); handleUser(null);
}

async function load() {
  const out = empty();
  if (mode === "cloud") {
    const { api } = fb;
    await Promise.all(COLLS.map(async (c) => {
      const snap = await api.getDocs(api.collection(fb.db, "users", db.user.uid, c));
      snap.forEach((d) => { out[c][d.id] = d.data(); });
    }));
  } else {
    const d = LS.get("mt_data_" + db.user.uid, {});
    COLLS.forEach((c) => Object.assign(out[c], d[c] || {}));
  }
  return out;
}
const saveLocal = () => { if (!LS.set("mt_data_" + db.user.uid, db.data)) toast("تعذّر الحفظ على هذا الجهاز"); };

export function put(coll, obj) {
  db.data[coll][obj.id] = obj;
  if (mode === "cloud") {
    const { api } = fb;
    api.setDoc(api.doc(fb.db, "users", db.user.uid, coll, obj.id), JSON.parse(JSON.stringify(obj)))
      .catch(() => toast("تعذّر الحفظ. تحقّق من الاتصال بالإنترنت"));
  } else saveLocal();
  emit();
}
export function del(coll, id) {
  delete db.data[coll][id];
  if (mode === "cloud") {
    const { api } = fb;
    api.deleteDoc(api.doc(fb.db, "users", db.user.uid, coll, id)).catch(() => toast("تعذّر الحذف. تحقّق من الاتصال بالإنترنت"));
  } else saveLocal();
  emit();
}

export const settings = () => ({ ...DEFAULT_SETTINGS, ...(db.data.meta.settings || {}) });
export const displayName = () => db.data.meta.profile?.name || db.user?.name || (db.user?.email || "").split("@")[0];

export const AUTH_ERR = {
  "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
  "auth/wrong-password": "البريد أو كلمة المرور غير صحيحة.",
  "auth/user-not-found": "لا يوجد حساب بهذا البريد.",
  "auth/email-already-in-use": "هذا البريد مسجّل من قبل. سجّل الدخول بدلاً من ذلك.",
  "auth/weak-password": "كلمة المرور قصيرة. استخدم ٦ أحرف أو أكثر.",
  "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
  "auth/too-many-requests": "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.",
  "auth/network-request-failed": "لا يوجد اتصال بالإنترنت.",
  "auth/operation-not-allowed": "تسجيل الدخول بالبريد غير مفعّل في Firebase. فعّله من Authentication ← Sign-in method.",
  "auth/unauthorized-domain": "هذا الرابط غير مضاف في Firebase. أضفه من Authentication ← Settings ← Authorized domains.",
  "auth/missing-email": "اكتب بريدك الإلكتروني أولاً.",
  "local/reset": "استعادة كلمة المرور تعمل بعد ربط الموقع بـ Firebase.",
};
