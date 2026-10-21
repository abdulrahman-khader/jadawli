import { useState } from "react";
import { db, put, settings } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, uid, toast, T10, isTables, LEVELS } from "../lib/util.js";
import { classTests, buildPool } from "../lib/stats.js";
import { cn } from "../lib/utils.js";
import { getFam, FAM_NAME } from "../lib/section.js";
import { Shell, Icon, Empty, Panel, Btn } from "../components/app.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Switch } from "../components/ui/switch.jsx";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group.jsx";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, +v || lo));
function Stepper({ id, value, set, lo, hi }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" aria-label="زيادة" onClick={() => set(clamp(+value + 1, lo, hi))}>+</Button>
      <Input id={id} type="number" min={lo} max={hi} value={value} className="w-20 text-center font-display text-lg" onChange={(e) => set(e.target.value)} onBlur={(e) => set(clamp(e.target.value, lo, hi))} />
      <Button type="button" variant="outline" size="icon" aria-label="إنقاص" onClick={() => set(clamp(value - 1, lo, hi))}>−</Button>
    </div>
  );
}
// مفتاح تشغيل مع عنوان وشرح (يُستخدم في الإعدادات أيضاً)
export function SwitchRow({ checked, defaultChecked, onChange, title, desc, name }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-3.5">
      <Switch checked={checked} defaultChecked={defaultChecked} onCheckedChange={onChange} name={name} className="mt-0.5" />
      <span><b className="block">{title}</b>{desc && <small className="block text-sm text-muted-foreground">{desc}</small>}</span>
    </label>
  );
}

