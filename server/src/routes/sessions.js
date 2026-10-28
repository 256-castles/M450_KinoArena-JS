import { Router } from "express";
import { LOCKOUT_PERIOD_MS, MAX_FAILED_ATTEMPTS, throttleKey } from "../domain/loginThrottle.js";
import { recordActivity, target } from "../models/activityLogs.js";
import { authenticate, findUserByEmail, publicUser } from "../models/users.js";
import { signIn, signOut } from "../middleware/context.js";

// FA-1: Anmeldung und Abmeldung (SessionsController)
export function sessionsRouter({ db, loginThrottle }) {
  const router = Router();

  router.get("/", (req, res) => {
    res.json({ user: publicUser(req.currentUser) });
  });

  router.post("/", async (req, res) => {
    const emailAddress = req.body.email_address;
    const key = throttleKey(req.ip, emailAddress);

    if (loginThrottle.isLockedOut(key)) {
      await recordActivity(db, {
        action: "login_blocked",
        description: `Anmeldung nach ${MAX_FAILED_ATTEMPTS} Fehlversuchen gesperrt fuer ${emailAddress}`,
        ipAddress: req.ip,
        now: req.now
      });
      res.status(429).json({
        alert: `Zu viele Fehlversuche. Bitte warte ${LOCKOUT_PERIOD_MS / 60_000} Minuten oder setze dein Passwort zurueck.`
      });
      return;
    }

    const user = await findUserByEmail(db, emailAddress);

    if (await authenticate(user, req.body.password)) {
      loginThrottle.clear(key);
      signIn(req, user);
      await req.logActivity("login", { target: target("User", user), description: "Erfolgreiche Anmeldung" });
      res.json({ user: publicUser(user), notice: `Willkommen zurueck, ${user.name}!` });
      return;
    }

    loginThrottle.registerFailure(key);
    await recordActivity(db, {
      action: "login_failed",
      description: `Fehlgeschlagener Anmeldeversuch fuer ${emailAddress}`,
      ipAddress: req.ip,
      now: req.now
    });
    res.status(422).json({ alert: "E-Mail-Adresse oder Passwort ist falsch." });
  });

  router.delete("/", async (req, res) => {
    if (req.currentUser) {
      await req.logActivity("logout", { target: target("User", req.currentUser), description: "Abmeldung" });
    }
    signOut(req);
    res.json({ notice: "Du wurdest abgemeldet." });
  });

  return router;
}
