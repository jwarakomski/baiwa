import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: https://jwarakomski.github.io/baiwa/
const base = process.env.GITHUB_PAGES === "true" ? "/baiwa/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
});
