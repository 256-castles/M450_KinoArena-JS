import { Router } from "express";
import { permit } from "../../domain/validation.js";
import { target } from "../../models/activityLogs.js";
import { listAuditoriumOptions } from "../../models/auditoria.js";
import {
  createShowtime,
  deleteShowtime,
  findShowtimeDetailed,
  listMovieOptions,
  listShowtimesForAdmin,
  updateShowtime
} from "../../models/showtimes.js";
import { authorize } from "../../policies/applicationPolicy.js";
import { ShowtimePolicy } from "../../policies/showtimePolicy.js";
import { requireParams } from "../../middleware/context.js";

// FA-6: Spielplanverwaltung (Admin::ShowtimesController)
export function adminShowtimesRouter({ db }) {
  const router = Router();

  function showtimeParams(req, showtime) {
    return permit(requireParams(req.body, "showtime"), new ShowtimePolicy(req.currentUser, showtime).permittedAttributes());
  }

  // load_form_collections
  async function formOptions() {
    const [movies, auditoria] = await Promise.all([listMovieOptions(db), listAuditoriumOptions(db)]);
    return { movies, auditoria };
  }

  router.get("/", async (req, res) => {
    authorize(new ShowtimePolicy(req.currentUser, null), "index");
    res.json({ showtimes: await listShowtimesForAdmin(db) });
  });

  router.get("/new", async (req, res) => {
    authorize(new ShowtimePolicy(req.currentUser, null), "new");
    res.json(await formOptions());
  });

  router.get("/:id", async (req, res) => {
    const showtime = await findShowtimeDetailed(db, req.params.id);
    authorize(new ShowtimePolicy(req.currentUser, showtime), "edit");
    res.json({ showtime, ...(await formOptions()) });
  });

  router.post("/", async (req, res) => {
    authorize(new ShowtimePolicy(req.currentUser, null), "create");
    const showtime = await createShowtime(db, showtimeParams(req, null), { now: req.now });

    await req.logActivity("showtime_created", { target: target("Showtime", showtime), description: showtime.label });
    res.status(201).json({ showtime, notice: "Vorstellung wurde angelegt." });
  });

  router.patch("/:id", async (req, res) => {
    const showtime = await findShowtimeDetailed(db, req.params.id);
    authorize(new ShowtimePolicy(req.currentUser, showtime), "update");

    const updated = await updateShowtime(db, showtime, showtimeParams(req, showtime), { now: req.now });
    await req.logActivity("showtime_updated", { target: target("Showtime", updated), description: updated.label });
    res.json({ showtime: updated, notice: "Vorstellung wurde aktualisiert." });
  });

  router.delete("/:id", async (req, res) => {
    const showtime = await findShowtimeDetailed(db, req.params.id);
    authorize(new ShowtimePolicy(req.currentUser, showtime), "destroy");

    await deleteShowtime(db, showtime);
    await req.logActivity("showtime_deleted", { description: showtime.label });
    res.json({ notice: "Vorstellung wurde geloescht." });
  });

  return router;
}
