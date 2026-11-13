# PocketPlan — Personal Expense Tracker
## Product Requirements Document — v3 (Finalized)

**Date:** August 30, 2026
**Status:** Locked — all v2 open items resolved. This is the working reference for implementation planning.

---

## 1. Revision Note

v3 incorporates the confirmations made on the six open items raised in v2, Section 10:

| # | Item | Decision |
|---|---|---|
| 1 | Auth mechanism | Supabase Auth — holds as previously agreed |
| 2 | Mobile / PWA | Confirmed in scope — PWA now, Capacitor wrap for app stores later |
| 3 | Savings goals | Confirmed — added back into scope |
| 4 | ORM | Prisma — confirmed |
| 5 | Recurring expenses | Reminder + manual-confirm model, not automatic generation |
| 6 | Account balances | No strong preference given ("best choice") — see the decision note in Section 7; flagged as my judgment call, not your explicit instruction |

**One additional correction:** currency was inadvertently dropped when v2 was written. v1 had locked a single hardcoded currency (৳ BDT) for MVP; that was never revisited or reversed, so it's restored here rather than silently left out a second time.

---

## 2. Project Overview

A personal expense tracker application where users can securely record, categorize, and monitor their daily expenses, set budgets, and view spending summaries and reports.

---

## 3. Goals

- Let users record and categorize expenses quickly and accurately.
- Let users organize their money across multiple accounts/wallets.
- Let users set monthly budgets per category.
- Let users compare planned vs actual spending.
- Let users set savings goals and track progress toward them.
- Let users view visual summaries and reports of their spending.
- Support recurring expenses so users don't have to re-enter the same expense every period.
- Be usable as an installed app on mobile, not just in a desktop browser.

---

## 4. Target Users

Students, young professionals, families, freelancers — anyone who wants to manage a personal monthly budget.

---

## 5. Technology Stack

### Frontend
- React / Next.js
- Installable as a **PWA** (manifest + service worker) for the mobile experience now
- **Capacitor wrap planned for a later phase** to distribute via App Store / Play Store — same codebase, no rebuild
- Communicates with the backend exclusively via REST API — no direct database access from the frontend

### Backend
- Node.js runtime, with **NestJS** as the application framework
- REST API modules: `Auth`, `Users`, `Accounts`, `Categories`, `Budgets`, `Expenses`, `Recurring Expenses`, `Savings`, `Reports`
- **ORM: Prisma** (confirmed)

### Database
- **Supabase** (managed PostgreSQL)
- Entities: Users, Accounts/Wallets, Categories, Budgets, Expenses, Recurring Expenses, Savings Goals
- **Currency:** single currency, ৳ BDT, hardcoded for MVP (restored from v1 — see Section 1)
- Data integrity enforced with foreign keys, indexes, and constraints
- Transactions used for any operation that writes to more than one table

---

## 6. Core Modules & Features

### 6.1 Auth  *(confirmed)*
Register, login, logout, password reset via **Supabase Auth** (managed, JWT-based). NestJS validates the token on protected routes; no custom credential storage.

### 6.2 Users
Profile data (name, email, preferences). One user has many Accounts, Categories, Budgets, Expenses, and Savings Goals.

### 6.3 Categories
Default categories seeded per user at signup (Food, Transport, Bills, Shopping, Health, Education, Entertainment, Savings, Miscellaneous). Custom categories supported, each with a name and an icon.

### 6.4 Accounts / Wallets
Represents where money is held or spent from (Cash, Bank, Card, Mobile Wallet, Other). Every expense links to exactly one account.

### 6.5 Budgets
User sets a planned amount per category, per month. Planned-vs-actual is computed by comparing Budgets against Expenses for the same category and month.

### 6.6 Expenses
Full CRUD. Fields: amount, category, account, date, description.

### 6.7 Recurring Expenses  *(confirmed: reminder model, not auto-generated)*
A saved template (category, account, amount, description, frequency, `next_due_date`). When `next_due_date` has passed and the template is active, it surfaces as a **due reminder** — the user reviews it (fields are editable) and taps **Confirm** to create an actual expense row. Confirming also advances `next_due_date` to the next occurrence based on frequency. No background job is required for MVP — "due" status is simply computed by comparing `next_due_date` to today whenever the list is read.

### 6.8 Savings Goals  *(confirmed: added back)*
A `savings_goals` row holds a target amount for the month. The **saved amount is not entered separately** — it's derived by summing that month's expenses logged under the "Savings" category, the same approach locked in v1. This keeps one source of truth instead of two numbers that can drift apart.

### 6.9 Reports
Spending by category, spending by account, monthly trend, budget utilization (planned vs actual), and savings progress — visualized on the dashboard.

---

## 7. Database Schema

### `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | References `auth.users.id` (Supabase Auth) |
| name | text | |
| email | text | Kept in sync with auth provider |
| created_at / updated_at | timestamp | |

### `accounts`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| name | text | e.g. "Cash", "City Bank", "bKash" |
| type | enum | Cash / Bank / Card / Mobile Wallet / Other |
| balance | numeric | **Manually adjustable / informational** — see decision note below |
| created_at / updated_at | timestamp | |

> **Decision note — account balance (item 6):** no income or deposit tracking exists anywhere in this PRD's scope — only expenses reduce money. An automatic running ledger fed by outflows alone would just count down from whatever value it started at, which wouldn't reliably reflect a real balance and could mislead more than help. Recommendation: treat `balance` as a field the user sets and updates themselves (e.g., syncing it with their real bank or mobile-wallet balance periodically), rather than simulate a ledger the current data model can't actually support accurately. If income/deposit tracking is added later, this can be revisited and turned into a true computed running ledger — flagged as a new deferred item in Section 11.

