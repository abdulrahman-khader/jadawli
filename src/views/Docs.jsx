import { useReducer, useState } from "react";
import { db, settings, displayName } from "../lib/store.js";
import { go, bulk } from "../lib/router.js";
import { n, pct, secs, opName, fmtDate, shuffle, scoreColor, T10, toast, testScope, isTables } from "../lib/util.js";
import { testStats, sc, qText, classStudents, classAgg, reportIds, periodText, studentAgg } from "../lib/stats.js";
import { planData, TRICKS, explainFact, splitFact, targetFacts } from "../lib/plan.js";
import { Icon, Kpi, Logo, Btn, useBusy, nextFrame, Spinner } from "../components/app.jsx";
import { Progress } from "../components/ui/progress.jsx";
import { Button } from "../components/ui/button.jsx";
import { HBars, ColChart, LineChart, HeatMap, Facts } from "../components/charts.jsx";

const DocHead = () => (
  <div className="dh"><div className="dh-brand"><Logo /><div><b>{settings().school || "جداولي"}</b><span>المعلم: {displayName()}</span></div></div>
    <div className="dh-date">{fmtDate(Date.now())}</div></div>
);
const Sec = ({ title, children }) => <div className="dsec"><h2>{title}</h2>{children}</div>;
const Sign = ({ a = "تقييم المعلم", b = "توقيع ولي الأمر" }) => <div className="row" style={{ gap: 40 }}><span>{a}: ..........</span><span>{b}: ..........</span></div>;

function ChunkMatrix({ studs, asc, ids }) {
  const per = 6, parts = []; for (let i = 0; i < asc.length; i += per) parts.push(asc.slice(i, i + per));
  return parts.map((p, pi) => (
    <div key={pi} className="stack" style={{ gap: 6 }}>
      {parts.length > 1 && <p className="hint">الاختبارات {n(pi * per + 1)}–{n(pi * per + p.length)} من {n(asc.length)}</p>}
      <div className="tbl-wrap mtx"><table className="tbl">
        <thead><tr><th>الطالب</th>{p.map((t, i) => <th key={t.id}>{n(pi * per + i + 1)}. {opName(t.op)}<br />{fmtDate(t.date, true)}</th>)}<th>المتوسط العام</th></tr></thead>
        <tbody>{studs.map((s) => {
          const a = studentAgg(s.id, ids);
          return <tr key={s.id}><td>{s.name}</td>{p.map((t) => { const r = t.results?.[s.id]; const x = sc(r); return <td key={t.id}>{r?.status === "absent" ? "غائب" : x ? <b style={{ color: scoreColor(x.p) }}>{pct(x.p)}</b> : "—"}</td>; })}<td><b>{pct(a.avg)}</b></td></tr>;
        })}</tbody>
        <tfoot><tr><td>متوسط الاختبار</td>{p.map((t) => <td key={t.id}>{pct(testStats(t).avg)}</td>)}<td /></tr></tfoot>
      </table></div>
    </div>
  ));
}

function TestDoc({ t }) {
  const st = testStats(t); const c = db.data.classes[t.classId]; const ranked = st.done.slice().sort((a, b) => b.x.p - a.x.p);
  return <>
    <section className="sheet"><DocHead />
      <h1 className="dtitle">تقرير اختبار {opName(t.op)} · {c?.name}</h1>
      <p className="dsub">{fmtDate(t.date)} · {testScope(t)} · {n(t.count)} سؤال · {n(t.seconds)} ثوانٍ للسؤال{t.strict ? " · استبعاد نهائي" : ""}</p>
      <div className="kpis"><Kpi v={pct(st.avg)} label="المتوسط" /><Kpi v={pct(st.max)} label="الأعلى" /><Kpi v={pct(st.min)} label="الأقل" /><Kpi v={`${n(st.done.length)}/${n(st.studs.length)}`} label={`أنهوا · ${n(st.absent)} غائب`} /></div>
      <Sec title="درجات الطلاب"><HBars items={ranked.map((d) => ({ label: d.s.name, p: d.x.p }))} /></Sec>
      {isTables(t.op) && <Sec title="الدقة في كل جدول"><ColChart tables={st.tables} /></Sec>}
      <Sec title="أكثر الأسئلة خطأً"><Facts list={st.facts} op={t.op} /></Sec>
    </section>
    <section className="sheet"><Sec title="التفاصيل"><table className="dtable"><thead><tr><th>#</th><th>الطالب</th><th>الدرجة</th><th>النسبة</th><th>الزمن</th><th>الأسئلة الخاطئة</th></tr></thead><tbody>
      {st.studs.map((s, i) => { const r = t.results?.[s.id]; const x = sc(r);
        return <tr key={s.id}><td>{n(i + 1)}</td><td className="r">{s.name}</td><td>{r?.status === "absent" ? "غائب" : x ? `${n(x.c)}/${n(x.total)}` : "—"}</td><td>{x ? pct(x.p) : "—"}</td><td>{x ? secs(x.avgMs) : "—"}</td>
          <td className="r" dir="rtl">{x ? r.items.filter((q) => !q.ok).map(qText).join("، ") || "—" : "—"}</td></tr>; })}
    </tbody></table></Sec></section>
  </>;
}

