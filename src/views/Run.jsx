import { useEffect, useReducer, useRef, useState } from "react";
import { db, put } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, pct, secs, opName, toast, isAr } from "../lib/util.js";
import { classStudents, makeQuestions, sc, qText, qAns } from "../lib/stats.js";
import { Shell, Avatar, Icon, Empty, ConfirmButton } from "../components/app.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { useRemoteHost } from "../lib/remote.js";
import { RemoteButton, RemoteQr, studentList } from "../components/remote-qr.jsx";

const CIRC = 2 * Math.PI * 52;
const REVEAL_MS = 1500;

export default function Run({ r }) {
  const t = db.data.tests[r.id]; const s = db.data.students[r.id2];
  const R = useRef(null);
  if (!R.current && t) R.current = { phase: "ready", qs: makeQuestions(t), i: 0, paused: false, reveal: false, qStart: 0, pausedAt: 0, left: t.seconds * 1000, tok: 0 };
  const [, force] = useReducer((x) => x + 1, 0);
  const run = R.current; const total = (t?.seconds || 10) * 1000;

  const begin = () => { run.qStart = performance.now(); run.left = total; run.remain = total; run.seg = (run.seg || 0) + 1; run.paused = false; run.reveal = false; force(); };
  const finish = () => { t.results = t.results || {}; t.results[s.id] = { status: "done", items: run.qs, at: Date.now() }; put("tests", t); run.phase = "done"; force(); window.scrollTo(0, 0); };
  const next = () => { if (!run.reveal) return; run.reveal = false; run.i++; if (run.i >= run.qs.length) finish(); else begin(); };
  const mark = (ok, timeout) => {
    if (run.phase !== "q" || run.reveal || run.paused) return;
    const q = run.qs[run.i]; q.ok = !!ok; q.to = !!timeout; q.ms = Math.round(Math.min(total, performance.now() - run.qStart));
    run.left = Math.max(0, total - q.ms); run.reveal = true; force();
    const tok = ++run.tok; setTimeout(() => { if (R.current === run && run.reveal && run.tok === tok) next(); }, REVEAL_MS);
  };
  const togglePause = () => {
    if (run.reveal) return;
    if (run.paused) { run.qStart += performance.now() - run.pausedAt; run.paused = false; run.remain = total - (performance.now() - run.qStart); run.seg = (run.seg || 0) + 1; } else { run.paused = true; run.pausedAt = performance.now(); }
    force();
  };
  // المؤقت
  const fns = useRef({}); fns.current = { mark, next };
  useEffect(() => {
    const id = setInterval(() => {
      if (!run || run.phase !== "q" || run.paused || run.reveal) return;
      run.left = Math.max(0, total - (performance.now() - run.qStart));
      if (run.left <= 0) fns.current.mark(false, true); else force();
    }, 100);
    const key = (e) => {
      if (!run || run.phase !== "q") return;
      if (run.reveal) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fns.current.next(); } return; }
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); fns.current.mark(true, false); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); fns.current.mark(false, false); }
    };
    window.addEventListener("keydown", key);
    return () => { clearInterval(id); window.removeEventListener("keydown", key); if (run) run.tok++; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // تحكم الجوال
  const [qrOpen, setQrOpen] = useState(false);
  const nextStud = () => (t ? classStudents(t.classId).find((z) => !t.results?.[z.id] && z.id !== s?.id) : null);
  const goNext = () => { const nx = nextStud(); if (nx) go("run", t.id, null, nx.id, { replace: true }); else go("test", t.id); };
  const onCmd = (c, d = {}) => {
    if (c === "hello") { setQrOpen(false); toast("تم ربط الجوال ✓"); return; }
    if (c === "pick") { if (run.phase !== "q" && d.sid && d.sid !== s.id && db.data.students[d.sid]) go("run", t.id, null, d.sid, { replace: true }); return; }
    if (run.phase === "ready") {
      if (c === "start" && run.qs.length) { run.phase = "q"; begin(); }
      else if (c === "absent") { t.results = t.results || {}; t.results[s.id] = { status: "absent", at: Date.now() }; put("tests", t); goNext(); }
    } else if (run.phase === "q") {
      if (d.i != null && d.i !== run.i) return; // أمر متأخر لسؤال سابق
      if (c === "ok") mark(true, false); else if (c === "no") mark(false, false); else if (c === "next") next(); else if (c === "pause") togglePause();
      // الجوال انتهى عدّاده: نعتمد عليه إذا تأخر مؤقت هذا الجهاز (مثلاً الصفحة في الخلفية)
      else if (c === "timeout" && !run.paused && performance.now() - run.qStart >= total - 1500) mark(false, true);
    } else if (run.phase === "done" && c === "nextStudent") goNext();
  };
  useRemoteHost(remoteState(), onCmd);
  function remoteState() {
    if (!t || !s || !run) return { phase: "idle" };
    const q = run.phase === "q" ? run.qs[run.i] : null; const x = run.phase === "done" ? sc(t.results[s.id]) : null;
    return {
      phase: run.phase, name: s.name, info: `اختبار ${opName(t.op)} · الجداول ${t.tables.map(n).join("، ")}`, i: run.i, total: run.qs.length,
      q: q ? qText(q) : null, ans: q ? n(qAns(q)) : null, div: q?.op === "div", reveal: !!run.reveal, ok: q?.ok ?? null, to: !!q?.to,
      // remain: الوقت الباقي لحظة بدء السؤال أو استئنافه، والجوال يعدّ بساعته هو (ساعتا الجهازين قد تختلفان)
      paused: !!run.paused, remain: q && !run.paused && !run.reveal ? Math.round(run.remain) : null, seg: run.seg || 0,
      left: q && run.paused ? total - (run.pausedAt - run.qStart) : null, secs: t.seconds,
      score: x ? `${n(x.c)}/${n(x.total)}` : null, pct: x ? pct(x.p) : null, avg: x ? secs(x.avgMs) : null,
      wrong: x ? t.results[s.id].items.filter((w) => !w.ok).map((w) => ({ q: qText(w), a: n(qAns(w)), to: !!w.to })) : null, next: run.phase !== "q" ? nextStud()?.name || null : null, ar: isAr(),
      cur: s.id, students: run.phase !== "q" ? studentList(classStudents(t.classId), t) : null,
    };
  }
  const remoteBtn = <RemoteButton onClick={() => setQrOpen(true)} />;
  const qrModal = <RemoteQr open={qrOpen} onClose={() => setQrOpen(false)} />;

  if (!t || !s) return <Shell title="الاختبار" back={["home"]}><Empty title="الاختبار أو الطالب غير موجود" /></Shell>;
  const back = ["test", t.id];

  if (run.phase === "ready") return (
    <Shell title="الاختبار" back={back}><div className="run">
      <Avatar name={s.name} className="size-16 rounded-2xl text-2xl" /><h1 className="text-4xl">{s.name}</h1>
      <p className="text-muted-foreground">اختبار {opName(t.op)} · الجداول {t.tables.map(n).join("، ")}</p>
      <p>{n(run.qs.length)} سؤالاً · {n(t.seconds)} ثوانٍ لكل سؤال. إذا انتهى الوقت يُحسب السؤال خطأ.</p>
      <Button variant="warm" size="xl" className="h-16 text-xl" disabled={!run.qs.length}
        onClick={() => { run.phase = "q"; begin(); }}><Icon name="play" /> ابدأ الآن</Button>
      {remoteBtn}
    </div>{qrModal}</Shell>
  );

  if (run.phase === "done") {
    // الدرجة لا تظهر على الشاشة المعروضة للطلاب: تظهر في جوال المعلم، وفي صفحة الاختبار والتقارير
    const nx = classStudents(t.classId).find((z) => !t.results?.[z.id]);
    return (
      <Shell title="انتهى الاختبار" back={back}><div className="run">
        <Avatar name={s.name} className="size-16 rounded-2xl text-2xl" /><h1 className="text-4xl">{s.name}</h1>
        <div className="grid size-20 place-items-center rounded-full bg-success/15 text-5xl text-success">✓</div>
        <p className="font-display text-2xl font-bold">انتهى اختبارك، شكراً لك</p>
        {nx ? <Button variant="warm" size="xl" onClick={() => go("run", t.id, null, nx.id, { replace: true })}>الطالب التالي: {nx.name}</Button>
          : <Badge className="bg-success/15 px-3 py-1 text-base text-success">اختُبر جميع الطلاب</Badge>}
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => go("result", t.id, null, s.id)}>مراجعة وتعديل الدرجة</Button>
          <Button variant="outline" onClick={() => go("test", t.id)}>قائمة الطلاب</Button>
        </div>
        {remoteBtn}
      </div>{qrModal}</Shell>
    );
  }

  const q = run.qs[run.i]; const rv = run.reveal; const left = run.paused ? total - (run.pausedAt - run.qStart) : run.left;
  return (
    <Shell title="الاختبار" back={back}><div className="run">
      <div className="run-top"><span className="run-name">{s.name}</span><span className="font-display tabular-nums text-muted-foreground">سؤال {n(run.i + 1)} من {n(run.qs.length)}</span>
        {rv ? <span /> : <Button variant="outline" size="sm" onClick={togglePause}>{run.paused ? "متابعة" : "إيقاف مؤقت"}</Button>}</div>
      <div className="prog"><i style={{ width: (run.i * 100) / run.qs.length + "%" }} /></div>
      <div className={"timer-ring " + (left <= 3000 ? "low" : "")}><svg viewBox="0 0 120 120"><circle className="bg" cx="60" cy="60" r="52" />
        <circle className="fg" cx="60" cy="60" r="52" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - left / total)} /></svg>
        <div className="secs">{n(Math.ceil(left / 1000))}</div></div>
      <div className={"question " + (q.op === "div" ? "div " : "") + (rv ? (q.ok ? "r-ok" : "r-no") : "")} dir="rtl">{qText(q)} = <span className="qa">{rv ? n(qAns(q)) : "؟"}</span></div>
      {rv ? <div className={"reveal " + (q.ok ? "ok" : "no")}><b>{q.to ? "انتهى الوقت" : q.ok ? "✓ إجابة صحيحة" : "✗ إجابة خاطئة"}</b>
        <Button variant="outline" size="lg" onClick={next}>{run.i + 1 < run.qs.length ? "السؤال التالي" : "عرض النتيجة"}</Button></div>
        : <div className="marks"><button type="button" className="mk ok" onClick={() => mark(true, false)}>✓ صح</button><button type="button" className="mk no" onClick={() => mark(false, false)}>✗ خطأ</button></div>}
      <ConfirmButton variant="ghost" className="text-destructive" confirmText="إلغاء محاولة الطالب؟" desc="لن تُحفظ إجاباته في هذه المحاولة." action="إلغاء المحاولة"
        onConfirm={() => go("test", t.id)}>إلغاء المحاولة</ConfirmButton>
      {run.paused && <Badge className="bg-warm/30 text-foreground">متوقف مؤقتاً</Badge>}
      {remoteBtn}
    </div>{qrModal}</Shell>
  );
}
