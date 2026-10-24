// صفحة الجوال: تحكم عن بعد بالاختبار المعروض على الشاشة (لا تحتاج تسجيل دخول)
import { useEffect, useReducer, useRef, useState } from "react";
import { remoteAvailable, useRemoteClient } from "../lib/remote.js";
import { toast } from "../lib/util.js";
import { cn } from "../lib/utils.js";
import { ConfirmButton, Spinner, Icon } from "../components/app.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Eye, EyeOff, Pause, Play, ChevronDown } from "lucide-react";

const AR = "٠١٢٣٤٥٦٧٨٩";
const REVEAL_MS = 1500; // نفس مدة ظهور الإجابة في شاشة العرض
let latin = false;
const ar = (x) => (latin ? String(x) : String(x).replace(/\d/g, (d) => AR[d]));

export default function Remote({ r }) {
  if (!remoteAvailable()) return <Box><h2>التحكم بالجوال يعمل بعد ربط الموقع بـ Firebase</h2></Box>;
  return <RemoteInner tok={r.id} />;
}

function Box({ children }) { return <div className="remote"><div className="remote-in">{children}</div></div>; }
const Connected = () => <Badge className="bg-success/15 text-success">الجوال متصل ✓</Badge>;

// قائمة الطلاب: الضغط على اسم يفتح اختباره في شاشة العرض
function Students({ list, cur, onPick, open: open0 = false, disabled }) {
  const [open, setOpen] = useState(open0);
  if (!list?.length) return null;
  const left = list.filter((x) => !x.st).length;
  return (
    <div className="w-full rounded-xl border bg-card text-start">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-bold" onClick={() => setOpen(!open)}>
        <span>اختيار طالب <span className="text-sm font-normal text-muted-foreground">· باقي {ar(left)} من {ar(list.length)}</span></span>
        <ChevronDown className={cn("size-5 transition", open && "rotate-180")} /></button>
      {open && <div className="max-h-[50dvh] divide-y overflow-y-auto border-t">{list.map((x) => (
        <button type="button" key={x.id} disabled={disabled || x.id === cur} onClick={() => onPick(x.id)}
          className={cn("flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-start active:bg-muted disabled:cursor-default", x.id === cur && "bg-secondary")}>
          <span className="font-bold">{x.name}</span>
          {x.id === cur ? <Badge className="bg-primary text-primary-foreground">الآن</Badge>
            : x.st === "d" ? <Badge className="bg-success/15 text-success">اختُبر</Badge>
            : x.st === "a" ? <Badge variant="outline">غائب</Badge> : <Badge className="bg-warm/30 text-foreground">لم يُختبر</Badge>}
        </button>
      ))}</div>}
    </div>
  );
}

// تعديل الدرجة: الضغط على علامة سؤال يحوّلها من صح إلى خطأ أو العكس
function Answers({ items, onFlip, busy, disabled, title }) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;
  const ok = items.filter((x) => x.ok).length;
  return (
    <div className="w-full rounded-xl border bg-card text-start">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-bold" onClick={() => setOpen(!open)}>
        <span>{title} <span className="text-sm font-normal text-muted-foreground">· الصحيح {ar(ok)} من {ar(items.length)}</span></span>
        <ChevronDown className={cn("size-5 transition", open && "rotate-180")} /></button>
      {open && <div className="max-h-[50dvh] divide-y overflow-y-auto border-t">
        <p className="px-4 py-2 text-sm text-muted-foreground">اضغط على العلامة لتحويلها من صح إلى خطأ أو العكس.</p>
        {items.map((x, j) => (
          <div key={j} className={cn("flex items-center gap-2 px-4 py-2", !x.ok && "bg-destructive/6")}>
            <span className="text-sm text-muted-foreground">{ar(j + 1)}.</span>
            <b className="flex-1 font-display text-lg [unicode-bidi:isolate]" dir="rtl">{x.q} = {x.a}</b>
            {x.to && <small className="text-muted-foreground">انتهى الوقت</small>}
            <Button size="icon-lg" variant={x.ok ? "success" : "destructive"} disabled={disabled} aria-label={x.ok ? "صح، اضغط لجعلها خطأ" : "خطأ، اضغط لجعلها صح"}
              onClick={() => onFlip(j)}>{busy(j) ? <Spinner className="text-current" /> : x.ok ? "✓" : "✗"}</Button>
          </div>
        ))}</div>}
    </div>
  );
}

