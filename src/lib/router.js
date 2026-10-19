// توجيه بسيط عبر الرابط (#/class/ID/tab) — يجعل زر الرجوع في المتصفح يعمل
export function parseHash() {
  const p = location.hash.replace(/^#\/?/, "").split("/").map((x) => (x === "-" || x === "" ? undefined : decodeURIComponent(x)));
  return { name: p[0] || "home", id: p[1], tab: p[2], id2: p[3] };
}
export function go(name, id, tab, id2, opts = {}) {
  const parts = [name, id, tab, id2].map((x) => (x == null || x === "" ? "-" : encodeURIComponent(x)));
  while (parts.length > 1 && parts[parts.length - 1] === "-") parts.pop();
  const h = "#/" + parts.join("/");
  if (opts.replace) { history.replaceState(null, "", h); window.dispatchEvent(new HashChangeEvent("hashchange")); }
  else if (location.hash === h) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = h;
}
// اختيار الطلاب لأوراق العمل الجماعية
export const bulk = { ids: null };
