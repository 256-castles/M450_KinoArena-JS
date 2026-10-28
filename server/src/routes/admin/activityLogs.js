import { Router } from "express";
import { distinctActions, listActivityLogs } from "../../models/activityLogs.js";
import { authorize } from "../../policies/applicationPolicy.js";
import { ActivityLogPolicy } from "../../policies/activityLogPolicy.js";

// FA-9: Aktivitaetsprotokoll, filterbar nach Aktion und Benutzer
export function adminActivityLogsRouter({ db }) {
  const router = Router();

  router.get("/", async (req, res) => {
    authorize(new ActivityLogPolicy(req.currentUser, null), "index");

    const [logs, actions, users] = await Promise.all([
      listActivityLogs(db, { actionFilter: req.query.action_filter, userId: req.query.user_id }),
      distinctActions(db),
      db("users").select("id", "email_address").orderBy("email_address")
    ]);
    res.json({ logs, actions, users });
  });

  return router;
}
