"use client";

import { useEffect } from "react";
import type { Category, Wallet } from "./ledger";
import { useApiData } from "./use-api-data";

const CATEGORIES_CHANGED = "pocketplan:categories-changed";

/** Tells every mounted usePersonalData to reload categories (e.g. after "+ New category"). */
export function notifyCategoriesChanged() {
  window.dispatchEvent(new Event(CATEGORIES_CHANGED));
}

/** The signed-in user's categories and wallets, with lookups by id. */
export function usePersonalData() {
  const categories = useApiData<Category[]>("/categories");
  const wallets = useApiData<Wallet[]>("/accounts");
  const reloadCategories = categories.reload;

  useEffect(() => {
    window.addEventListener(CATEGORIES_CHANGED, reloadCategories);
    return () => window.removeEventListener(CATEGORIES_CHANGED, reloadCategories);
  }, [reloadCategories]);

  return {
    categories: categories.data ?? [],
    wallets: wallets.data ?? [],
    ready: categories.data !== null && wallets.data !== null,
    error: categories.error ?? wallets.error,
    categoryById: (id: string) => categories.data?.find((c) => c.id === id),
    walletById: (id: string) => wallets.data?.find((w) => w.id === id),
    reloadWallets: wallets.reload,
    reloadCategories,
    reload: () => {
      categories.reload();
      wallets.reload();
    },
  };
}
