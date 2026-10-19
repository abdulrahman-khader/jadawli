import { useState } from "react";
import { db, put, del } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, pct, secs, uid, toast, opSym, opName, fmtDate, scoreColor, downloadCSV } from "../lib/util.js";
import { classStudents, classTests, testStats, studentAgg, classAgg, reportIds, periodText, sc } from "../lib/stats.js";
import {
  Shell, Avatar, Stars, Icon, Empty, Kpi, OpTag, ConfirmButton, PageHead, Panel, List, Row, RowMain, RowActions, Btn, useBusy, nextFrame, Hint,
} from "../components/app.jsx";
import { LineChart, ColChart, Facts } from "../components/charts.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Checkbox } from "../components/ui/checkbox.jsx";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.jsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible.jsx";
import { ChevronDown } from "lucide-react";

export default function ClassView({ r }) {
  const c = db.data.classes[r.id];
  const [rename, setRename] = useState(false);
  if (!c) return <Shell title="الفصل" back={["home"]}><Empty title="هذا الفصل غير موجود" /></Shell>;
  const tab = r.tab || "students"; const studs = classStudents(c.id); const tests = classTests(c.id);
  return (
    <Shell title={c.name} back={["home"]}>
      <PageHead icon={<Avatar name={c.name} />} title={c.name} sub={`${n(studs.length)} طالب · ${n(tests.length)} اختبار`}>
        <Button variant="outline" size="sm" onClick={() => setRename(!rename)}><Icon name="edit" /> تعديل الاسم</Button>
        <ConfirmButton className="text-destructive" confirmText={`حذف فصل «${c.name}»؟`} desc="سيُحذف الفصل وكل طلابه واختباراته نهائياً." action="حذف الفصل"
          onConfirm={() => { studs.forEach((s) => del("students", s.id)); tests.forEach((t) => del("tests", t.id)); del("classes", c.id); toast("حُذف الفصل"); go("home"); }}>
          <Icon name="trash" /> حذف</ConfirmButton>
      </PageHead>
      {rename && <Panel><form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); c.name = String(new FormData(e.currentTarget).get("name")).trim() || c.name; put("classes", c); setRename(false); toast("حُفظ اسم الفصل"); }}>
        <Label htmlFor="renameIn">اسم الفصل</Label>
        <div className="flex flex-wrap gap-2"><Input id="renameIn" name="name" className="h-10 flex-[1_1_180px]" defaultValue={c.name} required maxLength={40} autoFocus /><Button size="lg">حفظ</Button></div></form></Panel>}
      <Button variant="warm" size="xl" disabled={!studs.length} onClick={() => go("newTest", c.id)}><Icon name="plus" /> اختبار جديد</Button>
      {!studs.length && <Hint>أضف الطلاب أولاً لتتمكن من إنشاء اختبار.</Hint>}
      {tests.length > 0 && <Button variant="outline" size="xl" onClick={() => go("bulk", c.id)}><Icon name="sheet" /> أوراق عمل لطلاب الفصل</Button>}
      <Tabs value={tab} onValueChange={(k) => go("class", c.id, k)} dir="rtl">
        <TabsList className="grid h-11 w-full grid-cols-4">
          <TabsTrigger value="students">الطلاب</TabsTrigger><TabsTrigger value="tests">الاختبارات</TabsTrigger>
          <TabsTrigger value="report">التقرير الشامل</TabsTrigger><TabsTrigger value="rank">الترتيب</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "students" ? <Students c={c} studs={studs} /> : tab === "tests" ? <Tests tests={tests} /> : tab === "report" ? <Report c={c} studs={studs} tests={tests} /> : <Rank studs={studs} />}
    </Shell>
  );
}

