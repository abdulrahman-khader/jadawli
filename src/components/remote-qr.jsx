// زر «تحكم بالجوال» ونافذة الباركود (في صفحة الاختبار وشاشة الطالب)
import { useEffect, useState } from "react";
import { remoteAvailable, remoteToken, remoteCreate, remoteUrl, qrSvg } from "../lib/remote.js";
import { Icon, Spinner } from "./app.jsx";
import { Button } from "./ui/button.jsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog.jsx";

export function RemoteButton({ onClick, className }) {
  if (!remoteAvailable()) return null;
  return <Button variant="outline" size="sm" className={"no-print " + (className || "")} onClick={onClick}><Icon name="phone" /> {remoteToken() ? "باركود الجوال" : "تحكم بالجوال"}</Button>;
}

export function RemoteQr({ open, onClose }) {
  const [tok, setTok] = useState(remoteToken); const [err, setErr] = useState(false);
  useEffect(() => { if (open && !tok) { setErr(false); remoteCreate().then(setTok).catch(() => setErr(true)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="no-print flex flex-col items-center text-center sm:max-w-md">
        <DialogHeader className="items-center sm:text-center"><DialogTitle className="font-display text-xl">تحكم بالجوال</DialogTitle>
          <DialogDescription>امسح الباركود بكاميرا الجوال، وتحكّم بالاختبار وأنت بعيد عن الشاشة: اختيار الطالب، صح، خطأ، التالي.</DialogDescription></DialogHeader>
        {err ? <p className="text-destructive">تعذّر إنشاء الرابط. تحقّق من الاتصال بالإنترنت.</p>
          : tok ? <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg(remoteUrl(tok)) }} /> : <div className="qr"><Spinner label="نجهّز الباركود…" /></div>}
        <p className="text-sm text-muted-foreground">تبقى النافذة مفتوحة حتى يتصل الجوال، ثم تُغلق تلقائياً.</p>
      </DialogContent>
    </Dialog>
  );
}

// قائمة طلاب الفصل وحالة كل واحد (للجوال)
export const studentList = (studs, t) => studs.map((z) => {
  const rr = t.results?.[z.id];
  return { id: z.id, name: z.name, st: rr?.status === "absent" ? "a" : rr ? "d" : "" };
});
