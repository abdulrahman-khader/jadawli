import { useState } from "react";
import { db, put, del } from "../lib/store.js";
import { useRemoteHost } from "../lib/remote.js";
import { RemoteButton, RemoteQr, studentList } from "../components/remote-qr.jsx";
import { go } from "../lib/router.js";
import { n, pct, secs, toast, opName, fmtDate, downloadCSV, isAr } from "../lib/util.js";
import { testStats, sc, qText, qAns, qPlain } from "../lib/stats.js";
import {
  Shell, Avatar, Icon, Empty, Kpi, OpTag, ConfirmButton, PageHead, Panel, List, Row, RowMain, RowActions, Score, Btn, useBusy, nextFrame, Hint,
} from "../components/app.jsx";
import { ColChart, Facts } from "../components/charts.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { cn } from "../lib/utils.js";

export default function TestView({ r }) {
  const t = db.data.tests[r.id];
  const [busyX, runX] = useBusy();
  // تحكم الجوال: من هنا يختار المعلم الطالب من جواله قبل بدء الاختبار
  const [qrOpen, setQrOpen] = useState(false);
  useRemoteHost(t ? { phase: "list", info: `اختبار ${opName(t.op)} · ${db.data.classes[t.classId]?.name || ""}`, students: studentList(testStats(t).studs, t), ar: isAr() } : { phase: "idle" },
    (cmd, d = {}) => {
      if (cmd === "hello") { setQrOpen(false); toast("تم ربط الجوال ✓"); }
      else if (cmd === "pick" && t && d.sid && db.data.students[d.sid]) go("run", t.id, null, d.sid);
    });
  if (!t) return <Shell title="الاختبار" back={["home"]}><Empty title="هذا الاختبار غير موجود" /></Shell>;
  const c = db.data.classes[t.classId]; const st = testStats(t);
  const next = st.studs.find((s) => !t.results?.[s.id]);
  const setRes = (sid, v) => { t.results = t.results || {}; if (v) t.results[sid] = v; else delete t.results[sid]; put("tests", t); };
  const csv = () => runX(async () => {
    await nextFrame();
    const rows = [["الطالب", "الحالة", "الصحيح", "عدد الأسئلة", "النسبة", "متوسط الزمن (ث)", "الأسئلة الخاطئة"]];
    st.studs.forEach((s) => {
      const rr = t.results?.[s.id]; const x = sc(rr);
      rows.push([s.name, rr?.status === "absent" ? "غائب" : x ? "مكتمل" : "لم يُختبر", x ? x.c : "", x ? x.total : "", x ? Math.round(x.p) + "%" : "",
        x && x.avgMs != null ? (x.avgMs / 1000).toFixed(1) : "", x ? rr.items.filter((q) => !q.ok).map(qPlain).join(" | ") : ""]);
    });
    downloadCSV(`اختبار ${opName(t.op)} - ${c?.name || ""} - ${new Date(t.date).toISOString().slice(0, 10)}`, rows); toast("نُزّل ملف Excel");
  });
  return (
    <Shell title={`اختبار ${opName(t.op)}`} back={["class", t.classId, "tests"]}>
      <PageHead icon={<OpTag op={t.op} />} title={`اختبار ${opName(t.op)} · ${c?.name || ""}`} sub={fmtDate(t.date)} />
      <div className="flex flex-wrap gap-1.5"><Badge className={t.op === "div" ? "bg-div-soft text-div" : "bg-secondary text-primary"}>الجداول: {t.tables.map(n).join("، ")}</Badge>
        <Badge variant="outline">{n(t.count)} سؤال</Badge><Badge variant="outline">{n(t.seconds)} ثوانٍ للسؤال</Badge>{t.strict && <Badge className="bg-warm/30 text-foreground">استبعاد نهائي</Badge>}</div>
      {next && <Button variant="warm" size="xl" onClick={() => go("run", t.id, null, next.id)}><Icon name="play" /> ابدأ مع {next.name}</Button>}
      <RemoteButton className="self-start" onClick={() => setQrOpen(true)} /><RemoteQr open={qrOpen} onClose={() => setQrOpen(false)} />
      <div className="kpis"><Kpi v={pct(st.avg)} label="المتوسط" /><Kpi v={pct(st.max)} label="الأعلى" /><Kpi v={pct(st.min)} label="الأقل" />
        <Kpi v={`${n(st.done.length)}/${n(st.studs.length)}`} label={`أنهوا · ${n(st.absent)} غائب`} /></div>
      <h2>الطلاب</h2>
      {st.studs.length ? <List>{st.studs.map((s) => {
        const rr = t.results?.[s.id]; const x = sc(rr);
        return (
          <Row key={s.id}><Avatar name={s.name} />
            <RowMain title={s.name} sub={<>{rr?.status === "absent" ? <Badge variant="outline">غائب</Badge> : x ? <Score p={x.p}>{n(x.c)}/{n(x.total)} · {pct(x.p)}</Score> : <Badge className="bg-warm/30 text-foreground">لم يُختبر</Badge>}
              {x && <span>زمن {secs(x.avgMs)}</span>}</>} />
            <RowActions>
              {!rr && <><Button size="sm" onClick={() => go("run", t.id, null, s.id)}><Icon name="play" /> ابدأ</Button>
                <Button variant="outline" size="sm" onClick={() => { setRes(s.id, { status: "absent", at: Date.now() }); toast(`سُجّل ${s.name} غائباً`); }}><Icon name="absent" /> غائب</Button></>}
              {rr?.status === "absent" && <><Button size="sm" onClick={() => go("run", t.id, null, s.id)}>اختبره الآن</Button>
                <Button variant="outline" size="sm" onClick={() => { setRes(s.id, null); toast("أُلغي الغياب"); }}>إلغاء الغياب</Button></>}
              {x && <><Button variant="outline" size="sm" onClick={() => go("result", t.id, null, s.id)}>الإجابات</Button>
                <ConfirmButton confirmText={`إعادة اختبار ${s.name}؟`} desc="ستُستبدل نتيجته الحالية بالنتيجة الجديدة." action="إعادة الاختبار"
                  onConfirm={() => go("run", t.id, null, s.id)}><Icon name="refresh" /> إعادة</ConfirmButton></>}
            </RowActions>
          </Row>
        );
      })}</List> : <Empty title="لا يوجد طلاب في هذا الفصل" />}
      {st.done.length > 0 && <>
        <Panel title="أكثر الأسئلة خطأً"><Facts list={st.facts} op={t.op} lim={10} /></Panel>
        <Panel title="الدقة في كل جدول"><ColChart tables={st.tables} /></Panel>
      </>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => go("doc", t.id, "test")}><Icon name="pdf" /> تقرير PDF</Button>
        <Btn variant="outline" loading={busyX} onClick={csv}><Icon name="xls" /> Excel</Btn>
        <ConfirmButton size="default" className="text-destructive" confirmText="حذف هذا الاختبار؟" desc="ستُحذف نتائج كل الطلاب في هذا الاختبار نهائياً." action="حذف الاختبار"
          onConfirm={() => { del("tests", t.id); toast("حُذف الاختبار"); go("class", t.classId, "tests"); }}><Icon name="trash" /> حذف الاختبار</ConfirmButton>
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
      <PageHead icon={<Avatar name={s.name} />} title={s.name} sub={`اختبار ${opName(t.op)} · ${fmtDate(t.date)}`}>
        <Score p={x.p} className="px-4 py-1 text-base">{n(x.c)} من {n(x.total)} · {pct(x.p)}</Score></PageHead>
      <Hint>لتعديل الدرجة اضغط على علامة أي سؤال لتحويلها من صح إلى خطأ أو العكس. التعديل يُحفظ فوراً.</Hint>
      <List>{rr.items.map((q, i) => (
        <div className={cn("flex items-center gap-2.5 px-4 py-2.5", !q.ok && "bg-destructive/6")} key={i}>
          <span className="flex-1 font-display text-lg tabular-nums [unicode-bidi:isolate]" dir="rtl">{qText(q)} = {n(qAns(q))}</span>
          <span className="min-w-16 text-center text-sm text-muted-foreground">{q.to ? "انتهى الوقت" : secs(q.ms)}</span>
          <Button size="icon-lg" variant={q.ok ? "success" : "destructive"} aria-label={q.ok ? "صح، اضغط لجعلها خطأ" : "خطأ، اضغط لجعلها صح"}
            onClick={() => { q.ok = !q.ok; rr.edited = true; put("tests", t); toast(q.ok ? "صارت الإجابة صحيحة" : "صارت الإجابة خاطئة"); }}>{q.ok ? <Icon name="check" className="size-5" /> : <Icon name="x" className="size-5" />}</Button>
        </div>
      ))}</List>
      <Button variant="outline" size="lg" onClick={() => go("student", s.id)}>صفحة الطالب والخطة العلاجية</Button>
    </Shell>
  );
}
