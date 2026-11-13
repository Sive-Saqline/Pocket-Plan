"use client";

import { useCallback, useEffect, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);
  const show = useCallback((m: string) => setMessage(m), []);
  return { message, show };
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-36 z-30 flex justify-center lg:bottom-10 lg:left-64">
      {message && (
        <p className="max-w-sm rounded-lg bg-text px-4 py-3 text-sm text-surface shadow-lg">{message}</p>
      )}
    </div>
  );
}