function Students({ c, studs }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const add = (name) => put("students", { id: uid(), name: name.slice(0, 50), classId: c.id, created: Date.now() });
  return (
    <>
      {studs.length ? <List>{studs.map((s) => {
        const a = studentAgg(s.id);
        return (
          <Row key={s.id}><Avatar name={s.name} />
            <RowMain title={s.name} onClick={() => go("student", s.id)}
              sub={a.done.length ? <><Stars p={a.avg} /> <span>المتوسط {pct(a.avg)}</span> · <span>{n(a.done.length)} اختبار</span></> : "لم يُختبر بعد"} />
            <RowActions><ConfirmButton variant="ghost" size="icon-sm" className="text-destructive" aria-label={"حذف " + s.name}
              confirmText={`حذف الطالب «${s.name}»؟`} desc="ستبقى نتائجه القديمة في الاختبارات." action="حذف"
              onConfirm={() => { del("students", s.id); toast("حُذف الطالب"); }}><Icon name="trash" /></ConfirmButton></RowActions>
          </Row>
        );
      })}</List> : <Empty title="لا يوجد طلاب في هذا الفصل">أضفهم من الأسفل، واحداً واحداً أو قائمة كاملة.</Empty>}
      <Panel><form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; const name = String(new FormData(f).get("name")).trim(); if (!name) return; add(name); f.reset(); f.querySelector("input").focus(); toast(`أُضيف «${name}»`); }}>
        <Label htmlFor="newStu">إضافة طالب</Label>
        <div className="flex flex-wrap gap-2"><Input id="newStu" name="name" className="h-10 flex-[1_1_180px]" placeholder="اسم الطالب" required maxLength={50} /><Button size="lg"><Icon name="plus" /> إضافة</Button></div></form></Panel>
      <Collapsible open={bulkOpen} onOpenChange={setBulkOpen}>
        <Panel>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between font-bold text-primary">إضافة عدة طلاب دفعة واحدة<ChevronDown className={"size-5 transition " + (bulkOpen ? "rotate-180" : "")} /></CollapsibleTrigger>
          <CollapsibleContent>
            <form className="mt-3 grid gap-3" onSubmit={(e) => {
              e.preventDefault(); const names = String(new FormData(e.currentTarget).get("names") || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
              if (!names.length) { toast("اكتب اسماً واحداً على الأقل"); return; }
              names.forEach(add); e.currentTarget.reset(); toast(`أُضيف ${n(names.length)} طالب`);
            }}>
              <Label htmlFor="bulkIn">اكتب أو الصق الأسماء، كل اسم في سطر</Label>
              <Textarea id="bulkIn" name="names" rows={6} placeholder={"عبدالله أحمد\nفهد خالد\nسعود محمد"} />
              <Button size="lg">إضافة القائمة</Button></form>
          </CollapsibleContent>
        </Panel>
      </Collapsible>
    </>
  );
}

function Tests({ tests }) {
  if (!tests.length) return <Empty title="لا توجد اختبارات بعد">اضغط «اختبار جديد» لاختيار الجداول والبدء.</Empty>;
  return <List>{tests.map((t) => {
    const st = testStats(t);
    return (
      <Row key={t.id}><OpTag op={t.op} />
        <RowMain title={`اختبار ${opName(t.op)} · ${fmtDate(t.date)}`} onClick={() => go("test", t.id)}
          sub={<><span>الجداول: {t.tables.map(n).join("، ")}</span> · <span>{n(t.count)} سؤال</span>{t.strict && <> · <span>استبعاد نهائي</span></>}</>} />
        <RowActions>{st.avg != null && <Badge className="bg-secondary text-primary">{pct(st.avg)}</Badge>}<Badge variant="outline">{n(st.done.length)}/{n(st.studs.length)}</Badge>
          {st.pending > 0 && <Badge className="bg-warm/30 text-foreground">باقي {n(st.pending)}</Badge>}</RowActions>
      </Row>
    );
  })}</List>;
}

