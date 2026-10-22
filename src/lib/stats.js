// الحسابات: الدرجات، الإحصاءات، توليد الأسئلة
import { db } from "./store.js";
import { n, fmtDate, shuffle, T10, isTables } from "./util.js";

export const classStudents = (cid) => Object.values(db.data.students).filter((s) => s.classId === cid).sort((a, b) => a.name.localeCompare(b.name, "ar"));
// fam: "x" أو "pm" لاختبارات قسم واحد فقط
export const classTests = (cid, fam) => Object.values(db.data.tests).filter((t) => t.classId === cid && (!fam || (fam === "x") === isTables(t.op))).sort((a, b) => b.date - a.date);

export function sc(r) {
  if (!r || r.status !== "done") return null;
  const it = r.items || []; const c = it.filter((q) => q.ok).length; const an = it.filter((q) => !q.to);
  return { c, total: it.length, p: it.length ? (c * 100) / it.length : 0, avgMs: an.length ? an.reduce((s, q) => s + q.ms, 0) / an.length : null };
}
// السؤال: في الجمع والطرح t هو العدد الأول وm الثاني
export const qText = (q) => (q.op === "add" ? `${n(q.t)} + ${n(q.m)}` : q.op === "sub" ? `${n(q.t)} − ${n(q.m)}`
  : q.op === "div" ? `${n(q.t * q.m)} ÷ ${n(q.t)}` : q.sw ? `${n(q.m)} × ${n(q.t)}` : `${n(q.t)} × ${n(q.m)}`);
export const qAns = (q) => (q.op === "add" ? q.t + q.m : q.op === "sub" ? q.t - q.m : q.op === "div" ? q.m : q.t * q.m);
export const qPlain = (q) => (q.op === "add" ? `${q.t}+${q.m}` : q.op === "sub" ? `${q.t}-${q.m}` : q.op === "div" ? `${q.t * q.m}÷${q.t}` : `${q.t}×${q.m}`);

export function testStats(t) {
  const studs = classStudents(t.classId); const done = []; let absent = 0; const facts = {}, tables = {};
  for (const s of studs) {
    const r = t.results?.[s.id];
    if (r?.status === "absent") { absent++; continue; }
    const x = sc(r); if (!x) continue; done.push({ s, x, r });
    for (const q of r.items) {
      const k = q.t + "|" + q.m; facts[k] = facts[k] || { t: q.t, m: q.m, op: t.op, tries: 0, wrong: 0 }; facts[k].tries++; if (!q.ok) facts[k].wrong++;
      if (isTables(q.op)) { tables[q.t] = tables[q.t] || { tries: 0, c: 0 }; tables[q.t].tries++; if (q.ok) tables[q.t].c++; }
    }
  }
  const ps = done.map((d) => d.x.p);
  return {
    studs, done, absent, pending: studs.length - done.length - absent,
    avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null,
    max: ps.length ? Math.max(...ps) : null, min: ps.length ? Math.min(...ps) : null,
    facts: Object.values(facts).filter((f) => f.wrong).sort((a, b) => b.wrong - a.wrong || b.wrong / b.tries - a.wrong / a.tries), tables,
  };
}
export function studentHistory(sid, ids) {
  const s = db.data.students[sid]; if (!s) return [];
  return Object.values(db.data.tests).filter((t) => t.classId === s.classId && t.results?.[sid] && (!ids || ids.includes(t.id)))
    .sort((a, b) => a.date - b.date).map((t) => ({ t, r: t.results[sid], x: sc(t.results[sid]) }));
}
// fam: "x" للضرب والقسمة فقط، "pm" للجمع والطرح فقط، وبدونه كل الاختبارات
export function studentAgg(sid, ids, fam) {
  const h = studentHistory(sid, ids).filter((e) => !fam || (fam === "x") === isTables(e.t.op)); const done = h.filter((e) => e.x); const absent = h.filter((e) => e.r.status === "absent").length;
  const facts = {}, tables = {}; let ms = 0, msn = 0;
  for (const e of done) for (const q of e.r.items) {
    if (!q.to) { ms += q.ms; msn++; }
    if (!isTables(q.op)) continue; // خريطة الإتقان والخطة العلاجية للضرب والقسمة فقط
    const k = q.t + "|" + q.m; const f = (facts[k] = facts[k] || { t: q.t, m: q.m, tries: 0, wrong: 0, ops: {} });
    f.tries++; if (!q.ok) f.wrong++; f.ops[q.op] = 1;
    const tb = (tables[q.t] = tables[q.t] || { t: q.t, tries: 0, c: 0, ms: 0, msn: 0 }); tb.tries++; if (q.ok) tb.c++;
    if (!q.to) { tb.ms += q.ms; tb.msn++; }
  }
  const ps = done.map((e) => e.x.p);
  return { h, done, absent, facts, tables, avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null, avgMs: msn ? ms / msn : null, first: ps[0], last: ps[ps.length - 1] };
}
// اختيار الاختبارات المشمولة في التقرير الشامل محفوظ لكل قسم على حدة
export const reportKey = (fam) => (fam === "pm" ? "reportSelPm" : "reportSel");
export function reportIds(cid, fam = "x") {
  const c = db.data.classes[cid]; const all = classTests(cid, fam).map((t) => t.id); const sel = c?.[reportKey(fam)];
  return Array.isArray(sel) ? sel.filter((id) => all.includes(id)) : all;
}
export function periodText(tests) {
  if (!tests.length) return "";
  const a = Math.min(...tests.map((t) => t.date)), b = Math.max(...tests.map((t) => t.date));
  return fmtDate(a) === fmtDate(b) ? fmtDate(a) : `من ${fmtDate(a)} إلى ${fmtDate(b)}`;
}
export function classAgg(cid, ids) {
  const tests = classTests(cid).slice().reverse().filter((t) => !ids || ids.includes(t.id)); const tables = {}, facts = {};
  tests.forEach((t) => {
    const st = testStats(t);
    for (const [k, v] of Object.entries(st.tables)) { const a = (tables[k] = tables[k] || { tries: 0, c: 0 }); a.tries += v.tries; a.c += v.c; }
    st.facts.forEach((f) => { const k = f.op + f.t + "|" + f.m; const a = (facts[k] = facts[k] || { ...f, tries: 0, wrong: 0 }); a.tries += f.tries; a.wrong += f.wrong; });
  });
  return { tests, tables, facts: Object.values(facts).sort((a, b) => b.wrong - a.wrong) };
}

