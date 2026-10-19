import { useState } from "react";
import { login, register, resetPassword, mode, AUTH_ERR } from "../lib/store.js";
import { toast } from "../lib/util.js";

export default function Auth() {
  const [m, setM] = useState("login");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e, fn) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    try { await fn(fd); } catch (x) { setErr(AUTH_ERR[x?.code] || "حدث خطأ. حاول مرة أخرى."); } finally { setBusy(false); }
  }
  const switchTo = (k) => { setM(k); setErr(""); };

  return (
    <>
      {mode === "local" && <div className="demo">وضع تجريبي: الحسابات والبيانات محفوظة على هذا الجهاز فقط.</div>}
      <div className="auth"><div className="auth-card">
        <div className="brand"><span className="logo big">×÷</span><h1>جداولي</h1><p>اختبارات جدول الضرب والقسمة لفصولك، مع تقارير وخطة علاجية لكل طالب.</p></div>
        {m !== "reset" && <div className="tabs">
          <button type="button" className={"tab " + (m === "login" ? "on" : "")} onClick={() => switchTo("login")}>تسجيل الدخول</button>
          <button type="button" className={"tab " + (m === "register" ? "on" : "")} onClick={() => switchTo("register")}>حساب جديد</button>
        </div>}
        {m === "login" && <form className="card stack" onSubmit={(e) => submit(e, (fd) => login(fd.get("email"), fd.get("pass")))}>
          <div><label className="lbl" htmlFor="lEmail">البريد الإلكتروني</label><input id="lEmail" name="email" type="email" required autoComplete="email" dir="ltr" /></div>
          <div><label className="lbl" htmlFor="lPass">كلمة المرور</label><input id="lPass" name="pass" type="password" required autoComplete="current-password" dir="ltr" /></div>
          <button className="btn primary big" disabled={busy}>دخول</button>
          <button type="button" className="link" onClick={() => switchTo("reset")}>نسيت كلمة المرور؟</button>
          <p className="err" role="alert">{err}</p>
        </form>}
        {m === "register" && <form className="card stack" onSubmit={(e) => submit(e, (fd) => register(String(fd.get("name")).trim(), fd.get("email"), fd.get("pass")))}>
          <div><label className="lbl" htmlFor="rName">اسمك</label><input id="rName" name="name" type="text" required maxLength={40} placeholder="مثال: أ. محمد" /></div>
          <div><label className="lbl" htmlFor="rEmail">البريد الإلكتروني</label><input id="rEmail" name="email" type="email" required autoComplete="email" dir="ltr" /></div>
          <div><label className="lbl" htmlFor="rPass">كلمة المرور (٦ أحرف أو أكثر)</label><input id="rPass" name="pass" type="password" required minLength={6} autoComplete="new-password" dir="ltr" /></div>
          <button className="btn primary big" disabled={busy}>إنشاء الحساب</button>
          <p className="err" role="alert">{err}</p>
        </form>}
        {m === "reset" && <form className="card stack" onSubmit={(e) => submit(e, async (fd) => { await resetPassword(fd.get("email")); toast("أرسلنا رابط تعيين كلمة المرور إلى بريدك"); })}>
          <p className="muted">اكتب بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.</p>
          <div><label className="lbl" htmlFor="pEmail">البريد الإلكتروني</label><input id="pEmail" name="email" type="email" required dir="ltr" /></div>
          <button className="btn primary big" disabled={busy}>إرسال الرابط</button>
          <button type="button" className="link" onClick={() => switchTo("login")}>العودة لتسجيل الدخول</button>
          <p className="err" role="alert">{err}</p>
        </form>}
      </div></div>
    </>
  );
}
