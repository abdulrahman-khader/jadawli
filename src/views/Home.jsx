import { db, put, displayName } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, pct, uid, levelColor, toast } from "../lib/util.js";
import { classStudents, classTests, testStats } from "../lib/stats.js";
import { TopBar, Avatar, Icon, Empty } from "../components/app.jsx";
import { Card } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import { Button } from "../components/ui/button.jsx";

export default function Home() {
  const cls = Object.values(db.data.classes).sort((a, b) => a.created - b.created);
  function add(e) {
    e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name")).trim(); if (!name) return;
    put("classes", { id: uid(), name, created: Date.now() }); e.currentTarget.reset(); toast(`أُضيف فصل «${name}»`);
  }
  return (
    <>
      <TopBar title="جداولي" />
      <section className="bg-band px-4 pt-1.5 pb-14 text-white"><div className="mx-auto flex max-w-4xl flex-col gap-2">
        <h1 className="text-3xl">أهلاً {displayName()}</h1><p className="opacity-80">اختر فصلاً لتبدأ اختباراً أو تراجع النتائج.</p></div></section>
      <main className="mx-auto -mt-10 flex max-w-4xl flex-col gap-4 px-4 pb-16">
        {cls.length ? (
          <section className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">{cls.map((c) => {
            const st = classStudents(c.id).length, ts = classTests(c.id), avg = ts.length ? testStats(ts[0]).avg : null;
            return (
              <Card key={c.id} role="button" tabIndex={0} onClick={() => go("class", c.id)} onKeyDown={(e) => e.key === "Enter" && go("class", c.id)}
                className="cursor-pointer gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                <div className="flex items-center gap-3"><Avatar name={c.name} /><div><div className="font-display text-xl font-bold">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{n(st)} طالب · {n(ts.length)} اختبار</div></div></div>
                <div className="h-2 overflow-hidden rounded bg-muted"><i className="block h-full rounded" style={{ width: (avg ?? 0) + "%", background: levelColor(avg) }} /></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>آخر اختبار</span><b className="font-display tabular-nums text-foreground">{avg != null ? pct(avg) : "—"}</b></div>
              </Card>
            );
          })}</section>
        ) : <Empty title="لا توجد فصول بعد">أضف أول فصل من الأسفل، ثم أضف طلابه.</Empty>}
        <Card className="gap-2 p-5"><form onSubmit={add} className="grid gap-2"><Label htmlFor="newClass">فصل جديد</Label>
          <div className="flex flex-wrap gap-2"><Input id="newClass" name="name" className="h-10 min-w-0 flex-[1_1_180px]" placeholder="مثال: الثالث أ" required maxLength={40} />
            <Button size="lg"><Icon name="plus" /> إضافة الفصل</Button></div></form></Card>
      </main>
    </>
  );
}
