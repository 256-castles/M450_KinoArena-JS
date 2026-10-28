import { useFlash } from "../context/FlashContext.jsx";

// shared/_flash.html.erb
export function Flash() {
  const { flash } = useFlash();
  if (!flash) return null;

  return (
    <>
      {flash.notice && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200" role="status">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{flash.notice}</span>
        </div>
      )}

      {flash.alert && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300" role="alert">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 6a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
          </svg>
          <span>{flash.alert}</span>
        </div>
      )}
    </>
  );
}
