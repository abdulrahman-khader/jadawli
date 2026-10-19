import { useEffect, useRef, useState } from "react";
import { go } from "../lib/router.js";
import { mode } from "../lib/store.js";
import { onToast } from "../lib/util.js";

const PATHS = {
  back: <path d="M5 12h14M13 6l6 6-6 6" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  pdf: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 14h6M9 17h4" /></>,
  sheet: <><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  play: <path d="M7 5l12 7-12 7z" />,
  print: <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z" />,
  xls: <path d="M4 4h16v16H4zM4 10h16M10 4v16" />,
};
export const Icon = ({ name }) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;

const AVC = ["#2B46C9", "#0E8C84", "#C2410C", "#7C3AED", "#B91C1C", "#0369A1", "#4D7C0F", "#A21CAF", "#B45309", "#0F766E"];
export function Avatar({ name }) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <span className="av" style={{ background: AVC[h % AVC.length] }} aria-hidden="true">{[...name.trim().replace(/^ال/, "")][0] || "؟"}</span>;
}
export function Stars({ p }) {
  const k = p == null ? 0 : p >= 90 ? 3 : p >= 75 ? 2 : p >= 50 ? 1 : 0;
  return <span className="stars" aria-label={`${k} نجوم`}>{"★".repeat(k)}<span className="off">{"★".repeat(3 - k)}</span></span>;
}
export function OpTag({ op }) { return <span className={"optag " + (op === "div" ? "div" : "")}>{op === "div" ? "÷" : "×"}</span>; }

// زر يحتاج ضغطتين للتأكيد (للحذف والإعادة)
export function ConfirmButton({ onConfirm, confirmText = "اضغط مرة أخرى للتأكيد", className = "btn sm", children, ...rest }) {
  const [armed, setArmed] = useState(false); const tm = useRef();
  useEffect(() => () => clearTimeout(tm.current), []);
  return (
    <button type="button" className={className + (armed ? " armed" : "")} {...rest}
      onClick={() => { if (!armed) { setArmed(true); tm.current = setTimeout(() => setArmed(false), 4000); } else { clearTimeout(tm.current); setArmed(false); onConfirm(); } }}>
      {armed ? confirmText : children}
    </button>
  );
}

export function TopBar({ title, back, noSettings, extra }) {
  return (
    <>
      <header className="bar"><div className="bar-in">
        {back ? <button type="button" className="icon-btn" aria-label="رجوع" onClick={() => go(...back)}><Icon name="back" /></button> : <span className="logo">×÷</span>}
        <div className="bar-title">{title}</div>
        {extra}
        {!noSettings && <button type="button" className="icon-btn" aria-label="الإعدادات" onClick={() => go("settings")}><Icon name="gear" /></button>}
      </div></header>
      {mode === "local" && <div className="demo no-print">وضع تجريبي: البيانات محفوظة على هذا الجهاز فقط حتى يُربط الموقع بـ Firebase.</div>}
    </>
  );
}
export function Shell({ title, back, noSettings, children }) {
  return <><TopBar title={title} back={back} noSettings={noSettings} /><main className="wrap">{children}</main></>;
}
export const Empty = ({ title, children }) => <div className="empty"><strong>{title}</strong>{children}</div>;
export const Kpi = ({ v, label }) => <div className="kpi"><b>{v}</b><span>{label}</span></div>;

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => onToast((msg) => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2600);
  }), []);
  return items.slice(-1).map((t) => <div key={t.id} className="toast" role="status">{t.msg}</div>);
}
