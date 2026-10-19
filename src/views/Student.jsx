import { useState } from "react";
import { db, put, settings, displayName, logout, mode } from "../lib/store.js";
import { go, bulk } from "../lib/router.js";
import { n, pct, secs, opName, fmtDate, chipCls, toast } from "../lib/util.js";
import { studentAgg, classStudents } from "../lib/stats.js";
import { Shell, Avatar, Stars, Icon, Empty, Kpi, OpTag } from "../components/ui.jsx";
import { LineChart, ColChart, HeatMap } from "../components/charts.jsx";

export function Student({ r }) {
  const s = db.data.students[r.id];
  const [rename, setRename] = useState(false);
  if (!s) return <Shell title="الطالب" back={["home"]}><Empty title="هذا الطالب غير موجود" /></Shell>;
  const c = db.data.classes[s.classId]; const a = studentAgg(s.id); const has = a.done.length > 0;
  return (
    <Shell title={s.name} back={["class", s.classId, "students"]}>
      <div className="page-head"><div className="row" style={{ gap: 14 }}><Avatar name={s.name} /><div><h1>{s.name}</h1><p className="sub">{c?.name} {has && <>· <Stars p={a.avg} /></>}</p></div></div>
        <button type="button" className="btn sm" onClick={() => setRename(!rename)}>تعديل الاسم</button></div>
      {rename && <form className="card" onSubmit={(e) => { e.preventDefault(); s.name = String(new FormData(e.currentTarget).get("name")).trim() || s.name; put("students", s); setRename(false); }}>
        <label className="lbl" htmlFor="renameIn">اسم الطالب</label>
        <div className="row"><input id="renameIn" name="name" type="text" defaultValue={s.name} required maxLength={50} autoFocus /><button className="btn primary">حفظ</button></div></form>}
      {has && <div className="row">
        <button type="button" className="btn primary" onClick={() => go("doc", s.id, "plan")}><Icon name="pdf" /> الخطة العلاجية</button>
        <button type="button" className="btn yellow" onClick={() => go("doc", s.id, "sheet")}><Icon name="sheet" /> ورقة العمل</button>
        <button type="button" className="btn" onClick={() => go("doc", s.id, "student")}><Icon name="pdf" /> تقرير الطالب</button>
      </div>}
      {a.h.length ? <>
        <div className="kpis"><Kpi v={pct(a.avg)} label="متوسط الدرجات" /><Kpi v={secs(a.avgMs)} label="متوسط زمن الإجابة" /><Kpi v={n(a.done.length)} label="اختبار" /><Kpi v={n(a.absent)} label="غياب" /></div>
        <div className="card"><h2>تطور الدرجات</h2><LineChart points={a.done.map((e) => ({ label: fmtDate(e.t.date, true), p: e.x.p }))} /></div>
        <div className="card"><h2>الدقة في كل جدول</h2><ColChart tables={a.tables} /></div>
        <div className="card"><h2>خريطة الإتقان</h2><p className="hint" style={{ marginBottom: 10 }}>الصفوف: الجدول · الأعمدة: العدد المضروب فيه. القسمة تُحسب على حقيقة الضرب المقابلة.</p><HeatMap a={a} /></div>
        <h2>الاختبارات</h2>
        <div className="list">{a.h.slice().reverse().map((e) => (
          <div className="li" key={e.t.id}><OpTag op={e.t.op} />
            <div className="li-main static"><span className="li-title">اختبار {opName(e.t.op)} · {fmtDate(e.t.date)}</span><span className="li-sub">الجداول: {e.t.tables.map(n).join("، ")}</span></div>
            <div className="li-actions">{e.r.status === "absent" ? <span className="chip">غائب</span> : <>
              <span className={"chip " + chipCls(e.x.p)}>{n(e.x.c)}/{n(e.x.total)}</span>
              <button type="button" className="btn sm" onClick={() => go("result", e.t.id, null, s.id)}>الأخطاء</button></>}</div>
          </div>
        ))}</div>
      </> : <Empty title="لم يُختبر هذا الطالب بعد">ستظهر هنا درجاته وأخطاؤه وخطته العلاجية بعد أول اختبار.</Empty>}
    </Shell>
  );
}

