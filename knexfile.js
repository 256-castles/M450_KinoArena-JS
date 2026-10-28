import { knexConfig } from "./server/src/db/knexConfig.js";

// Die Knex-CLI liest keine .env-Datei; das holen wir hier nach.
try {
  process.loadEnvFile(".env");
} catch {
  // Keine .env vorhanden: es gelten die Standardwerte (XAMPP)
}

export default {
  development: knexConfig("development"),
  test: knexConfig("test"),
  production: knexConfig("production")
};
