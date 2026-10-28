import { Router } from "express";
import { authorize } from "../policies/applicationPolicy.js";
import { MoviePolicy } from "../policies/moviePolicy.js";
import { findMovie, presentMovie } from "../models/movies.js";
import { upcomingForMovie } from "../models/showtimes.js";

// FA-2: Filmdetail mit kommenden Vorstellungen (MoviesController)
export function moviesRouter({ db }) {
  const router = Router();

  router.get("/:id", async (req, res) => {
    const movie = await findMovie(db, req.params.id);
    authorize(new MoviePolicy(req.currentUser, movie), "show");

    res.json({ movie: presentMovie(movie), showtimes: await upcomingForMovie(db, movie.id, req.now) });
  });

  return router;
}