function ClassDoc({ cid }) {
  const c = db.data.classes[cid]; const studs = classStudents(cid); const ids = reportIds(cid); const ag = classAgg(cid, ids);
  const sa = studs.map((s) => ({ s, a: studentAgg(s.id, ids) })); const avgs = sa.map((x) => x.a.avg).filter((x) => x != null);
  return <>
    <section className="sheet"><DocHead />
      <h1 className="dtitle">التقرير الشامل · {c.name}</h1><p className="dsub">{n(ag.tests.length)} اختبار · {n(studs.length)} طالب · {periodText(ag.tests)}</p>
      <div className="kpis"><Kpi v={pct(avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null)} label="متوسط الفصل" /><Kpi v={n(avgs.filter((x) => x >= 90).length)} label="متقن" />
        <Kpi v={n(avgs.filter((x) => x >= 70 && x < 90).length)} label="جيد" /><Kpi v={n(avgs.filter((x) => x < 70).length)} label="يحتاج دعماً" /></div>
      <Sec title="متوسط الفصل في كل اختبار"><LineChart points={ag.tests.map((t) => ({ label: fmtDate(t.date, true), p: testStats(t).avg })).filter((x) => x.p != null)} /></Sec>
      <Sec title="دقة الفصل في كل جدول"><ColChart tables={ag.tables} /></Sec>
      <Sec title="أكثر الأسئلة خطأً"><Facts list={ag.facts} /></Sec>
    </section>
    <section className="sheet">
      <Sec title="متوسط كل طالب"><HBars items={sa.filter((x) => x.a.avg != null).sort((x, y) => y.a.avg - x.a.avg).map((x) => ({ label: x.s.name, p: x.a.avg }))} /></Sec>
      <Sec title="درجات الاختبارات"><ChunkMatrix studs={studs} asc={ag.tests} ids={ids} /></Sec>
    </section>
  </>;
}

function StudentDoc({ sid }) {
  const s = db.data.students[sid]; const c = db.data.classes[s.classId]; const a = studentAgg(sid);
  return <>
    <section className="sheet"><DocHead />
      <h1 className="dtitle">تقرير الطالب · {s.name}</h1><p className="dsub">{c?.name}</p>
      <div className="kpis"><Kpi v={pct(a.avg)} label="المتوسط" /><Kpi v={secs(a.avgMs)} label="زمن الإجابة" /><Kpi v={n(a.done.length)} label="اختبار" /><Kpi v={n(a.absent)} label="غياب" /></div>
      <Sec title="تطور الدرجات"><LineChart points={a.done.map((e) => ({ label: fmtDate(e.t.date, true), p: e.x.p }))} /></Sec>
      <Sec title="الدقة في كل جدول"><ColChart tables={a.tables} /></Sec>
      <Sec title="خريطة الإتقان"><HeatMap a={a} /></Sec>
    </section>
    <section className="sheet"><Sec title="سجل الاختبارات"><table className="dtable"><thead><tr><th>التاريخ</th><th>النوع</th><th>الجداول</th><th>الدرجة</th><th>الأسئلة الخاطئة</th></tr></thead><tbody>
      {a.h.map((e) => <tr key={e.t.id}><td>{fmtDate(e.t.date, true)}</td><td>{opName(e.t.op)}</td><td>{testScope(e.t, true)}</td>
        <td>{e.r.status === "absent" ? "غائب" : `${n(e.x.c)}/${n(e.x.total)} (${pct(e.x.p)})`}</td>
        <td className="r" dir="rtl">{e.x ? e.r.items.filter((q) => !q.ok).map(qText).join("، ") || "—" : "—"}</td></tr>)}
    </tbody></table></Sec></section>
  </>;
}

