
/* ═══════════════════════════════════════════════════════════════
   POCKETPLAN v4 — Interactive Prototype
   Single-file SPA. All state is held in memory + localStorage.
   Aligned to PocketPlan-PRD-v4.md (Option D: collaborative + AI).
   ═══════════════════════════════════════════════════════════════ */


/* Icons */
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9.5z"/></svg>',
  expenses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  groups: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>',
  wand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>',
  calculator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><line x1="8" y1="14" x2="8" y2="18"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="12" y1="10" x2="12" y2="10"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>',
  creditCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  category: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17a2 2 0 1 1-2-2M5 17V9l2-5h10l2 5v8"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>',
  shopping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  education: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  entertainment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
  savings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h12v-3.5c2-1.5 2-2.7 2-4.5 0-3.6-3-5.6-6-5.6"/><path d="M16 11h.01"/><circle cx="16" cy="11" r="1"/></svg>',
  misc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>',
  grocery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l2 13h12l2-9H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>',
  homeLarge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9.5z"/></svg>',
  plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  cake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16h16"/><path d="M12 11V7"/><path d="M9 7h6l-3-5z"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  signOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  google: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1H12v2.97h5.34c-.23 1.25-1.66 3.67-5.34 3.67-3.22 0-5.84-2.66-5.84-5.95s2.62-5.95 5.84-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.48C16.84 3.4 14.62 2.4 12 2.4 6.83 2.4 2.66 6.57 2.66 11.74s4.17 9.34 9.34 9.34c5.39 0 8.96-3.78 8.96-9.12 0-.61-.07-1.08-.21-1.86z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.03-.81.86-2.13 1.51-3.21 1.43-.13-1.11.43-2.27 1.18-3.06.84-.91 2.27-1.55 3.24-1.4zM20.4 17.39c-.59 1.36-.87 1.97-1.62 3.17-1.05 1.67-2.53 3.74-4.36 3.76-1.63.02-2.05-1.06-4.27-1.05-2.22.02-2.68 1.07-4.31 1.06-1.83-.02-3.24-1.89-4.29-3.56C-1.42 16.99-1.7 11.5 1.85 8.31c1.25-1.12 2.78-1.77 4.27-1.77 1.7 0 2.77 1.04 4.18 1.04 1.36 0 2.19-1.04 4.16-1.04 1.49 0 3.07.81 4.19 2.22-3.68 2.02-3.08 7.27.75 8.63z"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  signal: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="14" width="3" height="6" rx="0.5"/><rect x="7" y="10" width="3" height="10" rx="0.5"/><rect x="12" y="6" width="3" height="14" rx="0.5"/><rect x="17" y="2" width="3" height="18" rx="0.5"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><rect x="4" y="9" width="14" height="6" rx="1" fill="currentColor" stroke="none"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
};
function icon(name) {
  const raw = ICON[name];
  if (!raw) return '';
  /* Inject explicit width/height so SVG renders even without parent CSS context.
     1em scales with parent font-size; combined with `stroke="currentColor"`,
     icons inherit color from their container. */
  return raw.replace('<svg ', '<svg width="1em" height="1em" ');
}


