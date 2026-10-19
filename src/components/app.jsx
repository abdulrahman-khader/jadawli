// مكوّنات مشتركة للموقع مبنية على shadcn/ui
import { useState } from "react";
import {
  ArrowRight, Settings, Plus, FileText, NotebookPen, Trash2, Play, Printer, FileSpreadsheet, Loader2,
  Smartphone, LogOut, Pencil, Users, ClipboardList, BarChart3, Trophy, RefreshCw, UserX, Check, X, Download,
} from "lucide-react";
import { go } from "../lib/router.js";
import { mode } from "../lib/store.js";
import { cn } from "../lib/utils.js";
import { Button } from "./ui/button.jsx";
import { Card } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "./ui/alert-dialog.jsx";

const ICONS = {
  back: ArrowRight, gear: Settings, plus: Plus, pdf: FileText, sheet: NotebookPen, trash: Trash2, play: Play,
  print: Printer, xls: FileSpreadsheet, phone: Smartphone, logout: LogOut, edit: Pencil, users: Users,
  tests: ClipboardList, chart: BarChart3, trophy: Trophy, refresh: RefreshCw, absent: UserX, check: Check, x: X, download: Download,
};
export const Icon = ({ name, className }) => { const C = ICONS[name] || Plus; return <C className={className} aria-hidden="true" />; };

// زر يعرض أيقونة تحميل أثناء العمليات التي تأخذ وقتاً
export function Btn({ loading, disabled, children, ...rest }) {
  return (
    <Button disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}{children}
    </Button>
  );
}
// const [busy, run] = useBusy();  run(async () => …)  → يشغّل أيقونة التحميل حتى تنتهي العملية
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { if (busy) return; setBusy(true); try { return await fn(); } finally { setBusy(false); } };
  return [busy, run];
}
// يعطي المتصفح فرصة لرسم أيقونة التحميل قبل عمل ثقيل (طباعة، تصدير)
export const nextFrame = () => new Promise((r) => { requestAnimationFrame(() => setTimeout(r, 30)); setTimeout(r, 120); }); // المهلة احتياط إذا كانت الصفحة مخفية

export function Spinner({ className, label }) {
  return <span className={cn("inline-flex items-center gap-2 text-muted-foreground", className)} role="status"><Loader2 className="size-5 animate-spin" aria-hidden="true" />{label}</span>;
}
export function Logo({ big }) {
  return <span className={cn("inline-grid flex-none -rotate-3 place-items-center bg-warm font-display font-bold text-warm-foreground",
    big ? "size-18 rounded-2xl text-3xl" : "size-9 rounded-[11px] text-[15px]")} aria-hidden="true">×÷</span>;
}
export function LoadingScreen({ label = "جارٍ التحميل…" }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-band text-white">
      <div className="flex flex-col items-center gap-4"><Logo big /><span className="inline-flex items-center gap-2 opacity-90"><Loader2 className="size-5 animate-spin" />{label}</span></div>
    </div>
  );
}

const AVC = ["#2B46C9", "#0E8C84", "#C2410C", "#7C3AED", "#B91C1C", "#0369A1", "#4D7C0F", "#A21CAF", "#B45309", "#0F766E"];
export function Avatar({ name, className }) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <span className={cn("grid size-10 flex-none place-items-center rounded-xl font-display font-bold text-white", className)} style={{ background: AVC[h % AVC.length] }} aria-hidden="true">{[...name.trim().replace(/^ال/, "")][0] || "؟"}</span>;
}
export function Stars({ p }) {
  const k = p == null ? 0 : p >= 90 ? 3 : p >= 75 ? 2 : p >= 50 ? 1 : 0;
  return <span className="tracking-wider text-warm" aria-label={`${k} نجوم`}>{"★".repeat(k)}<span className="text-border">{"★".repeat(3 - k)}</span></span>;
}
export function OpTag({ op }) {
  return <span className={cn("grid size-10 flex-none place-items-center rounded-xl font-display text-2xl font-bold", op === "div" ? "bg-div-soft text-div" : "bg-secondary text-primary")}>{op === "div" ? "÷" : "×"}</span>;
}
// شارة درجة ملوّنة حسب المستوى
export function Score({ p, children, className }) {
  const tone = p == null ? "" : p >= 90 ? "bg-success/15 text-success" : p >= 70 ? "bg-warm/25 text-foreground" : "bg-destructive/12 text-destructive";
  return <Badge variant="secondary" className={cn("font-bold tabular-nums", tone, className)}>{children}</Badge>;
}