function PlanDoc({ d }) {
  const { s, c, a, weak, slow, strong, wrongFacts, hadDiv, focus, lv } = d;
  const fw = [...weak, ...slow].map((v) => v.t); const weeks = [];
  if (fw.length) {
    const ch = []; for (let i = 0; i < fw.length && ch.length < 3; i += 2) ch.push(fw.slice(i, i + 2)); if (fw.length > 6) ch[2] = ch[2].concat(fw.slice(6));
    ch.forEach((x, i) => weeks.push({ h: `الأسبوع ${n(i + 1)}`, b: `جدول ${x.map(n).join(" و")}`, d: "قراءة الجدول، بطاقات الحقائق الخاطئة، وتحدي سرعة قصير يومياً." }));
    weeks.push({ h: `الأسبوع ${n(weeks.length + 1)}`, b: "مراجعة شاملة", d: "خلط الجداول السابقة مع الحقائق الخاطئة، ثم إعادة الاختبار في الفصل." });
  }
  return <>
    <section className="sheet"><DocHead />
      <div className="between"><div><h1 className="dtitle">الخطة العلاجية · {s.name}</h1><p className="muted">{c?.name}</p></div>
        <span className="lvl" style={{ background: `color-mix(in srgb,${lv.c} 14%,#fff)`, color: lv.c }}>{lv.t}</span></div>
      <div className="kpis"><Kpi v={pct(a.avg)} label={`متوسط ${n(a.done.length)} اختبار`} /><Kpi v={secs(a.avgMs)} label="زمن الإجابة" /><Kpi v={n(wrongFacts.length)} label="حقيقة تحتاج تدريباً" /><Kpi v={n(a.absent)} label="غياب" /></div>
      <Sec title="الدقة في كل جدول"><ColChart tables={a.tables} /></Sec>
      <Sec title="التشخيص">
        <p><b>نقاط القوة:</b> {strong.length ? strong.map((v) => `جدول ${n(v.t)} (${pct(v.p)})`).join("، ") : "لم يصل بعد إلى إتقان ٩٠٪ في أي جدول."}</p>
        <p><b>يحتاج تدريباً:</b> {weak.length ? weak.map((v) => `جدول ${n(v.t)} (دقة ${pct(v.p)})`).join("، ") : "لا توجد جداول ضعيفة."}</p>
        {slow.length > 0 && <p><b>صحيح لكنه بطيء:</b> {slow.map((v) => `جدول ${n(v.t)} (${secs(v.avgMs)})`).join("، ")}. البطء مع صحة الإجابة يعني أن الطالب يحسب ولا يستحضر الحقيقة من الذاكرة.</p>}
      </Sec>
      {wrongFacts.length > 0 && <Sec title="الأخطاء وشرحها"><div className="learn">{wrongFacts.slice(0, 8).map((f, i) => (
        <div className="lcard" key={i}><div className="eq" dir="rtl">{n(f.t)} × {n(f.m)} = {n(f.t * f.m)}</div><p className="why"><b>الطريقة:</b> {explainFact(f.t, f.m)}</p><p className="hint">أخطأ {n(f.wrong)} من {n(f.tries)}</p></div>
      ))}</div></Sec>}
    </section>
    <section className="sheet"><DocHead />
      <Sec title="طريقة الحفظ">
        {focus.map((t) => <div className="trick" key={t}><h3>جدول {n(t)}</h3><p>{TRICKS[t]?.()}</p></div>)}
        <div className="trick"><h3>قاعدة الإبدال</h3><p>{n(3)} × {n(8)} = {n(8)} × {n(3)}، لذلك كل حقيقة يحفظها الطالب تعطيه حقيقتين، والجدول يصبح نصف ما يبدو عليه.</p></div>
        {hadDiv && <div className="trick"><h3>القسمة</h3><p>القسمة عكس الضرب. لحل {n(42)} ÷ {n(6)} اسأل نفسك: {n(6)} × كم = {n(42)}؟ من يحفظ حقيقة الضرب يعرف القسمة.</p></div>}
      </Sec>
      {weeks.length ? <Sec title="الخطة الأسبوعية"><div className="weeks">{weeks.map((w, i) => <div className="week" key={i}><b>{w.h}</b><span className="chip pri">{w.b}</span><p className="hint" style={{ marginTop: 6 }}>{w.d}</p></div>)}</div></Sec>
        : <Sec title="الخطة"><p>مستواه ممتاز. يكفيه تدريب سرعة مرتين أسبوعياً للمحافظة على مستواه.</p></Sec>}
      <Sec title="روتين يومي (١٠ دقائق)"><ul className="clean">
        <li><b>دقيقتان:</b> قراءة جدول الأسبوع بصوت مرتفع.</li>
        <li><b>٣ دقائق:</b> بطاقات الحقائق الخاطئة: السؤال على الوجه والجواب خلفه. البطاقة التي يجيبها صحيحة ٣ أيام متتالية تخرج من الرزمة.</li>
        <li><b>٣ دقائق:</b> كتابة كل حقيقة مع عكسها بالقسمة.</li>
        <li><b>دقيقتان:</b> تحدي سرعة: ١٠ أسئلة مع مؤقت، ومحاولة تحسين الزمن كل يوم.</li></ul></Sec>
      <Sec title="نصائح لولي الأمر"><ul className="clean">
        <li>جلسة قصيرة كل يوم أفضل من جلسة طويلة مرة في الأسبوع.</li>
        <li>اسأله الحقائق في السيارة أو أثناء المشي، بلا ورق.</li>
        <li>امدح التحسن والمحاولة، لا السرعة فقط.</li>
        <li>علّق ورقة الجدول الذي يتدرب عليه في مكان يراه يومياً.</li></ul></Sec>
      <Sign a="توقيع المعلم" />
    </section>
  </>;
}

