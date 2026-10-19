// تحكم الجوال: مستند remotes/{token} يكتب فيه جهاز العرض حالة الاختبار، ويكتب فيه الجوال الأوامر.
// الرمز عشوائي طويل ولا يعرفه إلا من مسح الباركود.
import { useEffect, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { cloud, db, mode } from "./store.js";

const KEY = "mt_remote";
let cur = null;
const tokListeners = new Set();

export const remoteAvailable = () => mode === "cloud";
export function remoteToken() {
  if (cur) return cur;
  try { cur = sessionStorage.getItem(KEY); } catch { /* ignore */ }
  return cur;
}
export async function remoteCreate() {
  if (remoteToken()) return cur;
  const a = new Uint8Array(18); crypto.getRandomValues(a);
  const tok = [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
  const fb = await cloud();
  await fb.api.setDoc(fb.api.doc(fb.db, "remotes", tok), { owner: db.user.uid, state: { phase: "idle" }, cmd: null, at: Date.now() });
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

// جهاز العرض: ينشر الحالة ويستقبل الأوامر
export function useRemoteHost(state, onCmd) {
  const [tok, setTok] = useState(remoteToken);
  const cb = useRef(onCmd); cb.current = onCmd;
  const last = useRef("");
  useEffect(() => { tokListeners.add(setTok); return () => tokListeners.delete(setTok); }, []);
  useEffect(() => {
    if (!tok) return;
    let off = () => {}; let alive = true; let seen;
    cloud().then((fb) => {
      if (!alive) return;
      const ref = fb.api.doc(fb.db, "remotes", tok);
      off = fb.api.onSnapshot(ref, (d) => {
        const c = d.data()?.cmd;
        if (seen === undefined) { seen = c?.id || null; return; } // تجاهل أمر قديم موجود مسبقاً
        if (c && c.id !== seen) { seen = c.id; cb.current(c.type); }
      }, () => {});
    });
    return () => {
      alive = false; off(); last.current = "";
      cloud().then((fb) => fb.api.updateDoc(fb.api.doc(fb.db, "remotes", tok), { state: { phase: "idle" }, at: Date.now() }).catch(() => {}));
    };
  }, [tok]);
  // نشر الحالة عند تغيّرها فقط
  useEffect(() => {
    if (!tok) return;
    const js = JSON.stringify(state);
    if (js === last.current) return;
    last.current = js;
    cloud().then((fb) => fb.api.updateDoc(fb.api.doc(fb.db, "remotes", tok), { state, at: Date.now() }).catch(() => {}));
  });
  return tok;
}

// الجوال: يقرأ الحالة ويرسل الأوامر
export function useRemoteClient(tok) {
  const [doc, setDoc] = useState(undefined); // undefined = جارٍ الاتصال، null = غير موجود
  useEffect(() => {
    let off = () => {}; let alive = true;
    cloud().then((fb) => {
      if (!alive) return;
      off = fb.api.onSnapshot(fb.api.doc(fb.db, "remotes", tok), (d) => setDoc(d.exists() ? d.data() : null), () => setDoc(null));
    });
    return () => { alive = false; off(); };
  }, [tok]);
  const send = (type) => cloud().then((fb) =>
    fb.api.updateDoc(fb.api.doc(fb.db, "remotes", tok), { cmd: { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type } }));
  return [doc, send];
}
