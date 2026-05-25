import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// baiwa.org is served from /. Set VITE_BASE_PATH=/baiwa/ only for a subpath deploy without a custom domain.
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
});
