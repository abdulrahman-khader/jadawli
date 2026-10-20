import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
// الخطوط داخل الموقع نفسه (أسرع من Google Fonts، وتُضمَّن في ملفات PDF)
import "@fontsource/almarai/300.css";
import "@fontsource/almarai/400.css";
import "@fontsource/almarai/700.css";
import "@fontsource/almarai/800.css";
import "@fontsource/baloo-bhaijaan-2/500.css";
import "@fontsource/baloo-bhaijaan-2/600.css";
import "@fontsource/baloo-bhaijaan-2/700.css";
import "@fontsource/baloo-bhaijaan-2/800.css";
import "./index.css";
import "./styles.css";

// عند فتح الموقع من جديد (بعد إغلاقه) نبدأ من الصفحة الرئيسية. التحديث العادي يبقى في نفس الصفحة،
// ورابط الجوال (#/remote/…) يبقى كما هو
const nav = performance.getEntriesByType?.("navigation")?.[0];
if (nav?.type !== "reload" && location.hash && !location.hash.startsWith("#/remote/")) history.replaceState(null, "", location.pathname + location.search);

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
