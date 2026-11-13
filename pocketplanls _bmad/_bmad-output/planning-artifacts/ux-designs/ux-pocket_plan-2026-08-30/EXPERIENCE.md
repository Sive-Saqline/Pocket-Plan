---
status: final
updated: 2026-08-30
project: pocket_plan
intent: create
run: ux-pocket_plan-2026-08-30
sources:
  - docs/PocketPlan-PRD-v3.md
---

# EXPERIENCE.md — PocketPlan

> Behavior, IA, states, interactions, accessibility, journeys. **How it works.**
> Visual identity (colors, type, components, shapes) lives in `DESIGN.md`. This file cross-references DESIGN.md tokens by `{path.to.token}` syntax. Spines win on conflict with any mock, wireframe, or import.

---

## 1 · Foundation

### 1.1 Form-factor
Mobile-first PWA, with desktop-responsive layouts in the same codebase (no separate desktop IA).

- **Mobile (<768px)** — bottom tab bar, single-column content, sticky top app bar, FAB for primary actions on lists.
- **Tablet (768–1023px)** — same as mobile but with two-column density on list+detail screens.
- **Desktop (≥1024px)** — left sidebar replaces bottom tabs (same five items, same order); top app bar carries the user menu (right). **No global search at MVP** (deferred per memlog). Content area gains more breathing room and uses wider table/grid layouts.

Breakpoints are token-driven: `{layout.breakpoint.sm}`, `{layout.breakpoint.md}`, `{layout.breakpoint.lg}`. See DESIGN.md → Layout & Spacing.

### 1.2 UI system
No third-party UI kit selected yet — DESIGN.md proposes tokens; tokens map to whichever component library is chosen at implementation time (e.g., shadcn/ui, Radix primitives, or a custom set). Spines are library-agnostic except where behavior is intrinsically library-coupled (e.g., `prefers-reduced-motion` handling, ARIA roles for comboboxes).

### 1.3 Stakes
Consumer-grade (see memlog). Not a regulated financial product. Tone is helpful, never advisory. Accessibility target is WCAG 2.1 AA consumer.

### 1.4 Persistence expectations
Online-only for MVP (see §2.7). Reads and writes require connectivity. The PWA service worker caches the app shell and static assets only — not user data. There is no offline queue, no sync indicator, no "syncing" state. A user attempting a write while offline sees the standard page-level error banner (see §6.3).

### 1.5 Key-screen mocks
Visual references for layout-driven or visual-language-anchoring surfaces live in `mockups/`:

- `mockups/mock-01-home.html` — Home / dashboard
- `mockups/mock-02-add-expense.html` — Add Expense sheet
- `mockups/mock-03-expenses-list.html` — Expenses list (grouped by day)
- `mockups/mock-04-confirm-recurring.html` — ConfirmRecurringSheet
- `mockups/mock-05-reports-by-category.html` — Reports → By Category

Spines win on conflict with any mock.

---

## 2 · Information Architecture

### 2.1 Top-level navigation (mobile)
Five tabs, in order:

| # | Tab | Purpose |
|---|---|---|
| 1 | **Home** | Dashboard snapshot + due-recurring banner |
| 2 | **Expenses** | Expense list (grouped by day) + Add Expense |
| 3 | **Budgets** | Per-month, per-category budget editor and readout |
| 4 | **Reports** | Visual summaries (by category, by account, trend, savings progress) |
| 5 | **More** | Secondary surfaces: Accounts, Categories, Recurring, Savings Goals, Settings |

Tab bar tokens: `{components.tabbar.mobile}`, `{components.tabbar.active}`, `{components.tabbar.badge}`. Red dot on **More** while any due recurring template is unread (`{components.badge.due}`).

### 2.2 Top-level navigation (desktop)
Left sidebar with the same five items, same order. Top app bar carries: app name (left), search (center, optional for MVP), user menu (right — profile, settings, sign out).

### 2.3 Surface map

