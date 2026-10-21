// الأقسام: «الضرب والقسمة» (x) و«الجمع والطرح» (pm). لكل قسم اختباراته وتقاريره وأوراق عمله،
// والقسم الحالي يُحفظ على الجهاز فيفتح الموقع على آخر قسم استعمله المعلم
import { isTables } from "./util.js";

const KEY = "mt_fam";
export const famOf = (op) => (isTables(op) ? "x" : "pm");
export const FAM_NAME = { x: "الضرب والقسمة", pm: "الجمع والطرح" };
export function getFam() {
  try { return localStorage.getItem(KEY) === "pm" ? "pm" : "x"; } catch { return "x"; }
}
// rerender: نعيد رسم الصفحة الحالية بعد تغيير القسم
export function setFam(f, rerender = true) {
  if (getFam() === f) return;
  try { localStorage.setItem(KEY, f); } catch { /* ignore */ }
  if (rerender) window.dispatchEvent(new HashChangeEvent("hashchange"));
}
