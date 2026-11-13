"use client";

import { useCallback, useEffect, useState } from "react";
import { demoGroup, type Group } from "./group";

// Demo-only persistence until the database work lands; per-browser.
const STORAGE_KEY = "pocketplan.demo-group.v1";

function load(): Group {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Group;
  } catch {
    // storage unavailable or corrupt: fall back to the seed
  }
  return demoGroup;
}

export function useGroup() {
  const [group, setGroup] = useState<Group>(demoGroup);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setGroup(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    } catch {
      // non-fatal: the demo still works for this session
    }
  }, [group, hydrated]);

  const reset = useCallback(() => setGroup(demoGroup), []);

  return { group, setGroup, hydrated, reset };
}