| Surface | Lands here from journey | Primary action |
|---|---|---|
| Sign Up | (cold start) | Create account |
| Sign In | (cold start, signed out) | Authenticate |
| Forgot Password | (signed out) | Request reset email |
| Onboarding wizard (4 steps) | Rakib step 1 | Complete setup |
| Home (dashboard) | All three journeys land here first | Drill-in to a card |
| Expenses list | All three | Tap to edit / FAB to add |
| Add / Edit Expense | Rakib step 4–5 (climax) | Save expense |
| Budgets | Salma step 3 | Set/edit monthly plans |
| Add / Edit Budget | Salma step 3 | Save planned amount |
| Reports — By Category | Naima step 2 | Drill into a category |
| Reports — By Account | (secondary) | Drill into an account |
| Reports — Monthly Trend | (secondary) | Read chart |
| Reports — Savings Progress | Naima step 3 (climax) | Read progress |
| More → Accounts | Naima step 5, Salma step 1 | CRUD account |
| More → Add / Edit Account | Rakib step 2 | Save account |
| More → Categories | Salma step 2 | CRUD category |
| More → Add / Edit Category | Salma step 2 | Save category |
| More → Recurring Expenses | Naima step 4 | CRUD + confirm |
| More → Confirm Recurring | Naima step 4 (climax) | Confirm to create expense |
| More → Savings Goals | Naima step 3 | Set target |
| More → Settings | (any) | Profile (name + preferences; email read-only), theme, sign out |
| (signed out) Set New Password | Forgot Password → email link | Save new password, sign in |

Every stated PRD need has a surface in this map. Every surface has at least one journey landing on it (closure holds).

### 2.4 Screen hierarchy at a glance

```
Sign Up / Sign In / Forgot Password
        ↓
Onboarding Wizard (4 steps)
        ↓
   Home (dashboard)
        │
        ├── Expenses → Add/Edit Expense
        ├── Budgets → Add/Edit Budget
        ├── Reports → By Category / By Account / Trend / Savings
        └── More
             ├── Accounts → Add/Edit Account
             ├── Categories → Add/Edit Category
             ├── Recurring → Add/Edit Template, Confirm Due
             ├── Savings Goals → Set Target
             └── Settings (Profile, Theme, Sign Out)
```

### 2.5 Routing conventions
- One route per surface; deep links supported for in-app navigation only at MVP (no sharing external URLs to expenses).
- Authenticated routes are guarded; unauthenticated users hitting any non-auth route are redirected to Sign In, preserving `returnTo`.

### 2.6 Empty-state coverage
Every surface that can be empty has an empty state: small illustration, one-line copy, primary CTA. Empty states are listed in §6.4.

### 2.7 Offline / connectivity behavior (PRD §9 deferred decision)
- Online-only MVP. The PWA is installable and caches the shell + static assets.
- No offline cache for user data; no write queue; no "syncing" indicator; no conflict handling.
- Reads/writes require connectivity. On write failure due to no network, show the standard page-level error banner (see §6.3).

---

## 3 · Voice and Tone

Microcopy lives here; brand voice anchors in DESIGN.md → Brand & Style.

### 3.1 Voice principles
- **Helpful, never advisory.** We don't tell users what they *should* do with their money. We surface the numbers and let them decide.
- **Concrete, not jargon.** "You spent ৳1,200 on Transport today" not "Spending velocity has increased in the Transport category."
- **Plain error copy.** No anthropomorphized "Oops!"; just the cause and the fix.
- **Local-friendly English.** Spelling and idioms acceptable globally (this is a consumer-grade app, not region-locked), but currency is ৳ BDT and date format follows locale (DD MMM YYYY).

### 3.2 Copy patterns by context

