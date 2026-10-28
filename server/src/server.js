import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDb } from "./db/connection.js";
import { createMailer } from "./services/mailer.js";

const config = loadConfig();
const db = createDb(config.env);
const clientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));

const app = createApp({
  db,
  config,
  mailer: createMailer(config.mail),
  staticDir: existsSync(clientDist) && config.env === "production" ? clientDist : null
});

try {
  await db.raw("SELECT 1");
} catch (error) {
  console.error(`Keine Verbindung zur Datenbank (${error.message}).`);
  console.error("Laeuft MySQL im XAMPP Control Panel? Wurden `npm run db:create` und `npm run db:migrate` ausgefuehrt?");
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`KinoArena API laeuft auf http://localhost:${config.port} (${config.env})`);
});

async function shutdown() {
  server.close();
  server.closeAllConnections();
  await db.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
