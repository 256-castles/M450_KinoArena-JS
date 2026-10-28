import { Link, useParams } from "react-router";
import { Underline } from "../components/Brand.jsx";
import { Hero } from "../components/Layout.jsx";
import { useResource } from "../hooks/useResource.js";
import { chf, dateKey, showtimeDate, timeOfDay } from "../lib/format.js";
import { NotFound } from "./NotFound.jsx";

function groupByDate(showtimes) {
  const groups = new Map();
  for (const showtime of showtimes) {
    const key = dateKey(showtime.start_time);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(showtime);
  }
  return [...groups.values()];
}

// movies/show.html.erb
export function MovieShow() {
  const { id } = useParams();
  const { data, notFound } = useResource(`/movies/${id}`);
  if (notFound) return <NotFound />;
  if (!data) return null;

  const { movie, showtimes } = data;
  const showtimesByDate = groupByDate(showtimes);

  return (
    <>
      <Hero>
        <section className="relative overflow-hidden border-b border-white/5">
          {movie.poster_url && (
            <img src={movie.poster_url} alt="" aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" />

          <div className="relative mx-auto flex w-full max-w-6xl items-end gap-6 px-5 pb-8 pt-14">
            {movie.poster_url && (
              <img src={movie.poster_url} alt={movie.title}
                className="hidden h-44 w-28 shrink-0 rounded-lg border border-white/10 object-cover shadow-2xl sm:block" />
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="ka-chip">{movie.duration_label}</span>
              </div>
              <h1 className="mt-3 text-4xl md:text-5xl">{movie.title}</h1>
            </div>
          </div>
        </section>
      </Hero>

      <Link to="/" className="ka-label transition hover:text-white">← Zurück zum Programm</Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <section>
          <h2 className="text-2xl">Handlung</h2>
          <Underline className="mt-2" />
          <p className="mt-5 leading-relaxed text-slate-400">{movie.description}</p>
        </section>

        <section>
          <h2 className="text-2xl">Vorstellungen</h2>
          <Underline className="mt-2" />

          {showtimesByDate.length === 0 && (
            <p className="mt-5 text-sm text-slate-500">Für diesen Film sind derzeit keine Vorstellungen geplant.</p>
          )}

          {showtimesByDate.map((group) => (
            <div key={dateKey(group[0].start_time)}>
              <p className="ka-label mt-6">{showtimeDate(group[0].start_time)}</p>

              <div className="mt-3 space-y-3">
                {group.map((showtime) => {
                  const free = showtime.free_seats;
                  const total = showtime.total_seats;
                  return (
                    <Link key={showtime.id} to={`/showtimes/${showtime.id}`}
                      className="ka-card block p-4 transition hover:border-brand-500/50">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-2xl text-white">{timeOfDay(showtime.start_time)}</span>
                        <span className="font-mono text-sm text-gold-400">{chf(showtime.price)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{showtime.auditorium.name}</p>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-600">
                          <div className={`h-full ${free === 0 ? "bg-brand-500" : "bg-emerald-500"}`}
                            style={{ width: `${total === 0 ? 0 : Math.floor(((total - free) * 100) / total)}%` }} />
                        </div>
                        <span className={`font-mono text-xs ${free === 0 ? "text-brand-400" : "text-slate-400"}`}>
                          {free === 0 ? "ausverkauft" : `${free} frei`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
