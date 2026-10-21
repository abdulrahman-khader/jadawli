// الخطة العلاجية وورقة العمل للجمع والطرح: تصنيف الأخطاء حسب المهارة، وشرح طريقة الحل
import { db } from "./store.js";
import { n, isTables, shuffle } from "./util.js";
import { studentHistory } from "./stats.js";

// عائلة الاختبار: x = الضرب والقسمة، pm = الجمع والطرح
import { famOf } from "./section.js";
export { famOf, FAM_NAME } from "./section.js";

const sum = (q) => q.t + q.m;
const carry = (q) => (q.t % 10) + (q.m % 10) >= 10;
const borrow = (q) => q.t % 10 < q.m % 10;

// المهارة التي يقيسها السؤال
export function skillOf(q, level) {
  const a = q.t, b = q.m;
  if (level === 2) return q.op === "add" ? (carry(q) ? "addCarry" : "addNo") : borrow(q) ? "subBorrow" : "subNo";
  if (q.op === "add") {
    if (a === b) return "doubles";
    if (Math.abs(a - b) === 1) return "nearDoubles";
    if (sum(q) === 10) return "tens";
    return sum(q) > 10 ? "cross10" : "under10";
  }
  if (a === b) return "self";
  if (b <= 2) return "back";
  if (a - b <= 2) return "diff";
  return "think";
}

export const SKILLS = {
  doubles: { name: "الأعداد المتشابهة (الأضعاف)", trick: () => `احفظ الأضعاف كأنها جدول: ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => `${n(x)} + ${n(x)} = ${n(2 * x)}`).slice(4).join("، ")}. هي مفتاح لحقائق كثيرة.` },
  nearDoubles: { name: "العددان المتتاليان", trick: () => `إذا كان العددان متتاليين فاستعمل الضعف ثم أضف ${n(1)}: ${n(6)} + ${n(7)} = ${n(6)} + ${n(6)} + ${n(1)} = ${n(13)}.` },
  tens: { name: "أصدقاء العشرة", trick: () => `الأزواج التي مجموعها ${n(10)}: ${[[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]].map(([x, y]) => `(${n(x)} و${n(y)})`).join(" ")}. احفظها بأصابع اليدين: الأصابع المرفوعة والمثنية مجموعها ${n(10)}.` },
  cross10: { name: "عبور العشرة", trick: () => `كمّل العدد الأكبر إلى ${n(10)} ثم أضف الباقي: ${n(8)} + ${n(5)} = ${n(8)} + ${n(2)} + ${n(3)} = ${n(10)} + ${n(3)} = ${n(13)}.` },
  under10: { name: "مجموع أقل من عشرة", trick: () => `ابدأ دائماً من العدد الأكبر وعدّ للأمام بالأصغر: ${n(2)} + ${n(6)} ← ${n(7)}، ${n(8)}، فالجواب ${n(8)}.` },
  self: { name: "طرح العدد من نفسه", trick: () => `أي عدد نطرح منه نفسه يبقى ${n(0)}: ${n(7)} − ${n(7)} = ${n(0)}.` },
  back: { name: "طرح ١ أو ٢ (العدّ للخلف)", trick: () => `عدّ للخلف خطوة أو خطوتين: ${n(8)} − ${n(2)} ← ${n(7)}، ${n(6)}، فالجواب ${n(6)}.` },
  diff: { name: "العددان المتقاربان", trick: () => `إذا كان العددان قريبين فعدّ من الأصغر إلى الأكبر: ${n(9)} − ${n(7)} ← ${n(8)}، ${n(9)} = خطوتان، فالجواب ${n(2)}.` },
  think: { name: "الطرح باستعمال الجمع", trick: () => `الطرح عكس الجمع: لحل ${n(9)} − ${n(4)} اسأل نفسك: ${n(4)} + كم = ${n(9)}؟ الجواب ${n(5)}.` },
  addNo: { name: "جمع عددين بدون حمل", trick: () => `اجمع العشرات مع العشرات والآحاد مع الآحاد: ${n(43)} + ${n(25)} = (${n(40)} + ${n(20)}) + (${n(3)} + ${n(5)}) = ${n(60)} + ${n(8)} = ${n(68)}.` },
  addCarry: { name: "جمع عددين مع حمل", trick: () => `إذا صار مجموع الآحاد ${n(10)} أو أكثر فهو عشرة جديدة تُضاف للعشرات: ${n(47)} + ${n(25)}: الآحاد ${n(7)} + ${n(5)} = ${n(12)}، والعشرات ${n(40)} + ${n(20)} = ${n(60)}، والجواب ${n(60)} + ${n(12)} = ${n(72)}.` },
  subNo: { name: "طرح عددين بدون استلاف", trick: () => `اطرح الآحاد من الآحاد والعشرات من العشرات: ${n(86)} − ${n(32)}: ${n(80)} − ${n(30)} = ${n(50)} و${n(6)} − ${n(2)} = ${n(4)}، والجواب ${n(54)}.` },
  subBorrow: { name: "طرح عددين مع استلاف", trick: () => `إذا كانت آحاد العدد الأول أصغر، اطرح العشرات أولاً ثم الآحاد: ${n(83)} − ${n(36)} = ${n(83)} − ${n(30)} − ${n(6)} = ${n(53)} − ${n(6)} = ${n(47)}.` },
};