export function Matrix({ studs, asc, ids, links }) {
  return (
    <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>الطالب</th>{asc.map((t) => <th key={t.id}>{opSym(t.op)} {fmtDate(t.date, true)}</th>)}<th>المتوسط</th></tr></thead>
      <tbody>{studs.map((s) => {
        const a = studentAgg(s.id, ids);
        return <tr key={s.id}><td>{links ? <button type="button" className="cursor-pointer font-bold text-primary underline underline-offset-3" onClick={() => go("student", s.id)}>{s.name}</button> : s.name}</td>
          {asc.map((t) => { const rr = t.results?.[s.id]; const x = sc(rr); return <td key={t.id}>{rr?.status === "absent" ? "غائب" : x ? <b style={{ color: scoreColor(x.p) }}>{pct(x.p)}</b> : "—"}</td>; })}
          <td><b>{pct(a.avg)}</b></td></tr>;
      })}</tbody>
      <tfoot><tr><td>متوسط الاختبار</td>{asc.map((t) => <td key={t.id}>{pct(testStats(t).avg)}</td>)}<td /></tr></tfoot>
    </table></div>
  );
}

function Report({ c, studs, tests }) {
  const [open, setOpen] = useState(false);
  const [busyX, runX] = useBusy();
  if (!tests.length) return <Empty title="لا يوجد ما يُعرض">يظهر هنا تقرير يجمع كل اختبارات الفصل بعد أول اختبار.</Empty>;
  const ids = reportIds(c.id); const ag = classAgg(c.id, ids); const avgs = studs.map((s) => studentAgg(s.id, ids).avg).filter((x) => x != null);
  const setSel = (sel) => { c.reportSel = sel; put("classes", c); };
  const quick = (m) => {
    const now = new Date();
    const inMonth = (d, off) => { const x = new Date(now.getFullYear(), now.getMonth() + off, 1); const t = new Date(d); return t.getFullYear() === x.getFullYear() && t.getMonth() === x.getMonth(); };
    const sel = m === "all" ? null : m === "none" ? [] : tests.filter((t) => inMonth(t.date, m === "this" ? 0 : -1)).map((t) => t.id);
    setSel(sel); const k = sel == null ? tests.length : sel.length;
    toast(m === "none" ? "أُلغي اختيار كل الاختبارات" : k ? `اختير ${n(k)} اختبار` : "لا توجد اختبارات في هذه الفترة", m !== "none" && !k ? "info" : undefined);
  };
  const toggle = (id, on) => { const s = new Set(ids); on ? s.add(id) : s.delete(id); const arr = tests.map((t) => t.id).filter((x) => s.has(x)); setSel(arr.length === tests.length ? null : arr); };
  const excel = () => runX(async () => {
    await nextFrame();
    const asc = ag.tests;
    const rows = [["الطالب", ...asc.map((t) => `${opName(t.op)} ${new Date(t.date).toISOString().slice(0, 10)}`), "المتوسط"]];
    studs.forEach((s) => { const a = studentAgg(s.id, ids); rows.push([s.name, ...asc.map((t) => { const rr = t.results?.[s.id]; const x = sc(rr); return rr?.status === "absent" ? "غائب" : x ? Math.round(x.p) + "%" : ""; }), a.avg != null ? Math.round(a.avg) + "%" : ""]); });
    downloadCSV(`تقرير ${c.name}`, rows); toast("نُزّل ملف Excel");
  });
  return (
    <>
      <Panel title="الاختبارات المشمولة في التقرير" action={<Badge className="bg-secondary text-primary">{n(ids.length)} من {n(tests.length)}</Badge>}>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => quick("all")}>الكل</Button>
          <Button variant="outline" size="sm" onClick={() => quick("this")}>هذا الشهر</Button>
          <Button variant="outline" size="sm" onClick={() => quick("last")}>الشهر الماضي</Button>
          <Button variant="outline" size="sm" onClick={() => quick("none")}>لا شيء</Button>
        </div>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex cursor-pointer items-center gap-1 font-bold text-primary">اختيار الاختبارات واحداً واحداً<ChevronDown className={"size-4 transition " + (open ? "rotate-180" : "")} /></CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2.5 divide-y rounded-xl border">{tests.map((t) => {
              const st = testStats(t);
              return (
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5" key={t.id}>
                  <Checkbox checked={ids.includes(t.id)} onCheckedChange={(v) => toggle(t.id, !!v)} className="size-5" />
                  <OpTag op={t.op} /><RowMain title={`اختبار ${opName(t.op)} · ${fmtDate(t.date)}`} sub={`الجداول ${t.tables.map(n).join("، ")}`} />
                  {st.avg != null && <Badge className="bg-secondary text-primary">{pct(st.avg)}</Badge>}
                </label>
              );
            })}</div>
          </CollapsibleContent>
        </Collapsible>
        {ids.length > 0 && <Hint>الفترة: {periodText(ag.tests)}</Hint>}
      </Panel>
      {!ids.length ? <Empty title="لم تختر أي اختبار">اختر الاختبارات التي تريدها في التقرير.</Empty> : <>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => go("doc", c.id, "class")}><Icon name="pdf" /> تقرير الفصل PDF</Button>
          <Btn variant="outline" loading={busyX} onClick={excel}><Icon name="xls" /> Excel</Btn>
        </div>
        <div className="kpis"><Kpi v={n(ag.tests.length)} label="اختبار" /><Kpi v={pct(avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null)} label="متوسط الفصل" /><Kpi v={n(avgs.filter((x) => x < 70).length)} label="طالب يحتاج دعماً" /></div>
        <Panel title="متوسط الفصل في كل اختبار"><LineChart points={ag.tests.map((t) => ({ label: fmtDate(t.date, true), p: testStats(t).avg })).filter((x) => x.p != null)} /></Panel>
        <Panel title="دقة الفصل في كل جدول"><ColChart tables={ag.tables} /></Panel>
        <h2>درجات الاختبارات المختارة</h2><Matrix studs={studs} asc={ag.tests} ids={ids} links />
        <Panel title="أكثر الأسئلة خطأً في الفصل"><Facts list={ag.facts} lim={15} /></Panel>
      </>}
    </>
  );
}