// زر حذف أو إعادة يطلب تأكيداً في نافذة
export function ConfirmButton({ onConfirm, confirmText = "هل أنت متأكد؟", desc, action = "تأكيد", children, variant = "outline", size = "sm", className, ...rest }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant={variant} size={size} className={className} {...rest}>{children}</Button></AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="sm:text-start"><AlertDialogTitle>{confirmText}</AlertDialogTitle>{desc && <AlertDialogDescription>{desc}</AlertDialogDescription>}</AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogAction variant="destructive" onClick={onConfirm}>{action}</AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TopBar({ title, back, noSettings, extra }) {
  return (
    <>
      <header className="no-print sticky top-0 z-20 bg-band pt-[env(safe-area-inset-top)] text-white shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          {back ? <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 hover:text-white" aria-label="رجوع" onClick={() => go(...back)}><ArrowRight className="size-5" /></Button> : <Logo />}
          <div className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{title}</div>
          {extra}
          {!noSettings && <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 hover:text-white" aria-label="الإعدادات" onClick={() => go("settings")}><Settings className="size-5" /></Button>}
        </div>
      </header>
      {mode === "local" && <div className="no-print bg-warm px-4 py-1.5 text-center text-sm text-warm-foreground">وضع تجريبي: البيانات محفوظة على هذا الجهاز فقط حتى يُربط الموقع بـ Firebase.</div>}
    </>
  );
}
export function Shell({ title, back, noSettings, children }) {
  return <><TopBar title={title} back={back} noSettings={noSettings} /><main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 pt-5 pb-16">{children}</main></>;
}
export function PageHead({ icon, title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3.5">{icon}<div><h1>{title}</h1>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div></div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
export function Panel({ title, action, className, children }) {
  return (
    <Card className={cn("gap-3 p-5", className)}>
      {(title || action) && <div className="flex flex-wrap items-center justify-between gap-2">{title && <h2>{title}</h2>}{action}</div>}
      {children}
    </Card>
  );
}
export const List = ({ className, children }) => <Card className={cn("gap-0 divide-y overflow-hidden py-0", className)}>{children}</Card>;
export function Row({ className, children, ...rest }) {
  return <div className={cn("flex min-w-0 flex-wrap items-center gap-3 px-4 py-3", className)} {...rest}>{children}</div>;
}
// الجزء الرئيسي في صف القائمة (قابل للضغط إذا أُعطي onClick)
export function RowMain({ title, sub, onClick }) {
  const inner = <><span className="truncate font-bold">{title}</span>{sub && <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{sub}</span>}</>;
  return onClick
    ? <button type="button" className="flex min-w-0 flex-[1_1_180px] cursor-pointer flex-col gap-0.5 text-start hover:opacity-80" onClick={onClick}>{inner}</button>
    : <span className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">{inner}</span>;
}
export const RowActions = ({ children }) => <div className="ms-auto flex flex-wrap items-center justify-end gap-1.5">{children}</div>;

export function Empty({ title, children }) {
  return (
    <div className="rounded-xl border-2 border-dashed bg-card px-5 py-8 text-center text-muted-foreground">
      <strong className="mb-1 block font-display text-lg text-foreground">{title}</strong>{children}
    </div>
  );
}
export const Kpi = ({ v, label }) => <div className="kpi"><b>{v}</b><span>{label}</span></div>;
export const Hint = ({ className, children }) => <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
