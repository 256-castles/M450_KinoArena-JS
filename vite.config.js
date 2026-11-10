import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // envDir am Projektverzeichnis festmachen – process.cwd() haengt vom Startort ab.
  const env = loadEnv(mode, import.meta.dirname, "");

  return {
    root: "client",
    plugins: [react(), tailwindcss()],
    // Inline-Config verhindert, dass Vite ausserhalb des Projekts nach postcss.config.* sucht.
    css: {
      postcss: { plugins: [] }
    },
    build: {
      outDir: "dist",
      emptyOutDir: true
    },
    server: {
      port: 5173,
      // Im Entwicklungsmodus leitet Vite alle API-Aufrufe an Express weiter.
      proxy: {
        "/api": `http://localhost:${env.PORT ?? 3000}`
      }
    }
  };
});
