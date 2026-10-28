import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations", import.meta.url));
const SEEDS_DIR = fileURLToPath(new URL("./seeds", import.meta.url));

// XAMPP startet MariaDB ohne Strict Mode; ohne ihn wuerden zu lange Werte
// stillschweigend abgeschnitten statt abgelehnt.
const SQL_MODE = "STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION";

export function databaseName(environment, env = process.env) {
  if (environment === "test") return env.DB_TEST_NAME || "kinoarena_test";
  return env.DB_NAME || `kinoarena_${environment}`;
}

export function connectionSettings(env = process.env) {
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    charset: "utf8mb4",
    // Zeitpunkte werden immer in UTC gespeichert, angezeigt wird in Europe/Zurich.
    timezone: "Z",
    decimalNumbers: true
  };
}

export function knexConfig(environment = process.env.NODE_ENV || "development", env = process.env) {
  return {
    client: "mysql2",
    connection: { ...connectionSettings(env), database: databaseName(environment, env) },
    pool: {
      min: 0,
      max: Number(env.DB_POOL || 10),
      afterCreate(connection, done) {
        connection.query(`SET SESSION sql_mode = '${SQL_MODE}', time_zone = '+00:00'`, (error) => done(error, connection));
      }
    },
    migrations: { directory: MIGRATIONS_DIR, tableName: "knex_migrations" },
    seeds: { directory: SEEDS_DIR }
  };
}