function Rank({ studs }) {
  const rows = studs.map((s) => ({ s, a: studentAgg(s.id) })).filter((x) => x.a.done.length).sort((x, y) => y.a.avg - x.a.avg || (x.a.avgMs ?? 1e9) - (y.a.avgMs ?? 1e9));
  if (!rows.length) return <Empty title="الترتيب يظهر بعد أول اختبار">يُرتَّب الطلاب حسب متوسط الدرجة ثم سرعة الإجابة.</Empty>;
  return (
    <>
      <List>{rows.map((x, i) => {
        const d = x.a.done.length > 1 ? x.a.last - x.a.first : null;
        return (
          <Row key={x.s.id}><span className={"grid size-8 flex-none place-items-center rounded-full font-display font-bold " + (i === 0 ? "bg-warm text-warm-foreground" : "bg-muted")}>{n(i + 1)}</span>
            <RowMain title={x.s.name} onClick={() => go("student", x.s.id)} sub={<><Stars p={x.a.avg} /> <span>متوسط الزمن {secs(x.a.avgMs)}</span></>} />
            <RowActions><Badge className="bg-secondary text-primary">{pct(x.a.avg)}</Badge>
              {d != null && Math.round(d) !== 0 && <Badge className={d > 0 ? "bg-success/15 text-success" : "bg-destructive/12 text-destructive"}>{d > 0 ? "▲" : "▼"} {pct(Math.abs(d))}</Badge>}</RowActions>
          </Row>
        );
      })}</List>
      <Hint>النجوم: ★★★ من ٩٠٪ فأكثر · ★★ من ٧٥٪ · ★ من ٥٠٪. السهم يقارن آخر اختبار بأول اختبار.</Hint>
    </>
  );
}