/* ── Seed data ────────────────────────────────────────────── */
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const THIS_MONTH = NOW.getMonth();
const THIS_YEAR = NOW.getFullYear();
function daysAgo(n) {
  const d = new Date(NOW); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function nextDue(intervalDays) {
  const d = new Date(NOW); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const SEED = {
  /* auth flow state */
  authScreen: 'landing',
  authenticated: true,

  currentTab: 'home',
  subScreen: null,
  activeGroupId: null,
  showAddSheet: false,
  showConfirmSheet: false,
  confirmRecurringId: null,
  showInsights: false,
  insightScope: 'personal',
  reportsTab: 'category',
  reportsScope: 'personal',

  user: { name: 'Saqline', email: 'saqline@example.com', avatarLetter: 'S' },

  categories: [
    { id: 'food',     name: 'Food',        icon: 'food' },
    { id: 'transport',name: 'Transport',   icon: 'car' },
    { id: 'bills',    name: 'Bills',       icon: 'receipt' },
    { id: 'shopping', name: 'Shopping',    icon: 'shopping' },
    { id: 'health',   name: 'Health',      icon: 'health' },
    { id: 'edu',      name: 'Education',   icon: 'education' },
    { id: 'fun',      name: 'Entertainment',icon:'entertainment' },
    { id: 'savings',  name: 'Savings',     icon: 'savings' },
    { id: 'misc',     name: 'Misc',        icon: 'misc' },
    { id: 'grocery',  name: 'Grocery',     icon: 'grocery' },
  ],

  accounts: [
    { id: 'cash',     name: 'Cash',       type: 'Cash',     icon: 'wallet' },
    { id: 'bkash',    name: 'bKash',      type: 'Mobile Wallet', icon: 'phone' },
    { id: 'city',     name: 'City Bank',  type: 'Bank',     icon: 'bank' },
    { id: 'card',     name: 'Card',       type: 'Card',     icon: 'creditCard' },
  ],

  groups: [
    {
      id: 'g-mess', name: 'Mess — Bashundhara', icon: 'homeLarge',
      members: [
        { userId: 'u-saql', name: 'Saqline', letter: 'S', color: 'var(--accent)' },
        { userId: 'u-sabb', name: 'Sabbir',  letter: 'B', color: '#7A5C3A' },
        { userId: 'u-nadm', name: 'Nadim',   letter: 'N', color: '#5C7A3A' },
        { userId: 'u-tahm', name: 'Tahmid',  letter: 'T', color: '#7A3A5C' },
      ],
      monthlyBudget: 20000,
    },
    {
      id: 'g-trip', name: 'Sajek Trip 2026', icon: 'plane',
      members: [
        { userId: 'u-saql', name: 'Saqline', letter: 'S', color: 'var(--accent)' },
        { userId: 'u-sabb', name: 'Sabbir',  letter: 'B', color: '#7A5C3A' },
        { userId: 'u-nadm', name: 'Nadim',   letter: 'N', color: '#5C7A3A' },
        { userId: 'u-tahm', name: 'Tahmid',  letter: 'T', color: '#7A3A5C' },
        { userId: 'u-anwr', name: 'Anwar',   letter: 'A', color: '#3A5C7A' },
        { userId: 'u-mahm', name: 'Mahmud',  letter: 'M', color: '#5C3A7A' },
      ],
      monthlyBudget: null,
    },
    {
      id: 'g-subs', name: 'Home Subscriptions', icon: 'film',
      members: [
        { userId: 'u-saql', name: 'Saqline', letter: 'S', color: 'var(--accent)' },
        { userId: 'u-sabb', name: 'Sabbir',  letter: 'B', color: '#7A5C3A' },
        { userId: 'u-nadm', name: 'Nadim',   letter: 'N', color: '#5C7A3A' },
      ],
      monthlyBudget: 1500,
    },
    {
      id: 'g-reun', name: 'Reunion Dinner', icon: 'cake',
      members: [
        { userId: 'u-saql', name: 'Saqline', letter: 'S', color: 'var(--accent)' },
        { userId: 'u-sabb', name: 'Sabbir',  letter: 'B', color: '#7A5C3A' },
        { userId: 'u-nadm', name: 'Nadim',   letter: 'N', color: '#5C7A3A' },
        { userId: 'u-tahm', name: 'Tahmid',  letter: 'T', color: '#7A3A5C' },
      ],
      monthlyBudget: null,
    },
  ],

  expenses: [
    { id: 'e1', groupId: null,       amount: 120,  categoryId: 'food',      accountId: 'cash',  date: TODAY,         description: 'Lunch at canteen' },
    { id: 'e2', groupId: null,       amount: 40,   categoryId: 'transport', accountId: 'cash',  date: TODAY,         description: 'Bus home' },
    { id: 'e3', groupId: null,       amount: 140,  categoryId: 'shopping',  accountId: 'bkash', date: TODAY,         description: 'Notebook' },
    { id: 'e4', groupId: null,       amount: 1200, categoryId: 'bills',     accountId: 'city',  date: daysAgo(1),     description: 'Wi-Fi - Sep', paidBy: 'u-saql' },
    { id: 'e5', groupId: null,       amount: 220,  categoryId: 'food',      accountId: 'bkash', date: daysAgo(1),     description: 'Dinner with friends' },
    { id: 'e6', groupId: null,       amount: 85,   categoryId: 'transport', accountId: 'bkash', date: daysAgo(3),     description: 'Pathao to Gulshan' },
    { id: 'e7', groupId: null,       amount: 3200, categoryId: 'shopping',  accountId: 'city',  date: daysAgo(5),     description: 'Weekly shop at Agora' },
    { id: 'e8', groupId: null,       amount: 340,  categoryId: 'health',    accountId: 'cash',  date: daysAgo(5),     description: 'Pharmacy' },
    { id: 'e9', groupId: null,       amount: 6000, categoryId: 'savings',   accountId: 'city',  date: daysAgo(7),     description: 'Monthly savings' },

    { id: 'e10', groupId: 'g-mess', paidBy: 'u-saql', amount: 1200, categoryId: 'bills',    accountId: 'cash', date: daysAgo(1), description: 'Wi-Fi - September' },
    { id: 'e11', groupId: 'g-mess', paidBy: 'u-nadm', amount: 2640, categoryId: 'grocery',  accountId: 'bkash',date: daysAgo(2), description: 'Grocery - Shwapno' },
    { id: 'e12', groupId: 'g-mess', paidBy: 'u-tahm', amount: 1840, categoryId: 'bills',    accountId: 'city', date: daysAgo(3), description: 'Electricity - Sep' },
    { id: 'e13', groupId: 'g-mess', paidBy: 'u-sabb', amount: 800,  categoryId: 'food',     accountId: 'cash', date: daysAgo(4), description: 'Cook - Sunday lunch' },

    { id: 'e14', groupId: 'g-trip', paidBy: 'u-saql', amount: 12000, categoryId: 'transport', accountId: 'city', date: daysAgo(8),  description: 'Microbus rental' },
    { id: 'e15', groupId: 'g-trip', paidBy: 'u-anwr', amount: 8400,  categoryId: 'food',      accountId: 'bkash',date: daysAgo(8),  description: 'Day 1 dinner' },
    { id: 'e16', groupId: 'g-trip', paidBy: 'u-saql', amount: 5200,  categoryId: 'misc',      accountId: 'cash', date: daysAgo(7),  description: 'Resort booking' },
    { id: 'e17', groupId: 'g-trip', paidBy: 'u-tahm', amount: 3000,  categoryId: 'fun',       accountId: 'bkash',date: daysAgo(7),  description: 'Bonfire night' },

    { id: 'e18', groupId: 'g-subs', paidBy: 'u-saql', amount: 800, categoryId: 'fun', accountId: 'city', date: daysAgo(10), description: 'Netflix - Sep' },
    { id: 'e19', groupId: 'g-subs', paidBy: 'u-nadm', amount: 650, categoryId: 'fun', accountId: 'bkash',date: daysAgo(10), description: 'Spotify - Sep' },

    { id: 'e20', groupId: 'g-reun', paidBy: 'u-saql', amount: 8800, categoryId: 'food', accountId: 'city', date: daysAgo(28), description: 'Reunion dinner total', settled: true },
  ],

  recurring: [
    { id: 'r1', groupId: null, accountId: 'city', categoryId: 'bills', amount: 1200, description: 'Internet - Oct', frequency: 'Monthly', nextDueDate: nextDue(1), isActive: true },
    { id: 'r2', groupId: 'g-subs', accountId: 'city', categoryId: 'fun', amount: 800, description: 'Netflix - Oct', frequency: 'Monthly', nextDueDate: nextDue(1), isActive: true },
    { id: 'r3', groupId: null, accountId: 'city', categoryId: 'edu', amount: 4500, description: 'Course subscription', frequency: 'Monthly', nextDueDate: daysAgo(-12), isActive: true },
  ],

  budgets: [
    { categoryId: 'food',      planned: 12000 },
    { categoryId: 'transport', planned: 5000  },
    { categoryId: 'bills',     planned: 5000  },
    { categoryId: 'shopping',  planned: 3000  },
    { categoryId: 'health',    planned: 2000  },
    { categoryId: 'fun',       planned: 1500  },
    { categoryId: 'savings',   planned: 6000  },
  ],

  savingsGoal: { target: 6000 },

  settlements: [
    { id: 's1', groupId: 'g-reun', fromUserId: 'u-sabb', toUserId: 'u-saql', amount: 1760, settledAt: daysAgo(20) },
    { id: 's2', groupId: 'g-reun', fromUserId: 'u-nadm', toUserId: 'u-saql', amount: 1760, settledAt: daysAgo(20) },
    { id: 's3', groupId: 'g-reun', fromUserId: 'u-tahm', toUserId: 'u-saql', amount: 1760, settledAt: daysAgo(20) },
  ],

  aiToggles: {
    nlEntry: true, autoCat: true, anomaly: true, pattern: false, insights: true,
  },

  parsed: null,
  parsing: false,
};

const STORAGE_KEY = 'pocketplan_v4_state';
let S = loadState();
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(SEED);
    const saved = JSON.parse(raw);
    return Object.assign(clone(SEED), saved, {
      user: Object.assign({}, SEED.user, saved.user || {}),
      aiToggles: Object.assign({}, SEED.aiToggles, saved.aiToggles || {}),
    });
  } catch (e) { return clone(SEED); }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) {}
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function uid() { return 'x' + Math.random().toString(36).slice(2, 9); }

