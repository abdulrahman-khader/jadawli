// صفحة الجوال: تحكم عن بعد بالاختبار المعروض على الشاشة (لا تحتاج تسجيل دخول)
import { useEffect, useReducer, useRef, useState } from "react";
import { remoteAvailable, useRemoteClient } from "../lib/remote.js";
import { ConfirmButton } from "../components/ui.jsx";

const AR = "٠١٢٣٤٥٦٧٨٩";
const ar = (x) => String(x).replace(/\d/g, (d) => AR[d]);

export default function Remote({ r }) {
  if (!remoteAvailable()) return <Box><h2>التحكم بالجوال يعمل بعد ربط الموقع بـ Firebase</h2></Box>;
  return <RemoteInner tok={r.id} />;
}

function Box({ children }) { return <div className="remote"><div className="remote-in">{children}</div></div>; }

function RemoteInner({ tok }) {
  const [d, send] = useRemoteClient(tok);
  const [, tick] = useReducer((x) => x + 1, 0);
  const said = useRef(false);
  // إظهار الجواب في الجوال قبل الإجابة (يُحفظ على هذا الجوال)
  const [showAns, setShowAns] = useState(() => { try { return localStorage.getItem("mt_remote_ans") !== "0"; } catch { return true; } });
  const toggleAns = () => { const v = !showAns; setShowAns(v); try { localStorage.setItem("mt_remote_ans", v ? "1" : "0"); } catch { /* ignore */ } };
  useEffect(() => { const id = setInterval(tick, 250); return () => clearInterval(id); }, []);
  useEffect(() => { if (d && !said.current) { said.current = true; send("hello").catch(() => {}); } }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  // إبقاء شاشة الجوال مضاءة
  useEffect(() => {
    let lock = null;
    const get = () => { if (document.visibilityState === "visible") navigator.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    get(); document.addEventListener("visibilitychange", get);
    return () => { document.removeEventListener("visibilitychange", get); lock?.release?.().catch(() => {}); };
  }, []);
  const press = (c) => { navigator.vibrate?.(25); send(c).catch(() => {}); };

  if (d === undefined) return <Box><p className="muted">جارٍ الاتصال…</p></Box>;
  if (d === null) return <Box><h2>الرابط غير صالح</h2><p className="muted">امسح الباركود من جديد من شاشة الاختبار.</p></Box>;
  const s = d.state || {}; latin = s.ar === false;

  if (s.phase === "ready") return (
    <Box>
      <span className="chip good">الجوال متصل ✓</span>
      <h1 className="remote-name">{s.name}</h1><p className="muted">{s.info}</p>
      <button type="button" className="mk ok remote-big" onClick={() => press("start")}>▶ ابدأ</button>
      <ConfirmButton className="btn" confirmText="اضغط مرة أخرى: غائب" onConfirm={() => press("absent")}>غائب</ConfirmButton>
    </Box>
  );

  if (s.phase === "q") {
    const left = s.paused ? s.left : s.end ? Math.max(0, s.end - Date.now()) : 0;
    return (
      <Box>
        <div className="remote-top"><b>{s.name}</b><span className="muted">سؤال {ar(s.i + 1)} من {ar(s.total)}</span></div>
        <div className="prog"><i style={{ width: (s.i * 100) / s.total + "%" }} /></div>
        <div className={"question remote-q " + (s.div ? "div " : "") + (s.reveal ? (s.ok ? "r-ok" : "r-no") : "")} dir="rtl">
          {s.q} = <span className="qa">{showAns || s.reveal ? s.ans : "؟"}</span></div>
        {s.reveal ? <>
          <p className={"remote-res " + (s.ok ? "ok" : "no")}>{s.to ? "انتهى الوقت" : s.ok ? "✓ صحيحة" : "✗ خاطئة"}</p>
          <button type="button" className="btn primary remote-big" onClick={() => press("next")}>{s.i + 1 < s.total ? "السؤال التالي" : "عرض النتيجة"}</button>
        </> : <>
          <p className={"remote-secs " + (left <= 3000 ? "low" : "")}>{s.paused ? "متوقف" : ar(Math.ceil(left / 1000))}</p>
          <div className="marks remote-marks"><button type="button" className="mk ok" onClick={() => press("ok")}>✓ صح</button><button type="button" className="mk no" onClick={() => press("no")}>✗ خطأ</button></div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button type="button" className="btn" onClick={() => press("pause")}>{s.paused ? "متابعة" : "إيقاف مؤقت"}</button>
            <button type="button" className="btn" onClick={toggleAns}>{showAns ? "إخفاء الجواب" : "إظهار الجواب"}</button>
          </div>
        </>}
      </Box>
    );
  }

  if (s.phase === "done") return (
    <Box>
      <h1 className="remote-name">{s.name}</h1>
      <div className="done-score">{s.score}</div><p className="muted">{s.pct}</p>
      {s.next ? <button type="button" className="btn yellow remote-big" onClick={() => press("nextStudent")}>الطالب التالي: {s.next}</button>
        : <p className="chip good">اختُبر جميع الطلاب</p>}
    </Box>
  );

  return <Box><span className="chip good">الجوال متصل ✓</span><h2>بانتظار الاختبار</h2><p className="muted">افتح الاختبار على الشاشة واختر الطالب، وستظهر أزرار التحكم هنا.</p></Box>;
}
