import { Router } from "express";
import { permit, toSentence } from "../../domain/validation.js";
import { target } from "../../models/activityLogs.js";
import {
  createMovie,
  deleteMovie,
  findMovie,
  listMoviesWithShowtimeCounts,
  presentMovie,
  updateMovie
} from "../../models/movies.js";
import { authorize } from "../../policies/applicationPolicy.js";
import { MoviePolicy } from "../../policies/moviePolicy.js";
import { requireParams } from "../../middleware/context.js";

// FA-5: Filmverwaltung (Admin::MoviesController)
export function adminMoviesRouter({ db }) {
  const router = Router();

  function movieParams(req, movie) {
    return permit(requireParams(req.body, "movie"), new MoviePolicy(req.currentUser, movie).permittedAttributes());
  }

  router.get("/", async (req, res) => {
    authorize(new MoviePolicy(req.currentUser, null), "index");
    res.json({ movies: await listMoviesWithShowtimeCounts(db) });
  });

  router.get("/:id", async (req, res) => {
    const movie = await findMovie(db, req.params.id);
    authorize(new MoviePolicy(req.currentUser, movie), "edit");
    res.json({ movie: presentMovie(movie) });
  });

  router.post("/", async (req, res) => {
    authorize(new MoviePolicy(req.currentUser, null), "create");
    const movie = await createMovie(db, movieParams(req, null), { now: req.now });

    await req.logActivity("movie_created", { target: target("Movie", movie), description: movie.title });
    res.status(201).json({ movie: presentMovie(movie), notice: `Film "${movie.title}" wurde angelegt.` });
  });

  router.patch("/:id", async (req, res) => {
    const movie = await findMovie(db, req.params.id);
    authorize(new MoviePolicy(req.currentUser, movie), "update");

    const updated = await updateMovie(db, movie, movieParams(req, movie), { now: req.now });
    await req.logActivity("movie_updated", { target: target("Movie", updated), description: updated.title });
    res.json({ movie: presentMovie(updated), notice: `Film "${updated.title}" wurde aktualisiert.` });
  });

  router.delete("/:id", async (req, res) => {
    const movie = await findMovie(db, req.params.id);
    authorize(new MoviePolicy(req.currentUser, movie), "destroy");

    const errors = await deleteMovie(db, movie);
    if (errors.any) {
      res.status(422).json({ alert: toSentence(errors.fullMessages()) });
      return;
    }

    await req.logActivity("movie_deleted", { description: movie.title });
    res.json({ notice: `Film "${movie.title}" wurde geloescht.` });
  });

  return router;
}
