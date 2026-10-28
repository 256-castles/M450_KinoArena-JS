import { Link, useParams } from "react-router";
import { SeatMap } from "../components/SeatMap.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useResource } from "../hooks/useResource.js";
import { showtimeDate, timeOfDay } from "../lib/format.js";
import { NotFound } from "./NotFound.jsx";

// showtimes/show.html.erb – Saalplan einer Vorstellung
export function ShowtimeShow() {
  const { id } = useParams();
  const { user, loggedIn } = useAuth();
  const { data, notFound } = useResource(`/showtimes/${id}`);
  if (notFound) return <NotFound />;
  if (!data) return null;

  const { showtime } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <h1 className="text-4xl">{showtime.movie.title}</h1>
        <p className="ka-label mt-2">
          {showtimeDate(showtime.start_time)} &middot; {timeOfDay(showtime.start_time)} &middot; {showtime.auditorium.name}
        </p>
      </div>

      <div className="mt-12">
        <div className="mx-auto h-2 w-3/4 rounded-full bg-brand-500 shadow-[0_0_60px_20px_rgba(232,17,45,0.25)]" />
        <p className="ka-label mt-3 text-center">Leinwand</p>
      </div>

      {!loggedIn && (
        <p className="mt-8 rounded-lg border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-center text-sm text-gold-400">
          <Link to="/login" className="font-medium underline">Melde dich an</Link>, um Tickets zu buchen.
        </p>
      )}

      <SeatMap
        key={showtime.id}
        showtime={showtime}
        initialSeats={data.seats}
        holdDurationMinutes={data.hold_duration_minutes}
        currentUserId={user?.id ?? null}
      />

      <p className="mt-6 text-center">
        <Link to={`/movies/${showtime.movie.id}`} className="ka-label transition hover:text-white">← Zurück zum Film</Link>
      </p>
    </div>
  );
}