/* ── Tiny helpers ──────────────────────────────────────────── */
function bdt(n) { return '\u09F3' + Math.round(n).toLocaleString('en-US'); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function findCat(id) { return S.categories.find(c => c.id === id) || { name: '?', icon: 'misc' }; }
function findAcc(id) { return S.accounts.find(a => a.id === id) || { name: '?' }; }
function findGroup(id) { return S.groups.find(g => g.id === id); }
function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  return d.getMonth() === THIS_MONTH && d.getFullYear() === THIS_YEAR;
}
function fmtDate(d) {
  const dt = new Date(d);
  if (d === TODAY) return 'Today';
  const y = new Date(TODAY); y.setDate(y.getDate() - 1);
  if (d === y.toISOString().slice(0,10)) return 'Yesterday';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function dueRecurring() {
  return S.recurring.filter(r => r.isActive && r.nextDueDate <= TODAY);
}
function greeting() {
  const h = NOW.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ── Balance + settlement algorithm (PRD §9) ──────────────── */
function groupBalances(groupId) {
  const g = findGroup(groupId); if (!g) return {};
  const balances = {};
  g.members.forEach(m => balances[m.userId] = 0);

  S.expenses.filter(e => e.groupId === groupId).forEach(e => {
    const payer = e.paidBy || 'u-saql';
    const participants = g.members.map(m => m.userId);
    const share = e.amount / participants.length;
    balances[payer] = (balances[payer] || 0) + e.amount;
    participants.forEach(uid => {
      balances[uid] = (balances[uid] || 0) - share;
    });
  });
  S.settlements.filter(s => s.groupId === groupId).forEach(s => {
    balances[s.fromUserId] = (balances[s.fromUserId] || 0) + s.amount;
    balances[s.toUserId]   = (balances[s.toUserId]   || 0) - s.amount;
  });
  return balances;
}
function simplifyDebts(balances) {
  const debtors  = [];
  const creditors = [];
  Object.keys(balances).forEach(k => {
    const v = Math.round(balances[k]);
    if (v < -0.5) debtors.push({ id: k, amount: -v });
    else if (v > 0.5) creditors.push({ id: k, amount: v });
  });
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const out = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amount -= pay; if (debtors[i].amount < 0.5) i++;
    creditors[j].amount -= pay; if (creditors[j].amount < 0.5) j++;
  }
  return out;
}


/* ── Actions ──────────────────────────────────────────────── */
function setTab(tab) {
  S.currentTab = tab;
  S.subScreen = null;
  S.activeGroupId = null;
  S.showAddSheet = false;
  S.showConfirmSheet = false;
  saveState(); render();
}
function openGroup(id) { S.subScreen = 'groupDetail'; S.activeGroupId = id; saveState(); render(); }
function backToGroups() { S.subScreen = null; S.activeGroupId = null; saveState(); render(); }
function openAdd() { S.showAddSheet = true; S.parsed = null; S.parsing = false; saveState(); render(); }
function closeAdd() { S.showAddSheet = false; S.parsed = null; S.parsing = false; saveState(); render(); }
function openConfirm(id) { S.showConfirmSheet = true; S.confirmRecurringId = id; saveState(); render(); }
function closeConfirm() { S.showConfirmSheet = false; S.confirmRecurringId = null; saveState(); render(); }
function openInsights() { S.showInsights = true; saveState(); render(); }
function closeInsights() { S.showInsights = false; saveState(); render(); }
function setInsightScope(scope) { S.insightScope = scope; saveState(); render(); }
function setReportsTab(t) { S.reportsTab = t; saveState(); render(); }
function setReportsScope(s) { S.reportsScope = s; saveState(); render(); }
function toggleAi(key) { S.aiToggles[key] = !S.aiToggles[key]; saveState(); render(); }

function goAuth(screen) { S.authScreen = screen; saveState(); render(); }
function login() {
  S.authenticated = true; S.authScreen = 'landing';
  toast('Welcome back, ' + S.user.name);
  saveState(); render();
}
function register() {
  S.authenticated = true; S.authScreen = 'landing';
  toast('Account created');
  saveState(); render();
}
function signOut() {
  S.authenticated = false; S.authScreen = 'landing';
  S.currentTab = 'home'; S.subScreen = null; S.activeGroupId = null;
  toast('Signed out');
  saveState(); render();
}

function settle(groupId, from, to, amount) {
  S.settlements.push({
    id: uid(), groupId, fromUserId: from, toUserId: to, amount, settledAt: TODAY,
  });
  toast('Settlement recorded');
  saveState(); render();
}

function parseExpense() {
  const text = document.getElementById('nlText').value.trim();
  if (!text) return;
  S.parsing = true; saveState(); render();
  setTimeout(() => {
    const amountMatch = text.match(/(\d{2,6})/);
    const amount = amountMatch ? Number(amountMatch[1]) : 0;
    let categoryId = 'misc';
    let description = text;
    const lc = text.toLowerCase();
    if (/wifi|internet|bill|electric/.test(lc)) { categoryId = 'bills'; description = 'Wi-Fi - Internet'; }
    else if (/grocery|groceries|shwapno|agora/.test(lc)) { categoryId = 'grocery'; description = 'Grocery run'; }
    else if (/lunch|dinner|food|coffee|restaurant/.test(lc)) { categoryId = 'food'; description = 'Meal'; }
    else if (/uber|pathao|bus|taxi|transport/.test(lc)) { categoryId = 'transport'; description = 'Transport'; }
    else if (/netflix|spotify|subscription/.test(lc)) { categoryId = 'fun'; description = 'Subscription'; }
    else if (/shop|notebook|clothes/.test(lc)) { categoryId = 'shopping'; description = 'Shopping'; }
    let groupId = null;
    if (/mess|g-mess/i.test(text)) groupId = 'g-mess';
    else if (/trip|sajek|g-trip/i.test(text)) groupId = 'g-trip';
    else if (/subscription|netflix|g-subs/i.test(text)) groupId = 'g-subs';
    let accountId = 'cash';
    if (/bkash/i.test(text)) accountId = 'bkash';
    else if (/city|bank/i.test(text)) accountId = 'city';
    else if (/card/i.test(text)) accountId = 'card';

    S.parsed = { amount, categoryId, description, accountId, groupId, splitType: groupId ? 'equal' : 'just-me', _raw: text };
    S.parsing = false;
    saveState(); render();
  }, 700);
}

function confirmParsed() {
  if (!S.parsed) return;
  const p = S.parsed;
  const amount = Number(p.amount) || 0;
  if (amount <= 0) { toast('Enter a valid amount'); return; }
  const expense = {
    id: uid(),
    groupId: p.groupId || null,
    paidBy: 'u-saql',
    amount,
    categoryId: p.categoryId,
    accountId: p.accountId,
    date: TODAY,
    description: p.description || 'Expense',
  };
  S.expenses.unshift(expense);
  toast('Expense saved');
  closeAdd();
}

function confirmRecurring() {
  const r = S.recurring.find(x => x.id === S.confirmRecurringId);
  if (!r) { closeConfirm(); return; }
  S.expenses.unshift({
    id: uid(),
    groupId: r.groupId || null,
    paidBy: 'u-saql',
    amount: Number(r.amount),
    categoryId: r.categoryId,
    accountId: r.accountId,
    date: TODAY,
    description: r.description,
  });
  const d = new Date(r.nextDueDate);
  d.setMonth(d.getMonth() + 1);
  r.nextDueDate = d.toISOString().slice(0, 10);
  toast('Recurring expense confirmed');
  closeConfirm();
}
function skipRecurring() {
  const r = S.recurring.find(x => x.id === S.confirmRecurringId);
  if (r) {
    const d = new Date(r.nextDueDate);
    d.setDate(d.getDate() + 1);
    r.nextDueDate = d.toISOString().slice(0, 10);
  }
  toast('Skipped for today');
  closeConfirm();
}

function convertPatternToTemplate() {
  S.recurring.push({
    id: uid(), groupId: null, accountId: 'city', categoryId: 'bills',
    amount: 1200, description: 'Internet - recurring', frequency: 'Monthly',
    nextDueDate: daysAgo(-30), isActive: true,
  });
  toast('Recurring template created');
  closeInsights();
}

let toastTimer;
function toast(msg) {
  clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('phone').appendChild(el);
  toastTimer = setTimeout(() => el.remove(), 1800);
}

/* ── Renderers ───────────────────────────────────────────── */
function render() {
  const phone = document.getElementById('phone');
  phone.innerHTML = renderPhone();
  bindEvents();
}
function renderPhone() {
  if (!S.authenticated) {
    if (S.authScreen === 'login') return renderLogin();
    if (S.authScreen === 'register') return renderRegister();
    return renderLanding();
  }
  return `
    <div class="statusbar"><span>9:41</span><span class="statusbar-icons">${icon("signal")}${icon("wifi")}${icon("battery")}</span></div>
    ${renderAppbar()}
    <div class="content" id="content">${renderContent()}</div>
    ${renderTabbar()}
    ${renderFab()}
    ${S.showAddSheet ? renderAddSheet() : ''}
    ${S.showConfirmSheet ? renderConfirmSheet() : ''}
    ${S.showInsights ? renderInsights() : ''}
  `;
}

/* ── Landing / Login / Register ───────────────────────────── */
function renderLanding() {
  return `
    <div class="statusbar"><span>9:41</span><span class="statusbar-icons">${icon("signal")}${icon("wifi")}${icon("battery")}</span></div>
    <div class="landing">
      <div class="brand">${icon('wallet')} <span>PocketPlan</span></div>

      <div class="hero-art">${icon('rocket')}</div>

      <h1>Track every taka,<br/>alone or together.</h1>
      <p class="lede">Personal budgets, shared expenses with friends, and an AI layer that makes logging effortless.</p>

      <div class="features">
        <div class="feature">
          <div class="ico">${icon('home')}</div>
          <strong>Personal</strong>
          <span>Budgets, recurring, savings - all in one place.</span>
        </div>
        <div class="feature">
          <div class="ico">${icon('groups')}</div>
          <strong>Together</strong>
          <span>Split expenses with mess, trips, and families.</span>
        </div>
        <div class="feature">
          <div class="ico">${icon('sparkles')}</div>
          <strong>AI assist</strong>
          <span>Type it, we fill the form. Edit anything before saving.</span>
        </div>
        <div class="feature">
          <div class="ico">${icon('check')}</div>
          <strong>Settle up</strong>
          <span>Minimum payments, computed live. No spreadsheets.</span>
        </div>
      </div>

      <div class="cta">
        <button class="btn btn-primary" onclick="goAuth('register')">I want to start</button>
        <button class="btn btn-secondary" onclick="goAuth('login')">I already have an account</button>
        <div class="terms">By continuing you agree to our Terms &amp; Privacy.</div>
      </div>
    </div>
  `;
}

function renderLogin() {
  return `
    <div class="statusbar"><span>9:41</span><span class="statusbar-icons">${icon("signal")}${icon("wifi")}${icon("battery")}</span></div>
    <div class="auth">
      <div class="head">
        <div class="brand">${icon('wallet')} <span>PocketPlan</span></div>
      </div>
      <div class="head" style="margin-bottom: var(--s3);">
        <div>
          <h2>Welcome back</h2>
          <p>Sign in to continue tracking your expenses.</p>
        </div>
      </div>

      <div class="auth-form">
        <div>
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value="${esc(S.user.email)}" />
        </div>
        <div>
          <label>Password</label>
          <input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
        </div>

        <div class="row-line">
          <label class="checkbox"><input type="checkbox" /> Remember me</label>
          <a onclick="toast('Password reset email sent')">Forgot?</a>
        </div>

        <button class="submit" onclick="login()">Sign in</button>

        <div class="divider">or continue with</div>
        <div class="social">
          <button onclick="login()">${icon('google')} Google</button>
          <button onclick="login()">${icon('apple')} Apple</button>
        </div>

        <div class="alt">
          New here? <a onclick="goAuth('register')">Create an account</a>
        </div>
        <div class="alt" style="margin-top: var(--s2);">
          <a onclick="goAuth('landing')" class="back-link">${icon("back")} Back</a>
        </div>
      </div>
    </div>
  `;
}

function renderRegister() {
  return `
    <div class="statusbar"><span>9:41</span><span class="statusbar-icons">${icon("signal")}${icon("wifi")}${icon("battery")}</span></div>
    <div class="auth">
      <div class="head">
        <div class="brand">${icon('wallet')} <span>PocketPlan</span></div>
      </div>
      <div class="head" style="margin-bottom: var(--s3);">
        <div>
          <h2>Let\u2019s get started</h2>
          <p>Create an account in under a minute.</p>
        </div>
      </div>

      <div class="auth-form">
        <div>
          <label>Full name</label>
          <input type="text" placeholder="Your name" value="${esc(S.user.name)}" />
        </div>
        <div>
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value="${esc(S.user.email)}" />
        </div>
        <div>
          <label>Password</label>
          <input type="password" placeholder="At least 8 characters" />
        </div>

        <label class="checkbox"><input type="checkbox" /> I agree to the Terms &amp; Privacy Policy</label>

        <button class="submit" onclick="register()">Create account</button>

        <div class="divider">or continue with</div>
        <div class="social">
          <button onclick="register()">${icon('google')} Google</button>
          <button onclick="register()">${icon('apple')} Apple</button>
        </div>

        <div class="alt">
          Already have an account? <a onclick="goAuth('login')">Sign in</a>
        </div>
        <div class="alt" style="margin-top: var(--s2);">
          <a onclick="goAuth('landing')" class="back-link">${icon("back")} Back</a>
        </div>
      </div>
    </div>
  `;
}

function renderAppbar() {
  if (S.currentTab === 'home') {
    return `
      <div class="appbar">
        <div class="title-stack">
          <div class="greet">${greeting()},</div>
          <h1>${esc(S.user.name)}</h1>
        </div>
        <button class="avatar" onclick="openInsights()" aria-label="Open insights">${esc(S.user.avatarLetter)}</button>
      </div>
    `;
  }
  if (S.currentTab === 'expenses') {
    return `<div class="appbar"><h1 style="flex:1;">Expenses</h1></div>`;
  }
  if (S.currentTab === 'groups') {
    if (S.subScreen === 'groupDetail' && S.activeGroupId) {
      const g = findGroup(S.activeGroupId);
      return `
        <div class="appbar">
          <button class="back" onclick="backToGroups()" aria-label="Back">${icon('back')}</button>
          <h1 style="flex:1;">${esc(g.name)}</h1>
          <button class="icon-btn" onclick="toast('More options coming soon')" aria-label="More">${icon('more')}</button>
        </div>
      `;
    }
    return `
      <div class="appbar">
        <h1 style="flex:1;">Groups</h1>
        <button class="icon-btn" onclick="toast('Create group flow coming soon')" aria-label="Create">${icon('plus')}</button>
      </div>
    `;
  }
  if (S.currentTab === 'reports') {
    return `
      <div class="appbar">
        <h1 style="flex:1;">Reports</h1>
        <button class="icon-btn sm" onclick="setReportsScope(S.reportsScope === 'personal' ? 'group' : 'personal')">${S.reportsScope === 'personal' ? 'Personal' : 'Group'}</button>
      </div>
    `;
  }
  if (S.currentTab === 'more') {
    return `<div class="appbar"><h1 style="flex:1;">Profile</h1></div>`;
  }
  return `<div class="appbar"><h1>PocketPlan</h1></div>`;
}

function renderContent() {
  if (S.currentTab === 'home') return renderHome();
  if (S.currentTab === 'expenses') return renderExpenses();
  if (S.currentTab === 'groups') {
    if (S.subScreen === 'groupDetail') return renderGroupDetail();
    return renderGroupsList();
  }
  if (S.currentTab === 'reports') return renderReports();
  if (S.currentTab === 'more') return renderProfile();
  return '';
}


/* ── Home ─────────────────────────────────────────────────── */
function renderHome() {
  const due = dueRecurring();
  const personalThisMonth = S.expenses.filter(e => !e.groupId && isThisMonth(e.date));
  const spent = personalThisMonth.reduce((a, b) => a + b.amount, 0);
  const planned = S.budgets.reduce((a, b) => a + b.planned, 0);
  const pct = planned ? Math.min(100, Math.round(spent / planned * 100)) : 0;

  let totalOwed = 0, totalOwes = 0;
  S.groups.forEach(g => {
    const b = groupBalances(g.id);
    const mine = b['u-saql'] || 0;
    if (mine > 0.5) totalOwed += mine;
    else if (mine < -0.5) totalOwes += -mine;
  });

  const recent = S.expenses.filter(e => !e.groupId).slice(0, 5);

  return `
    ${due.length ? `
      <button class="due-banner" onclick="openConfirm('${due[0].id}')" style="border:0;width:100%;text-align:left;font-family:inherit;">
        <div class="ico">${icon('bell')}</div>
        <div class="body">
          <strong>${due.length} recurring expense${due.length>1?'s':''} due</strong>
          <span>Tap to review and confirm</span>
        </div>
        ${icon('chevron')}
      </button>
    ` : ''}

    <button class="insights" onclick="openInsights()">
      <span class="badge">${icon('sparkles')} AI insights</span>
      <h3>Your ${new Date(THIS_YEAR, THIS_MONTH).toLocaleString('en-US', { month: 'long' })} so far</h3>
      <p>Spent <strong style="font-family:var(--mono);">${bdt(spent)}</strong> of ${bdt(planned)}. ${due.length ? 'A recurring item is due - review now.' : 'On track with your budget.'}</p>
    </button>

    <div class="card total-card">
      <div class="card-label">Spent this month</div>
      <div class="amount">${bdt(spent)}</div>
      <div class="sub">of ${bdt(planned)} planned \u00B7 ${pct}% used</div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
    </div>

    <div class="qa">
      <button class="qa-btn primary" onclick="openAdd()">
        ${icon('wand')}
        Type an expense
      </button>
      <button class="qa-btn" onclick="openAdd()">
        ${icon('calculator')}
        Manual entry
      </button>
    </div>

    <div class="section-title">Your groups <a onclick="setTab('groups')">See all</a></div>
    <div class="card" style="padding: var(--s3) var(--s4);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:14px;font-weight:600;">Net across ${S.groups.length} groups</div>
          <div style="font-size:12px;color:var(--text-muted);">Updated from your latest activity</div>
        </div>
        <div style="text-align:right;">
          ${totalOwed ? `<div style="color:var(--success);font-family:var(--mono);font-weight:700;font-size:13px;">+${bdt(totalOwed)}</div>` : ''}
          ${totalOwes ? `<div style="color:var(--danger);font-family:var(--mono);font-weight:700;font-size:13px;">\u2212${bdt(totalOwes)}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="section-title">Recent activity <a onclick="setTab('expenses')">See all</a></div>
    ${recent.length === 0 ? '<div class="empty">No expenses yet - tap + to add one.</div>' :
      recent.map(e => {
        const c = findCat(e.categoryId);
        return `
          <div class="row" onclick="setTab('expenses')">
            <div class="icon">${icon(c.icon)}</div>
            <div class="text">
              <strong>${esc(e.description)}</strong>
              <span>${esc(c.name)} \u00B7 ${esc(findAcc(e.accountId).name)} \u00B7 ${fmtDate(e.date)}</span>
            </div>
            <div class="amount">${bdt(e.amount)}</div>
          </div>
        `;
      }).join('')
    }
  `;
}

/* ── Expenses list ────────────────────────────────────────── */
function renderExpenses() {
  const personal = S.expenses.filter(e => !e.groupId).sort((a, b) => b.date.localeCompare(a.date));
  const groups = {};
  personal.forEach(e => {
    (groups[e.date] = groups[e.date] || []).push(e);
  });
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  if (personal.length === 0) {
    return '<div class="empty">No personal expenses yet.<br>Tap + to add one.</div>';
  }

  return dates.map(d => {
    const dayExp = groups[d];
    const total = dayExp.reduce((a, b) => a + b.amount, 0);
    return `
      <div class="day-header">
        <span>${fmtDate(d)}</span>
        <span class="day-total">${bdt(total)}</span>
      </div>
      ${dayExp.map(e => {
        const c = findCat(e.categoryId);
        return `
          <div class="row" onclick="toast('Edit coming soon')">
            <div class="icon">${icon(c.icon)}</div>
            <div class="text">
              <strong>${esc(e.description)}</strong>
              <span>${esc(c.name)} \u00B7 ${esc(findAcc(e.accountId).name)}</span>
            </div>
            <div class="amount">${bdt(e.amount)}</div>
          </div>
        `;
      }).join('')}
    `;
  }).join('');
}

/* ── Groups list ──────────────────────────────────────────── */
function renderGroupsList() {
  let totalOwed = 0, totalOwes = 0;
  const items = S.groups.map(g => {
    const bal = groupBalances(g.id);
    const mine = Math.round(bal['u-saql'] || 0);
    const isSettled = Math.abs(mine) < 0.5 && S.expenses.filter(e => e.groupId === g.id && !e.settled).length === 0;
    const thisMonthSpend = S.expenses.filter(e => e.groupId === g.id && isThisMonth(e.date)).reduce((a, b) => a + b.amount, 0);
    let chip = '';
    if (isSettled) chip = `<span class="chip settled">settled</span>`;
    else if (mine > 0.5) { chip = `<span class="chip owed">+${bdt(mine)}</span>`; totalOwed += mine; }
    else if (mine < -0.5) { chip = `<span class="chip owes">\u2212${bdt(-mine)}</span>`; totalOwes += -mine; }
    else chip = `<span class="chip settled">settled</span>`;

    const avs = g.members.slice(0, 4).map((m, idx) =>
      `<div class="avatar-stack" style="${idx===0?'margin-left:0':''}background:${m.color};">${esc(m.letter)}</div>`
    ).join('');
    const more = g.members.length > 4 ? `<div class="avatar-stack more">+${g.members.length - 4}</div>` : '';

    const monthLabel = new Date(THIS_YEAR, THIS_MONTH, 1).toLocaleString('en-US', { month: 'long' });

    return `
      <button class="group-card" onclick="openGroup('${g.id}')">
        <div class="head">
          <div class="icon">${icon(g.icon)}</div>
          <div class="title">
            <strong>${esc(g.name)}</strong>
            <span>${g.members.length} member${g.members.length>1?'s':''}${g.monthlyBudget ? ' \u00B7 budget ' + bdt(g.monthlyBudget) : ''}</span>
          </div>
          ${chip}
        </div>
        <div class="members">
          <div class="avatars">${avs}${more}</div>
          <div class="meta">
            ${thisMonthSpend ? `${monthLabel} so far \u00B7 <strong>${bdt(thisMonthSpend)}</strong>` : ''}
          </div>
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="summary">
      <div class="col owed">
        <div class="label">You are owed</div>
        <div class="amount">${bdt(totalOwed)}</div>
      </div>
      <div class="divider"></div>
      <div class="col owes">
        <div class="label">You owe</div>
        <div class="amount">${bdt(totalOwes)}</div>
      </div>
    </div>
    ${items}
  `;
}

/* ── Group detail ─────────────────────────────────────────── */
function renderGroupDetail() {
  const g = findGroup(S.activeGroupId);
  if (!g) return '';
  const bal = groupBalances(g.id);
  const mine = bal['u-saql'] || 0;
  const thisMonthSpend = S.expenses.filter(e => e.groupId === g.id && isThisMonth(e.date)).reduce((a, b) => a + b.amount, 0);
  const budgetPct = g.monthlyBudget ? Math.min(100, Math.round(thisMonthSpend / g.monthlyBudget * 100)) : 0;

  const balancesRows = g.members.map(m => {
    const v = Math.round(bal[m.userId] || 0);
    const netCls = v > 0.5 ? 'pos' : v < -0.5 ? 'neg' : 'zero';
    const netTxt = v > 0.5 ? '+' + bdt(v) : v < -0.5 ? '\u2212' + bdt(-v) : bdt(0);
    return `
      <div class="bal-row ${m.userId === 'u-saql' ? 'you' : ''}">
        <div class="bal-avatar" style="background:${m.color};">${esc(m.letter)}</div>
        <div class="meta">
          <strong>${esc(m.name)}${m.userId === 'u-saql' ? ' (you)' : ''}</strong>
          <span>Member</span>
        </div>
        <div class="net ${netCls}">${netTxt}</div>
      </div>
    `;
  }).join('');

  const settlements = simplifyDebts(bal);
  const settleRows = settlements.length === 0
    ? `<div class="empty" style="padding:var(--s5) var(--s3);">All settled! Nothing owed.</div>`
    : settlements.map(s => {
        const from = g.members.find(m => m.userId === s.from);
        const to = g.members.find(m => m.userId === s.to);
        return `
          <div class="settle-row">
            <div class="settle-pair">
              <div class="from">
                <div class="sm-av" style="background:${from.color};">${esc(from.letter)}</div>
                <div class="name">${esc(from.name)}</div>
              </div>
              <div class="arrow"><span class="amt">${bdt(s.amount)}</span></div>
              <div class="to">
                <div class="sm-av" style="background:${to.color};">${esc(to.letter)}</div>
                <div class="name">${esc(to.name)}</div>
              </div>
            </div>
            <button class="btn" onclick="settle('${g.id}', '${s.from}', '${s.to}', ${s.amount})">Settle</button>
          </div>
        `;
      }).join('');

  const recent = S.expenses.filter(e => e.groupId === g.id).slice(0, 5);
  const expRows = recent.length === 0 ? '<div class="empty">No expenses in this group yet.</div>'
    : recent.map(e => {
        const c = findCat(e.categoryId);
        const payer = g.members.find(m => m.userId === (e.paidBy || 'u-saql'));
        return `
          <div class="row" onclick="toast('Edit coming soon')" style="background:var(--surface);">
            <div class="icon">${icon(c.icon)}</div>
            <div class="text">
              <strong>${esc(e.description)}</strong>
              <span>${esc(payer ? payer.name : '?')} \u00B7 ${esc(findAcc(e.accountId).name)}</span>
            </div>
            <div class="amount">${bdt(e.amount)}</div>
          </div>
        `;
      }).join('');

  return `
    <div class="ghead">
      <div class="top">
        <div class="icon">${icon(g.icon)}</div>
        <div class="title">
          <strong>${esc(g.name)}</strong>
          <span>${g.members.length} members</span>
        </div>
        <div class="you">
          <div class="label">You</div>
          <div class="amount" style="color:${mine > 0.5 ? 'var(--success)' : mine < -0.5 ? 'var(--danger)' : 'var(--text-muted)'};">${mine > 0.5 ? '+' + bdt(mine) : mine < -0.5 ? '\u2212' + bdt(-mine) : bdt(0)}</div>
        </div>
      </div>
      ${g.monthlyBudget ? `
        <div class="budget">
          <div class="row">
            <span>${new Date(THIS_YEAR, THIS_MONTH).toLocaleString('en-US',{month:'long'})} budget</span>
            <strong>${bdt(thisMonthSpend)} / ${bdt(g.monthlyBudget)}</strong>
          </div>
          <div class="bar"><div class="fill" style="width:${budgetPct}%"></div></div>
        </div>
      ` : ''}
    </div>

    <div class="sect">Member balances <span class="hint">Live</span></div>
    <div class="bal-card">${balancesRows}</div>

    <div class="sect">Suggested settlements <span class="hint">${settlements.length} payment${settlements.length !== 1 ? 's' : ''}</span></div>
    ${settlements.length > 0 ? `<p style="font-size:12px;color:var(--text-muted);margin:0 0 var(--s3);">Greedy match reduces the group to the minimum payments needed to clear every balance.</p>` : ''}
    ${settlements.length ? `<div class="settle-card">${settleRows}</div>` : ''}

    <div class="sect">Recent in this group</div>
    ${expRows}
  `;
}

/* ── Reports ──────────────────────────────────────────────── */
function renderReports() {
  const scope = S.reportsScope;
  const expenses = scope === 'personal'
    ? S.expenses.filter(e => !e.groupId && isThisMonth(e.date))
    : S.expenses.filter(e => e.groupId === 'g-mess' && isThisMonth(e.date));
  const total = expenses.reduce((a, b) => a + b.amount, 0);
  const planned = S.budgets.reduce((a, b) => a + b.planned, 0);
  const pct = planned ? Math.round(total / planned * 100) : 0;

  const tabs = `
    <div class="tabs-pill">
      <button class="tab-pill ${S.reportsTab === 'category' ? 'active' : ''}" onclick="setReportsTab('category')">By Category</button>
      <button class="tab-pill ${S.reportsTab === 'account' ? 'active' : ''}" onclick="setReportsTab('account')">By Account</button>
      <button class="tab-pill ${S.reportsTab === 'trend' ? 'active' : ''}" onclick="setReportsTab('trend')">Trend</button>
      <button class="tab-pill ${S.reportsTab === 'savings' ? 'active' : ''}" onclick="setReportsTab('savings')">Savings</button>
    </div>
  `;

  if (S.reportsTab === 'category') {
    const byCat = {};
    expenses.forEach(e => byCat[e.categoryId] = (byCat[e.categoryId] || 0) + e.amount);
    const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cid, amt]) => {
      const c = findCat(cid);
      const budget = S.budgets.find(b => b.categoryId === cid);
      const used = budget ? Math.round(amt / budget.planned * 100) : 0;
      const cls = used >= 100 ? 'danger' : used >= 80 ? 'warn' : 'norm';
      const w = Math.min(100, used || 30);
      return `
        <div class="cat-row ${cls}">
          <div class="ico">${icon(c.icon)}</div>
          <div class="text">
            <strong>${esc(c.name)}</strong>
            <div class="bar"><div class="bar-fill" style="width:${w}%"></div></div>
          </div>
          <div class="amount">
            ${bdt(amt)}
            <span class="pct">${budget ? used + '%' : ''}</span>
          </div>
        </div>
      `;
    }).join('');
    return `
      ${tabs}
      <div class="summary-card">
        <div class="label">Total spent \u00B7 ${new Date(THIS_YEAR, THIS_MONTH).toLocaleString('en-US',{month:'long'})}</div>
        <div class="amount">${bdt(total)}</div>
        <div class="sub">${pct}% of ${bdt(planned)} budgeted</div>
      </div>
      <div class="section-title">By category</div>
      ${rows || '<div class="empty">No expenses this month.</div>'}
    `;
  }

  if (S.reportsTab === 'account') {
    const byAcc = {};
    expenses.forEach(e => byAcc[e.accountId] = (byAcc[e.accountId] || 0) + e.amount);
    const rows = Object.entries(byAcc).sort((a, b) => b[1] - a[1]).map(([aid, amt]) => {
      const a = findAcc(aid);
      return `
        <div class="cat-row norm">
          <div class="ico">${icon(a.icon || 'creditCard')}</div>
          <div class="text"><strong>${esc(a.name)}</strong></div>
          <div class="amount">${bdt(amt)}</div>
        </div>
      `;
    }).join('');
    return `${tabs}<div class="section-title" style="margin-top:0;">By account</div>${rows || '<div class="empty">No expenses this month.</div>'}`;
  }

  if (S.reportsTab === 'trend') {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(THIS_YEAR, THIS_MONTH - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString('en-US', { month: 'short' }) });
    }
    const totals = months.map(({ y, m }) =>
      S.expenses.filter(e => !e.groupId && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((a, b) => a + b.amount, 0)
    );
    const max = Math.max(...totals, 1);
    const bars = months.map((mo, i) => {
      const h = Math.max(2, Math.round(totals[i] / max * 100));
      return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:6px;">
        <div style="font-size:10px;font-family:var(--mono);color:var(--text-muted);">${bdt(totals[i])}</div>
        <div style="height:120px;display:flex;align-items:flex-end;width:100%;">
          <div style="background:var(--accent);width:60%;height:${h}%;border-radius:4px 4px 0 0;margin:0 auto;"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);">${mo.label}</div>
      </div>`;
    }).join('');
    return `
      ${tabs}
      <div class="trend-chart">
        <h4>Last 6 months</h4>
        <div style="display:flex;gap:6px;align-items:flex-end;height:160px;">${bars}</div>
        <div class="legend"><span><span class="swatch" style="background:var(--accent);"></span>Personal spend</span></div>
      </div>
    `;
  }

  if (S.reportsTab === 'savings') {
    const saved = S.expenses.filter(e => e.categoryId === 'savings' && isThisMonth(e.date)).reduce((a, b) => a + b.amount, 0);
    const target = S.savingsGoal.target;
    const pct = target ? Math.min(100, Math.round(saved / target * 100)) : 0;
    return `
      ${tabs}
      <div class="summary-card">
        <div class="label">Saved this month</div>
        <div class="amount">${bdt(saved)}</div>
        <div class="sub">${pct}% of ${bdt(target)} target</div>
      </div>
      <div class="card">
        <div class="card-label">Progress to goal</div>
        <div class="total-card" style="margin-bottom:0;">
          <div class="bar"><div class="bar-fill" style="width:${pct}%;background:var(--success);"></div></div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:var(--s3);">
        Saved amount is computed from your expenses tagged with the <strong>Savings</strong> category - one source of truth.
      </p>
    `;
  }
  return '';
}


