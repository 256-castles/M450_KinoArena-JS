import cookieSession from "cookie-session";
import express from "express";
import helmet from "helmet";
import { systemClock } from "./domain/clock.js";
import { LoginThrottle } from "./domain/loginThrottle.js";
import { csrfGuard, requireAdmin } from "./middleware/auth.js";
import { requestContext } from "./middleware/context.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminActivityLogsRouter } from "./routes/admin/activityLogs.js";
import { adminAuditoriaRouter } from "./routes/admin/auditoria.js";
import { adminMoviesRouter } from "./routes/admin/movies.js";
import { adminShowtimesRouter } from "./routes/admin/showtimes.js";
import { bookingsRouter } from "./routes/bookings.js";
import { checkoutsRouter } from "./routes/checkouts.js";
import { moviesRouter } from "./routes/movies.js";
import { passwordResetsRouter } from "./routes/passwordResets.js";
import { registrationsRouter } from "./routes/registrations.js";
import { seatHoldsRouter } from "./routes/seatHolds.js";
import { sessionsRouter } from "./routes/sessions.js";
import { showtimesRouter } from "./routes/showtimes.js";
import { usersRouter } from "./routes/users.js";
import { SeatBroadcaster } from "./services/seatBroadcast.js";

const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// Baut die Express-App aus injizierten Abhaengigkeiten zusammen.
// Tests koennen so eine eigene Datenbank, einen Mail-Speicher oder eine
// feste Uhrzeit (clock) uebergeben, z. B. fuer Supertest.
export function createApp({
  db,
  config,
  mailer,
  clock = systemClock,
  broadcaster = new SeatBroadcaster(),
  loginThrottle = new LoginThrottle({ now: () => clock.now().getTime() }),
  staticDir = null
}) {
  const deps = { db, config, mailer, clock, broadcaster, loginThrottle };
  const app = express();

  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "https:"],
          "style-src": ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          // Die App laeuft lokal auch ueber http://localhost
          "upgrade-insecure-requests": null
        }
      }
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(
    cookieSession({
      name: "kinoarena_session",
      keys: [config.sessionSecret],
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      maxAge: SESSION_MAX_AGE_MS
    })
  );

  const api = express.Router();
  api.use(csrfGuard);
  api.use(requestContext(deps));

  // FA-1: Authentifizierung
  api.use("/session", sessionsRouter(deps));
  api.use("/registrations", registrationsRouter(deps));
  api.use("/password_resets", passwordResetsRouter(deps));

  // FA-2/FA-3/FA-4: Kunde
  api.use("/showtimes/:showtimeId/seat_holds", seatHoldsRouter(deps));
  api.use("/showtimes/:showtimeId/checkout", checkoutsRouter(deps));
  api.use("/showtimes", showtimesRouter(deps));
  api.use("/movies", moviesRouter(deps));
  api.use("/bookings", bookingsRouter(deps));
  api.use("/users", usersRouter(deps));

  // FA-5/FA-6 + Aktivitaetsprotokoll: Admin
  const admin = express.Router();
  admin.use(requireAdmin);
  admin.use("/movies", adminMoviesRouter(deps));
  admin.use("/auditoria", adminAuditoriaRouter(deps));
  admin.use("/showtimes", adminShowtimesRouter(deps));
  admin.use("/activity_logs", adminActivityLogsRouter(deps));
  api.use("/admin", admin);

  api.use((_req, res) => res.status(404).json({ alert: "Diese Seite gibt es nicht", not_found: true }));

  app.use("/api", api);

  // Produktion: das gebaute Frontend (client/dist) wird mit ausgeliefert.
  if (staticDir) {
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
    app.get("/{*path}", (_req, res) => res.sendFile("index.html", { root: staticDir }));
  }

  app.use(errorHandler());
  return app;
}
