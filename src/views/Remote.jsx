// صفحة الجوال: تحكم عن بعد بالاختبار المعروض على الشاشة (لا تحتاج تسجيل دخول)
import { useEffect, useReducer, useRef, useState } from "react";
import { remoteAvailable, useRemoteClient } from "../lib/remote.js";
import { toast } from "../lib/util.js";
import { ConfirmButton, Spinner, Icon } from "../components/app.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Eye, EyeOff, Pause, Play } from "lucide-react";

const AR = "٠١٢٣٤٥٦٧٨٩";
let latin = false;
const ar = (x) => (latin ? String(x) : String(x).replace(/\d/g, (d) => AR[d]));

export default function Remote({ r }) {
  if (!remoteAvailable()) return <Box><h2>التحكم بالجوال يعمل بعد ربط الموقع بـ Firebase</h2></Box>;
  return <RemoteInner tok={r.id} />;
}

function Box({ children }) { return <div className="remote"><div className="remote-in">{children}</div></div>; }
const Connected = () => <Badge className="bg-success/15 text-success">الجوال متصل ✓</Badge>;

function RemoteInner({ tok }) {
  const [d, send] = useRemoteClient(tok);
  const [, tick] = useReducer((x) => x + 1, 0);
  const [sent, setSent] = useState(null); // آخر زر ضُغط، حتى تتغيّر الشاشة
  const said = useRef(false);
  // إظهار الجواب في الجوال قبل الإجابة (يُحفظ على هذا الجوال)
  const [showAns, setShowAns] = useState(() => { try { return localStorage.getItem("mt_remote_ans") !== "0"; } catch { return true; } });
  const toggleAns = () => { const v = !showAns; setShowAns(v); try { localStorage.setItem("mt_remote_ans", v ? "1" : "0"); } catch { /* ignore */ } };
  useEffect(() => { const id = setInterval(tick, 250); return () => clearInterval(id); }, []);
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
  const press = (c) => {
    navigator.vibrate?.(25); setSent(c);
    send(c).catch(() => { setSent(null); toast("تعذّر الإرسال. تحقّق من الإنترنت في الجوال"); });
    setTimeout(() => setSent((x) => (x === c ? null : x)), 4000);
  };
  const busy = (c) => sent === c;
  const spin = (c, label) => (busy(c) ? <Spinner className="text-current" /> : label);

  if (d === undefined) return <Box><Spinner label="جارٍ الاتصال…" /></Box>;
  if (d === null) return <Box><h2>الرابط غير صالح</h2><p className="text-muted-foreground">امسح الباركود من جديد من شاشة الاختبار.</p></Box>;
  const s = d.state || {}; latin = s.ar === false;

  if (s.phase === "ready") return (
    <Box>
      <Connected />
      <h1 className="remote-name">{s.name}</h1><p className="text-muted-foreground">{s.info}</p>
      <button type="button" className="mk ok remote-big" disabled={!!sent} onClick={() => press("start")}>{spin("start", "▶ ابدأ")}</button>
      <ConfirmButton size="lg" confirmText={`تسجيل ${s.name} غائباً؟`} desc="سينتقل الاختبار للطالب التالي." action="غائب" onConfirm={() => press("absent")}>
        <Icon name="absent" /> غائب</ConfirmButton>
    </Box>
  );

  if (s.phase === "q") {
    const left = s.paused ? s.left : s.end ? Math.max(0, s.end - Date.now()) : 0;
    return (
      <Box>
        <div className="remote-top"><b>{s.name}</b><span className="text-muted-foreground">سؤال {ar(s.i + 1)} من {ar(s.total)}</span></div>
        <div className="prog"><i style={{ width: (s.i * 100) / s.total + "%" }} /></div>
        <div className={"question remote-q " + (s.div ? "div " : "") + (s.reveal ? (s.ok ? "r-ok" : "r-no") : "")} dir="rtl">
          {s.q} = <span className="qa">{showAns || s.reveal ? s.ans : "؟"}</span></div>
        {s.reveal ? <>
          <p className={"remote-res " + (s.ok ? "ok" : "no")}>{s.to ? "انتهى الوقت" : s.ok ? "✓ صحيحة" : "✗ خاطئة"}</p>
          <Button size="xl" className="h-16 text-xl" disabled={!!sent} onClick={() => press("next")}>{spin("next", s.i + 1 < s.total ? "السؤال التالي" : "عرض النتيجة")}</Button>
        </> : <>
          <p className={"remote-secs " + (left <= 3000 ? "low" : "")}>{s.paused ? "متوقف" : ar(Math.ceil(left / 1000))}</p>
          <div className="marks remote-marks">
            <button type="button" className="mk ok" disabled={!!sent} onClick={() => press("ok")}>{spin("ok", "✓ صح")}</button>
            <button type="button" className="mk no" disabled={!!sent} onClick={() => press("no")}>{spin("no", "✗ خطأ")}</button></div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="lg" disabled={!!sent} onClick={() => press("pause")}>{s.paused ? <><Play /> متابعة</> : <><Pause /> إيقاف مؤقت</>}</Button>
            <Button variant="outline" size="lg" onClick={toggleAns}>{showAns ? <><EyeOff /> إخفاء الجواب</> : <><Eye /> إظهار الجواب</>}</Button>
          </div>
        </>}
      </Box>
    );
  }

  if (s.phase === "done") return (
    <Box>
      <h1 className="remote-name">{s.name}</h1>
      <div className="done-score">{s.score}</div><p className="text-muted-foreground">{s.pct}</p>
      {s.next ? <Button variant="warm" size="xl" className="h-16 text-xl" disabled={!!sent} onClick={() => press("nextStudent")}>{spin("nextStudent", `الطالب التالي: ${s.next}`)}</Button>
        : <Badge className="bg-success/15 px-3 py-1 text-base text-success">اختُبر جميع الطلاب</Badge>}
    </Box>
  );

  return <Box><Connected /><h2>بانتظار الاختبار</h2><p className="text-muted-foreground">افتح الاختبار على الشاشة واختر الطالب، وستظهر أزرار التحكم هنا.</p></Box>;
}