// ---------- ورقة العمل العلاجية ----------
function DotArray({ sp }) {
  const c = 13, gap = sp.mode === "add" ? 8 : 0, W = sp.cols * c + 4, H = sp.rows * c + gap + 4; const els = [];
  for (let i = 0; i < sp.rows; i++) {
    const cls = sp.mode === "add" ? (i < sp.a1 ? "d1" : "d2") : i < 9 ? "d1" : "d3";
    const y = 2 + c / 2 + i * c + (sp.mode === "add" && i >= sp.a1 ? gap : 0);
    for (let j = 0; j < sp.cols; j++) els.push(<circle key={i + "-" + j} className={cls} cx={2 + c / 2 + j * c} cy={y} r="4.6" />);
    if (cls === "d3") els.push(<line key={"s" + i} className="strike" x1="1" x2={W - 1} y1={y} y2={y} />);
  }
  if (sp.mode === "add") els.push(<line key="cut" className="cut" x1="0" x2={W} y1={2 + sp.a1 * c + gap / 2} y2={2 + sp.a1 * c + gap / 2} />);
  return <svg className="dots" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>{els}</svg>;
}
function SplitEq({ sp }) {
  if (sp.mode === "sub") return <><span className="g1">{n(10)} × {n(sp.b)}</span> − <span className="g2">{n(1)} × {n(sp.b)}</span> = <span className="g1">{n(10 * sp.b)}</span> − <span className="g2">{n(sp.b)}</span> = <b>{n(9 * sp.b)}</b></>;
  return <><span className="g1">{n(sp.a1)} × {n(sp.b)}</span> + <span className="g2">{n(sp.a2)} × {n(sp.b)}</span> = <span className="g1">{n(sp.a1 * sp.b)}</span> + <span className="g2">{n(sp.a2 * sp.b)}</span> = <b>{n(sp.a * sp.b)}</b></>;
}
const Triangle = ({ f }) => (
  <svg className="tri" viewBox="0 0 120 104"><polygon points="60,4 116,100 4,100" /><line x1="22" y1="68" x2="98" y2="68" />
    <text x="60" y="54" className="tp">{n(f.t * f.m)}</text><text x="38" y="90">{n(f.t)}</text><text x="82" y="90">{n(f.m)}</text>
    <text x="60" y="90" className="op">×</text><text x="60" y="66" className="op">÷</text></svg>
);
const BX = () => <span className="bx" />;

