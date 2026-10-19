// تحكم الجوال: مستند remotes/{token} يكتب فيه جهاز العرض حالة الاختبار، ويكتب فيه الجوال الأوامر.
// الرمز عشوائي طويل ولا يعرفه إلا من مسح الباركود.
import { useEffect, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { cloud, db, mode } from "./store.js";

const KEY = "mt_remote";
let cur = null;
const tokListeners = new Set();

// طريقة النقل: Firestore في الموقع الحقيقي، وفي الوضع التجريبي تبويبان في نفس المتصفح (للتجربة فقط)
const T = mode === "cloud" ? {
  set: (tok, data) => cloud().then((fb) => fb.api.setDoc(fb.api.doc(fb.db, "remotes", tok), data)),
  update: (tok, patch) => cloud().then((fb) => fb.api.updateDoc(fb.api.doc(fb.db, "remotes", tok), patch)),
  watch: (tok, cb, onErr) => {
    let off = () => {}; let alive = true;
    cloud().then((fb) => { if (alive) off = fb.api.onSnapshot(fb.api.doc(fb.db, "remotes", tok), (d) => cb(d.exists() ? d.data() : null), onErr); });
    return () => { alive = false; off(); };
  },
} : (() => {
  const k = (tok) => "mt_rdoc_" + tok; const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("mt_remote") : null;
  const read = (tok) => { try { return JSON.parse(localStorage.getItem(k(tok))); } catch { return null; } };
  const write = (tok, v) => { localStorage.setItem(k(tok), JSON.stringify(v)); ch?.postMessage(tok); return Promise.resolve(); };
  return {
    set: write,
    update: (tok, patch) => { const v = read(tok); return v ? write(tok, { ...v, ...patch }) : Promise.reject(new Error("missing")); },
    watch: (tok, cb) => {
      const f = (e) => { if (e.data === tok) cb(read(tok)); };
      ch?.addEventListener("message", f); setTimeout(() => cb(read(tok)), 0);
      return () => ch?.removeEventListener("message", f);
    },
  };
})();

export const remoteAvailable = () => true;
export function remoteToken() {
  if (cur) return cur;
  try { cur = sessionStorage.getItem(KEY); } catch { /* ignore */ }
  return cur;
}
export async function remoteCreate() {
  if (remoteToken()) return cur;
  const a = new Uint8Array(18); crypto.getRandomValues(a);
  const tok = [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
  await T.set(tok, { owner: db.user.uid, state: { phase: "idle" }, cmd: null, at: Date.now() });
  cur = tok;
  try { sessionStorage.setItem(KEY, tok); } catch { /* ignore */ }
  tokListeners.forEach((f) => f(tok));
  return tok;
}
export const remoteUrl = (tok) => location.origin + location.pathname + "#/remote/" + tok;
export function qrSvg(text) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

// جهاز العرض: ينشر الحالة ويستقبل الأوامر. onCmd(type, cmd) — cmd فيه بيانات إضافية مثل i وsid
export function useRemoteHost(state, onCmd) {
  const [tok, setTok] = useState(remoteToken);
  const cb = useRef(onCmd); cb.current = onCmd;
  const last = useRef("");
  useEffect(() => { tokListeners.add(setTok); return () => tokListeners.delete(setTok); }, []);
  useEffect(() => {
    if (!tok) return;
    let seen;
    const off = T.watch(tok, (d) => {
      const c = d?.cmd;
      if (seen === undefined) { seen = c?.id || null; return; } // تجاهل أمر قديم موجود مسبقاً
      if (c && c.id !== seen) { seen = c.id; cb.current(c.type, c); }
    }, () => {});
    return () => { off(); last.current = ""; T.update(tok, { state: { phase: "idle" }, at: Date.now() }).catch(() => {}); };
  }, [tok]);
  // نشر الحالة عند تغيّرها فقط
  useEffect(() => {
    if (!tok) return;
    const js = JSON.stringify(state);
    if (js === last.current) return;
    last.current = js;
    T.update(tok, { state, at: Date.now() }).catch(() => {});
  });
  return tok;
}

// الجوال: يقرأ الحالة ويرسل الأوامر
export function useRemoteClient(tok) {
  const [doc, setDoc] = useState(undefined); // undefined = جارٍ الاتصال، null = غير موجود
  useEffect(() => T.watch(tok, (d) => setDoc(d), () => setDoc(null)), [tok]);
  // extra: بيانات إضافية مع الأمر (رقم السؤال i، أو رقم الطالب sid)
  const send = (type, extra = {}) => T.update(tok, { cmd: { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, ...extra } });
  return [doc, send];
}