### `categories`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| name | text | UNIQUE per (user_id, name) |
| icon | text | Emoji string |
| created_at | timestamp | |

### `budgets`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| category_id | uuid, FK → categories.id | |
| month / year | int | UNIQUE per (user_id, category_id, month, year) |
| planned_amount | numeric | |
| created_at / updated_at | timestamp | |

### `expenses`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| account_id | uuid, FK → accounts.id | |
| category_id | uuid, FK → categories.id | |
| amount | numeric | |
| description | text | |
| expense_date | date | |
| created_at / updated_at | timestamp | |

### `recurring_expenses`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| account_id | uuid, FK → accounts.id | |
| category_id | uuid, FK → categories.id | |
| amount | numeric | |
| description | text | |
| frequency | enum | Daily / Weekly / Monthly / Yearly |
| start_date / next_due_date | date | `next_due_date` drives the reminder |
| is_active | boolean | |
| created_at / updated_at | timestamp | |

### `savings_goals`  *(new)*
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| month / year | int | UNIQUE per (user_id, month, year) |
| target_amount | numeric | |
| created_at / updated_at | timestamp | |

*(`saved_amount` is not a stored column — computed as `SUM(expenses.amount)` where the expense's category is "Savings" and `expense_date` falls in that month/year, for that user.)*

### Indexes, Constraints & Transactions
- Foreign keys on every `*_id` column, with `ON DELETE CASCADE` for user-owned data.
- Composite index on `expenses(user_id, expense_date)` — the most common query pattern.
- Indexes on `expenses(category_id)` and `expenses(account_id)` for report aggregation.
- Unique constraints as noted per table above.
- Any write touching more than one table (e.g., confirming a recurring expense: insert into `expenses` + update `recurring_expenses.next_due_date`) is wrapped in a database transaction.

---

## 8. API Surface (high level)

| Route prefix | Purpose | Auth required |
|---|---|---|
| `/auth` | Register, login, logout, refresh, password reset | No (except refresh/logout) |
| `/users` | Get/update profile | Yes |
| `/accounts` | CRUD for wallets/accounts | Yes |
| `/categories` | CRUD for categories | Yes |
| `/budgets` | Set/get planned amounts per category per month | Yes |
| `/expenses` | CRUD, filterable by date range / category / account | Yes |
| `/recurring-expenses` | CRUD, manage schedule; `?due=true` lists templates currently due | Yes |
| `/recurring-expenses/:id/confirm` | Creates an expense from the template, advances `next_due_date` | Yes |
| `/savings-goals` | Get/set monthly target; response includes computed `saved_amount` | Yes |
| `/reports` | Aggregated summaries for dashboard and charts | Yes |

---

## 9. Non-Functional Requirements

- All financial data is scoped strictly to the authenticated user (row-level access control).
- Input validation on every write endpoint (`class-validator` in NestJS).
- Consistent error response shape across the whole API.
- Database transactions for any multi-table write.
- Environment-based configuration — no secrets committed to source control.
- PWA offline behavior (what works without a connection) is a design decision for the implementation phase, not fixed here.

---

## 10. Confirmed Decisions Log

| # | Item | Status |
|---|---|---|
| 1 | Auth mechanism | Supabase Auth — **confirmed** |
| 2 | Mobile / PWA | In scope, PWA → later Capacitor wrap — **confirmed** |
| 3 | Savings goals | Added back — **confirmed** |
| 4 | ORM | Prisma — **confirmed** |
| 5 | Recurring expenses | Reminder + manual confirm, not auto-generated — **confirmed** |
| 6 | Account balance | Manually adjustable / informational — **recommendation, flagged** (see Section 7) |
| — | Currency | ৳ BDT, hardcoded — **restored** from v1 (was omitted from v2 by mistake) |

---

## 11. Explicitly Out of Scope / Deferred

AI features · Receipt scanning · Bank integrations · Cryptocurrency tracking · Social features · Multi-organization support · Voice input · Financial advice engine · Multi-currency support · **Income/deposit tracking** *(new — would be required for a true auto-updating account balance ledger, see Section 7)*

---

## 12. Roadmap

| Phase | Scope |
|---|---|
| 0 | Infra: repo setup, NestJS scaffold, Next.js scaffold, Supabase project, Prisma schema |
| 1 | Auth |
| 2 | Accounts/Wallets + Categories |
| 3 | Budgets |
| 4 | Expenses (full CRUD) |
| 5 | Recurring Expenses (reminder + confirm flow) |
| 6 | Savings Goals |
| 7 | Reports & Dashboard |
| 8 | PWA polish: manifest, service worker, install prompts |
| 9 | Capacitor wrap (deferred/optional) — app store distribution |
| 10 | Testing, validation, deployment |

---

## 13. Change Log

- **v1** — Initial finalized PRD (Next.js full-stack + PWA + Capacitor plan).
- **v2** — Fresh rewrite: separate NestJS backend, Accounts/Wallets, Recurring Expenses added; several v1 items (mobile, savings) omitted pending confirmation.
- **v3** — Finalized: all v2 open items resolved (auth, mobile, savings, ORM, recurring-expense model, account-balance policy); currency restored after being dropped in v2 by mistake.