// شرح طريقة حل سؤال معيّن
export function explainArith(q, level) {
  const a = q.t, b = q.m;
  if (q.op === "add") {
    const s = a + b, big = Math.max(a, b), small = Math.min(a, b);
    if (level === 2) {
      const tt = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10, oo = (a % 10) + (b % 10);
      return `نجمع العشرات: ${n(Math.floor(a / 10) * 10)} + ${n(Math.floor(b / 10) * 10)} = ${n(tt)}، ثم الآحاد: ${n(a % 10)} + ${n(b % 10)} = ${n(oo)}، والمجموع ${n(tt)} + ${n(oo)} = ${n(s)}.`;
    }
    if (a === b) return `ضعف ${n(a)}: ${n(a)} + ${n(a)} = ${n(s)}.`;
    if (big - small === 1) return `قريب من الضعف: ${n(small)} + ${n(small)} = ${n(2 * small)}، ثم نضيف ${n(1)}: ${n(s)}.`;
    if (s === 10) return `${n(a)} و${n(b)} صديقا العشرة: مجموعهما ${n(10)}.`;
    if (s > 10) { const need = 10 - big; return `نكمّل ${n(big)} إلى ${n(10)} بأخذ ${n(need)} من ${n(small)} فيبقى ${n(small - need)}، إذن ${n(10)} + ${n(small - need)} = ${n(s)}.`; }
    return `نبدأ من ${n(big)} ونعدّ للأمام ${n(small)}: ${Array.from({ length: small }, (_, i) => n(big + i + 1)).join("، ")}، فالجواب ${n(s)}.`;
  }
  const r = a - b;
  if (level === 2) {
    const bt = Math.floor(b / 10) * 10, bo = b % 10;
    return bo ? `نطرح العشرات أولاً: ${n(a)} − ${n(bt)} = ${n(a - bt)}، ثم الآحاد: ${n(a - bt)} − ${n(bo)} = ${n(r)}.` : `نطرح العشرات: ${n(a)} − ${n(bt)} = ${n(r)}.`;
  }
  if (r === 0) return `العدد ناقص نفسه = ${n(0)}.`;
  if (b <= 2) return `نعدّ للخلف من ${n(a)}: ${Array.from({ length: b }, (_, i) => n(a - i - 1)).join("، ")}، فالجواب ${n(r)}.`;
  if (r <= 2) return `نعدّ للأمام من ${n(b)} إلى ${n(a)}: ${Array.from({ length: r }, (_, i) => n(b + i + 1)).join("، ")}، أي ${n(r)} خطوة.`;
  return `نفكّر بالجمع: ${n(b)} + ؟ = ${n(a)}، والجواب ${n(r)}.`;
}

