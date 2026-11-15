"use client";

/** Inline "Are you sure?" box shown inside a sheet before deleting something. */
export function ConfirmDelete({
  message,
  busy,
  onCancel,
  onConfirm,
}: {
  message: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div role="alertdialog" aria-label="Confirm delete" className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3">
      <p className="text-sm font-medium">{message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-lg border border-border bg-surface font-medium focus-visible:outline-2 focus-visible:outline-accent"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="h-11 flex-1 rounded-lg bg-danger font-semibold text-white disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