/* ── Profile ──────────────────────────────────────────────── */
function renderProfile() {
  return `
    <div class="profile">
      <div class="av">${esc(S.user.avatarLetter)}</div>
      <h2>${esc(S.user.name)}</h2>
      <div class="email">${esc(S.user.email)}</div>
      <div class="pill">${S.groups.length} groups \u00B7 ${S.accounts.length} accounts</div>
    </div>

    <div class="sect-label">Money</div>
    <div class="list">
      <div class="row" onclick="toast('Accounts view coming soon')">
        <div class="ico">${icon('wallet')}</div>
        <div class="body"><strong>Accounts / wallets</strong><span>${S.accounts.length} active</span></div>
        ${icon('chevron')}
      </div>
      <div class="row" onclick="toast('Categories view coming soon')">
        <div class="ico">${icon('category')}</div>
        <div class="body"><strong>Categories</strong><span>${S.categories.length} total</span></div>
        ${icon('chevron')}
      </div>
      <div class="row" onclick="toast('Recurring view coming soon')">
        <div class="ico">${icon('calendar')}</div>
        <div class="body"><strong>Recurring expenses</strong><span>${S.recurring.length} templates</span></div>
        ${icon('chevron')}
      </div>
      <div class="row" onclick="toast('Savings goal view coming soon')">
        <div class="ico">${icon('savings')}</div>
        <div class="body"><strong>Savings goal</strong><span>${bdt(S.savingsGoal.target)} / month</span></div>
        ${icon('chevron')}
      </div>
    </div>

    <div class="sect-label">AI features</div>
    <div class="list">
      ${aiRow('nlEntry',  'sparkles', 'Natural-language entry', 'Suggest fields from typed text')}
      ${aiRow('autoCat', 'wand', 'Auto-categorize', 'Suggest category on save')}
      ${aiRow('anomaly', 'alert', 'Anomaly & duplicate detection', 'Flag unusual or repeated entries')}
      ${aiRow('pattern', 'refresh', 'Recurring-pattern hints', 'Suggest templates from repeats')}
      ${aiRow('insights','trending', 'Monthly insights', 'Summary, anomaly, forecast')}
    </div>

    <div class="sect-label">Account</div>
    <div class="list">
      <div class="row" onclick="toast('Change password managed by Supabase Auth')">
        <div class="ico">${icon('shield')}</div>
        <div class="body"><strong>Change password</strong><span>Managed by Supabase Auth</span></div>
        ${icon('chevron')}
      </div>
      <div class="row" onclick="toast('Notification preferences coming soon')">
        <div class="ico">${icon('bell')}</div>
        <div class="body"><strong>Notifications</strong><span>Reminders and updates</span></div>
        ${icon('chevron')}
      </div>
      <div class="row" onclick="signOut()" style="color:var(--danger);">
        <div class="ico" style="background:rgba(192,57,43,0.10);color:var(--danger);">${icon('signOut')}</div>
        <div class="body"><strong style="color:var(--danger);">Sign out</strong><span>${esc(S.user.email)}</span></div>
      </div>
    </div>
  `;
}
function aiRow(key, ico, label, sub) {
  const on = S.aiToggles[key];
  return `
    <div class="row" onclick="toggleAi('${key}')">
      <div class="ico">${icon(ico)}</div>
      <div class="body"><strong>${label}</strong><span>${sub}</span></div>
      <button class="toggle ${on ? 'on' : ''}" aria-label="Toggle ${label}" onclick="event.stopPropagation(); toggleAi('${key}')"></button>
    </div>
  `;
}

