import { useState } from "react";
import { db, put, del } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, pct, secs, uid, toast, opSym, opName, fmtDate, scoreColor, downloadCSV } from "../lib/util.js";
import { classStudents, classTests, testStats, studentAgg, classAgg, reportIds, periodText, sc } from "../lib/stats.js";
import { Shell, Avatar, Stars, Icon, Empty, Kpi, OpTag, ConfirmButton } from "../components/ui.jsx";
import { LineChart, ColChart, Facts } from "../components/charts.jsx";

export default function ClassView({ r }) {
  const c = db.data.classes[r.id];
  const [rename, setRename] = useState(false);
  if (!c) return <Shell title="الفصل" back={["home"]}><Empty title="هذا الفصل غير موجود" /></Shell>;
  const tab = r.tab || "students"; const studs = classStudents(c.id); const tests = classTests(c.id);
  const T = (k, l) => <button type="button" className={"tab " + (tab === k ? "on" : "")} onClick={() => go("class", c.id, k)}>{l}</button>;
  return (
    <Shell title={c.name} back={["home"]}>
      <div className="page-head">
        <div className="row" style={{ gap: 14 }}><Avatar name={c.name} /><div><h1>{c.name}</h1><p className="sub">{n(studs.length)} طالب · {n(tests.length)} اختبار</p></div></div>
        <div className="row">
          <button type="button" className="btn sm" onClick={() => setRename(!rename)}>تعديل الاسم</button>
          <ConfirmButton className="btn sm danger" confirmText="تأكيد حذف الفصل وكل بياناته" onConfirm={() => {
            studs.forEach((s) => del("students", s.id)); tests.forEach((t) => del("tests", t.id)); del("classes", c.id); toast("حُذف الفصل"); go("home");
          }}><Icon name="trash" /> حذف</ConfirmButton>
        </div>
      </div>
      {rename && <form className="card" onSubmit={(e) => { e.preventDefault(); c.name = String(new FormData(e.currentTarget).get("name")).trim() || c.name; put("classes", c); setRename(false); }}>
        <label className="lbl" htmlFor="renameIn">اسم الفصل</label>
        <div className="row"><input id="renameIn" name="name" type="text" defaultValue={c.name} required maxLength={40} autoFocus /><button className="btn primary">حفظ</button></div></form>}
      <button type="button" className="btn yellow big" disabled={!studs.length} onClick={() => go("newTest", c.id)}><Icon name="plus" /> اختبار جديد</button>
      {!studs.length && <p className="hint">أضف الطلاب أولاً لتتمكن من إنشاء اختبار.</p>}
      {tests.length > 0 && <button type="button" className="btn big" onClick={() => go("bulk", c.id)}><Icon name="sheet" /> أوراق عمل لطلاب الفصل</button>}
      <nav className="tabs">{T("students", "الطلاب")}{T("tests", "الاختبارات")}{T("report", "التقرير الشامل")}{T("rank", "الترتيب")}</nav>
      {tab === "students" ? <Students c={c} studs={studs} /> : tab === "tests" ? <Tests tests={tests} /> : tab === "report" ? <Report c={c} studs={studs} tests={tests} /> : <Rank studs={studs} />}
    </Shell>
  );
}

function Students({ c, studs }) {
  const add = (name) => put("students", { id: uid(), name: name.slice(0, 50), classId: c.id, created: Date.now() });
  return (
    <>
      {studs.length ? <div className="list">{studs.map((s) => {
        const a = studentAgg(s.id);
        return (
          <div className="li" key={s.id}><Avatar name={s.name} />
            <button type="button" className="li-main" onClick={() => go("student", s.id)}>
              <span className="li-title">{s.name}</span>
              <span className="li-sub">{a.done.length ? <><Stars p={a.avg} /> <span>المتوسط {pct(a.avg)}</span> · <span>{n(a.done.length)} اختبار</span></> : "لم يُختبر بعد"}</span>
            </button>
            <div className="li-actions"><ConfirmButton className="btn sm danger" confirmText="تأكيد الحذف" aria-label={"حذف " + s.name}
              onConfirm={() => { del("students", s.id); toast("حُذف الطالب"); }}><Icon name="trash" /></ConfirmButton></div>
          </div>
        );
      })}</div> : <Empty title="لا يوجد طلاب في هذا الفصل">أضفهم من الأسفل، واحداً واحداً أو قائمة كاملة.</Empty>}
      <form className="card" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; const name = String(new FormData(f).get("name")).trim(); if (!name) return; add(name); f.reset(); f.querySelector("input").focus(); }}>
        <label className="lbl" htmlFor="newStu">إضافة طالب</label>
        <div className="row"><input id="newStu" name="name" type="text" placeholder="اسم الطالب" required maxLength={50} /><button className="btn primary"><Icon name="plus" /> إضافة</button></div></form>
      <details className="card"><summary>إضافة عدة طلاب دفعة واحدة</summary>
        <form className="stack" style={{ marginTop: 12 }} onSubmit={(e) => {
          e.preventDefault(); const names = String(new FormData(e.currentTarget).get("names") || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
          names.forEach(add); e.currentTarget.reset(); toast(`أُضيف ${n(names.length)} طالب`);
        }}>
          <label className="lbl" htmlFor="bulkIn">اكتب أو الصق الأسماء، كل اسم في سطر</label>
          <textarea id="bulkIn" name="names" rows={6} placeholder={"عبدالله أحمد\nفهد خالد\nسعود محمد"} />
          <button className="btn primary">إضافة القائمة</button></form></details>
    </>
  );
}

