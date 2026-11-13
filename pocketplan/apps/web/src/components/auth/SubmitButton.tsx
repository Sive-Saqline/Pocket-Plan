export function SubmitButton({ busy, children }: { busy: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-text-inverse hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {busy && (
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm">
      {message}
    </p>
  );
}
