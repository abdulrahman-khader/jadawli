import { useEffect, useState } from "react";
import { boot, subscribe, settings } from "./lib/store.js";
import { parseHash } from "./lib/router.js";
import { setCfg } from "./lib/util.js";
import { Toasts } from "./components/ui.jsx";
import Auth from "./views/Auth.jsx";
import Home from "./views/Home.jsx";
import ClassView from "./views/ClassView.jsx";
import NewTest from "./views/NewTest.jsx";
import TestView, { Result } from "./views/TestView.jsx";
import Run from "./views/Run.jsx";
import { Student, Bulk, Settings } from "./views/Student.jsx";
import DocView from "./views/Docs.jsx";
import Remote from "./views/Remote.jsx";

const VIEWS = { home: Home, class: ClassView, newTest: NewTest, test: TestView, result: Result, run: Run, student: Student, bulk: Bulk, settings: Settings, doc: DocView };

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = جارٍ التحميل
  const [, setVer] = useState(0);
  const [route, setRoute] = useState(parseHash);

  useEffect(() => subscribe(setVer), []);
  useEffect(() => {
    const f = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  useEffect(() => { boot(setUser).catch(() => setUser("error")); }, []);

  setCfg(settings());
  if (route.name === "remote") return <Remote r={route} key={route.id} />; // صفحة الجوال لا تحتاج تسجيل دخول
  if (user === undefined || user === "loading") return <div className="loading">جارٍ التحميل…</div>;
  if (user === "error") return <div className="auth"><div className="auth-card card"><h2>تعذّر الاتصال بـ Firebase</h2><p className="muted">تأكد من اتصال الإنترنت ومن صحة الإعدادات في ملف firebase-config.js.</p></div></div>;
  if (!user) return <><Auth /><Toasts /></>;
  const View = VIEWS[route.name] || Home;
  return <><View r={route} key={[route.name, route.id, route.id2].join("/")} /><Toasts /></>;
}