function Tests({ tests }) {
  if (!tests.length) return <Empty title="لا توجد اختبارات بعد">اضغط «اختبار جديد» لاختيار الجداول والبدء.</Empty>;
  return <div className="list">{tests.map((t) => {
    const st = testStats(t);
    return (
      <div className="li" key={t.id}><OpTag op={t.op} />
        <button type="button" className="li-main" onClick={() => go("test", t.id)}>
          <span className="li-title">اختبار {opName(t.op)} · {fmtDate(t.date)}</span>
          <span className="li-sub"><span>الجداول: {t.tables.map(n).join("، ")}</span> · <span>{n(t.count)} سؤال</span>{t.strict && <> · <span>استبعاد نهائي</span></>}</span>
        </button>
        <div className="li-actions">{st.avg != null && <span className="chip pri">{pct(st.avg)}</span>}<span className="chip">{n(st.done.length)}/{n(st.studs.length)}</span>{st.pending > 0 && <span className="chip warn">باقي {n(st.pending)}</span>}</div>
      </div>
    );
  })}</div>;
}

export function Matrix({ studs, asc, ids, links }) {
  return (
    <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>الطالب</th>{asc.map((t) => <th key={t.id}>{opSym(t.op)} {fmtDate(t.date, true)}</th>)}<th>المتوسط</th></tr></thead>
      <tbody>{studs.map((s) => {
        const a = studentAgg(s.id, ids);
        return <tr key={s.id}><td>{links ? <button type="button" className="link" onClick={() => go("student", s.id)}>{s.name}</button> : s.name}</td>
          {asc.map((t) => { const rr = t.results?.[s.id]; const x = sc(rr); return <td key={t.id}>{rr?.status === "absent" ? "غائب" : x ? <b style={{ color: scoreColor(x.p) }}>{pct(x.p)}</b> : "—"}</td>; })}
          <td><b>{pct(a.avg)}</b></td></tr>;
      })}</tbody>
      <tfoot><tr><td>متوسط الاختبار</td>{asc.map((t) => <td key={t.id}>{pct(testStats(t).avg)}</td>)}<td /></tr></tfoot>
    </table></div>
  );
}

