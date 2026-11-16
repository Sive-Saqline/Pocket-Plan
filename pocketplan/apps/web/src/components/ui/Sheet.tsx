"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseButton } from "./CloseButton";

/**
 * Bottom sheet on phones, centred dialog from `sm` up: the same frame the
 * other sheets use (ExpenseSheet, WalletSheet). Uses <dialog> for focus
 * trapping and Escape-to-close.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = `sheet-${title.replace(/\W+/g, "-").toLowerCase()}`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={id}
      className={`m-auto mb-0 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-0 text-text sm:mb-auto sm:rounded-2xl ${
        wide ? "max-w-2xl" : "max-w-lg"
      }`}
    >
      {open && (
        <div className="flex flex-col gap-5 p-4 sm:p-6">
          <header className="flex items-center justify-between gap-2">
            <h2 id={id} className="text-xl font-semibold">
              {title}
            </h2>
            <CloseButton onClick={onClose} />
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Red "couldn't do it" box used at the top of forms. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm">
      {message}
    </p>
  );
}
