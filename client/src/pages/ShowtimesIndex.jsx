import { Link } from "react-router";
import { Hero } from "../components/Layout.jsx";
import { useResource } from "../hooks/useResource.js";
import { pluralize, showtimeDate } from "../lib/format.js";

// showtimes/index.html.erb – Startseite mit dem aktuellen Programm
export function ShowtimesIndex() {
  const { data } = useResource("/showtimes");
  if (!data) return null;

  return (
    <>
      <Hero>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/25 via-ink-950 to-gold-400/10" />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-20">
            <p className="ka-label text-brand-400">Spielplan &middot; {showtimeDate(new Date()).toUpperCase()}</p>
            <h1 className="mt-4 max-w-2xl text-5xl leading-tight md:text-6xl">
              Was läuft<br />
              <span className="text-brand-500">heute Abend?</span>
            </h1>
            <p className="mt-5 text-slate-400">
              {pluralize(data.showtimes_count, "Vorstellung", "Vorstellungen")} im Programm
              &middot; Echtzeit-Verfügbarkeit &middot; Sofort-Buchung
            </p>
          </div>
        </section>
      </Hero>

      {data.movies.length === 0 ? (
        <div className="ka-card p-12 text-center">
          <p className="text-slate-400">Aktuell sind keine Vorstellungen geplant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {data.movies.map((movie) => (
            <Link key={movie.id} to={`/movies/${movie.id}`} className="group block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-ink-800">
                {movie.poster_url ? (
                  <img src={movie.poster_url} alt={movie.title} loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center">
                    <span className="font-display text-lg text-slate-600">{movie.title}</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent opacity-80" />

                <span className="absolute right-2 top-2 rounded-md bg-ink-950/70 px-2 py-0.5 font-mono text-xs text-slate-300">
                  {movie.duration_label}
                </span>
              </div>

              <h2 className="mt-3 text-base leading-snug transition group-hover:text-brand-400">{movie.title}</h2>
              <p className="ka-label mt-1 normal-case tracking-normal">
                {pluralize(movie.showtimes_count, "Vorstellung", "Vorstellungen")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
