import { Router } from "express";
import { PASSWORD_RESET_VALIDITY_MS } from "../domain/passwordResetToken.js";
import { Errors, isBlank, permit } from "../domain/validation.js";
import { RecordInvalid } from "../errors.js";
import { recordActivity, target } from "../models/activityLogs.js";
import {
  clearPasswordResetSentAt,
  findUserByEmail,
  findUserByPasswordResetToken,
  passwordResetThrottled,
  startPasswordReset,
  updateUser
} from "../models/users.js";
import { requireParams, signOut } from "../middleware/context.js";
import { passwordResetMail } from "../services/mailer.js";

const INVALID_LINK_MESSAGE = "Der Link ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen an.";

// FA-1b: Passwort vergessen (PasswordResetsController)
export function passwordResetsRouter({ db, mailer, config }) {
  const router = Router();

  router.use((req, res, next) => {
    if (req.currentUser) {
      res.status(403).json({ alert: "Du bist bereits angemeldet.", redirect_to: "/" });
      return;
    }
    next();
  });

  // Der Token traegt seine eigene Gueltigkeit: abgelaufen oder bereits benutzt
  // (Passwort geaendert) liefert findUserByPasswordResetToken null.
  async function userFromToken(req, res) {
    const user = await findUserByPasswordResetToken(db, req.params.token, { now: req.now, secret: config.tokenSecret });
    if (user) return user;

    await recordActivity(db, {
      action: "password_reset_invalid_token",
      description: "Ungueltiger oder abgelaufener Reset-Link aufgerufen",
      ipAddress: req.ip,
      now: req.now
    });
    res.status(410).json({ alert: INVALID_LINK_MESSAGE });
    return null;
  }

  router.post("/", async (req, res) => {
    const emailAddress = req.body.email_address;
    const user = await findUserByEmail(db, emailAddress);

    if (!user || passwordResetThrottled(user, req.now)) {
      await recordActivity(db, {
        action: "password_reset_rejected",
        userId: user?.id ?? null,
        description: `Kein Link versendet fuer ${emailAddress}`,
        ipAddress: req.ip,
        now: req.now
      });
    } else {
      const token = await startPasswordReset(db, user, { now: req.now, secret: config.tokenSecret });
      await mailer.deliver(
        passwordResetMail({
          user,
          url: `${config.appUrl}/password_resets/${token}/edit`,
          validityMinutes: PASSWORD_RESET_VALIDITY_MS / 60_000
        })
      );
      await recordActivity(db, {
        action: "password_reset_requested",
        userId: user.id,
        target: target("User", user),
        description: "Link zum Zuruecksetzen verschickt",
        ipAddress: req.ip,
        now: req.now
      });
    }

    // Die Rueckmeldung ist bewusst identisch, egal ob das Konto existiert.
    // Sonst liesse sich ueber das Formular herausfinden, wer registriert ist.
    res.json({
      notice: "Falls ein Konto zu dieser E-Mail-Adresse existiert, ist ein Link zum Zuruecksetzen unterwegs."
    });
  });

  router.get("/:token", async (req, res) => {
    const user = await userFromToken(req, res);
    if (user) res.json({ email_address: user.email_address });
  });

  router.patch("/:token", async (req, res) => {
    const user = await userFromToken(req, res);
    if (!user) return;

    const params = permit(requireParams(req.body, "user"), ["password", "password_confirmation"]);

    // has_secure_password ignoriert ein leeres Passwort stillschweigend,
    // deshalb wird die Eingabe hier ausdruecklich geprueft.
    if (isBlank(params.password)) {
      throw new RecordInvalid(new Errors("user").add("password", "darf nicht leer sein"));
    }

    await updateUser(db, user, params, { now: req.now });
    await clearPasswordResetSentAt(db, user);
    signOut(req);
    await recordActivity(db, {
      action: "password_reset_completed",
      userId: user.id,
      target: target("User", user),
      description: "Passwort ueber Reset-Link geaendert",
      ipAddress: req.ip,
      now: req.now
    });
    res.json({ notice: "Passwort wurde geaendert. Bitte melde dich neu an." });
  });

  return router;
}
