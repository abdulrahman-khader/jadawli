import { useState } from "react";
import { login, register, resetPassword, mode, AUTH_ERR } from "../lib/store.js";
import { toast } from "../lib/util.js";
import { Btn, Logo } from "../components/app.jsx";
import { Card } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.jsx";
import { Button } from "../components/ui/button.jsx";

const Field = ({ id, label, ...p }) => <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} className="h-11" {...p} /></div>;

export default function Auth() {
  const [m, setM] = useState("login");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // عند النجاح تبقى أيقونة التحميل حتى تفتح الصفحة الرئيسية
  async function submit(e, fn) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    try { await fn(fd); } catch (x) { setErr(AUTH_ERR[x?.code] || "حدث خطأ. حاول مرة أخرى."); setBusy(false); }
  }
  const switchTo = (k) => { setM(k); setErr(""); };
  const err_ = <p className="min-h-5 text-sm text-destructive" role="alert">{err}</p>;

  return (
    <div className="grid min-h-dvh place-items-center bg-band px-4 py-8">
      {mode === "local" && <div className="fixed inset-x-0 top-0 bg-warm py-1.5 text-center text-sm text-warm-foreground">وضع تجريبي: الحسابات والبيانات محفوظة على هذا الجهاز فقط.</div>}
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="flex flex-col items-center gap-2.5 text-center text-white"><Logo big /><h1 className="text-4xl">جداولي</h1>
          <p className="opacity-80">اختبارات جدول الضرب والقسمة لفصولك، مع تقارير وخطة علاجية لكل طالب.</p></div>
        {m !== "reset" && <Tabs value={m} onValueChange={switchTo} dir="rtl">
          <TabsList className="grid h-11 w-full grid-cols-2 bg-white/12">
            <TabsTrigger value="login" className="text-white/85 data-[state=active]:text-foreground">تسجيل الدخول</TabsTrigger>
            <TabsTrigger value="register" className="text-white/85 data-[state=active]:text-foreground">حساب جديد</TabsTrigger>
          </TabsList>
        </Tabs>}
        <Card className="gap-4 p-6">
          {m === "login" && <form className="flex flex-col gap-4" onSubmit={(e) => submit(e, (fd) => login(fd.get("email"), fd.get("pass")))}>
            <Field id="lEmail" label="البريد الإلكتروني" name="email" type="email" required autoComplete="email" dir="ltr" />
            <Field id="lPass" label="كلمة المرور" name="pass" type="password" required autoComplete="current-password" dir="ltr" />
            <Btn size="xl" loading={busy}>{busy ? "جارٍ الدخول…" : "دخول"}</Btn>
            <Button type="button" variant="link" onClick={() => switchTo("reset")}>نسيت كلمة المرور؟</Button>
            {err_}
          </form>}
          {m === "register" && <form className="flex flex-col gap-4" onSubmit={(e) => submit(e, (fd) => register(String(fd.get("name")).trim(), fd.get("email"), fd.get("pass")))}>
            <Field id="rName" label="اسمك" name="name" type="text" required maxLength={40} placeholder="مثال: أ. محمد" />
            <Field id="rEmail" label="البريد الإلكتروني" name="email" type="email" required autoComplete="email" dir="ltr" />
            <Field id="rPass" label="كلمة المرور (٦ أحرف أو أكثر)" name="pass" type="password" required minLength={6} autoComplete="new-password" dir="ltr" />
            <Btn size="xl" loading={busy}>{busy ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}</Btn>
            {err_}
          </form>}
          {m === "reset" && <form className="flex flex-col gap-4" onSubmit={(e) => submit(e, async (fd) => { await resetPassword(fd.get("email")); setBusy(false); toast("أرسلنا رابط تعيين كلمة المرور إلى بريدك"); })}>
            <p className="text-muted-foreground">اكتب بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.</p>
            <Field id="pEmail" label="البريد الإلكتروني" name="email" type="email" required dir="ltr" />
            <Btn size="xl" loading={busy}>إرسال الرابط</Btn>
            <Button type="button" variant="link" onClick={() => switchTo("login")}>العودة لتسجيل الدخول</Button>
            {err_}
          </form>}
        </Card>
      </div>
    </div>
  );
}