// ---------- توليد الأسئلة ----------
// كل اختبار: ٤٠٪ صعبة، ٤٠٪ متوسطة، ٢٠٪ سهلة، وبدون تكرار للطالب (٤ × ٥ و٥ × ٤ يُعدّان سؤالاً واحداً).
// إذا لم تكفِ أسئلة مستوى نكمل من المستوى المجاور، وإذا لم تكفِ كل الأسئلة المختلفة يتكرر بعضها فقط بعد استعمالها كلها.
export const MIX = { hard: 0.4, mid: 0.4, easy: 0.2 };
const EASY_F = [1, 2, 5, 10], MID_F = [3, 4, 9];
// صعوبة حقيقة الضرب/القسمة حسب أسهل العددين: سهلة إذا فيها ١ أو ٢ أو ٥ أو ١٠، متوسطة إذا فيها ٣ أو ٤ أو ٩، وصعبة إذا العددان من ٦ و٧ و٨
export const factLevel = (t, m) => (EASY_F.includes(t) || EASY_F.includes(m) ? "easy" : MID_F.includes(t) || MID_F.includes(m) ? "mid" : "hard");
// صعوبة الجمع والطرح
export function arithLevel(op, a, b, level) {
  if (level === 2) {
    if (op === "add") return (a % 10) + (b % 10) < 10 ? "easy" : a + b < 100 ? "mid" : "hard";
    const gap = (b % 10) - (a % 10); return gap <= 0 ? "easy" : gap <= 4 ? "mid" : "hard";
  }
  if (op === "add") { const s = a + b; return s <= 10 ? "easy" : a === b || Math.abs(a - b) === 1 || Math.max(a, b) === 9 ? "mid" : "hard"; }
  return b <= 2 || a === b || a - b <= 1 ? "easy" : b >= 4 && a - b >= 3 ? "hard" : "mid";
}

