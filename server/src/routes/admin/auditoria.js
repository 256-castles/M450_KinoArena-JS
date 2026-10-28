import { Router } from "express";
import { MAX_ROWS, MAX_SEATS_PER_ROW } from "../../domain/seatRows.js";
import { permit } from "../../domain/validation.js";
import { target } from "../../models/activityLogs.js";
import {
  createAuditorium,
  deleteAuditorium,
  findAuditorium,
  listAuditoria,
  renameAuditorium
} from "../../models/auditoria.js";
import { authorize } from "../../policies/applicationPolicy.js";
import { AuditoriumPolicy } from "../../policies/auditoriumPolicy.js";
import { requireParams } from "../../middleware/context.js";

// FA-6: Saalverwaltung (Admin::AuditoriaController)
export function adminAuditoriaRouter({ db }) {
  const router = Router();

  function auditoriumParams(req, auditorium) {
    return permit(requireParams(req.body, "auditorium"), new AuditoriumPolicy(req.currentUser, auditorium).permittedAttributes());
  }

  router.get("/", async (req, res) => {
    authorize(new AuditoriumPolicy(req.currentUser, null), "index");
    res.json({ auditoria: await listAuditoria(db), max_rows: MAX_ROWS, max_seats_per_row: MAX_SEATS_PER_ROW });
  });

  router.get("/:id", async (req, res) => {
    const auditorium = await findAuditorium(db, req.params.id);
    authorize(new AuditoriumPolicy(req.currentUser, auditorium), "edit");
    res.json({ auditorium });
  });

  router.post("/", async (req, res) => {
    authorize(new AuditoriumPolicy(req.currentUser, null), "create");
    const auditorium = await createAuditorium(db, auditoriumParams(req, null), { now: req.now });

    await req.logActivity("auditorium_created", {
      target: target("Auditorium", auditorium),
      description: `${auditorium.name} mit ${auditorium.total_seats} Plätzen`
    });
    res.status(201).json({
      auditorium,
      notice: `Saal "${auditorium.name}" wurde mit ${auditorium.total_seats} Sitzplätzen angelegt.`
    });
  });

  // Der Saalplan bleibt unveraendert, damit bestehende Buchungen gueltig bleiben.
  router.patch("/:id", async (req, res) => {
    const auditorium = await findAuditorium(db, req.params.id);
    authorize(new AuditoriumPolicy(req.currentUser, auditorium), "update");

    const updated = await renameAuditorium(db, auditorium, auditoriumParams(req, auditorium), { now: req.now });
    await req.logActivity("auditorium_updated", { target: target("Auditorium", updated), description: updated.name });
    res.json({ auditorium: updated, notice: "Saal wurde umbenannt." });
  });

  router.delete("/:id", async (req, res) => {
    const auditorium = await findAuditorium(db, req.params.id);
    authorize(new AuditoriumPolicy(req.currentUser, auditorium), "destroy");

    if (!(await deleteAuditorium(db, auditorium))) {
      res.status(422).json({
        alert: `Saal "${auditorium.name}" kann nicht gelöscht werden, solange Vorstellungen geplant sind.`
      });
      return;
    }

    await req.logActivity("auditorium_deleted", { description: auditorium.name });
    res.json({ notice: `Saal "${auditorium.name}" wurde gelöscht.` });
  });

  return router;
}
