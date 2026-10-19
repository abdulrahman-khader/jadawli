// الخطة العلاجية: التشخيص، حيل الحفظ، شرح الأخطاء
import { db } from "./store.js";
import { n } from "./util.js";
import { studentAgg } from "./stats.js";

export const TRICKS = {
  1: () => `أي عدد مضروب في ${n(1)} يبقى كما هو: ${n(1)} × ${n(8)} = ${n(8)}.`,
  2: () => `الضرب في ${n(2)} = مضاعفة العدد (اجمعه مع نفسه): ${n(2)} × ${n(7)} = ${n(7)} + ${n(7)} = ${n(14)}.`,
  3: () => `ضاعِف العدد ثم أضفه مرة ثالثة: ${n(3)} × ${n(6)} = ${n(12)} + ${n(6)} = ${n(18)}. وتدرّب على العدّ القفزي: ${[3, 6, 9, 12, 15].map(n).join("، ")}…`,
  4: () => `ضاعِف ثم ضاعِف مرة أخرى: ${n(4)} × ${n(7)} ← ${n(14)} ← ${n(28)}.`,
  5: () => `النواتج تنتهي دائماً بـ ${n(0)} أو ${n(5)}، وهي نصف الضرب في ${n(10)}: ${n(5)} × ${n(8)} = نصف ${n(80)} = ${n(40)}. واستعن بالساعة: كل رقم على الساعة ${n(5)} دقائق.`,
  6: () => `ناتج جدول ${n(5)} ثم أضف العدد مرة واحدة: ${n(6)} × ${n(7)} = ${n(35)} + ${n(7)} = ${n(42)}. ومع العدد الزوجي ينتهي الناتج بالرقم نفسه: ${n(6)} × ${n(4)} = ${n(24)}.`,
  7: () => `معظم حقائقه محفوظة من الجداول الأخرى بالإبدال (${n(7)} × ${n(3)} = ${n(3)} × ${n(7)}). الجديد فقط: ${n(7)} × ${n(6)} = ${n(42)}، ${n(7)} × ${n(7)} = ${n(49)}، ${n(7)} × ${n(8)} = ${n(56)} (تذكّر ${[5, 6, 7, 8].map(n).join("، ")}: ${n(56)} = ${n(7)} × ${n(8)})، ${n(7)} × ${n(9)} = ${n(63)}.`,
  8: () => `ضاعِف ثلاث مرات: ${n(8)} × ${n(6)} ← ${n(12)} ← ${n(24)} ← ${n(48)}. وتذكّر: ${n(8)} × ${n(8)} = ${n(64)}.`,
  9: () => `حيلة الأصابع: افرد أصابعك العشرة واثنِ الإصبع الذي رقمه العدد؛ الأصابع قبله عشرات وبعده آحاد (${n(9)} × ${n(4)} = ${n(36)}). أو ${n(10)} × العدد ناقص العدد: ${n(9)} × ${n(7)} = ${n(70)} − ${n(7)} = ${n(63)}. ومجموع رقمي الناتج دائماً ${n(9)}.`,
  10: () => `أضف صفراً على يمين العدد: ${n(10)} × ${n(7)} = ${n(70)}.`,
};

const EASE = [1, 10, 2, 5, 9, 4, 3, 6, 8, 7];
export function explainFact(t, m) {
  const p = t * m; const k = EASE.indexOf(t) <= EASE.indexOf(m) ? t : m; const o = k === t ? m : t;
  const sw = k !== t ? `بالإبدال ${n(t)} × ${n(m)} = ${n(k)} × ${n(o)}. ` : "";
  const N = n;
  const map = {
    1: `أي عدد × ${N(1)} = العدد نفسه، إذن الناتج ${N(p)}.`,
    10: `نضيف صفراً إلى ${N(o)} فيصبح ${N(p)}.`,
    2: `نضاعف ${N(o)}: ${N(o)} + ${N(o)} = ${N(p)}.`,
    5: `${N(10)} × ${N(o)} = ${N(10 * o)}، ونصفه ${N(p)}.`,
    9: `${N(10)} × ${N(o)} = ${N(10 * o)}، ثم نطرح ${N(o)}: ${N(10 * o)} − ${N(o)} = ${N(p)}.`,
    4: `نضاعف ${N(o)} مرتين: ${N(o)} ← ${N(2 * o)} ← ${N(p)}.`,
    3: `نضاعف ${N(o)} = ${N(2 * o)}، ثم نضيف ${N(o)}: ${N(2 * o)} + ${N(o)} = ${N(p)}.`,
    6: `${N(5)} × ${N(o)} = ${N(5 * o)}، ثم نضيف ${N(o)}: ${N(5 * o)} + ${N(o)} = ${N(p)}.`,
    8: `نضاعف ${N(o)} ثلاث مرات: ${N(o)} ← ${N(2 * o)} ← ${N(4 * o)} ← ${N(p)}.`,
    7: `${N(5)} × ${N(o)} = ${N(5 * o)} و ${N(2)} × ${N(o)} = ${N(2 * o)}، نجمعهما: ${N(5 * o)} + ${N(2 * o)} = ${N(p)}.`,
  };
  return sw + map[k];
}

