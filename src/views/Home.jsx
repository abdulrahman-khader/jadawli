import { db, put, displayName } from "../lib/store.js";
import { go } from "../lib/router.js";
import { n, pct, uid, levelColor, toast } from "../lib/util.js";
import { classStudents, classTests, testStats } from "../lib/stats.js";
import { TopBar, Avatar, Icon, Empty } from "../components/ui.jsx";

export default function Home() {
  const cls = Object.values(db.data.classes).sort((a, b) => a.created - b.created);
  function add(e) {
    e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name")).trim(); if (!name) return;
    put("classes", { id: uid(), name, created: Date.now() }); e.currentTarget.reset(); toast("أُضيف الفصل");
  }
  return (
    <>
      <TopBar title="جداولي" />
      <section className="hero"><div className="hero-in"><h1>أهلاً {displayName()}</h1><p>اختر فصلاً لتبدأ اختباراً أو تراجع النتائج.</p></div></section>
      <main className="wrap lift">
        {cls.length ? (
          <section className="grid-classes">{cls.map((c) => {
            const st = classStudents(c.id).length, ts = classTests(c.id), avg = ts.length ? testStats(ts[0]).avg : null;
            return (
              <button type="button" className="class-card" key={c.id} onClick={() => go("class", c.id)}>
                <div className="cc-top"><Avatar name={c.name} /><div><div className="cc-name">{c.name}</div><div className="cc-meta">{n(st)} طالب · {n(ts.length)} اختبار</div></div></div>
                <div className="meter"><i style={{ width: (avg ?? 0) + "%", background: levelColor(avg) }} /></div>
                <div className="cc-foot"><span>آخر اختبار</span><b className="num">{avg != null ? pct(avg) : "—"}</b></div>
              </button>
            );
          })}</section>
        ) : <Empty title="لا توجد فصول بعد">أضف أول فصل من الأسفل، ثم أضف طلابه.</Empty>}
        <form className="card" onSubmit={add}><label className="lbl" htmlFor="newClass">فصل جديد</label>
          <div className="row"><input id="newClass" name="name" type="text" placeholder="مثال: الثالث أ" required maxLength={40} />
            <button className="btn primary"><Icon name="plus" /> إضافة الفصل</button></div></form>
      </main>
    </>
  );
}