function SheetDoc({ d }) {
  const { s, c, focus, hadDiv } = d;
  const tg = targetFacts(d); const main = focus[0] || tg[0]?.t || 7;
  const ch = []; tg.forEach((f) => { ch.push(f); ch.push({ t: f.m, m: f.t }); }); T10.forEach((m) => ch.push({ t: main, m }));
  const chal = shuffle(ch).slice(0, 12).map((q, i) => ({ ...q, op: (hadDiv ? i % 3 === 2 : i % 4 === 3) ? "div" : "mul" }));
  return <>
    <section className="sheet"><DocHead />
      <h1 className="dtitle">ورقة عمل علاجية · حقائق الضرب</h1>
      <div className="ws-id"><div>الاسم: <b>{s.name}</b></div><div>الفصل: <b>{c?.name}</b></div><div /></div>
      <div className="goal"><b>هدفي هذا الأسبوع أن أحفظ:</b> {tg.map((f, i) => <span className="gchip" dir="rtl" key={i}>{n(f.t)} × {n(f.m)} = {n(f.t * f.m)}</span>)}</div>
      <Sec title="١. أرى وأفهم"><p className="hint">كل نقطة تمثل واحداً. نقسم المجموعة الكبيرة إلى جزأين نعرفهما، ثم نجمع.</p>
        <div className="arrays">{tg.slice(0, 3).map((f, i) => { const sp = splitFact(f.t, f.m);
          return <div className="acard" key={i}><div className="eq" dir="rtl">{n(f.t)} × {n(f.m)} = {n(f.t * f.m)}</div>
            {sp ? <><DotArray sp={sp} /><p className="split" dir="rtl"><SplitEq sp={sp} /></p></> : <p className="split">{explainFact(f.t, f.m)}</p>}</div>; })}</div></Sec>
      <Sec title="٢. انظر · غطِّ · اكتب · تحقّق">
        <p className="hint">اقرأ الحقيقة بصوت مرتفع، ثم غطِّها أو اطوِ الورقة على الخط المنقّط، واكتبها من ذاكرتك، ثم اكشفها وضع ✓ إذا كانت صحيحة.</p>
        <table className="ccc"><thead><tr><th>الحقيقة</th><th className="fold" /><th>المحاولة ١</th><th>✓</th><th>المحاولة ٢</th><th>✓</th><th>المحاولة ٣</th><th>✓</th></tr></thead>
          <tbody>{tg.map((f, i) => <tr key={i}><td className="fact-c" dir="rtl">{n(f.t)} × {n(f.m)} = {n(f.t * f.m)}</td><td className="fold" /><td /><td className="ck" /><td /><td className="ck" /><td /><td className="ck" /></tr>)}</tbody></table></Sec>
    </section>
    <section className="sheet">
      <div className="ws-id"><div>الاسم: <b>{s.name}</b></div><div /><div /></div>
      <Sec title="٣. مثلث العائلة"><p className="hint">الأعداد الثلاثة في المثلث تكوّن أربع حقائق: اثنتان ضرب واثنتان قسمة.</p>
        <div className="fams">{tg.slice(0, 4).map((f, i) => <div className="fam" key={i}><Triangle f={f} /><div className="famq" dir="rtl">
          <div><BX /> × <BX /> = <BX /></div><div><BX /> × <BX /> = <BX /></div><div><BX /> ÷ <BX /> = <BX /></div><div><BX /> ÷ <BX /> = <BX /></div></div></div>)}</div></Sec>
      <Sec title={`٤. أكمل جدول ${n(main)}`}><div className="ladder">{T10.map((m) => <div className="rung" dir="rtl" key={m}><span>{n(main)} × {n(m)}</span><span className="ln" /></div>)}</div></Sec>
      <Sec title="٥. تحدي الدقيقة"><p className="hint">حلّ الأسئلة في دقيقة واحدة. الزمن: ........ ثانية · الصحيح: ........ من {n(12)}</p>
        <div className="blanks c3">{chal.map((q, i) => <div className="blank" dir="rtl" key={i}><span>{q.op === "div" ? `${n(q.t * q.m)} ÷ ${n(q.t)}` : `${n(q.t)} × ${n(q.m)}`} =</span><span className="ln" /></div>)}</div></Sec>
      <Sign />
    </section>
  </>;
}

