import { useState } from "react";
import { db, put, settings, displayName, logout, mode } from "../lib/store.js";
import { go, bulk } from "../lib/router.js";
import { n, pct, secs, opName, fmtDate, toast, testScope } from "../lib/util.js";
import { studentAgg, classStudents } from "../lib/stats.js";
import { arithPlanData } from "../lib/arith.js";
import { getFam, FAM_NAME } from "../lib/section.js";
import { SectionSwitch } from "../components/section.jsx";
import {
  Shell, Avatar, Stars, Icon, Empty, Kpi, OpTag, PageHead, Panel, List, Row, RowMain, RowActions, Score, Btn, useBusy, nextFrame, Hint,
} from "../components/app.jsx";
import { LineChart, ColChart, HeatMap, HBars } from "../components/charts.jsx";
import { SwitchRow } from "./NewTest.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Checkbox } from "../components/ui/checkbox.jsx";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group.jsx";

export function Student({ r }) {
  const s = db.data.students[r.id];
  const [rename, setRename] = useState(false);
  if (!s) return <Shell title="الطالب" back={["home"]}><Empty title="هذا الطالب غير موجود" /></Shell>;
  // القسم الحالي: الدرجات والرسوم والخطة والتقرير لاختبارات هذا القسم فقط
  const fam = getFam(); const c = db.data.classes[s.classId]; const a = studentAgg(s.id, null, fam); const has = a.done.length > 0;
  const skills = fam === "pm" && has ? arithPlanData(s.id)?.tbl || [] : [];
  return (
    <Shell title={s.name} back={["class", s.classId, "students"]}>
      <PageHead icon={<Avatar name={s.name} />} title={s.name} sub={<>{c?.name} {has && <>· <Stars p={a.avg} /></>}</>}>
        <Button variant="outline" size="sm" onClick={() => setRename(!rename)}><Icon name="edit" /> تعديل الاسم</Button></PageHead>
      {rename && <Panel><form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); s.name = String(new FormData(e.currentTarget).get("name")).trim() || s.name; put("students", s); setRename(false); toast("حُفظ اسم الطالب"); }}>
        <Label htmlFor="renameIn">اسم الطالب</Label>
        <div className="flex flex-wrap gap-2"><Input id="renameIn" name="name" className="h-10 flex-[1_1_180px]" defaultValue={s.name} required maxLength={50} autoFocus /><Button size="lg">حفظ</Button></div></form></Panel>}
      <SectionSwitch fam={fam} />
      {has && <div className="flex flex-wrap gap-2">
        <Button onClick={() => go("doc", s.id, "plan", fam)}><Icon name="pdf" /> الخطة العلاجية</Button>
        <Button variant="warm" onClick={() => go("doc", s.id, "sheet", fam)}><Icon name="sheet" /> ورقة العمل</Button>
        <Button variant="outline" onClick={() => go("doc", s.id, "student", fam)}><Icon name="pdf" /> تقرير الطالب</Button>
      </div>}
      {a.h.length ? <>
        <div className="kpis"><Kpi v={pct(a.avg)} label="متوسط الدرجات" /><Kpi v={secs(a.avgMs)} label="متوسط زمن الإجابة" /><Kpi v={n(a.done.length)} label="اختبار" /><Kpi v={n(a.absent)} label="غياب" /></div>
        <Panel title="تطور الدرجات"><LineChart points={a.done.map((e) => ({ label: fmtDate(e.t.date, true), p: e.x.p }))} /></Panel>
        {fam === "pm" && skills.length > 0 && <Panel title="الدقة في كل مهارة"><HBars items={skills.map((v) => ({ label: v.name, p: v.p }))} /></Panel>}
        {fam === "x" && <><Panel title="الدقة في كل جدول"><ColChart tables={a.tables} /></Panel>
        <Panel title="خريطة الإتقان"><Hint>الصفوف: الجدول · الأعمدة: العدد المضروب فيه. القسمة تُحسب على حقيقة الضرب المقابلة.</Hint><HeatMap a={a} /></Panel></>}
        <h2>الاختبارات</h2>
        <List>{a.h.slice().reverse().map((e) => (
          <Row key={e.t.id}><OpTag op={e.t.op} />
            <RowMain title={`اختبار ${opName(e.t.op)} · ${fmtDate(e.t.date)}`} sub={testScope(e.t)} />
            <RowActions>{e.r.status === "absent" ? <Badge variant="outline">غائب</Badge> : <>
              <Score p={e.x.p}>{n(e.x.c)}/{n(e.x.total)}</Score>
              <Button variant="outline" size="sm" onClick={() => go("result", e.t.id, null, s.id)}>الأخطاء</Button></>}</RowActions>
          </Row>
        ))}</List>
      </> : <Empty title={`لم يُختبر هذا الطالب في ${FAM_NAME[fam]} بعد`}>ستظهر هنا درجاته وأخطاؤه وخطته العلاجية بعد أول اختبار.</Empty>}
    </Shell>
  );
}