function RemoteInner({ tok }) {
  const [d, send] = useRemoteClient(tok);
  const [, tick] = useReducer((x) => x + 1, 0);
  const [sent, setSent] = useState(null); // آخر زر ضُغط، حتى تتغيّر الشاشة
  const said = useRef(false);
  const timing = useRef({ key: "", end: 0, revealAt: 0, auto: "" });
  // إظهار الجواب في الجوال قبل الإجابة (يُحفظ على هذا الجوال)
  const [showAns, setShowAns] = useState(() => { try { return localStorage.getItem("mt_remote_ans") !== "0"; } catch { return true; } });
  const toggleAns = () => { const v = !showAns; setShowAns(v); try { localStorage.setItem("mt_remote_ans", v ? "1" : "0"); } catch { /* ignore */ } };
  useEffect(() => { const id = setInterval(tick, 200); return () => clearInterval(id); }, []);
  useEffect(() => { if (d && !said.current) { said.current = true; send("hello").catch(() => {}); } }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateKey = JSON.stringify(d?.state || null);
  useEffect(() => { setSent(null); }, [stateKey]);
  // إبقاء شاشة الجوال مضاءة
  useEffect(() => {
    let lock = null;
    const get = () => { if (document.visibilityState === "visible") navigator.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    get(); document.addEventListener("visibilitychange", get);
    return () => { document.removeEventListener("visibilitychange", get); lock?.release?.().catch(() => {}); };
  }, []);
  // key: ما يظهر عليه التحميل (لأزرار تعديل الدرجة: رقم السؤال)
  const press = (c, extra, key = c) => {
    navigator.vibrate?.(25); setSent(key);
    send(c, extra).catch(() => { setSent(null); toast("تعذّر الإرسال. تحقّق من الإنترنت في الجوال"); });
    setTimeout(() => setSent((x) => (x === key ? null : x)), 4000);
  };
  const busy = (c) => sent === c;
  const spin = (c, label) => (busy(c) ? <Spinner className="text-current" /> : label);
  const flip = (j) => press("flip", { j }, "flip" + j);
  const flipBusy = (j) => busy("flip" + j);

  if (d === undefined) return <Box><Spinner label="جارٍ الاتصال…" /></Box>;
  if (d === null) return <Box><h2>الرابط غير صالح</h2><p className="text-muted-foreground">امسح الباركود من جديد من شاشة الاختبار.</p></Box>;
  const s = d.state || {}; latin = s.ar === false;
  const pick = (sid) => press("pick", { sid });

  if (s.phase === "list") return (
    <Box>
      <Connected /><h2>{s.info}</h2><p className="text-muted-foreground">اختر الطالب ليبدأ اختباره على الشاشة.</p>
      <Students list={s.students} onPick={pick} open disabled={!!sent} />
    </Box>
  );

  if (s.phase === "ready") return (
    <Box>
      <Connected />
      <h1 className="remote-name">{s.name}</h1><p className="text-muted-foreground">{s.info}</p>
      <button type="button" className="mk ok remote-big" disabled={!!sent} onClick={() => press("start")}>{spin("start", "▶ ابدأ")}</button>
      <ConfirmButton size="lg" confirmText={`تسجيل ${s.name} غائباً؟`} desc="سينتقل الاختبار للطالب التالي." action="غائب" onConfirm={() => press("absent")}>
        <Icon name="absent" /> غائب</ConfirmButton>
      <Students list={s.students} cur={s.cur} onPick={pick} disabled={!!sent} />
    </Box>
  );

  if (s.phase === "q") {
    // الجوال يعدّ بساعته: نبدأ العد لحظة وصول السؤال
    const qid = `${s.name}|${s.i}|${s.seg}`; const key = `${qid}|${s.reveal}|${s.paused}`; const tm = timing.current;
    if (tm.key !== key) { tm.key = key; tm.end = s.remain != null ? Date.now() + s.remain : 0; tm.revealAt = s.reveal ? Date.now() : 0; }
    const left = s.paused ? s.left : s.remain != null ? Math.max(0, tm.end - Date.now()) : 0;
    // إذا تأخرت شاشة العرض (مثلاً الصفحة في الخلفية) يرسل الجوال «انتهى الوقت» ثم «التالي» بنفسه
    if (!s.reveal && !s.paused && s.remain != null && Date.now() > tm.end + 300 && tm.auto !== "to" + qid) { tm.auto = "to" + qid; send("timeout", { i: s.i }).catch(() => {}); }
    if (s.reveal && tm.revealAt && Date.now() > tm.revealAt + REVEAL_MS + 400 && tm.auto !== "nx" + qid) { tm.auto = "nx" + qid; send("next", { i: s.i }).catch(() => {}); }
    const q = (c, label) => ({ disabled: !!sent, onClick: () => press(c, { i: s.i }), children: spin(c, label) });
    return (
      <Box>
        <div className="remote-top"><b>{s.name}</b><span className="text-muted-foreground">سؤال {ar(s.i + 1)} من {ar(s.total)}</span></div>
        <div className="prog"><i style={{ width: (s.i * 100) / s.total + "%" }} /></div>
        <div className={"question remote-q " + (s.div ? "div " : "") + (s.reveal ? (s.ok ? "r-ok" : "r-no") : "")} dir="rtl">
          {s.q} = <span className="qa">{showAns || s.reveal ? s.ans : "؟"}</span></div>
        {s.reveal ? <>
          <p className={"remote-res " + (s.ok ? "ok" : "no")}>{s.to ? "انتهى الوقت" : s.ok ? "✓ صحيحة" : "✗ خاطئة"}</p>
          <Button size="xl" className="h-16 text-xl" {...q("next", s.i + 1 < s.total ? "السؤال التالي" : "عرض النتيجة")} />
        </> : <>
          <p className={"remote-secs " + (left <= 3000 ? "low" : "")}>{s.paused ? "متوقف" : ar(Math.ceil(left / 1000))}</p>
          <div className="marks remote-marks">
            <button type="button" className="mk ok" {...q("ok", "✓ صح")} />
            <button type="button" className="mk no" {...q("no", "✗ خطأ")} /></div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="lg" disabled={!!sent} onClick={() => press("pause", { i: s.i })}>{s.paused ? <><Play /> متابعة</> : <><Pause /> إيقاف مؤقت</>}</Button>
            <Button variant="outline" size="lg" onClick={toggleAns}>{showAns ? <><EyeOff /> إخفاء الجواب</> : <><Eye /> إظهار الجواب</>}</Button>
          </div>
        </>}
        <Answers title="تعديل الدرجة" items={s.items} onFlip={flip} busy={flipBusy} disabled={!!sent} />
      </Box>
    );
  }

  if (s.phase === "done") return (
    <Box>
      <h1 className="remote-name">{s.name}</h1>
      <Badge variant="outline">الدرجة تظهر لك فقط، لا تظهر على الشاشة</Badge>
      <div className="done-score">{s.score}</div><p className="text-muted-foreground">{s.pct}{s.avg && <> · متوسط الزمن {s.avg}</>}</p>
      {s.wrong?.length ? <div className="w-full rounded-xl border bg-card p-4 text-start"><b>الأسئلة الخاطئة</b>
        <div className="facts mt-2">{s.wrong.map((w, i) => <div className="fact bad" key={i}><b dir="rtl">{w.q} = {w.a}</b><small>{w.to ? "انتهى الوقت" : "إجابة خاطئة"}</small></div>)}</div></div>
        : s.wrong && <Badge className="bg-success/15 px-3 py-1 text-base text-success">كل الإجابات صحيحة!</Badge>}
      <Answers title="تعديل الدرجة" items={s.items} onFlip={flip} busy={flipBusy} disabled={!!sent} />
      {s.next ? <Button variant="warm" size="xl" className="h-16 text-xl" disabled={!!sent} onClick={() => press("nextStudent")}>{spin("nextStudent", `الطالب التالي: ${s.next}`)}</Button>
        : <Badge className="bg-success/15 px-3 py-1 text-base text-success">اختُبر جميع الطلاب</Badge>}
      <Students list={s.students} cur={s.cur} onPick={pick} disabled={!!sent} />
    </Box>
  );

  return <Box><Connected /><h2>بانتظار الاختبار</h2><p className="text-muted-foreground">افتح الاختبار على الشاشة، وستظهر هنا قائمة الطلاب وأزرار التحكم.</p></Box>;
}
