// shared/_errors.html.erb – erhaelt die "messages" einer 422-Antwort
export function ErrorList({ messages }) {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="mb-5 rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
      <p className="mb-1 font-medium">Bitte korrigiere folgende Angaben:</p>
      <ul className="list-inside list-disc space-y-0.5 text-brand-300/90">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
