// Entspricht `bin/rails db:create`: legt Entwicklungs- und Testdatenbank an.
import mysql from "mysql2/promise";
import { connectionSettings, databaseName } from "../server/src/db/knexConfig.js";

const environments = ["development", "test"];
const settings = connectionSettings();

let connection;
try {
  connection = await mysql.createConnection(settings);
} catch (error) {
  console.error(`Keine Verbindung zu MariaDB auf ${settings.host}:${settings.port} (${error.message}).`);
  console.error("Laeuft MySQL im XAMPP Control Panel? Stimmen DB_USER/DB_PASSWORD in .env?");
  process.exit(1);
}

for (const environment of environments) {
  const name = databaseName(environment);
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`Datenbank bereit: ${name}`);
}

await connection.end();
