import { useState } from "react";
import { db, put, settings } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, uid, toast, T10 } from "../lib/util.js";
import { classTests, buildPool } from "../lib/stats.js";
import { Shell, Icon, Empty } from "../components/ui.jsx";

const clampV = (v, lo, hi) => Math.min(hi, Math.max(lo, +v || lo));
function Stepper({ id, value, set, lo, hi }) {
  const clamp = clampV;
  return (
    <div className="stepper">
      <button type="button" className="btn" onClick={() => set(clamp(value - 1, lo, hi))}>−</button>
      <input id={id} type="number" min={lo} max={hi} value={value} onChange={(e) => set(e.target.value)} onBlur={(e) => set(clamp(e.target.value, lo, hi))} />
      <button type="button" className="btn" onClick={() => set(clamp(+value + 1, lo, hi))}>+</button>
    </div>
  );
}

export default function NewTest({ r }) {
  const c = db.data.classes[r.id];
  const st = settings(); const last = c ? classTests(c.id)[0] : null;
  const [op, setOp] = useState(last?.op || "mul");
  const [tables, setTables] = useState((last ? last.tables : [2, 3, 4, 5]).filter((t) => t <= 10));
  const [strict, setStrict] = useState(st.strict);
  const [count, setCount] = useState(st.count);
  const [seconds, setSeconds] = useState(st.seconds);
  const [swap, setSwap] = useState(st.swap);
  if (!c) return <Shell title="اختبار جديد" back={["home"]}><Empty title="هذا الفصل غير موجود" /></Shell>;

  const pool = buildPool(tables, strict); const ex = T10.filter((t) => !tables.includes(t));
  const toggleT = (t) => setTables((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t].sort((a, b) => a - b)));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, +v || lo));
  function create(e) {
    e.preventDefault();
    if (!tables.length) { toast("اختر جدولاً واحداً على الأقل"); return; }
    const t = { id: uid(), classId: c.id, op, tables: tables.slice().sort((a, b) => a - b), maxM: 10, strict, count: clamp(count, 1, 100), seconds: clamp(seconds, 3, 60), swap, date: Date.now(), results: {} };
    put("tests", t); go("test", t.id);
  }
  return (
    <Shell title="اختبار جديد" back={["class", c.id, "tests"]}>
      <h1>اختبار جديد · {c.name}</h1>
      <form className="stack" style={{ gap: 16 }} onSubmit={create}>
        <div className="card"><h3>نوع الاختبار</h3><div className="seg">
          <label><input type="radio" name="op" value="mul" checked={op === "mul"} onChange={() => setOp("mul")} /><span><b className="sym">×</b> ضرب</span></label>
          <label><input type="radio" name="op" value="div" checked={op === "div"} onChange={() => setOp("div")} /><span><b className="sym">÷</b> قسمة</span></label>
        </div></div>
        <div className="card stack">
          <div className="between"><h3>الجداول</h3><div className="row">
            <button type="button" className="btn sm" onClick={() => setTables(T10.slice())}>الكل</button>
            <button type="button" className="btn sm" onClick={() => setTables([])}>لا شيء</button>
            <button type="button" className="btn sm" onClick={() => setTables([2, 3, 4, 5])}>٢–٥</button>
            <button type="button" className="btn sm" onClick={() => setTables([6, 7, 8, 9])}>٦–٩</button>
          </div></div>
          <div className="tgrid">{T10.map((t) => <label key={t}><input type="checkbox" checked={tables.includes(t)} onChange={() => toggleT(t)} /><span>{n(t)}</span></label>)}</div>
          <label className="switch"><input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /><span><b>استبعاد نهائي للجداول غير المختارة</b>
            <small>عند التشغيل: إذا لم تختر جدول ٥ لن يظهر أي سؤال فيه ٥ أبداً، حتى ٩ × ٥. وعند الإيقاف: قد يظهر ٩ × ٥ ضمن جدول ٩.</small></span></label>
          <div className="poolbox">{!tables.length ? <span className="hint warn">اختر جدولاً واحداً على الأقل.</span> :
            <span>الأسئلة المختلفة المتاحة: {n(pool.length)}{strict && ex.length ? ` · لن يظهر أي سؤال فيه: ${ex.map(n).join("، ")}` : ""}{count > pool.length ? " · سيتكرر بعضها" : ""}</span>}</div>
        </div>
        <div className="card stack"><h3>الإعدادات</h3>
          <div className="between"><span>عدد الأسئلة لكل طالب</span><Stepper id="cnt" value={count} set={setCount} lo={1} hi={100} /></div>
          <div className="between"><span>زمن السؤال (ثانية)</span><Stepper id="sec" value={seconds} set={setSeconds} lo={3} hi={60} /></div>
          <label className="switch"><input type="checkbox" checked={swap} onChange={(e) => setSwap(e.target.checked)} /><span><b>خلط ترتيب العددين في الضرب</b><small>مثل ٤ × ٣ بدل ٣ × ٤</small></span></label>
        </div>
        <button className="btn primary big"><Icon name="play" /> إنشاء الاختبار</button>
      </form>
    </Shell>
  );
}
