// Konfiguration aus Umgebungsvariablen (.env), analog zu config/*.yml in Rails.
const DEV_SECRETS = ["dev-session-secret-bitte-aendern", "dev-token-secret-bitte-aendern"];

function parseTrustProxy(value) {
  if (value === undefined || value === "" || value === "0" || value === "false") return false;
  if (value === "true") return true;
  const hops = Number(value);
  return Number.isInteger(hops) ? hops : value;
}

export function loadConfig(env = process.env) {
  const environment = env.NODE_ENV || "development";
  const appUrl = (env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
  const config = {
    env: environment,
    port: Number(env.PORT || 3000),
    appUrl,
    // Secure-Cookies nur ueber HTTPS; lokal (http://localhost) wuerde der Browser sie verwerfen
    cookieSecure: appUrl.startsWith("https://"),
    sessionSecret: env.SESSION_SECRET || DEV_SECRETS[0],
    tokenSecret: env.TOKEN_SECRET || DEV_SECRETS[1],
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    mail: {
      mode: env.SMTP_URL ? "smtp" : environment === "test" ? "memory" : "file",
      smtpUrl: env.SMTP_URL,
      from: env.MAIL_FROM || "KinoArena <no-reply@kinoarena.test>",
      mailDir: "tmp/mails"
    }
  };

  if (environment === "production" && DEV_SECRETS.some((secret) => [config.sessionSecret, config.tokenSecret].includes(secret))) {
    throw new Error("SESSION_SECRET und TOKEN_SECRET muessen in Produktion gesetzt sein.");
  }
  return config;
}
