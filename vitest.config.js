import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Zwei Testprojekte:
//   server – Node-Umgebung, Dateien server/**/*.test.js
//   client – jsdom (simulierter Browser), Dateien client/**/*.test.{js,jsx}
export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["server/src/**/*.js", "client/src/**/*.{js,jsx}"],
      exclude: ["server/src/db/**", "server/src/server.js", "client/src/main.jsx"],
      reporter: ["text", "html"],
      reportsDirectory: "coverage"
    },
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["server/**/*.test.js"]
        }
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "client",
          environment: "jsdom",
          include: ["client/**/*.test.{js,jsx}"],
          setupFiles: ["./vitest.setup.client.js"]
        }
      }
    ]
  }
});