export default function NewTest({ r }) {
  const c = db.data.classes[r.id];
  const fam = getFam(); const st = settings(); const last = c ? classTests(c.id, fam)[0] : null;
  const [op, setOp] = useState(last?.op || (fam === "pm" ? "add" : "mul"));
  const [tables, setTables] = useState((last ? last.tables : [2, 3, 4, 5]).filter((t) => t <= 10));
  const [strict, setStrict] = useState(st.strict);
  const [count, setCount] = useState(st.count);
  const [seconds, setSeconds] = useState(st.seconds);
  const [swap, setSwap] = useState(st.swap);
  const [level, setLevel] = useState(last?.level || 1);
  if (!c) return <Shell title="اختبار جديد" back={["home"]}><Empty title="هذا الفصل غير موجود" /></Shell>;

  const pool = buildPool(tables, strict); const ex = T10.filter((t) => !tables.includes(t));
  function create(e) {
    e.preventDefault();
    const tb = isTables(op);
    if (tb && !tables.length) { toast("اختر جدولاً واحداً على الأقل"); return; }
    const t = { id: uid(), classId: c.id, op, tables: tb ? tables.slice().sort((a, b) => a - b) : [], maxM: 10, strict: tb && strict, count: clamp(count, 1, 100), seconds: clamp(seconds, 3, 60), swap: tb && swap, date: Date.now(), results: {} };
    if (!tb) t.level = level;
    put("tests", t); toast("أُنشئ الاختبار"); go("test", t.id);
  }
  const opItem = "h-14 rounded-xl border-2 text-base data-[state=on]:text-white";
  const tb = isTables(op);
  return (
    <Shell title="اختبار جديد" back={["class", c.id, "tests"]}>
      <h1>اختبار {FAM_NAME[fam]} جديد · {c.name}</h1>
      <form className="flex flex-col gap-4" onSubmit={create}>
        <Panel title="نوع الاختبار">
          <ToggleGroup type="single" value={op} onValueChange={(v) => v && setOp(v)} className="grid w-full grid-cols-2 gap-2" dir="rtl">
            {fam === "x" ? <>
            <ToggleGroupItem value="mul" className={cn(opItem, "data-[state=on]:border-primary data-[state=on]:bg-primary")}><b className="font-display text-2xl">×</b> ضرب</ToggleGroupItem>
            <ToggleGroupItem value="div" className={cn(opItem, "data-[state=on]:border-div data-[state=on]:bg-div")}><b className="font-display text-2xl">÷</b> قسمة</ToggleGroupItem>
            </> : <>
            <ToggleGroupItem value="add" className={cn(opItem, "data-[state=on]:border-warm data-[state=on]:bg-warm data-[state=on]:text-warm-foreground")}><b className="font-display text-2xl">+</b> جمع</ToggleGroupItem>
            <ToggleGroupItem value="sub" className={cn(opItem, "data-[state=on]:border-warm data-[state=on]:bg-warm data-[state=on]:text-warm-foreground")}><b className="font-display text-2xl">−</b> طرح</ToggleGroupItem>
            </>}
          </ToggleGroup>
        </Panel>
        {!tb && <Panel title="نوع الأعداد">
          <ToggleGroup type="single" value={String(level)} onValueChange={(v) => v && setLevel(+v)} className="grid w-full grid-cols-2 gap-2" dir="rtl">
            {[1, 2].map((k) => <ToggleGroupItem key={k} value={String(k)} className="flex h-auto flex-col gap-0.5 rounded-xl border-2 py-3 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <b className="text-base">{LEVELS[k]}</b><span className="font-display text-lg opacity-80" dir="rtl">{k === 1 ? (op === "add" ? `${n(7)} + ${n(5)}` : `${n(9)} − ${n(4)}`) : (op === "add" ? `${n(47)} + ${n(25)}` : `${n(83)} − ${n(36)}`)}</span>
            </ToggleGroupItem>)}
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">{level === 1 ? `أعداد من ${n(1)} إلى ${n(9)}.` : `أعداد من ${n(10)} إلى ${n(99)}.`}{op === "sub" ? " في الطرح يكون العدد الأول أكبر دائماً، فلا يطلع ناتج سالب." : ""}</p>
        </Panel>}
        {tb && <>
        <Panel title="الجداول" action={<div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => setTables(T10.slice())}>الكل</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setTables([])}>لا شيء</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setTables([2, 3, 4, 5])}>٢–٥</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setTables([6, 7, 8, 9])}>٦–٩</Button></div>}>
          <ToggleGroup type="multiple" value={tables.map(String)} onValueChange={(v) => setTables(v.map(Number).sort((a, b) => a - b))} className="grid w-full grid-cols-5 gap-2.5" dir="rtl">
            {T10.map((t) => <ToggleGroupItem key={t} value={String(t)} aria-label={"جدول " + t}
              className="h-15 rounded-xl border-2 border-dashed bg-background font-display text-2xl text-muted-foreground data-[state=on]:border-solid data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md">{n(t)}</ToggleGroupItem>)}
          </ToggleGroup>
          <SwitchRow checked={strict} onChange={setStrict} title="استبعاد نهائي للجداول غير المختارة"
            desc="عند التشغيل: إذا لم تختر جدول ٥ لن يظهر أي سؤال فيه ٥ أبداً، حتى ٩ × ٥. وعند الإيقاف: قد يظهر ٩ × ٥ ضمن جدول ٩." />
          <div className="rounded-xl bg-secondary px-3.5 py-3 font-bold text-primary">{!tables.length ? <span className="text-destructive">اختر جدولاً واحداً على الأقل.</span> :
            <span>الأسئلة المختلفة المتاحة: {n(pool.length)}{strict && ex.length ? ` · لن يظهر أي سؤال فيه: ${ex.map(n).join("، ")}` : ""}{count > pool.length ? " · سيتكرر بعضها" : ""}</span>}</div>
        </Panel>
        </>}
        <Panel title="الإعدادات">
          <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="cnt">عدد الأسئلة لكل طالب</label><Stepper id="cnt" value={count} set={setCount} lo={1} hi={100} /></div>
          <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="sec">زمن السؤال (ثانية)</label><Stepper id="sec" value={seconds} set={setSeconds} lo={3} hi={60} /></div>
          {op === "mul" && <SwitchRow checked={swap} onChange={setSwap} title="خلط ترتيب العددين في الضرب" desc="مثل ٤ × ٣ بدل ٣ × ٤" />}
        </Panel>
        <Btn size="xl"><Icon name="play" /> إنشاء الاختبار</Btn>
      </form>
    </Shell>
  );
}