export default function DocView({ r }) {
  const [seed, reroll] = useReducer((x) => x + 1, 0);
  const [printing, runPrint] = useBusy();
  const [prog, setProg] = useState(null); // [الصفحة الحالية، عدد الصفحات] أثناء إنشاء الملف
  // تنزيل PDF مباشرة: أسرع من نافذة الطباعة، ونعرض تقدّم العمل صفحة بصفحة
  const download = async () => {
    if (prog) return;
    setProg([0, 0]); await nextFrame();
    try {
      const { sheetsToPdf } = await import("../lib/pdf.js");
      const sheets = [...document.querySelectorAll(".doc .sheet")];
      await sheetsToPdf(sheets, fileName, (i, k) => setProg([i, k]));
      toast("نُزّل ملف PDF");
    } catch { toast("تعذّر إنشاء الملف. جرّب زر «طباعة» بدلاً منه"); }
    finally { setProg(null); }
  };
  const printNow = () => runPrint(async () => { await nextFrame(); await document.fonts?.ready; window.print(); });
  const kind = r.tab, id = r.id; let title = "", back = ["home"], body = null, extra = null;
  if (kind === "test" && db.data.tests[id]) { title = "تقرير الاختبار"; back = ["test", id]; body = <TestDoc t={db.data.tests[id]} />; }
  else if (kind === "class" && db.data.classes[id]) { title = "تقرير الفصل"; back = ["class", id, "report"]; body = <ClassDoc cid={id} />; }
  else if (kind === "student" && db.data.students[id]) { title = "تقرير الطالب"; back = ["student", id]; body = <StudentDoc sid={id} />; }
  else if (kind === "sheets" && db.data.classes[id]) {
    const ids = bulk.ids || classStudents(id).map((s) => s.id);
    const ds = ids.map(planData).filter(Boolean);
    title = `أوراق العمل · ${n(ds.length)} طالب`; back = ["bulk", id];
    body = ds.map((d) => <SheetDoc key={d.s.id + seed} d={d} />);
    extra = <Button variant="ghost" size="sm" className="bg-white/14 text-white hover:bg-white/24 hover:text-white" onClick={() => { reroll(); toast("أُنشئت أسئلة جديدة"); }}><Icon name="refresh" /> أسئلة جديدة</Button>;
  } else if ((kind === "plan" || kind === "sheet") && planData(id)) {
    const d = planData(id); back = ["student", id];
    if (kind === "plan") { title = "الخطة العلاجية"; body = <PlanDoc d={d} />; extra = <Button variant="ghost" size="sm" className="bg-white/14 text-white hover:bg-white/24 hover:text-white" onClick={() => go("doc", id, "sheet")}><Icon name="sheet" /> ورقة العمل</Button>; }
    else { title = "ورقة العمل"; body = <SheetDoc key={seed} d={d} />; extra = <Button variant="ghost" size="sm" className="bg-white/14 text-white hover:bg-white/24 hover:text-white" onClick={() => { reroll(); toast("أُنشئت أسئلة جديدة"); }}><Icon name="refresh" /> أسئلة جديدة</Button>; }
  } else body = <section className="sheet"><p>لا يوجد ما يُعرض.</p></section>;
  const who = kind === "test" ? `${db.data.classes[db.data.tests[id]?.classId]?.name || ""} ${new Date(db.data.tests[id]?.date || 0).toISOString().slice(0, 10)}`
    : kind === "class" || kind === "sheets" ? db.data.classes[id]?.name : db.data.students[id]?.name;
  const fileName = `${title.split(" · ")[0]} - ${who || ""}`.trim();
  return (
    <>
      <header className="no-print sticky top-0 z-20 bg-band pt-[env(safe-area-inset-top)] text-white shadow-sm"><div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 hover:text-white" aria-label="رجوع" onClick={() => go(...back)}><Icon name="back" className="size-5" /></Button>
        <div className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{title}</div>{extra}
        <Btn variant="ghost" size="sm" className="bg-white/14 text-white hover:bg-white/24 hover:text-white" loading={printing} disabled={!!prog} onClick={printNow}>{!printing && <Icon name="print" />} طباعة</Btn>
        <Btn variant="warm" size="sm" loading={!!prog} onClick={download}>{!prog && <Icon name="download" />} {prog ? (prog[1] > 1 ? `صفحة ${n(prog[0])} من ${n(prog[1])}…` : "نجهّز الملف…") : "تنزيل PDF"}</Btn>
      </div></header>
      <main className="doc">{body}</main>
      {prog && <div className="no-print fixed inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur-sm" role="status" aria-live="polite">
        <div className="flex w-72 flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-lg">
          <Spinner className="text-primary" /><b className="font-display text-lg">نجهّز ملف PDF</b>
          {prog[1] > 0 && <><Progress value={(prog[0] / prog[1]) * 100} className="w-full" /><span className="text-sm text-muted-foreground">صفحة {n(prog[0])} من {n(prog[1])}</span></>}
        </div></div>}
    </>
  );
}
