import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// base: "./" يجعل الموقع يعمل على أي رابط (مثل GitHub Pages داخل مجلد)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        // مكتبات كبيرة في ملفات منفصلة يحتفظ بها المتصفح بين التحديثات
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@firebase/firestore")) return "firestore";
          if (id.includes("firebase")) return "firebase";
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "react";
          return "ui";
        },
      },
    },
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
