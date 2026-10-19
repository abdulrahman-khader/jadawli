// أدوات عامة: تنسيق الأرقام والتواريخ وغيرها
export const DEFAULT_SETTINGS = { digits: "arab", count: 10, seconds: 10, swap: false, strict: false, school: "" };
let CFG = { ...DEFAULT_SETTINGS };
export const setCfg = (c) => { CFG = c; };

const AR = "٠١٢٣٤٥٦٧٨٩";
export const isAr = () => CFG.digits !== "latn";
export const n = (x) => { const s = String(x); return isAr() ? s.replace(/\d/g, (d) => AR[d]).replace(/\./g, "٫") : s; };
export const pct = (p) => (p == null || isNaN(p) ? "—" : n(Math.round(p)) + (isAr() ? "٪" : "%"));
export const secs = (ms) => (ms == null ? "—" : n((ms / 1000).toFixed(1)) + " ث");
export function fmtDate(ts, short) {
  try {
    return new Intl.DateTimeFormat(`ar-u-ca-gregory-nu-${isAr() ? "arab" : "latn"}`,
      short ? { day: "numeric", month: "short" } : { day: "numeric", month: "long", year: "numeric" }).format(ts);
  } catch { return new Date(ts).toLocaleDateString(); }
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const T10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const opSym = (op) => (op === "div" ? "÷" : "×");
export const opName = (op) => (op === "div" ? "القسمة" : "الضرب");
export const levelColor = (p) => (p == null ? "var(--line)" : p >= 90 ? "var(--good)" : p >= 70 ? "var(--pencil)" : "var(--bad)");
export const chipCls = (p) => (p >= 90 ? "good" : p >= 70 ? "warn" : "bad");
export const scoreColor = (p) => (p >= 90 ? "var(--good)" : p >= 70 ? "var(--ink)" : "var(--bad)");

export function downloadCSV(name, rows) {
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name + ".csv";
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// إشعار صغير أسفل الشاشة
const toastListeners = new Set();
export const onToast = (f) => { toastListeners.add(f); return () => toastListeners.delete(f); };
export const toast = (msg) => toastListeners.forEach((f) => f(msg));