/* ── Tabbar ───────────────────────────────────────────────── */
function renderTabbar() {
  const tabs = [
    { id: 'home',     label: 'Home',     icon: 'home' },
    { id: 'expenses', label: 'Expenses', icon: 'expenses' },
    { id: 'groups',   label: 'Groups',   icon: 'groups' },
    { id: 'reports',  label: 'Reports',  icon: 'reports' },
    { id: 'more',     label: 'More',     icon: 'more' },
  ];
  return `
    <div class="tabbar">
      ${tabs.map(t => `
        <button class="tab ${S.currentTab === t.id ? 'active' : ''}" onclick="setTab('${t.id}')">
          <div>${icon(t.icon)}</div>
          ${t.label}
        </button>
      `).join('')}
    </div>
  `;
}
function renderFab() {
  if (S.showAddSheet || S.showConfirmSheet || S.showInsights) return '';
  return `<button class="fab" onclick="openAdd()" aria-label="Add expense">${icon('plus')}</button>`;
}

/* ── Add expense sheet ────────────────────────────────────── */
function renderAddSheet() {
  const p = S.parsed;
  const grpOptions = S.groups.map(g => `<span class="chip ${p && p.groupId === g.id ? 'active' : ''}" onclick="pickGroup('${g.id}')">${icon(g.icon)} ${esc(g.name.split(' \u2014')[0].split(' 2026')[0])}</span>`).join('');

  return `
    <div class="overlay" onclick="if (event.target === this) closeAdd()">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="handle"></div>
        <div class="sh">
          <h2>Add expense</h2>
          <div class="mode-toggle">
            <button class="active">AI type-in</button>
            <button onclick="toast('Manual form same flow'); closeAdd(); setTimeout(openAdd, 100)">Manual</button>
          </div>
        </div>
        <div class="mode-desc">Describe the expense in plain language - we fill the form, you confirm.</div>

        <div class="nl-box">
          <textarea id="nlText" class="nl-input" placeholder="e.g. Paid 1200 for groceries at Shwapno, split evenly with the mess"></textarea>
          <div class="nl-tools">
            <span class="hint">Edit freely; press Parse to re-run.</span>
            <button class="parse-btn" onclick="parseExpense()">${icon('sparkles')} Parse</button>
          </div>
        </div>

        ${S.parsing ? `
          <div class="parse-loader"><div class="spinner"></div> Parsing with Claude\u2026</div>
        ` : ''}

        ${p ? `
          <div class="ai-card">
            <div class="head">
              <span class="badge">${icon('sparkles')} AI suggestion</span>
              <span class="editable-hint">All fields editable</span>
            </div>
            <div class="field">
              <div class="field-label">Amount</div>
              <div class="amount-row">
                <span class="cur">\u09F3</span>
                <input class="val" type="number" value="${p.amount}" oninput="S.parsed.amount = Number(this.value); saveState()" />
              </div>
            </div>
            <div class="field">
              <div class="field-label">Category</div>
              <div class="tag-row">
                ${S.categories.slice(0, 6).map(c => `
                  <span class="chip ${p.categoryId === c.id ? 'active' : ''}" onclick="S.parsed.categoryId='${c.id}'; saveState(); render()">${icon(c.icon)} ${esc(c.name)}</span>
                `).join('')}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Description</div>
              <input class="ain" value="${esc(p.description || '')}" oninput="S.parsed.description = this.value; saveState()" />
            </div>
            <div class="field">
              <div class="field-label">Account</div>
              <div class="tag-row">
                ${S.accounts.map(a => `
                  <span class="chip ${p.accountId === a.id ? 'active' : ''}" onclick="S.parsed.accountId='${a.id}'; saveState(); render()">${icon(a.icon)} ${esc(a.name)}</span>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="split-card">
            <div class="field-label">Scope</div>
            <div class="tag-row" style="margin-bottom: var(--s3);">
              <span class="chip ${!p.groupId ? 'active' : ''}" onclick="S.parsed.groupId = null; S.parsed.splitType = 'just-me'; saveState(); render()">${icon('user')} Personal</span>
              ${S.groups.map(g => `
                <span class="chip ${p.groupId === g.id ? 'active' : ''}" onclick="pickGroup('${g.id}')">${icon(g.icon)} ${esc(g.name.split(' \u2014')[0].split(' 2026')[0])}</span>
              `).join('')}
            </div>
            ${p.groupId ? `
              <div class="split-preview">
                <div class="av">
                  ${findGroup(p.groupId).members.slice(0, 4).map(m => `<div class="a" style="background:${m.color};">${esc(m.letter)}</div>`).join('')}
                </div>
                <div class="info">
                  <strong>${esc(findGroup(p.groupId).name)}</strong>
                  <span>${findGroup(p.groupId).members.length} members \u00B7 equal split</span>
                </div>
                <div class="share">${bdt(p.amount / findGroup(p.groupId).members.length)} each</div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="actions">
          <button class="btn btn-secondary" onclick="closeAdd()">Discard</button>
          <button class="btn btn-primary" onclick="confirmParsed()" ${!p || !p.amount ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Save expense</button>
        </div>
      </div>
    </div>
  `;
}

function pickGroup(gid) {
  if (!S.parsed) {
    S.parsed = { amount: 0, categoryId: 'misc', description: '', accountId: 'cash', groupId: gid, splitType: 'equal' };
  } else {
    S.parsed.groupId = gid;
    S.parsed.splitType = 'equal';
  }
  saveState(); render();
}

/* ── Confirm recurring sheet ──────────────────────────────── */
function renderConfirmSheet() {
  const r = S.recurring.find(x => x.id === S.confirmRecurringId);
  if (!r) return '';
  const due = dueRecurring();
  const idx = due.findIndex(x => x.id === r.id);
  const c = findCat(r.categoryId);

  return `
    <div class="overlay" onclick="if (event.target === this) skipRecurring()">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="handle"></div>

        <div class="queue">
          ${due.map((_, i) => `<div class="dot ${i > idx ? 'pending' : ''}"></div>`).join('')}
        </div>

        <div class="sh">
          <h2>Confirm recurring expense</h2>
          <button class="icon-btn sm" onclick="closeConfirm()" style="font-size:14px;font-weight:600;">Cancel</button>
        </div>
        <div class="mode-desc">${due.length} recurring expense${due.length>1?'s':''} due. Review and confirm to create an actual expense entry.</div>

        <div class="field">
          <div class="field-label">Amount</div>
          <div class="amount-display"><span class="currency">\u09F3</span><span class="value">${bdt(r.amount).slice(1)}</span></div>
        </div>
        <div class="field">
          <div class="field-label">Category</div>
          <div class="tag-row">
            <span class="chip active">${icon(c.icon)} ${esc(c.name)}</span>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Account</div>
          <div class="tag-row">
            <span class="chip active">${icon((findAcc(r.accountId).icon) || 'wallet')} ${esc(findAcc(r.accountId).name)}</span>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Description</div>
          <input class="ain" value="${esc(r.description)}" />
        </div>
        <div class="field">
          <div class="readonly-row"><span>Frequency</span><strong>${esc(r.frequency)}</strong></div>
        </div>
        <div class="field">
          <div class="readonly-row"><span>Due</span><strong>${esc(r.nextDueDate)}</strong></div>
        </div>
        ${idx < due.length - 1 ? `
          <div class="field">
            <div class="readonly-row" style="background:rgba(31,122,140,0.06);color:var(--accent);">
              <span>Next in queue</span><strong>${esc(due[idx+1].description)}</strong>
            </div>
          </div>
        ` : ''}

        <div class="actions">
          <button class="btn btn-secondary" onclick="skipRecurring()">Skip</button>
          <button class="btn btn-primary" onclick="confirmRecurring()">Confirm</button>
        </div>
      </div>
    </div>
  `;
}

/* ── Insights (overlay) ───────────────────────────────────── */
function renderInsights() {
  const scope = S.insightScope;
  const expenses = scope === 'personal'
    ? S.expenses.filter(e => !e.groupId && isThisMonth(e.date))
    : S.expenses.filter(e => e.groupId === scope && isThisMonth(e.date));
  const total = expenses.reduce((a, b) => a + b.amount, 0);
  const planned = S.budgets.reduce((a, b) => a + b.planned, 0);

  const sorted = [...expenses].sort((a, b) => b.amount - a.amount);
  const big = sorted[0];

  const byCat = {};
  expenses.forEach(e => byCat[e.categoryId] = (byCat[e.categoryId] || 0) + e.amount);
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  return `
    <div class="overlay" onclick="if (event.target === this) closeInsights()">
      <div class="sheet" onclick="event.stopPropagation()" style="max-height:88%;">
        <div class="handle"></div>

        <div class="sh">
          <h2>AI insights</h2>
          <button class="icon-btn sm" onclick="closeInsights()" style="font-size:14px;font-weight:600;">Close</button>
        </div>

        <div class="scope-tabs">
          <button class="${scope === 'personal' ? 'active' : ''}" onclick="setInsightScope('personal')">Personal</button>
          ${S.groups.map(g => `<button class="${scope === g.id ? 'active' : ''}" onclick="setInsightScope('${g.id}')">${esc(g.name.split(' \u2014')[0].split(' 2026')[0])}</button>`).join('')}
        </div>

        <div class="hero">
          <span class="badge">${icon('sparkles')} ${new Date(THIS_YEAR, THIS_MONTH).toLocaleString('en-US',{month:'long'})}</span>
          <h2>${topCat ? `${findCat(topCat[0]).name} is your top category.` : 'No spending yet this month.'}</h2>
          <p>
            You've spent <span class="num">${bdt(total)}</span> so far${planned ? ` of <span class="num">${bdt(planned)}</span> planned` : ''}.
            ${topCat ? `Top category <strong>${findCat(topCat[0]).name}</strong> at <span class="num">${bdt(topCat[1])}</span>.` : ''}
          </p>
        </div>

        ${big && big.amount > 1500 ? `
          <div class="card">
            <div class="card-label" style="color:#8a6a16;">Anomaly \u00B7 One entry</div>
            <h3 style="margin:0 0 var(--s2);font-size:15px;font-weight:700;">${esc(big.description)} \u2014 ${bdt(big.amount)}</h3>
            <p style="margin:0;font-size:13px;color:var(--text-muted);">
              ${findCat(big.categoryId).name} \u00B7 ${fmtDate(big.date)}. Larger than your recent typical entry - worth a second look.
            </p>
          </div>
        ` : ''}

        <div class="card">
          <div class="card-label" style="color:var(--accent);">Forecast \u00B7 Next month</div>
          <h3 style="margin:0 0 var(--s2);font-size:15px;font-weight:700;">October projected ~${bdt(Math.round(total * 1.05))}</h3>
          <p style="margin:0;font-size:13px;color:var(--text-muted);">
            Based on your last 3 months, expect ${findCat('bills').name} to rise ~\u09F31,200 (annual renewal). Keep ${findCat('transport').name} under \u09F35,000.
          </p>
        </div>

        ${S.recurring.length < 5 && S.aiToggles.pattern ? `
          <div class="rec-card">
            <div class="head">
              <span class="badge">Pattern</span>
              <strong style="font-size:14px;">Found a repeating expense</strong>
            </div>
            <p>"Wi-Fi - Internet" ~\u09F31,200 has been logged manually for the last 3 months.</p>
            <div class="pattern">
              <span class="num">\u09F31,200</span>
              <div class="meta">
                <strong>Bills \u00B7 Monthly</strong><br>
                Next due 30 Sep
              </div>
            </div>
            <div class="actions">
              <button class="secondary" onclick="closeInsights()">Not now</button>
              <button class="primary" onclick="convertPatternToTemplate()">Convert to template</button>
            </div>
          </div>
        ` : ''}

        <div class="disclaim">
          Insights are summaries of your own data. Not financial advice.
        </div>
      </div>
    </div>
  `;
}

/* ── Bind DOM events ──────────────────────────────────────── */
function bindEvents() {
  /* Most interactions are wired via inline onclick attributes for simplicity. */
}

/* Expose handlers to window so inline onclick works */
Object.assign(window, {
  setTab, openGroup, backToGroups, openAdd, closeAdd,
  openConfirm, closeConfirm, openInsights, closeInsights,
  setInsightScope, setReportsTab, setReportsScope,
  toggleAi, settle, parseExpense, confirmParsed,
  confirmRecurring, skipRecurring, convertPatternToTemplate,
  signOut, pickGroup,
  goAuth, login, register,
});

/* ── Boot ─────────────────────────────────────────────────── */
render();
