import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import nodemailer from "nodemailer";

// Ersatz fuer ActionMailer. Modi:
//   "file"   – Entwicklung: Mails landen als .eml unter tmp/mails/ (kein SMTP noetig)
//   "memory" – Tests: Mails werden in mailer.deliveries gesammelt
//   "smtp"   – Produktion: Versand ueber SMTP_URL
export function createMailer({ mode = "file", mailDir = "tmp/mails", from = "KinoArena <no-reply@kinoarena.test>", smtpUrl } = {}) {
  const transport =
    mode === "smtp"
      ? nodemailer.createTransport(smtpUrl)
      : mode === "memory"
        ? nodemailer.createTransport({ jsonTransport: true })
        : nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });

  const deliveries = [];

  return {
    deliveries,
    async deliver(message) {
      const mail = { from, ...message };
      const info = await transport.sendMail(mail);

      if (mode === "file") {
        // .eml zum Oeffnen im Mailprogramm, .txt mit dem Link im Klartext
        await mkdir(mailDir, { recursive: true });
        const baseName = `${Date.now()}-${String(message.to).replace(/[^\w.@-]/g, "_")}`;
        await writeFile(join(mailDir, `${baseName}.eml`), info.message);
        await writeFile(
          join(mailDir, `${baseName}.txt`),
          `From: ${mail.from}\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text ?? ""}`
        );
      }
      if (mode === "memory") deliveries.push(mail);
      return info;
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// UserMailer#password_reset
export function passwordResetMail({ user, url, validityMinutes }) {
  const text = `Hallo ${user.name}

für dein KinoArena-Konto (${user.email_address}) wurde ein neues Passwort angefordert.

Über den folgenden Link kannst du ein neues Passwort setzen:

${url}

Der Link ist ${validityMinutes} Minuten gültig und kann nur einmal verwendet werden.

Falls die Anfrage nicht von dir stammt, kannst du diese Nachricht ignorieren.
Dein bisheriges Passwort bleibt in diesem Fall unverändert gültig.

KinoArena
`;

  const html = `<!DOCTYPE html>
<html>
  <head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"></head>
  <body>
    <p>Hallo ${escapeHtml(user.name)}</p>
    <p>für dein KinoArena-Konto (${escapeHtml(user.email_address)}) wurde ein neues Passwort angefordert.</p>
    <p><a href="${escapeHtml(url)}">Neues Passwort setzen</a></p>
    <p>Der Link ist ${validityMinutes} Minuten gültig und kann nur einmal verwendet werden.</p>
    <p>
      Falls die Anfrage nicht von dir stammt, kannst du diese Nachricht ignorieren.
      Dein bisheriges Passwort bleibt in diesem Fall unverändert gültig.
    </p>
    <p>KinoArena</p>
  </body>
</html>
`;

  return { to: user.email_address, subject: "KinoArena – Passwort zurücksetzen", text, html };
}
