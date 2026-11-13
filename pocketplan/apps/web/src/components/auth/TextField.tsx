"use client";

import { useState, type InputHTMLAttributes } from "react";

export function TextField({
  id,
  label,
  hint,
  error,
  type = "text",
  ...input
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          className={`h-12 w-full rounded-lg border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger ${isPassword ? "pr-16" : ""}`}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="absolute inset-y-1 right-1 rounded-md px-3 text-sm font-medium text-accent hover:bg-surface-muted"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-sm text-text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
