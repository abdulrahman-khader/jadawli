// إنشاء ملف PDF مباشرة من صفحات التقرير (.sheet) وتنزيله، بدون نافذة الطباعة البطيئة.
// كل صفحة تُرسم صورةً بعرض A4، والصفحة الطويلة تُقسم عند حدود العناصر حتى لا يُقص سطر.
const A4W = 794, A4H = 1123, MARGIN = 36; // بالبكسل (٩٦ نقطة في البوصة)

// العناصر التي لا يجوز أن يمر القطع في وسطها
const ATOMIC = "tr, svg, img, li, .fact, .lcard, .acard, .fam, .week, .trick, .kpi, .blank, .rung, .goal, .dh, h1, h2, h3, p";

function cutPoints(sheet) {
  const top = sheet.getBoundingClientRect().top;
  const boxes = [...sheet.querySelectorAll(ATOMIC)].map((e) => { const r = e.getBoundingClientRect(); return [r.top - top, r.bottom - top]; });
  const total = sheet.scrollHeight; const cuts = [0];
  let start = 0;
  while (total - start > (cuts.length === 1 ? A4H : A4H - MARGIN)) {
    const limit = start + (cuts.length === 1 ? A4H - MARGIN : A4H - 2 * MARGIN);
    let y = limit;
    // نرجع للأعلى حتى نجد سطراً لا يقطع أي عنصر
    for (let tries = 0; tries < 400; tries++) {
      const hit = boxes.find(([a, b]) => a < y - 1 && b > y + 1);
      if (!hit) break;
      y = hit[0] - 4;
    }
    if (y <= start + 200) y = limit; // عنصر أطول من صفحة: نقطعه
    cuts.push(y); start = y;
  }
  cuts.push(total);
  return cuts;
}

let fontCSS = null; // الخطوط المضمّنة تُجهَّز مرة واحدة فقط

// نضمّن خطوط الموقع (العربية واللاتينية فقط) داخل الصورة حتى تظهر كما في الشاشة
async function embedFonts() {
  const rules = [];
  for (const sh of document.styleSheets) {
    let list; try { list = sh.cssRules; } catch { continue; }
    for (const r of list) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = r.style.getPropertyValue("font-family"); const range = r.style.getPropertyValue("unicode-range");
      if (!/Almarai|Baloo/.test(fam)) continue;
      if (range && !/U\+0?600|U\+0000-00FF/i.test(range)) continue; // عربي ولاتيني فقط
      const m = r.cssText.match(/url\(["']?([^"')]+\.woff2)["']?\)/); if (!m) continue;
      rules.push([r.cssText, new URL(m[1], sh.href || location.href).href]);
    }
  }
  const out = await Promise.all(rules.map(async ([css, url]) => {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
    return css.replace(/src:[^;]+;/, `src: url(${data}) format("woff2");`);
  }));
  return out.join("\n");
}

export async function sheetsToPdf(sheets, fileName, onProgress) {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const root = sheets[0].closest(".doc");
  root.classList.add("capture"); // عرض ثابت بمقاس A4 أثناء الرسم
  try {
    await document.fonts?.ready;
    if (fontCSS == null) fontCSS = await embedFonts().catch(() => "");
    const fontEmbedCSS = fontCSS || undefined;
    const pdf = new jsPDF({ unit: "px", format: [A4W, A4H], hotfixes: ["px_scaling"], compress: true });
    let first = true;
    for (let i = 0; i < sheets.length; i++) {
      onProgress?.(i + 1, sheets.length);
      await new Promise((r) => setTimeout(r, 0)); // نترك المتصفح يحدّث العدّاد
      const el = sheets[i]; const cuts = cutPoints(el);
      const canvas = await toCanvas(el, { pixelRatio: 1.6, backgroundColor: "#ffffff", fontEmbedCSS, skipFonts: !fontEmbedCSS, cacheBust: false });
      const k = canvas.width / el.offsetWidth;
      // صفحة أطول قليلاً من A4: نصغّرها لتدخل في صفحة واحدة بدل قطعة صغيرة في صفحة جديدة
      const total = cuts[cuts.length - 1];
      if (total <= A4H * 1.2) {
        const s = Math.min(1, A4H / total); const w = A4W * s;
        if (!first) pdf.addPage([A4W, A4H]);
        first = false;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.82), "JPEG", (A4W - w) / 2, 0, w, total * s, undefined, "FAST");
        continue;
      }
      for (let j = 0; j < cuts.length - 1; j++) {
        const y0 = cuts[j], h = cuts[j + 1] - y0; if (h < 2) continue;
        const part = document.createElement("canvas"); part.width = canvas.width; part.height = Math.round(h * k);
        part.getContext("2d").drawImage(canvas, 0, Math.round(y0 * k), canvas.width, part.height, 0, 0, canvas.width, part.height);
        if (!first) pdf.addPage([A4W, A4H]);
        first = false;
        pdf.addImage(part.toDataURL("image/jpeg", 0.82), "JPEG", 0, j === 0 ? 0 : MARGIN, A4W, h, undefined, "FAST");
      }
    }
    pdf.save(fileName.replace(/[\\/:*?"<>|]/g, "-") + ".pdf");
  } finally {
    root.classList.remove("capture");
  }
}