export function buildPool(tables, strict) {
  const pool = [];
  for (const a of tables) for (const m of T10) { if (strict && !tables.includes(m)) continue; pool.push({ t: a, m }); }
  return pool;
}
// الحقائق المختلفة فقط: ٤ × ٥ و٥ × ٤ حقيقة واحدة
export function uniquePool(tables, strict) {
  const seen = new Set(), out = [];
  for (const p of shuffle(buildPool(tables, strict))) { const k = Math.min(p.t, p.m) + "|" + Math.max(p.t, p.m); if (!seen.has(k)) { seen.add(k); out.push(p); } }
  return out;
}

// يختار count سؤالاً من مجموعات المستويات حسب النسب، ويكمل من المستوى المجاور عند النقص
function pickByLevel(buckets, count) {
  const want = { hard: Math.round(count * MIX.hard), mid: Math.round(count * MIX.mid) }; want.easy = count - want.hard - want.mid;
  const b = { hard: shuffle(buckets.hard.slice()), mid: shuffle(buckets.mid.slice()), easy: shuffle(buckets.easy.slice()) };
  const out = [];
  for (const lv of ["hard", "mid", "easy"]) out.push(...b[lv].splice(0, want[lv]));
  for (const lv of ["mid", "hard", "easy"]) while (out.length < count && b[lv].length) out.push(b[lv].shift()); // التعويض عند النقص
  return out;
}
// ترتيب عشوائي بدون سؤالين متطابقين متتاليين
function spread(list, same) {
  const out = shuffle(list.slice());
  for (let i = 1; i < out.length; i++) if (same(out[i], out[i - 1])) { const j = out.findIndex((x, k) => k > i && !same(x, out[i - 1])); if (j > 0) [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

function arithQuestions(t) {
  const level = t.level || 1; const mk = (a, b) => ({ t: a, m: b, op: t.op, sw: false, ok: null, ms: 0, to: false });
  const key = (a, b) => (t.op === "add" ? Math.min(a, b) + "|" + Math.max(a, b) : a + "|" + b);
  const buckets = { hard: [], mid: [], easy: [] }; const seen = new Set();
  const addQ = (a, b) => { const k = key(a, b); if (seen.has(k)) return; seen.add(k); buckets[arithLevel(t.op, a, b, level)].push([a, b]); };
  if (level === 1) { for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (t.op === "add" || b <= a) addQ(a, b); }
  else {
    // أعداد من منزلتين: نسحب عينة كبيرة كافية لكل مستوى
    const r = () => 10 + Math.floor(Math.random() * 90);
    for (let i = 0; i < 4000 && (buckets.hard.length < t.count || buckets.mid.length < t.count || buckets.easy.length < t.count); i++) {
      let a = r(), b = r(); if (t.op === "sub") { if (a === b) continue; if (b > a) [a, b] = [b, a]; } addQ(a, b);
    }
  }
  let picked = pickByLevel(buckets, t.count);
  if (!picked.length) return [];
  while (picked.length < t.count) picked = picked.concat(shuffle(picked).slice(0, t.count - picked.length)); // نادر: أسئلة مختلفة غير كافية
  // في الجمع نعرض العددين بترتيب عشوائي (٥ + ٤ أو ٤ + ٥)، والسؤال نفسه لا يتكرر
  return spread(picked, (x, y) => x[0] === y[0] && x[1] === y[1]).map(([a, b]) => (t.op === "add" && Math.random() < 0.5 ? mk(b, a) : mk(a, b)));
}
export function makeQuestions(t) {
  if (!isTables(t.op)) return arithQuestions(t);
  const uniq = uniquePool(t.tables, t.strict); if (!uniq.length) return [];
  const buckets = { hard: [], mid: [], easy: [] };
  for (const p of uniq) buckets[factLevel(p.t, p.m)].push(p);
  let picked = pickByLevel(buckets, t.count);
  // إذا طلب المعلم أسئلة أكثر من الحقائق المختلفة المتاحة، نكرر بعضها فقط بعد استعمالها كلها
  while (picked.length < t.count) picked = picked.concat(shuffle(uniq).slice(0, t.count - picked.length));
  return spread(picked, (x, y) => x.t === y.t && x.m === y.m)
    .map((p) => ({ t: p.t, m: p.m, op: t.op, sw: t.op === "mul" && t.swap ? Math.random() < 0.5 : false, ok: null, ms: 0, to: false }));
}