| Context | Pattern | Example |
|---|---|---|
| Empty list | "No <thing> yet. <action>." | "No expenses yet. Tap + to add your first one." |
| Success toast | "<Action> saved." | "Expense saved." |
| Confirmation prompt | Plain restatement of the action and its consequence. | "Delete 'City Bank'? This will also delete 47 linked expenses." |
| Inline form error | Cause + fix in one sentence. | "Amount is required." / "Pick a category." |
| Page error banner | What broke + retry. | "Couldn't load expenses. Check your connection and try again." |
| Budget overage chip | The percentage, no judgment. | "This puts Transport at 105% of budget." |
| Savings progress | Concrete saved vs target. | "Saved ৳3,200 of ৳5,000 for August." |

### 3.3 Onboarding copy (locked sample)
- Step 1 welcome: **"Track your spending in 2 minutes."** subhead: "We'll help you set up the basics. You can change anything later."
- Step 2 create account: **"Where does your money live?"** placeholder: "e.g., Cash, City Bank, bKash"
- Step 3 first budget: **"Set a budget for your biggest category."** Skip option: "Skip for now"
- Step 4 first expense: **"Add your first expense."** placeholder: "e.g., ৳120 Lunch"

---

## 4 · Component Patterns

Visual specs for components live in DESIGN.md → Components. This section owns the **behavioral** spec — what each component does, in what state, with what interaction.

### 4.1 AmountInput
- Numeric keypad appears by default on mobile (`inputmode="decimal"`).
- Currency prefix ৳ renders inside the input, left-aligned, not part of the editable value.
- Accepts up to two decimal places. Live-formats with thousand separators on blur (e.g., `1200` → `1,200`).
- Required; min 0.01.
- On error: inline message below input ("Amount is required.").
- Token: `{components.input.amount}`.

