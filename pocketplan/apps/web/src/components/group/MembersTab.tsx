"use client";

import { useState, type FormEvent } from "react";
import type { Group } from "@/lib/group";
import { Avatar } from "./Avatar";
import { Card } from "./Card";

export function MembersTab({
  group,
  onAdd,
  onRemove,
}: {
  group: Group;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const involved = (id: string) =>
    group.expenses.some((e) => e.paidBy === id || e.participants.includes(id)) ||
    group.settlements.some((s) => s.from === id || s.to === id);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name.");
    if (group.members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError(`${trimmed} is already in this group.`);
    }
    onAdd(trimmed);
    setName("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <Card title={`${group.members.length} members`}>
        <ul className="divide-y divide-border">
          {group.members.map((m, i) => {
            const locked = involved(m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.name} index={i} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  {locked && (
                    <p className="text-sm text-text-muted">Has expenses in this group</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  disabled={locked || group.members.length === 1}
                  title={locked ? "Members with expenses or settlements can't be removed" : undefined}
                  className="h-9 rounded-lg px-3 text-sm font-medium text-danger hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Add a member">
        <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor="member-name" className="sr-only">
              Name
            </label>
            <input
              id="member-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Name, e.g. Arif"
              maxLength={40}
              aria-invalid={!!error}
              aria-describedby={error ? "member-name-error" : undefined}
              className="h-12 w-full rounded-lg border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger"
            />
            {error && (
              <p id="member-name-error" className="mt-1 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="h-12 rounded-lg bg-accent px-5 font-semibold text-text-inverse hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Add
          </button>
        </form>
      </Card>
    </div>
  );
}
