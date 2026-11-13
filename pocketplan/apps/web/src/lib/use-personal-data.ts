"use client";

import type { Category, Wallet } from "./ledger";
import { useApiData } from "./use-api-data";

/** The signed-in user's categories and wallets, with lookups by id. */
export function usePersonalData() {
  const categories = useApiData<Category[]>("/categories");
  const wallets = useApiData<Wallet[]>("/accounts");
  return {
    categories: categories.data ?? [],
    wallets: wallets.data ?? [],
    ready: categories.data !== null && wallets.data !== null,
    error: categories.error ?? wallets.error,
    categoryById: (id: string) => categories.data?.find((c) => c.id === id),
    walletById: (id: string) => wallets.data?.find((w) => w.id === id),
    reloadWallets: wallets.reload,
    reload: () => {
      categories.reload();
      wallets.reload();
    },
  };
}
