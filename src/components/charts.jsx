import { n, pct, levelColor, T10 } from "../lib/util.js";
import { qText, qAns } from "../lib/stats.js";

export function HBars({ items }) {
  if (!items.length) return <p className="muted">لا توجد بيانات بعد.</p>;
  return (
    <div className="hb">{items.map((it, i) => (
      <div className="hb-row" key={i}><span className="hb-l">{it.label}</span>
        <div className="hb-t"><i style={{ width: (it.p ?? 0) + "%", background: levelColor(it.p) }} /></div>
        <span className="hb-v">{it.p == null ? "—" : pct(it.p)}</span></div>
    ))}</div>
  );
}

export function ColChart({ tables }) {
  if (!Object.keys(tables).length) return <p className="muted">لا توجد بيانات بعد.</p>;
  return (
    <>
      <div className="colchart">
        <div className="cc-axis"><span>{pct(100)}</span><span>{pct(50)}</span><span>{pct(0)}</span></div>
        <div className="cc-cols">{T10.map((t) => {
          const v = tables[t]; const p = v ? (v.c * 100) / v.tries : null;
          return <div className="cc-col" key={t}>{p == null ? <em>—</em> : <><em>{pct(p)}</em><i style={{ height: Math.max(2, p) + "%", background: levelColor(p) }} /></>}</div>;
        })}</div>
        <div className="cc-labels">{T10.map((t) => <span key={t}>{n(t)}</span>)}</div>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>نسبة الإجابات الصحيحة في كل جدول (١–١٠).</p>
    </>
  );
}

export function LineChart({ points }) {
  if (points.length < 2) return <p className="muted">يظهر الرسم بعد اختبارين أو أكثر.</p>;
  const W = 640, H = 210, L = 44, R = 18, T = 16, B = 32;
  const xs = (i) => L + ((W - L - R) * i) / (points.length - 1); const ys = (p) => T + (H - T - B) * (1 - p / 100);
  const pts = points.map((e, i) => [xs(i), ys(e.p)]);
  const area = `M${pts[0][0]},${ys(0)} L${pts.map((p) => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${ys(0)} Z`;
  return (
    <div className="chart"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="تطور الدرجات">
      {[0, 50, 100].map((v) => <g key={v}><line className="gl" x1={L} x2={W - R} y1={ys(v)} y2={ys(v)} /><text className="tx" x={L - 8} y={ys(v) + 4} textAnchor="end">{pct(v)}</text></g>)}
      <path className="ar" d={area} /><polyline className="ln" points={pts.map((p) => p.join(",")).join(" ")} />
      {pts.map((p, i) => <g key={i}><circle className={"pt " + (i === pts.length - 1 ? "last" : "")} cx={p[0]} cy={p[1]} r="5" />
        <text className="tx" x={p[0]} y={p[1] - 10} textAnchor="middle" style={{ fontWeight: 600 }}>{pct(points[i].p)}</text></g>)}
      {points.map((e, i) => (points.length <= 8 || i === 0 || i === points.length - 1) &&
        <text key={"l" + i} className="tx" x={xs(i)} y={H - 8} textAnchor="middle">{e.label}</text>)}
    </svg></div>
  );
}

export function HeatMap({ a }) {
  if (!Object.keys(a.tables).length) return <p className="muted">لا توجد بيانات بعد.</p>;
  const cells = [<div className="hh" key="c">×</div>, ...T10.map((m) => <div className="hh" key={"h" + m}>{n(m)}</div>)];
  for (const t of T10) {
    cells.push(<div className="hh" key={"r" + t}>{n(t)}</div>);
    for (const m of T10) {
      const f = a.facts[t + "|" + m];
      if (!f) { cells.push(<div className="h0" key={t + "-" + m} />); continue; }
      const p = (f.tries - f.wrong) / f.tries;
      cells.push(<div className={p >= 0.9 ? "hg" : p >= 0.6 ? "hw" : "hb"} key={t + "-" + m} title={`${t} × ${m}`}>{f.wrong ? n(f.wrong) : "✓"}</div>);
    }
  }
  return (
    <>
      <div className="heat-wrap"><div className="heat">{cells}</div></div>
      <div className="legend"><span><i style={{ background: "color-mix(in srgb,var(--good) 60%,var(--card))" }} />متقن</span><span><i style={{ background: "var(--pencil)" }} />متذبذب</span>
        <span><i style={{ background: "var(--bad)" }} />ضعيف</span><span><i style={{ background: "var(--chip)" }} />لم يُسأل</span><span>الرقم = عدد مرات الخطأ</span></div>
    </>
  );
}

export function Facts({ list, op, lim = 12 }) {
  if (!list.length) return <p className="muted">لا توجد أخطاء. ممتاز!</p>;
  return (
    <div className="facts">{list.slice(0, lim).map((f, i) => {
      const q = { t: f.t, m: f.m, op: op || f.op || "mul" };
      return <div className="fact bad" key={i}><b dir="rtl">{qText(q)} = {n(qAns(q))}</b><small>أخطأ {n(f.wrong)} من {n(f.tries)}</small></div>;
    })}</div>
  );
}
