import { Router } from "express";
import { roleName } from "../domain/labels.js";
import { isBlank, permit } from "../domain/validation.js";
import { target } from "../models/activityLogs.js";
import { listBookings } from "../models/bookings.js";
import {
  adminCount,
  deleteUser,
  findUserOrFail,
  listUsersWithBookingCounts,
  publicUser,
  updateUser
} from "../models/users.js";
import { authorize } from "../policies/applicationPolicy.js";
import { UserPolicy } from "../policies/userPolicy.js";
import { requireUser } from "../middleware/auth.js";
import { requireParams, signOut } from "../middleware/context.js";

// FA-7/FA-8: Profil- und Benutzerverwaltung (UsersController)
export function usersRouter({ db }) {
  const router = Router();

  router.use(requireUser);

  async function policyFor(req, record) {
    return new UserPolicy(req.currentUser, record, { adminCount: await adminCount(db) });
  }

  function permissions(policy) {
    return { can_update: policy.update(), can_destroy: policy.destroy(), can_change_role: policy.changeRole() };
  }

  router.get("/", async (req, res) => {
    authorize(await policyFor(req, null), "index");
    const count = await adminCount(db);

    const users = await listUsersWithBookingCounts(db);
    res.json({
      users: users.map((user) => ({
        ...user,
        ...permissions(new UserPolicy(req.currentUser, user, { adminCount: count }))
      }))
    });
  });

  router.get("/:id", async (req, res) => {
    const user = await findUserOrFail(db, req.params.id);
    const policy = await policyFor(req, user);
    authorize(policy, "show");

    const bookings = await listBookings(db, (query) => query.where("bookings.user_id", user.id));
    res.json({ user: { ...publicUser(user), ...permissions(policy) }, bookings });
  });

  router.patch("/:id", async (req, res) => {
    const user = await findUserOrFail(db, req.params.id);
    const policy = await policyFor(req, user);
    authorize(policy, "update");

    const params = permit(requireParams(req.body, "user"), policy.permittedAttributes());
    if (isBlank(params.password)) {
      delete params.password;
      delete params.password_confirmation;
    }

    const wasAdmin = user.admin;
    const updated = await updateUser(db, user, params, { now: req.now });

    // Eine Rollenaenderung ist die sicherheitsrelevanteste Aenderung am Konto und
    // bekommt deshalb einen eigenen Protokolleintrag.
    if (wasAdmin === updated.admin) {
      await req.logActivity("user_updated", { target: target("User", updated), description: "Profil aktualisiert" });
    } else {
      await req.logActivity("user_role_changed", {
        target: target("User", updated),
        description: `${updated.email_address}: ${wasAdmin ? "Administrator" : "Kunde"} → ${roleName(updated)}`
      });
    }

    res.json({ user: publicUser(updated), notice: "Profil wurde aktualisiert." });
  });

  router.delete("/:id", async (req, res) => {
    const user = await findUserOrFail(db, req.params.id);
    authorize(await policyFor(req, user), "destroy");

    const deletingSelf = user.id === req.currentUser.id;
    await deleteUser(db, user);

    // Wer sein eigenes Konto loescht, existiert danach nicht mehr als Benutzer;
    // der Eintrag wird deshalb ohne Benutzerbezug geschrieben.
    await req.logActivity("user_deleted", {
      description: `Konto ${user.email_address} geloescht`,
      userId: deletingSelf ? null : req.currentUser.id
    });

    if (deletingSelf) {
      signOut(req);
      res.json({ notice: "Dein Konto wurde geloescht.", signed_out: true });
    } else {
      res.json({ notice: `Konto ${user.email_address} wurde geloescht.` });
    }
  });

  return router;
}