function Report({ c, studs, tests }) {
  const [open, setOpen] = useState(false);
  if (!tests.length) return <Empty title="لا يوجد ما يُعرض">يظهر هنا تقرير يجمع كل اختبارات الفصل بعد أول اختبار.</Empty>;
  const ids = reportIds(c.id); const ag = classAgg(c.id, ids); const avgs = studs.map((s) => studentAgg(s.id, ids).avg).filter((x) => x != null);
  const setSel = (sel) => { c.reportSel = sel; put("classes", c); };
  const quick = (m) => {
    const now = new Date();
    const inMonth = (d, off) => { const x = new Date(now.getFullYear(), now.getMonth() + off, 1); const t = new Date(d); return t.getFullYear() === x.getFullYear() && t.getMonth() === x.getMonth(); };
    const sel = m === "all" ? null : m === "none" ? [] : tests.filter((t) => inMonth(t.date, m === "this" ? 0 : -1)).map((t) => t.id);
    setSel(sel); const k = sel == null ? tests.length : sel.length;
    toast(m === "none" ? "أُلغي اختيار كل الاختبارات" : k ? `اختير ${n(k)} اختبار` : "لا توجد اختبارات في هذه الفترة");
  };
  const toggle = (id, on) => { const s = new Set(ids); on ? s.add(id) : s.delete(id); const arr = tests.map((t) => t.id).filter((x) => s.has(x)); setSel(arr.length === tests.length ? null : arr); };
  return (
    <>
      <div className="card stack">
        <div className="between"><h3 style={{ margin: 0 }}>الاختبارات المشمولة في التقرير</h3><span className="chip pri">{n(ids.length)} من {n(tests.length)}</span></div>
        <div className="row">
          <button type="button" className="btn sm" onClick={() => quick("all")}>الكل</button>
          <button type="button" className="btn sm" onClick={() => quick("this")}>هذا الشهر</button>
          <button type="button" className="btn sm" onClick={() => quick("last")}>الشهر الماضي</button>
          <button type="button" className="btn sm" onClick={() => quick("none")}>لا شيء</button>
        </div>
        <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}><summary>اختيار الاختبارات واحداً واحداً</summary>
          <div className="list" style={{ marginTop: 10, boxShadow: "none", border: "1px solid var(--line)" }}>{tests.map((t) => {
            const st = testStats(t);
            return (
              <label className="li" key={t.id} style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={ids.includes(t.id)} onChange={(e) => toggle(t.id, e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--primary)" }} />
                <OpTag op={t.op} /><span className="li-main static"><span className="li-title">اختبار {opName(t.op)} · {fmtDate(t.date)}</span><span className="li-sub">الجداول {t.tables.map(n).join("، ")}</span></span>
                {st.avg != null && <span className="chip pri">{pct(st.avg)}</span>}
              </label>
            );
          })}</div></details>
        {ids.length > 0 && <p className="hint">الفترة: {periodText(ag.tests)}</p>}
      </div>
      {!ids.length ? <Empty title="لم تختر أي اختبار">اختر الاختبارات التي تريدها في التقرير.</Empty> : <>
        <div className="row">
          <button type="button" className="btn primary" onClick={() => go("doc", c.id, "class")}><Icon name="pdf" /> تقرير الفصل PDF</button>
          <button type="button" className="btn" onClick={() => {
            const asc = ag.tests;
            const rows = [["الطالب", ...asc.map((t) => `${opName(t.op)} ${new Date(t.date).toISOString().slice(0, 10)}`), "المتوسط"]];
            studs.forEach((s) => { const a = studentAgg(s.id, ids); rows.push([s.name, ...asc.map((t) => { const rr = t.results?.[s.id]; const x = sc(rr); return rr?.status === "absent" ? "غائب" : x ? Math.round(x.p) + "%" : ""; }), a.avg != null ? Math.round(a.avg) + "%" : ""]); });
            downloadCSV(`تقرير ${c.name}`, rows);
          }}><Icon name="xls" /> Excel</button>
        </div>
        <div className="kpis"><Kpi v={n(ag.tests.length)} label="اختبار" /><Kpi v={pct(avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null)} label="متوسط الفصل" /><Kpi v={n(avgs.filter((x) => x < 70).length)} label="طالب يحتاج دعماً" /></div>
        <div className="card"><h2>متوسط الفصل في كل اختبار</h2><LineChart points={ag.tests.map((t) => ({ label: fmtDate(t.date, true), p: testStats(t).avg })).filter((x) => x.p != null)} /></div>
        <div className="card"><h2>دقة الفصل في كل جدول</h2><ColChart tables={ag.tables} /></div>
        <h2>درجات الاختبارات المختارة</h2><Matrix studs={studs} asc={ag.tests} ids={ids} links />
        <div className="card"><h2>أكثر الأسئلة خطأً في الفصل</h2><Facts list={ag.facts} lim={15} /></div>
      </>}
    </>
  );
}

function Rank({ studs }) {
  const rows = studs.map((s) => ({ s, a: studentAgg(s.id) })).filter((x) => x.a.done.length).sort((x, y) => y.a.avg - x.a.avg || (x.a.avgMs ?? 1e9) - (y.a.avgMs ?? 1e9));
  if (!rows.length) return <Empty title="الترتيب يظهر بعد أول اختبار">يُرتَّب الطلاب حسب متوسط الدرجة ثم سرعة الإجابة.</Empty>;
  return (
    <>
      <div className="list">{rows.map((x, i) => {
        const d = x.a.done.length > 1 ? x.a.last - x.a.first : null;
        return (
          <div className="li" key={x.s.id}><span className={"rank " + (i === 0 ? "r1" : "")}>{n(i + 1)}</span>
            <button type="button" className="li-main" onClick={() => go("student", x.s.id)}><span className="li-title">{x.s.name}</span><span className="li-sub"><Stars p={x.a.avg} /> <span>متوسط الزمن {secs(x.a.avgMs)}</span></span></button>
            <div className="li-actions"><span className="chip pri">{pct(x.a.avg)}</span>{d != null && Math.round(d) !== 0 && <span className={"chip " + (d > 0 ? "good" : "bad")}>{d > 0 ? "▲" : "▼"} {pct(Math.abs(d))}</span>}</div>
          </div>
        );
      })}</div>
      <p className="hint">النجوم: ★★★ من ٩٠٪ فأكثر · ★★ من ٧٥٪ · ★ من ٥٠٪. السهم يقارن آخر اختبار بأول اختبار.</p>
    </>
  );
}
