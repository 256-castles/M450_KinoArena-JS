import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../api.js";
import { Underline } from "../../components/Brand.jsx";
import { ErrorList } from "../../components/ErrorList.jsx";
import { useFlash } from "../../context/FlashContext.jsx";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { NotFound } from "../NotFound.jsx";

// admin/movies/index.html.erb – Filmverwaltung (FA-5)
export function MoviesIndex() {
  const { data, reload } = useResource("/admin/movies");
  const { flashNow } = useFlash();
  const { run } = useAction();

  async function destroy(movie) {
    if (!window.confirm(`Film "${movie.title}" wirklich löschen?`)) return;
    const result = await run(() => api(`/admin/movies/${movie.id}`, { method: "DELETE" }));
    if (!result) return;
    flashNow({ notice: result.notice });
    reload();
  }

  if (!data) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl">Filmverwaltung</h1>
          <Underline />
        </div>
        <Link to="/admin/movies/new" className="ka-btn-primary text-sm">Neuer Film</Link>
      </div>

      <div className="ka-card mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ka-table">
            <thead>
              <tr>
                <th>Film</th>
                <th>Dauer</th>
                <th>Vorstellungen</th>
                <th>Version</th>
                <th className="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {data.movies.map((movie) => (
                <tr key={movie.id} className="transition hover:bg-white/[0.02]">
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="h-12 w-8 shrink-0 overflow-hidden rounded bg-ink-700">
                        {movie.poster_url && <img src={movie.poster_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </span>
                      <span className="text-white">{movie.title}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-slate-400">{movie.duration_label}</td>
                  <td className="text-slate-400">{movie.showtimes_count}</td>
                  <td className="font-mono text-xs text-slate-600">v{movie.lock_version}</td>
                  <td>
                    <div className="flex justify-end gap-3 text-xs">
                      <Link to={`/admin/movies/${movie.id}/edit`} className="text-slate-400 underline transition hover:text-white">Bearbeiten</Link>
                      <button type="button" onClick={() => destroy(movie)} className="text-brand-400 underline transition hover:text-brand-300">
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// admin/movies/_form.html.erb
function MovieForm({ movie, submitLabel }) {
  const navigate = useNavigate();
  const { flashNext } = useFlash();
  const { run, errorMessages, pending } = useAction();
  const [form, setForm] = useState({
    title: movie?.title ?? "",
    description: movie?.description ?? "",
    duration_minutes: movie?.duration_minutes ?? "",
    poster_url: movie?.poster_url ?? ""
  });

  async function submit(event) {
    event.preventDefault();
    // NFA-2: lock_version wird mitgesendet und vom Server geprueft
    const request = movie
      ? api(`/admin/movies/${movie.id}`, { method: "PATCH", body: { movie: { ...form, lock_version: movie.lock_version } } })
      : api("/admin/movies", { method: "POST", body: { movie: form } });
    const result = await run(() => request);
    if (!result) return;

    flashNext({ notice: result.notice });
    navigate("/admin/movies");
  }

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <>
      <ErrorList messages={errorMessages} />

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="movie_title" className="ka-label normal-case tracking-normal">Titel</label>
          <input id="movie_title" type="text" value={form.title} onChange={change("title")} className="ka-input" />
        </div>

        <div>
          <label htmlFor="movie_description" className="ka-label normal-case tracking-normal">Beschreibung</label>
          <textarea id="movie_description" rows={4} value={form.description} onChange={change("description")} className="ka-input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="movie_duration_minutes" className="ka-label normal-case tracking-normal">Dauer (Minuten)</label>
            <input id="movie_duration_minutes" type="number" value={form.duration_minutes} onChange={change("duration_minutes")} className="ka-input" />
          </div>

          <div>
            <label htmlFor="movie_poster_url" className="ka-label normal-case tracking-normal">Poster-URL</label>
            <input id="movie_poster_url" type="url" value={form.poster_url} onChange={change("poster_url")} placeholder="https://…" className="ka-input" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="ka-btn-primary">{submitLabel}</button>
          <Link to="/admin/movies" className="ka-btn-ghost">Abbrechen</Link>
        </div>
      </form>
    </>
  );
}

// admin/movies/new.html.erb
export function MovieNew() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="ka-card p-8">
        <h1 className="text-2xl">Neuer Film</h1>
        <Underline className="mt-2 mb-6" />
        <MovieForm submitLabel="Film anlegen" />
      </div>
    </div>
  );
}

// admin/movies/edit.html.erb
export function MovieEdit() {
  const { id } = useParams();
  const { data, notFound } = useResource(`/admin/movies/${id}`);
  if (notFound) return <NotFound />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="ka-card p-8">
        <h1 className="text-2xl">Film bearbeiten</h1>
        <Underline className="mt-2 mb-6" />
        <MovieForm key={data.movie.id} movie={data.movie} submitLabel="Änderungen speichern" />
      </div>
    </div>
  );
}
