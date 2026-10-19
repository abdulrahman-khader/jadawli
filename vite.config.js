import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" يجعل الموقع يعمل على أي رابط (مثل GitHub Pages داخل مجلد)
export default defineConfig({
  plugins: [react()],
  base: "./",
});
