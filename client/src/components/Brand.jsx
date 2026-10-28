export function LogoMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm2 3v8h8V8H6zm10 0v2h2V8h-2zm0 4v2h2v-2h-2z" />
      </svg>
    </span>
  );
}

export function Brand({ size = "text-xl" }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display ${size} text-white`}>
        Kino<span className="text-brand-500">Arena</span>
      </span>
    </span>
  );
}

export function CrossIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" />
    </svg>
  );
}

// Rote Trennlinie unter Ueberschriften
export function Underline({ className = "mt-3" }) {
  return <div className={`${className} h-0.5 w-12 bg-brand-500`} />;
}
