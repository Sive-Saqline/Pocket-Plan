import { randomUUID } from 'node:crypto';
import { SAVINGS_KEY, UserLedger } from './ledger.types';

// PRD §6.3 defaults. `icon` is a key the web app maps to an icon
// (apps/web/src/components/ui/icons.tsx); older accounts may still hold emojis.
// In Supabase the same defaults are created by the on_auth_user_created
// trigger (prisma/migrations/*_auth_users_link); newLedger() mirrors it for
// the file-based store the API tests use.
const DEFAULT_CATEGORIES: [string, string][] = [
  ['Food', 'food'],
  ['Transport', 'transport'],
  ['Bills', 'bills'],
  ['Shopping', 'shopping'],
  ['Health', 'health'],
  ['Education', 'education'],
  ['Entertainment', 'entertainment'],
  ['Savings', 'savings'],
  ['Miscellaneous', 'misc'],
];

export function newLedger(now = new Date().toISOString()): UserLedger {
  return {
    categories: DEFAULT_CATEGORIES.map(([name, icon]) => ({
      id: randomUUID(),
      name,
      icon,
      // Mirrors the sign-up trigger (migration *_savings_category).
      systemKey: icon === SAVINGS_KEY ? SAVINGS_KEY : null,
      createdAt: now,
    })),
    accounts: [
      {
        id: randomUUID(),
        name: 'Cash',
        type: 'CASH',
        balance: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenses: [],
    budgets: [],
    recurring: [],
    savings: [],
  };
}

export function isoDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
