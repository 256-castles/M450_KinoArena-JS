import { Router } from "express";
import { permit } from "../domain/validation.js";
import { target } from "../models/activityLogs.js";
import { createUser, publicUser } from "../models/users.js";
import { requireParams, signIn } from "../middleware/context.js";

// FA-1: Registrierung (RegistrationsController)
export function registrationsRouter({ db }) {
  const router = Router();

  router.post("/", async (req, res) => {
    const params = permit(requireParams(req.body, "user"), ["name", "email_address", "password", "password_confirmation"]);
    // NFA-5: bei Fehlern antwortet createUser mit 422, das Formular behaelt die Eingaben
    const user = await createUser(db, { ...params, admin: false }, { now: req.now });

    signIn(req, user);
    await req.logActivity("user_registered", { target: target("User", user), description: "Neues Konto erstellt" });
    res.status(201).json({ user: publicUser(user), notice: `Konto erstellt. Willkommen bei KinoArena, ${user.name}!` });
  });

  return router;
}
