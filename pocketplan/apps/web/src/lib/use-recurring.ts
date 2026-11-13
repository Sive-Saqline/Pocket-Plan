"use client";

import { useEffect } from "react";
import { isoDate } from "./dates";
import type { RecurringExpense } from "./ledger";
import { useApiData } from "./use-api-data";

const CHANGED = "pocketplan:recurring-changed";

/** Tell every mounted useRecurring (e.g. the More tab's dot) to refetch. */
export function notifyRecurringChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

/** The user's recurring templates, with "due" computed for their local today. */
export function useRecurring() {
  const list = useApiData<RecurringExpense[]>(`/recurring-expenses?today=${isoDate()}`);
  const { reload } = list;
  useEffect(() => {
    window.addEventListener(CHANGED, reload);
    return () => window.removeEventListener(CHANGED, reload);
  }, [reload]);
  const due = (list.data ?? []).filter((r) => r.due);
  return { ...list, due };
}