export function planData(sid) {
  const s = db.data.students[sid]; const a = studentAgg(sid); if (!s || !a.done.length) return null;
  const tbl = Object.values(a.tables).map((v) => ({ ...v, p: (v.c * 100) / v.tries, avgMs: v.msn ? v.ms / v.msn : null }));
  const weak = tbl.filter((v) => v.p < 80).sort((x, y) => x.p - y.p);
  const slow = tbl.filter((v) => v.p >= 80 && v.avgMs != null && v.avgMs > 5000).sort((x, y) => y.avgMs - x.avgMs);
  const strong = tbl.filter((v) => v.p >= 90 && !slow.includes(v)).sort((x, y) => x.t - y.t);
  const wrongFacts = Object.values(a.facts).filter((f) => f.wrong).sort((x, y) => y.wrong - x.wrong || y.wrong / y.tries - x.wrong / x.tries);
  const hadDiv = a.done.some((e) => e.t.op === "div");
  let focus = [...new Set([...weak, ...slow].map((v) => v.t))];
  if (!focus.length) { const byErr = {}; wrongFacts.forEach((f) => (byErr[f.t] = (byErr[f.t] || 0) + f.wrong)); focus = Object.keys(byErr).map(Number).sort((x, y) => byErr[y] - byErr[x]); }
  if (!focus.length) focus = tbl.slice().sort((x, y) => x.p - y.p || (y.avgMs ?? 0) - (x.avgMs ?? 0)).map((v) => v.t).slice(0, 2);
  const p = a.avg;
  const lv = p >= 90 ? { t: "متقن", c: "var(--good)" } : p >= 75 ? { t: "جيد", c: "var(--primary)" } : p >= 50 ? { t: "يحتاج دعماً", c: "#B7791F" } : { t: "يحتاج دعماً مكثفاً", c: "var(--bad)" };
  return { s, c: db.data.classes[s.classId], a, tbl, weak, slow, strong, wrongFacts, hadDiv, focus, lv };
}

// تفكيك الحقيقة إلى جزأين معروفين لرسم النقاط
export function splitFact(t, m) {
  if (t === 1 || m === 1 || t === 10 || m === 10) return null;
  if (t === 9 || m === 9) { const b = t === 9 ? m : t; return { mode: "sub", rows: 10, cols: b, a: 9, b }; }
  const big = [t, m].filter((x) => x >= 6);
  if (big.length) { const a = big.sort((x, y) => x - y)[0]; const b = a === t ? m : t; return { mode: "add", rows: a, cols: b, a1: 5, a2: a - 5, a, b }; }
  const a = Math.max(t, m); const b = a === t ? m : t;
  return a === 2 ? { mode: "add", rows: 2, cols: b, a1: 1, a2: 1, a, b } : { mode: "add", rows: a, cols: b, a1: 2, a2: a - 2, a, b };
}
export function targetFacts(d) {
  const seen = new Set(), out = [];
  const add = (t, m) => { const k = Math.min(t, m) + "|" + Math.max(t, m); if (seen.has(k)) return; seen.add(k); out.push({ t, m }); };
  const trivial = (f) => [1, 10].includes(f.t) || [1, 10].includes(f.m);
  d.wrongFacts.filter((f) => !trivial(f)).forEach((f) => add(f.t, f.m));
  for (const t of d.focus) for (const m of [7, 8, 6, 9, 4, 3]) { if (out.length >= 4) break; add(t, m); }
  d.wrongFacts.filter(trivial).forEach((f) => add(f.t, f.m));
  return out.slice(0, 6);
}