export function Bulk({ r }) {
  const c = db.data.classes[r.id];
  const rows = c ? classStudents(c.id).map((s) => ({ s, a: studentAgg(s.id) })) : [];
  const [sel, setSel] = useState(() => new Set(rows.filter((x) => x.a.done.length).map((x) => x.s.id)));
  if (!c) return <Shell title="أوراق العمل" back={["home"]}><Empty title="هذا الفصل غير موجود" /></Shell>;
  const all = rows.filter((x) => x.a.done.length).map((x) => x.s.id);
  const toggle = (id) => setSel((p) => { const q = new Set(p); q.has(id) ? q.delete(id) : q.add(id); return q; });
  return (
    <Shell title="أوراق عمل الفصل" back={["class", c.id]}>
      <h1>أوراق عمل · {c.name}</h1>
      <p className="muted">كل طالب يحصل على ورقة عمل خاصة بأخطائه. أزل العلامة عن الطالب الذي لا تريد له ورقة.</p>
      <div className="row"><button type="button" className="btn sm" onClick={() => setSel(new Set(all))}>تحديد الكل</button>
        <button type="button" className="btn sm" onClick={() => setSel(new Set())}>إلغاء الكل</button><span className="hint">المحدد: {n(sel.size)} طالب</span></div>
      <div className="list">{rows.map(({ s, a }) => {
        const ok = a.done.length > 0;
        return (
          <label className="li" key={s.id} style={{ cursor: ok ? "pointer" : "default" }}>
            <input type="checkbox" disabled={!ok} checked={sel.has(s.id)} onChange={() => toggle(s.id)} style={{ width: 22, height: 22, accentColor: "var(--primary)" }} />
            <Avatar name={s.name} />
            <span className="li-main static"><span className="li-title">{s.name}</span>
              <span className="li-sub">{ok ? <><Stars p={a.avg} /> <span>المتوسط {pct(a.avg)}</span></> : "لم يُختبر بعد، لا توجد له ورقة"}</span></span>
          </label>
        );
      })}</div>
      <button type="button" className="btn primary big" onClick={() => {
        if (!sel.size) { toast("اختر طالباً واحداً على الأقل"); return; }
        bulk.ids = rows.map((x) => x.s.id).filter((id) => sel.has(id)); go("doc", c.id, "sheets");
      }}><Icon name="sheet" /> إنشاء أوراق العمل</button>
    </Shell>
  );
}

export function Settings() {
  const st = settings();
  function save(e) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim(); if (name) put("meta", { id: "profile", name });
    const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, +v || d));
    put("meta", { id: "settings", digits: fd.get("digits") === "latn" ? "latn" : "arab", school: String(fd.get("school") || "").trim(),
      count: clamp(fd.get("count"), 1, 100, 10), seconds: clamp(fd.get("seconds"), 3, 60, 10), strict: !!fd.get("strict"), swap: !!fd.get("swap") });
    toast("حُفظت الإعدادات");
  }
  return (
    <Shell title="الإعدادات" back={["home"]} noSettings>
      <h1>الإعدادات</h1>
      <form className="card stack" onSubmit={save}>
        <div><label className="lbl" htmlFor="sName">اسمك (يظهر في التقارير)</label><input id="sName" name="name" type="text" defaultValue={displayName()} maxLength={40} /></div>
        <div><label className="lbl" htmlFor="sSchool">اسم المدرسة (يظهر في التقارير)</label><input id="sSchool" name="school" type="text" defaultValue={st.school} maxLength={60} placeholder="مثال: ابتدائية الملك فهد" /></div>
        <div><span className="lbl">شكل الأرقام</span><div className="seg">
          <label><input type="radio" name="digits" value="arab" defaultChecked={st.digits === "arab"} /><span>١٢٣</span></label>
          <label><input type="radio" name="digits" value="latn" defaultChecked={st.digits !== "arab"} /><span>123</span></label></div></div>
        <div className="between"><span>عدد الأسئلة الافتراضي</span><input name="count" type="number" min={1} max={100} defaultValue={st.count} style={{ width: 90, textAlign: "center" }} /></div>
        <div className="between"><span>زمن السؤال الافتراضي (ثانية)</span><input name="seconds" type="number" min={3} max={60} defaultValue={st.seconds} style={{ width: 90, textAlign: "center" }} /></div>
        <label className="switch"><input type="checkbox" name="strict" defaultChecked={st.strict} /><span><b>الاستبعاد النهائي مفعّل افتراضياً</b><small>الجداول غير المختارة لا تظهر في أي سؤال</small></span></label>
        <label className="switch"><input type="checkbox" name="swap" defaultChecked={st.swap} /><span><b>خلط ترتيب العددين افتراضياً</b></span></label>
        <button className="btn primary">حفظ الإعدادات</button>
      </form>
      <div className="card stack"><h2>الحساب</h2><p className="muted" dir="ltr" style={{ textAlign: "right" }}>{db.user?.email}</p>
        <p className="hint">{mode === "cloud" ? "بياناتك محفوظة في حسابك ويمكنك الدخول من أي جهاز." : "وضع تجريبي: البيانات على هذا الجهاز فقط."}</p>
        <button type="button" className="btn" onClick={() => logout().catch(() => toast("تعذّر تسجيل الخروج"))}>تسجيل الخروج</button></div>
    </Shell>
  );
}
