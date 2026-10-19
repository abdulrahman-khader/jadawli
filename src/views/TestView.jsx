import { db, put, del } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, pct, secs, toast, opName, fmtDate, chipCls, downloadCSV } from "../lib/util.js";
import { testStats, sc, qText, qAns, qPlain } from "../lib/stats.js";
import { Shell, Avatar, Icon, Empty, Kpi, OpTag, ConfirmButton } from "../components/ui.jsx";
import { ColChart, Facts } from "../components/charts.jsx";

export default function TestView({ r }) {
  const t = db.data.tests[r.id];
  if (!t) return <Shell title="الاختبار" back={["home"]}><Empty title="هذا الاختبار غير موجود" /></Shell>;
  const c = db.data.classes[t.classId]; const st = testStats(t);
  const next = st.studs.find((s) => !t.results?.[s.id]);
  const setRes = (sid, v) => { t.results = t.results || {}; if (v) t.results[sid] = v; else delete t.results[sid]; put("tests", t); };
  function csv() {
    const rows = [["الطالب", "الحالة", "الصحيح", "عدد الأسئلة", "النسبة", "متوسط الزمن (ث)", "الأسئلة الخاطئة"]];
    st.studs.forEach((s) => {
      const rr = t.results?.[s.id]; const x = sc(rr);
      rows.push([s.name, rr?.status === "absent" ? "غائب" : x ? "مكتمل" : "لم يُختبر", x ? x.c : "", x ? x.total : "", x ? Math.round(x.p) + "%" : "",
        x && x.avgMs != null ? (x.avgMs / 1000).toFixed(1) : "", x ? rr.items.filter((q) => !q.ok).map(qPlain).join(" | ") : ""]);
    });
    downloadCSV(`اختبار ${opName(t.op)} - ${c?.name || ""} - ${new Date(t.date).toISOString().slice(0, 10)}`, rows);
  }
  return (
    <Shell title={`اختبار ${opName(t.op)}`} back={["class", t.classId, "tests"]}>
      <div className="page-head"><div className="row" style={{ gap: 14 }}><OpTag op={t.op} /><div><h1>اختبار {opName(t.op)} · {c?.name}</h1><p className="sub">{fmtDate(t.date)}</p></div></div></div>
      <div className="row"><span className={"chip " + (t.op === "div" ? "div" : "pri")}>الجداول: {t.tables.map(n).join("، ")}</span><span className="chip">{n(t.count)} سؤال</span>
        <span className="chip">{n(t.seconds)} ثوانٍ للسؤال</span>{t.strict && <span className="chip warn">استبعاد نهائي</span>}</div>
      {next && <button type="button" className="btn yellow big" onClick={() => go("run", t.id, null, next.id)}><Icon name="play" /> ابدأ مع {next.name}</button>}
      <div className="kpis"><Kpi v={pct(st.avg)} label="المتوسط" /><Kpi v={pct(st.max)} label="الأعلى" /><Kpi v={pct(st.min)} label="الأقل" />
        <Kpi v={`${n(st.done.length)}/${n(st.studs.length)}`} label={`أنهوا · ${n(st.absent)} غائب`} /></div>
      <h2>الطلاب</h2>
      {st.studs.length ? <div className="list">{st.studs.map((s) => {
        const rr = t.results?.[s.id]; const x = sc(rr);
        return (
          <div className="li" key={s.id}><Avatar name={s.name} />
            <div className="li-main static"><span className="li-title">{s.name}</span>
              <span className="li-sub">{rr?.status === "absent" ? <span className="chip">غائب</span> : x ? <span className={"chip " + chipCls(x.p)}>{n(x.c)}/{n(x.total)} · {pct(x.p)}</span> : <span className="chip warn">لم يُختبر</span>}
                {x && <span>زمن {secs(x.avgMs)}</span>}</span></div>
            <div className="li-actions">
              {!rr && <><button type="button" className="btn sm primary" onClick={() => go("run", t.id, null, s.id)}>ابدأ</button>
                <button type="button" className="btn sm" onClick={() => setRes(s.id, { status: "absent", at: Date.now() })}>غائب</button></>}
              {rr?.status === "absent" && <><button type="button" className="btn sm primary" onClick={() => go("run", t.id, null, s.id)}>اختبره الآن</button>
                <button type="button" className="btn sm" onClick={() => setRes(s.id, null)}>إلغاء الغياب</button></>}
              {x && <><button type="button" className="btn sm" onClick={() => go("result", t.id, null, s.id)}>الإجابات</button>
                <ConfirmButton confirmText="ستُستبدل نتيجته · تأكيد" onConfirm={() => go("run", t.id, null, s.id)}>إعادة</ConfirmButton></>}
            </div>
          </div>
        );
      })}</div> : <Empty title="لا يوجد طلاب في هذا الفصل" />}
      {st.done.length > 0 && <>
        <div className="card"><h2>أكثر الأسئلة خطأً</h2><Facts list={st.facts} op={t.op} lim={10} /></div>
        <div className="card"><h2>الدقة في كل جدول</h2><ColChart tables={st.tables} /></div>
      </>}
      <div className="row">
        <button type="button" className="btn primary" onClick={() => go("doc", t.id, "test")}><Icon name="pdf" /> تقرير PDF</button>
        <button type="button" className="btn" onClick={csv}><Icon name="xls" /> Excel</button>
        <ConfirmButton className="btn danger" confirmText="تأكيد حذف الاختبار" onConfirm={() => { del("tests", t.id); toast("حُذف الاختبار"); go("class", t.classId, "tests"); }}><Icon name="trash" /> حذف الاختبار</ConfirmButton>
      </div>
    </Shell>
  );
}

export function Result({ r }) {
  const t = db.data.tests[r.id]; const s = db.data.students[r.id2]; const rr = t?.results?.[s?.id];
  if (!t || !s || !rr || rr.status !== "done") return <Shell title="الإجابات" back={["home"]}><Empty title="لا توجد نتيجة" /></Shell>;
  const x = sc(rr);
  return (
    <Shell title={s.name} back={["test", t.id]}>
      <div className="page-head"><div className="row" style={{ gap: 14 }}><Avatar name={s.name} /><div><h1>{s.name}</h1><p className="sub">اختبار {opName(t.op)} · {fmtDate(t.date)}</p></div></div>
        <span className={"chip " + chipCls(x.p)} style={{ fontSize: "1.05rem", padding: "5px 16px" }}>{n(x.c)} من {n(x.total)} · {pct(x.p)}</span></div>
      <p className="hint">لتعديل الدرجة اضغط على علامة أي سؤال لتحويلها من صح إلى خطأ أو العكس. التعديل يُحفظ فوراً.</p>
      <div className="list">{rr.items.map((q, i) => (
        <div className={"qrow " + (q.ok ? "" : "wrong")} key={i}><span className="qx" dir="rtl">{qText(q)} = {n(qAns(q))}</span>
          <span className="qt">{q.to ? "انتهى الوقت" : secs(q.ms)}</span>
          <button type="button" className={"toggle " + (q.ok ? "ok" : "no")} aria-label={q.ok ? "صح، اضغط لجعلها خطأ" : "خطأ، اضغط لجعلها صح"}
            onClick={() => { q.ok = !q.ok; rr.edited = true; put("tests", t); }}>{q.ok ? "✓" : "✗"}</button></div>
      ))}</div>
      <button type="button" className="btn" onClick={() => go("student", s.id)}>صفحة الطالب والخطة العلاجية</button>
    </Shell>
  );
}
