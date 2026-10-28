import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    // Im Entwicklungsmodus leitet Vite alle API-Aufrufe an Express weiter.
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