// بيانات الخطة: اختبارات الجمع والطرح فقط
export function arithPlanData(sid) {
  const s = db.data.students[sid]; if (!s) return null;
  const h = studentHistory(sid).filter((e) => !isTables(e.t.op));
  const done = h.filter((e) => e.x); if (!done.length) return null;
  const facts = {}, skills = {}; let ms = 0, msn = 0; const ops = {}, levels = {}, kinds = new Set();
  for (const e of done) {
    const level = e.t.level || 1; levels[level] = 1; kinds.add(e.t.op + "|" + level); ops[e.t.op] = (ops[e.t.op] || 0) + 1;
    for (const q of e.r.items) {
      const k = q.op + "|" + q.t + "|" + q.m;
      const f = (facts[k] = facts[k] || { op: q.op, t: q.t, m: q.m, level, tries: 0, wrong: 0 }); f.tries++; if (!q.ok) f.wrong++;
      const sk = skillOf(q, level); const v = (skills[sk] = skills[sk] || { key: sk, tries: 0, c: 0, ms: 0, msn: 0 });
      v.tries++; if (q.ok) v.c++; if (!q.to) { v.ms += q.ms; v.msn++; ms += q.ms; msn++; }
    }
  }
  const ps = done.map((e) => e.x.p); const avg = ps.reduce((x, y) => x + y, 0) / ps.length;
  const tbl = Object.values(skills).map((v) => ({ ...v, name: SKILLS[v.key].name, p: (v.c * 100) / v.tries, avgMs: v.msn ? v.ms / v.msn : null }));
  const weak = tbl.filter((v) => v.p < 80).sort((x, y) => x.p - y.p);
  const slow = tbl.filter((v) => v.p >= 80 && v.avgMs != null && v.avgMs > 5000).sort((x, y) => y.avgMs - x.avgMs);
  const strong = tbl.filter((v) => v.p >= 90 && !slow.includes(v));
  const wrongFacts = Object.values(facts).filter((f) => f.wrong).sort((x, y) => y.wrong - x.wrong || y.wrong / y.tries - x.wrong / x.tries);
  let focus = [...new Set([...weak, ...slow].map((v) => v.key))];
  if (!focus.length) focus = tbl.slice().sort((x, y) => x.p - y.p).map((v) => v.key).slice(0, 2);
  const lv = avg >= 90 ? { t: "متقن", c: "var(--good)" } : avg >= 75 ? { t: "جيد", c: "var(--primary)" } : avg >= 50 ? { t: "يحتاج دعماً", c: "#B7791F" } : { t: "يحتاج دعماً مكثفاً", c: "var(--bad)" };
  // التمارين الإضافية في الورقة تتبع آخر اختبار جمع أو طرح للطالب
  const last = done[done.length - 1].t; const mainOp = last.op, mainLevel = last.level || 1;
  return {
    fam: "pm", s, c: db.data.classes[s.classId], a: { done, absent: h.filter((e) => e.r.status === "absent").length, avg, avgMs: msn ? ms / msn : null },
    tbl, weak, slow, strong, wrongFacts, focus, lv, ops, levels, kinds: [...kinds].map((k) => { const [op, lv] = k.split("|"); return [op, +lv]; }), mainOp, mainLevel,
  };
}

// الحقائق المستهدفة في ورقة العمل: الأخطاء أولاً، ثم أمثلة من المهارات الضعيفة
export function arithTargets(d) {
  const out = []; const seen = new Set();
  const add = (q) => { const k = q.op + q.t + "|" + q.m; if (seen.has(k) || out.length >= 6) return; seen.add(k); out.push(q); };
  d.wrongFacts.forEach((f) => add({ op: f.op, t: f.t, m: f.m, level: f.level }));
  for (const sk of d.focus) for (const q of sampleSkill(sk, d.mainLevel, d.mainOp)) add(q);
  for (const q of sampleSkill(null, d.mainLevel, d.mainOp)) add(q);
  return out;
}
// أمثلة عشوائية لمهارة (أو لأي مهارة إذا sk فارغ)
export function sampleSkill(sk, level, op) {
  const out = [];
  for (let i = 0; i < 400 && out.length < 4; i++) {
    const o = sk ? (["self", "back", "diff", "think", "subNo", "subBorrow"].includes(sk) ? "sub" : "add") : op;
    let a, b;
    if (level === 2) { a = 10 + Math.floor(Math.random() * 90); b = 10 + Math.floor(Math.random() * 90); if (o === "sub" && b >= a) continue; }
    else { a = 1 + Math.floor(Math.random() * 9); b = 1 + Math.floor(Math.random() * 9); if (o === "sub" && b > a) continue; }
    const q = { op: o, t: a, m: b, level };
    if (sk && skillOf(q, level) !== sk) continue;
    if (!out.some((x) => x.t === a && x.m === b)) out.push(q);
  }
  return out;
}
// أسئلة تحدي الدقيقة
export function arithChallenge(d, tg) {
  const pool = [...tg];
  // نفس أنواع الأسئلة التي اختُبر فيها الطالب فقط
  while (pool.length < 12) for (const [op, lv] of d.kinds) pool.push(...sampleSkill(null, lv, op).slice(0, 2));
  return shuffle(pool).slice(0, 12);
}
export const arithText = (q) => `${n(q.t)} ${q.op === "add" ? "+" : "−"} ${n(q.m)}`;
export const arithAns = (q) => (q.op === "add" ? q.t + q.m : q.t - q.m);
export const famHasDone = (sid, fam) => studentHistory(sid).some((e) => e.x && famOf(e.t.op) === fam);
