// الحسابات: الدرجات، الإحصاءات، توليد الأسئلة
import { db } from "./store.js";
import { n, fmtDate, shuffle, T10 } from "./util.js";

export const classStudents = (cid) => Object.values(db.data.students).filter((s) => s.classId === cid).sort((a, b) => a.name.localeCompare(b.name, "ar"));
export const classTests = (cid) => Object.values(db.data.tests).filter((t) => t.classId === cid).sort((a, b) => b.date - a.date);

export function sc(r) {
  if (!r || r.status !== "done") return null;
  const it = r.items || []; const c = it.filter((q) => q.ok).length; const an = it.filter((q) => !q.to);
  return { c, total: it.length, p: it.length ? (c * 100) / it.length : 0, avgMs: an.length ? an.reduce((s, q) => s + q.ms, 0) / an.length : null };
}
export const qText = (q) => (q.op === "div" ? `${n(q.t * q.m)} ÷ ${n(q.t)}` : q.sw ? `${n(q.m)} × ${n(q.t)}` : `${n(q.t)} × ${n(q.m)}`);
export const qAns = (q) => (q.op === "div" ? q.m : q.t * q.m);
export const qPlain = (q) => (q.op === "div" ? `${q.t * q.m}÷${q.t}` : `${q.t}×${q.m}`);

export function testStats(t) {
  const studs = classStudents(t.classId); const done = []; let absent = 0; const facts = {}, tables = {};
  for (const s of studs) {
    const r = t.results?.[s.id];
    if (r?.status === "absent") { absent++; continue; }
    const x = sc(r); if (!x) continue; done.push({ s, x, r });
    for (const q of r.items) {
      const k = q.t + "|" + q.m; facts[k] = facts[k] || { t: q.t, m: q.m, op: t.op, tries: 0, wrong: 0 }; facts[k].tries++; if (!q.ok) facts[k].wrong++;
      tables[q.t] = tables[q.t] || { tries: 0, c: 0 }; tables[q.t].tries++; if (q.ok) tables[q.t].c++;
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
export function studentAgg(sid, ids) {
  const h = studentHistory(sid, ids); const done = h.filter((e) => e.x); const absent = h.filter((e) => e.r.status === "absent").length;
  const facts = {}, tables = {}; let ms = 0, msn = 0;
  for (const e of done) for (const q of e.r.items) {
    const k = q.t + "|" + q.m; const f = (facts[k] = facts[k] || { t: q.t, m: q.m, tries: 0, wrong: 0, ops: {} });
    f.tries++; if (!q.ok) f.wrong++; f.ops[q.op] = 1;
    const tb = (tables[q.t] = tables[q.t] || { t: q.t, tries: 0, c: 0, ms: 0, msn: 0 }); tb.tries++; if (q.ok) tb.c++;
    if (!q.to) { tb.ms += q.ms; tb.msn++; ms += q.ms; msn++; }
  }
  const ps = done.map((e) => e.x.p);
  return { h, done, absent, facts, tables, avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null, avgMs: msn ? ms / msn : null, first: ps[0], last: ps[ps.length - 1] };
}
export function reportIds(cid) {
  const c = db.data.classes[cid]; const all = classTests(cid).map((t) => t.id);
  return Array.isArray(c?.reportSel) ? c.reportSel.filter((id) => all.includes(id)) : all;
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

export function buildPool(tables, strict) {
  const pool = [];
  for (const a of tables) for (const m of T10) { if (strict && !tables.includes(m)) continue; pool.push({ t: a, m }); }
  return pool;
}
export function makeQuestions(t) {
  const pool = buildPool(t.tables, t.strict); if (!pool.length) return [];
  const out = []; let bag = [];
  while (out.length < t.count) {
    if (!bag.length) { bag = shuffle(pool.slice()); const l = out[out.length - 1]; if (l && bag.length > 1 && bag[0].t === l.t && bag[0].m === l.m) bag.push(bag.shift()); }
    const p = bag.shift();
    out.push({ t: p.t, m: p.m, op: t.op, sw: t.op === "mul" && t.swap ? Math.random() < 0.5 : false, ok: null, ms: 0, to: false });
  }
  return out;
}