### 4.2 CategoryPicker
- Horizontal scroller, scroll-snap to center, **most-used category first** (computed from the user's `expenses` history).
- Above the scroller: a search field that filters the scroller contents live as the user types. Empty results: "No categories match — create one?" with a link to Add Category.
- Default categories (PRD §6.3) appear for new users until the user starts logging expenses (then ordering shifts to most-used).
- Selection is a single required field; tap-to-select.
- Long-press on a category opens "Edit" / "Delete" if the user owns it and has no expenses in the current add-flow referencing it.
- Token: `{components.categoryScroller}`.

### 4.3 AccountPicker
- Same scroller pattern as CategoryPicker but accounts (PRD §6.4): Cash / Bank / Card / Mobile Wallet / Other.
- Last-used account pre-selected on Add Expense.
- Token: `{components.accountScroller}`.

### 4.4 ExpenseRow
- Single row in the Expenses list. Left: category icon + name. Center: description (truncated, ellipsized). Right: amount, right-aligned, monospaced.
- Tap: opens Edit Expense sheet.
- Long-press: action sheet (Edit, Delete, Duplicate).
- Day grouping: sticky day header above each group ("Today", "Yesterday", or "DD MMM YYYY").
- Token: `{components.expenseRow}`.

### 4.5 BudgetCard
- One per category that has a planned amount for the current month. Card body: category icon + name, planned amount, spent so far, progress bar.
- Bar color shifts to `{color.warning}` at 80% utilization and `{color.danger}` at 100%+.
- Tap: opens category detail (Reports → By Category, filtered to current month).
- Categories without a planned amount don't appear here (they live in Reports only).
- Token: `{components.budgetCard}`.

### 4.6 DueRecurringBanner
- Surfaces on Home when at least one recurring template has `next_due_date <= today` and `is_active = true`.
- One banner regardless of how many are due; body: "N recurring expenses are due. Review →"
- Dismissible per-session via "Not now". Dismissing doesn't mark templates as confirmed.
- Companion: red dot on **More** tab while any due template is unread.
- Tap "Review" → opens Confirm Recurring flow (§5.6).
- Token: `{components.banner.recurringDue}`.

### 4.7 ConfirmRecurringSheet
- Bottom sheet (mobile) / modal (desktop) listing each due template one at a time.
- Each template pre-filled and **editable**: amount, category, account, description, date. Frequency and `next_due_date` are shown but not editable here.
- Two CTAs: **Confirm** (saves expense, advances `next_due_date`, next due template slides in if any) and **Skip** (leaves `next_due_date` unchanged, advances to next due template). User can process the queue without confirming every item; the DueRecurringBanner stays visible while at least one due template remains.
- If user backs out mid-flow, no expense is saved and no `next_due_date` advances.
- Token: `{components.sheet.confirmRecurring}`.

### 4.8 SavingsGoalCard
- Shows on Home and on Reports → Savings Progress.
- Body: target amount for the month, saved amount (computed live from `expenses` where `category = "Savings"` and `expense_date` falls in this month/year), progress bar, percentage.
- Tap on Home card → drill-in to Reports → Savings Progress.
- Token: `{components.savingsGoalCard}`.

### 4.9 ReportChart (category pie / monthly trend line)
- Renders on Reports screens.
- Animated on first paint, soft fade + small upward translate (≤200ms). Always honors `prefers-reduced-motion: reduce` (renders statically).
- Tooltip on tap/long-press: shows exact value, percentage of total.
- Token: `{components.chart}`.

### 4.10 FormButton (primary / secondary / destructive)
- Primary: filled, `{color.accent}` background, white foreground.
- Secondary: outlined.
- Destructive (Delete): filled, `{color.danger}` background.
- Loading state replaces label with inline spinner; button is non-tappable during load.
- Disabled state: reduced opacity, cursor not-allowed, no hover elevation.
- Token: `{components.button}`.

### 4.11 AppBar
- Mobile: sticky top, height `{layout.appbarHeight.mobile}`. Holds: back arrow (when applicable), screen title, optional trailing actions.
- Desktop: same content, taller (`{layout.appbarHeight.desktop}`), with breadcrumb-style title.
- Token: `{components.appbar}`.

### 4.12 TabBar
- Mobile bottom tab bar: 5 items. Active tab has a top accent stripe plus bolded label. Inactive tabs use muted label color.
- Red dot badge on More tab (`{components.badge.due}`) while any due recurring template is unread.
- Hidden on desktop.
- Token: `{components.tabbar.mobile}`.

### 4.13 Toast
- Top of screen on mobile, top-right on desktop. Auto-dismiss after 4s. Stacks vertically (max 3 visible). Non-blocking.
- Used for success confirmations ("Expense saved.") and non-critical failures.
- Token: `{components.toast}`.

---

## 5 · State Patterns

### 5.1 Loading
- **Lists** (Home cards, Expenses, Budgets, Reports, Accounts, Categories, Recurring, Savings Goals): **skeleton** placeholders shaped like the final content, not spinners. 3–5 skeleton rows.
- **Actions** (Save, Delete, Confirm Recurring): inline spinner inside the button. Page stays interactive.
- **Charts**: skeleton shape (gray rounded bars) until data arrives.

### 5.2 Empty
Every list surface has an empty state (see §2.6). The pattern:
1. Small illustration (token `{asset.emptyExpense}`, etc. — generated at Finalize per surface).
2. One-line helpful copy (see §3.2).
3. Primary CTA — the surface's main action.

Empty states are not skipped if the user has data elsewhere in the app — every surface is treated independently.

### 5.3 Error
- **Form-level errors**: inline below the offending field. Cause + fix in one sentence.
- **Page-level errors** (failed list load, failed write due to network/server): top banner, `{color.danger}` border, message + "Retry" button.
- **Authentication errors** (expired session): silent refresh attempt; on failure, redirect to Sign In with `returnTo` set to current path.
- **Validation errors from API** (PRD §9: class-validator): mapped 1:1 to the relevant form input as inline error.

### 5.4 Confirmation / destructive
- **Delete expense**: confirmation modal — "Delete '<description>' from <date>? This can't be undone." Buttons: Cancel / Delete (destructive).
- **Delete account with linked expenses** (per memlog decision): "Delete '<account name>'? This will also delete N linked expenses. Continue?" Buttons: Cancel / Delete (destructive).
- **Delete category with linked expenses/budgets**: same pattern as account.
- **Confirm recurring expense** (§4.7) is its own flow, not a destructive action.
- All destructive actions use `{color.danger}` button color.

### 5.5 Auth state
- **Signed out**: only Sign Up, Sign In, Forgot Password, Set New Password are accessible. Any other route redirects to Sign In with `returnTo`.
- **Signed in, email unconfirmed**: a top banner across all surfaces reads "Confirm your email to keep your account secure." Dismissible but reappears on next session.
- **Signed in, confirmed**: full app.
- **Session expired**: silent refresh attempt; on failure, redirect to Sign In.
- **Password reset flow**: user clicks link in reset email → lands on **Set New Password** screen → types + confirms new password → on submit, signed in and lands on Home.

### 5.6 Budget state
- **Under budget** (<80%): normal progress bar color (`{color.accent}`).
- **Nearing budget** (80–99%): warning color (`{color.warning}`), no other change.
- **At or over budget** (≥100%): danger color (`{color.danger}`); chip on Add Expense when adding would push further.
- **No budget set for category**: category appears in Reports but not on dashboard BudgetCard. Empty state on Budgets page lists categories without a budget as "Not budgeted".

### 5.7 Recurring template state
- **Active, not due**: appears in Recurring list under "Active".
- **Active, due**: appears in Recurring list under "Due now" AND surfaces the DueRecurringBanner on Home.
- **Inactive** (`is_active = false`): appears under "Inactive"; no banner; not selectable for confirm flow.
- **Confirmed** (just confirmed in this session): brief checkmark toast; row moves back to "Active" with updated `next_due_date`.

### 5.8 Savings state
- **Goal set, partial progress**: progress bar with computed saved amount.
- **Goal set, fully met** (≥100%): celebratory copy ("Goal hit — ৳X saved!"), but no confetti / no animation. Stays tasteful.
- **Goal set, overshot** (>100%): progress bar fills, label says "Saved ৳X of ৳Y (Z%)" without alarm.
- **No goal set**: SavingsGoalCard doesn't render on Home; Reports → Savings shows empty state ("Set a savings goal for this month").

### 5.9 PWA install state
- **Not yet prompted** + first expense logged: show install prompt as a card on Home with primary CTA "Install PocketPlan" and secondary "Not now".
- **Dismissed this session**: suppressed; surfaces again next session if still eligible.
- **Installed**: prompt hides permanently.
- **Manual install path** in Settings → Install App stays available regardless.

---

## 6 · Interaction Primitives

### 6.1 Tap targets
Minimum 44×44 CSS pixels (WCAG 2.5.5). Spacing between adjacent tap targets ≥8px. List rows are 56–80px tall depending on density.

### 6.2 Gestures
- **Tap**: primary action.
- **Long-press** (≥500ms) on list rows: action sheet (Edit, Delete, Duplicate). Haptic feedback on supported devices.
- **Swipe-to-delete**: not used. Destructive actions always require explicit confirmation (per §5.4). Avoids accidental data loss.
- **Pull-to-refresh**: lists support pull-to-refresh to re-fetch.

### 6.3 Network failure handling
On any failed network request that the user explicitly initiated (save, delete, confirm recurring, sign-in):
1. If online but server returned an error: show inline error or page banner with the API's error message.
2. If offline: show "You're offline. Check your connection and try again." with a Retry button. No silent retry, no background retry.
3. On retry success: surface a toast ("Saved.").

### 6.4 Empty-state illustrations
Each empty-state surface gets a unique illustration (kept simple, monochrome, themed by the surface). Illustrations are token-referenced (`{asset.empty.<surface>}`) so DESIGN.md owns the visual.

### 6.5 PWA install prompt
Browser-default install affordance when available; if the browser doesn't fire `beforeinstallprompt`, fall back to in-app card with manual instructions ("In your browser menu, tap 'Add to Home Screen'").

### 6.6 Theme toggle
Settings → Theme: System / Light / Dark. Stored per-user; applied on next render. No flash of wrong theme on load (token bootstrap runs before paint).

---

## 7 · Accessibility Floor (behavioral)

Visual contrast is owned by DESIGN.md. Behaviorally:

### 7.1 Standards
Target WCAG 2.1 AA. No formal external audit at MVP, but patterns comply.

### 7.2 Screen reader support
- All interactive elements have accessible names (`aria-label` where icon-only).
- Form fields have associated `<label>` elements (no placeholder-only labels).
- Lists use semantic `<ul>/<li>` or `role="list"`.
- Bottom sheets/modals trap focus and announce their open/close state via `aria-modal`.
- Charts include a tabular fallback in a visually-hidden `<table>` for screen readers.

### 7.3 Keyboard
- All actions reachable via Tab in DOM order matching visual order.
- Custom scrollers (CategoryPicker, AccountPicker) are arrow-key navigable.
- Modals trap focus and restore it on close.
- Skip-to-content link on desktop.

### 7.4 Reduced motion
`@media (prefers-reduced-motion: reduce)` disables:
- List enter/exit transitions
- Chart fade-in / translate
- Banner slide-in

Save success confirmation reduces to an instant toast. No content disappears, only animation.

### 7.5 Color independence
Status (budget overage, due recurring) is conveyed by **both** color and an icon/text label. No information is color-only.

### 7.6 Form behavior
- Errors are programmatically associated with fields via `aria-describedby`.
- Submit buttons disable during in-flight requests.
- Required fields announced via `aria-required`.

---

## 8 · Key Flows

Numbered steps per journey, with the climax beat marked **(climax)**. Steps assume the protagonist is signed in, email confirmed, on mobile PWA. Desktop deviations noted in-line.

### 8.1 Naima — the freelancer (recurring + reports + savings)

| Step | Surface | Action | Result |
|---|---|---|---|
| 1 | Home | Opens app Sunday morning. | Sees DueRecurringBanner ("1 recurring expense is due. Review →") and the August budget at 70% with 5 days left. |
| 2 | Home → Reports (by category) | Taps the Transport budget card (95%). | Drills into August Transport expenses — list of rickshaw/Pathao entries. |
| 3 | Reports — Transport | Reviews two Pathao rides from Aug 12. | Confirms one is real, corrects the other (lower amount). |
| 4 | Home | Returns. Taps Savings card. | Sees goal ৳5,000 / saved ৳3,200 (64%). |
| 5 | More → Savings Goals | Sets target for August (already set — no-op). | — |
| 6 | Add Expense | Adds ৳1,800 "Savings" → account "bKash", description "Transfer to savings". | Saves. |
| 7 | Home | Returns. | **Climax:** Savings card now reads ৳5,000 / ৳5,000 (100%). Goal hit copy. |
| 8 | Home | Taps "Review" on the DueRecurringBanner. | Opens ConfirmRecurringSheet for Internet bill (৳1,200). |
| 9 | ConfirmRecurringSheet | Edits nothing, taps Confirm. | Expense saved, `next_due_date` advanced to next month, banner disappears. **Climax for recurring.** |
| 10 | More → Accounts | Opens bKash account. | Edits balance to match her real balance (PRD §7 manual balance). |

### 8.2 Rakib — the student (first run + onboarding + quick-add)

| Step | Surface | Action | Result |
|---|---|---|---|
| 1 | Sign Up | Enters email + password. | Receives confirmation email. |
| 2 | (email) | Clicks confirmation link. | Returns to app, signed in. |
| 3 | Onboarding wizard — Step 1 | "Track your spending in 2 minutes." | Taps Next. |
| 4 | Onboarding — Step 2 | "Where does your money live?" | Types "Cash", saves. Balance field shown, he types ৳2,400. |
| 5 | Onboarding — Step 3 | "Set a budget for your biggest category." | Sets Food = ৳6,000. |
| 6 | Onboarding — Step 4 | "Add your first expense." | **Climax:** numeric keypad appears. Types ৳120, picks Food, picks Cash, "Lunch at canteen". Saves. Empty Expenses list now shows one entry. |
| 7 | Home | Returns to dashboard. | Sees this-month total ৳120, Food budget at 2%, recent expense below. PWA install prompt appears (he's logged his first expense). |
| 8 | Home | Dismisses install prompt ("Not now"). | Suppressed for session; surfaces again tomorrow. |
| 9 | (later, on bus) | Quick-add: ৳40, Transport, Bus. | Second entry appears on Expenses list. |

### 8.3 Salma — the family manager (custom category + budgets + multi-user isolation)

| Step | Surface | Action | Result |
|---|---|---|---|
| 1 | Home | Opens app, dashboard shows her August totals across Cash / City Bank / bKash. | — |
| 2 | More → Categories | Adds custom category "School" with 🎒 emoji. | Appears in CategoryPicker. |
| 3 | More → Budgets → September | Sets Groceries ৳15,000, School ৳8,000, Utilities ৳4,000. | Budgets saved; BudgetCards on Home update next month. |
| 4 | Add Expense | Logs ৳3,200, Groceries, City Bank, "Weekly shop at Agora". | Saves. |
| 5 | Reports — By Account | Reviews spending per account for August. | — |
| 6 | (husband picks up her phone) | Husband signs out, signs in with his own credentials. | **Climax:** his dashboard shows his own data. Salma's accounts, expenses, and goals are not visible. PRD §9 row-level scoping confirmed. |

---

## 9 · Out-of-scope behaviors (explicit non-features)

These are intentionally not built for MVP. Listed here so they don't get invented later as accidents:

- No offline reads, writes, or sync (§2.7).
- No Web Push notifications (in-app only for recurring).
- No social login, no magic-link-only auth.
- No receipt OCR, no AI categorization, no bank integrations (PRD §11).
- No income / deposit tracking — account balances are user-set, never auto-updated (PRD §7).
- No multi-currency, no currency selector (৳ BDT hardcoded).
- No sharing external URLs to expenses.
- No customizable dashboard widgets (locked monthly snapshot).
- No data export (CSV / PDF) at MVP.
- No account-level categories shared across users (categories are per-user, per PRD §7).
- No animated onboarding tour beyond the 4-step wizard.
- No multi-organization / multi-tenant support (per PRD §11 deferred).
- No self-service email change (email is owned by Supabase Auth — Settings → Profile surfaces it as read-only with a 'Change email' link that initiates the Supabase re-confirmation flow).

---

## 10 · Open assumptions

All `[ASSUMPTION]` items raised during Discovery have been resolved. None remain open.

---

## 11 · Invented sections (product-specific concerns)

The SKILL.md invites sections for product-specific concerns beyond the canonical spine. The following are added here:

- **§5.5 Auth state** — email-confirmation state is significant for this PRD's Supabase Auth flow.
- **§5.9 PWA install state** — the PRD commits to PWA install; the state machine matters.
- **§9 Out-of-scope behaviors** — explicit non-feature list to prevent scope creep in implementation.
- **§10 Open assumptions** — surfaced separately from decisions so they can be triaged.

Visual identity (DESIGN.md) cross-references: `{color.accent}`, `{color.warning}`, `{color.danger}`, `{color.surface}`, `{color.text}`, `{components.tabbar.mobile}`, `{components.budgetCard}`, `{components.expenseRow}`, `{components.savingsGoalCard}`, `{components.banner.recurringDue}`, `{components.sheet.confirmRecurring}`, `{components.categoryScroller}`, `{components.chart}`, `{components.button}`, `{components.toast}`, `{components.appbar}`, `{components.tabbar.mobile}`, `{components.badge.due}`, `{asset.empty.<surface>}`, `{layout.appbarHeight.mobile}`, `{layout.appbarHeight.desktop}`, `{layout.breakpoint.sm|md|lg}`.