export function Bulk({ r }) {
  const c = db.data.classes[r.id];
  // نوع الأوراق حسب الاختبار: الضرب والقسمة أو الجمع والطرح
  const fam = r.id2 === "pm" || r.id2 === "x" ? r.id2 : getFam();
  const rows = c ? classStudents(c.id).map((s) => ({ s, a: studentAgg(s.id, null, fam) })) : [];
  const [sel, setSel] = useState(() => new Set(rows.filter((x) => x.a.done.length).map((x) => x.s.id)));
  const [busy, run] = useBusy();
  if (!c) return <Shell title="أوراق العمل" back={["home"]}><Empty title="هذا الفصل غير موجود" /></Shell>;
  const all = rows.filter((x) => x.a.done.length).map((x) => x.s.id);
  const toggle = (id) => setSel((p) => { const q = new Set(p); q.has(id) ? q.delete(id) : q.add(id); return q; });
  return (
    <Shell title="أوراق عمل الفصل" back={["class", c.id]}>
      <h1>أوراق عمل {FAM_NAME[fam]} · {c.name}</h1>

      <p className="text-muted-foreground">كل طالب يحصل على ورقة عمل خاصة بأخطائه. أزل العلامة عن الطالب الذي لا تريد له ورقة.</p>
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={() => setSel(new Set(all))}>تحديد الكل</Button>
        <Button variant="outline" size="sm" onClick={() => setSel(new Set())}>إلغاء الكل</Button><Hint>المحدد: {n(sel.size)} طالب</Hint></div>
      <List>{rows.map(({ s, a }) => {
        const ok = a.done.length > 0;
        return (
          <Row key={s.id} className={ok ? "cursor-pointer" : "opacity-60"} onClick={() => ok && toggle(s.id)}>
            <Checkbox disabled={!ok} checked={sel.has(s.id)} onCheckedChange={() => toggle(s.id)} onClick={(e) => e.stopPropagation()} className="size-5" aria-label={s.name} />
            <Avatar name={s.name} />
            <RowMain title={s.name} sub={ok ? <><Stars p={a.avg} /> <span>المتوسط {pct(a.avg)}</span></> : "لم يُختبر بعد، لا توجد له ورقة"} />
          </Row>
        );
      })}</List>
      <Btn size="xl" loading={busy} onClick={() => run(async () => {
        if (!sel.size) { toast("اختر طالباً واحداً على الأقل"); return; }
        await nextFrame(); bulk.ids = rows.map((x) => x.s.id).filter((id) => sel.has(id)); go("doc", c.id, "sheets", fam);
      })}><Icon name="sheet" /> {busy ? "نجهّز الأوراق…" : "إنشاء أوراق العمل"}</Btn>
    </Shell>
  );
}

export function Settings() {
  const st = settings();
  const [out, runOut] = useBusy();
  const [saving, setSaving] = useState(false);
  function save(e) {
    e.preventDefault(); const fd = new FormData(e.currentTarget); setSaving(true);
    const name = String(fd.get("name") || "").trim(); if (name) put("meta", { id: "profile", name });
    const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, +v || d));
    put("meta", { id: "settings", digits: fd.get("digits") === "latn" ? "latn" : "arab", school: String(fd.get("school") || "").trim(),
      count: clamp(fd.get("count"), 1, 100, 10), seconds: clamp(fd.get("seconds"), 3, 60, 10), strict: !!fd.get("strict"), swap: !!fd.get("swap") });
    setTimeout(() => { setSaving(false); toast("حُفظت الإعدادات"); }, 350);
  }
  return (
    <Shell title="الإعدادات" back={["home"]} noSettings>
      <h1>الإعدادات</h1>
      <Panel><form className="flex flex-col gap-4" onSubmit={save}>
        <div className="grid gap-2"><Label htmlFor="sName">اسمك (يظهر في التقارير)</Label><Input id="sName" name="name" className="h-10" defaultValue={displayName()} maxLength={40} /></div>
        <div className="grid gap-2"><Label htmlFor="sSchool">اسم المدرسة (يظهر في التقارير)</Label><Input id="sSchool" name="school" className="h-10" defaultValue={st.school} maxLength={60} placeholder="مثال: ابتدائية الملك فهد" /></div>
        <div className="grid gap-2"><Label>شكل الأرقام</Label>
          <RadioGroup name="digits" defaultValue={st.digits === "latn" ? "latn" : "arab"} className="flex gap-3" dir="rtl">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary"><RadioGroupItem value="arab" /> <span className="font-display text-lg">١٢٣</span></label>
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary"><RadioGroupItem value="latn" /> <span className="font-display text-lg">123</span></label>
          </RadioGroup></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="sCount">عدد الأسئلة الافتراضي</Label><Input id="sCount" name="count" type="number" min={1} max={100} defaultValue={st.count} className="w-24 text-center" /></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="sSec">زمن السؤال الافتراضي (ثانية)</Label><Input id="sSec" name="seconds" type="number" min={3} max={60} defaultValue={st.seconds} className="w-24 text-center" /></div>
        <SwitchRow name="strict" defaultChecked={st.strict} title="الاستبعاد النهائي مفعّل افتراضياً" desc="الجداول غير المختارة لا تظهر في أي سؤال" />
        <SwitchRow name="swap" defaultChecked={st.swap} title="خلط ترتيب العددين افتراضياً" />
        <Btn size="lg" loading={saving}>حفظ الإعدادات</Btn>
      </form></Panel>
      <Panel title="الحساب"><p className="text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{db.user?.email}</p>
        <Hint>{mode === "cloud" ? "بياناتك محفوظة في حسابك ويمكنك الدخول من أي جهاز." : "وضع تجريبي: البيانات على هذا الجهاز فقط."}</Hint>
        <Btn variant="outline" loading={out} onClick={() => runOut(() => logout().catch(() => toast("تعذّر تسجيل الخروج")))}><Icon name="logout" /> تسجيل الخروج</Btn></Panel>
    </Shell>
  );
}
