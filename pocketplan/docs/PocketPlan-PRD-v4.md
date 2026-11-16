# PocketPlan — Collaborative Expense & Budgeting Platform

**Product Requirements Document — v4 (End-to-End, Option D)**

Date: September 2, 2026
Status: Draft for review — supersedes v3. Carries forward the locked single-user scope and adds collaborative groups, expense splitting, settlements, and an AI layer, per the Option D direction selected after the R&D and product-options review.

---

## 1. Revision Note (v4)

v3 locked a single-user personal expense tracker. Before writing more of the PRD, a separate R&D pass was run to evaluate whether PocketPlan should stay a personal tracker, and to identify where AI would solve a real problem rather than being added for its own sake. Four directions were compared — (A) an enhanced personal tracker, (B) an AI-powered personal assistant, (C) a collaborative group-finance platform, and (D) collaborative finance with an AI layer on top. Option D was selected: it is the only direction that addresses the shared-living use case (roommates, families, trip groups, shared subscriptions) that motivated this expansion, while still using AI where it demonstrably reduces friction (natural-language entry, categorization, anomaly detection) rather than as decoration.

This document folds the full v3 scope in unchanged where nothing changed, and adds the new collaborative and AI-layer requirements needed to build Option D. Nothing below removes a v3 decision; Section 13 lists the decisions this revision adds on top of the v3 log.

- **Carried forward unchanged:** Auth, Users, Categories, Accounts/Wallets, Budgets, Recurring Expenses, Savings Goals, Reports, single hardcoded currency (৳ BDT), tech stack (Next.js / NestJS / Prisma / Supabase).
- **Extended:** Expenses (now optionally scoped to a group and a payer distinct from the recording user).
- **New in this revision:** Groups, Group Members, Expense Participants (splitting), Settlements, AI natural-language expense entry, AI auto-categorization, AI monthly insights, AI anomaly & duplicate detection, AI recurring-pattern detection.

---

## 2. Project Overview

PocketPlan is a collaborative expense and budgeting application. Individuals record, categorize, and budget their own spending exactly as in v3 — that path is unchanged. On top of it, any user can create or join a **group** (a shared mess or apartment, a trip, a household, a set of shared subscriptions) and log expenses that are automatically split among the people who benefited, with the app continuously tracking who owes whom and simplifying that into the fewest possible settlement payments. An AI layer, built on the Anthropic Claude API, sits across both personal and group expenses: it can turn a plain-language description into a structured expense, suggest a category, flag an unusual or duplicate entry, notice a recurring pattern, and generate a short monthly summary grounded in the user's actual numbers.

Personal expenses are not a separate code path from group expenses — a personal expense is simply an expense with no group attached and the recording user as its only participant. This keeps the data model and the splitting/settlement logic identical for both cases (see Section 8 and Section 9).

---

## 3. Goals

### Carried forward from v3
- Let users record and categorize expenses quickly and accurately.
- Let users organize their money across multiple accounts/wallets.
- Let users set monthly budgets per category.
- Let users compare planned vs actual spending.
- Let users set savings goals and track progress toward them.
- Let users view visual summaries and reports of their spending.
- Support recurring expenses so users don't have to re-enter the same expense every period.
- Be usable as an installed app on mobile, not just in a desktop browser.

### New in v4
- Let a group of people (roommates, family, trip companions) log shared expenses and know at any moment who owes whom.
- Reduce N-way IOUs to the minimum number of settlement payments automatically.
- Let users add an expense by typing a plain-language description instead of filling a form.
- Auto-suggest a category and split for a new expense, always editable before saving.
- Surface likely duplicate entries and detected recurring patterns without the user having to notice them manually.
- Generate a short, plain-language monthly summary and next-month forecast grounded in the user's real numbers.

---

## 4. Target Users & Use Cases

Students, young professionals, families, and freelancers managing a personal budget (unchanged from v3), plus groups of people who share recurring costs. The R&D pass evaluated a wide set of shared-living scenarios and narrowed to the ones that share one data model and justify the build:

| Use case | In scope for v4? | Why |
|---|---|---|
| Roommates / shared mess or apartment | Yes | Primary motivating scenario; highest expected usage frequency. |
| Families / couples | Yes | Same group primitive at smaller scale; doubles as personal budgeting for two. |
| Friends travelling together | Yes (BDT only) | Same splitting primitive; multi-currency deferred, see Section 14. |
| Shared subscriptions (Netflix, Spotify, etc.) | Yes | Recurring expense + group split combined; low effort, high delight. |
| Office / team expense reimbursement | No | Different problem: approval workflows and reimbursement policy, not group splitting. |
| Generic "small communities" / event finance | No | Too undefined to design against; a smaller instance of the group primitive already covers real cases. |

> **Note:** one general-purpose group primitive (members, shared expenses, flexible split, settlement) is built once and reused for every in-scope scenario above, rather than special-casing "mess mode" or "trip mode."

---

## 5. Technology Stack

### Frontend (unchanged)
- React / Next.js.
- Installable as a PWA (manifest + service worker) for the mobile experience now.
- Capacitor wrap planned for a later phase to distribute via App Store / Play Store — same codebase, no rebuild.
- Communicates with the backend exclusively via REST API.

### Backend (extended)
- Node.js runtime, with NestJS as the application framework.
- REST API modules: Auth, Users, Accounts, Categories, Budgets, Expenses, Recurring Expenses, Savings, Reports, **Groups, Settlements (new), AI (new)**.
- ORM: Prisma (confirmed, unchanged).
- **New:** an AI module wrapping the Anthropic Claude API (Messages endpoint) for natural-language parsing, categorization suggestions, and insight generation. All AI calls are server-side; the client never calls the provider directly. Every AI response is treated as a suggestion — nothing is written to the database until the user confirms it.

### Database (extended)
- Supabase (managed PostgreSQL), unchanged.
- Entities: Users, Accounts/Wallets, Categories, Budgets, Expenses, Recurring Expenses, Savings Goals, **Groups, Group Members, Expense Participants, Settlements (new)** — see Section 8.
- Currency: single currency, ৳ BDT, hardcoded for MVP — unchanged; explicitly revisited and re-confirmed rather than silently carried over, because the trip use case (Section 4) is the one scenario that genuinely wants multi-currency. Deferred anyway for v4 — see Section 14.
- Foreign keys, indexes, and constraints; transactions for multi-table writes — unchanged, extended to the new tables.

---

## 6. Core Modules & Features

6.1–6.9 are carried forward from v3 with the noted extensions. 6.10 onward are new in v4.

### 6.1 Auth (unchanged)
Register, login, logout, password reset via Supabase Auth (managed, JWT-based). NestJS validates the token on protected routes; no custom credential storage.

### 6.2 Users (unchanged)
Profile data (name, email, preferences). One user has many Accounts, Categories, Budgets, Expenses, Savings Goals, and now Group Memberships.

### 6.3 Categories (unchanged)
Default categories seeded per user at signup (Food, Transport, Bills, Shopping, Health, Education, Entertainment, Savings, Miscellaneous). Custom categories supported.

### 6.4 Accounts / Wallets (unchanged)
Represents where money is held or spent from (Cash, Bank, Card, Mobile Wallet, Other). Every expense links to exactly one account.

### 6.5 Budgets (unchanged)
User sets a planned amount per category, per month. Planned-vs-actual is computed by comparing Budgets against Expenses for the same category and month. Groups get their own budget in the same shape — see 6.13.

### 6.6 Expenses (extended)
Full CRUD. Fields: amount, category, account, date, description — plus two new nullable fields: `group_id` (which group this belongs to, if any) and `paid_by` (which member actually paid, if different from the recording user). A personal expense has `group_id = null` and `paid_by = the owner`.

### 6.7 Recurring Expenses (unchanged: reminder model)
A saved template (category, account, amount, description, frequency, next_due_date). When `next_due_date` has passed and the template is active, it surfaces as a due reminder — the user reviews it (fields editable) and taps Confirm to create an actual expense row. No background job is required — "due" status is computed by comparing `next_due_date` to today whenever the list is read.

### 6.8 Savings Goals (unchanged)
A `savings_goals` row holds a target amount for the month. The saved amount is derived by summing that month's expenses logged under the "Savings" category — one source of truth, no two numbers that can drift apart.

### 6.9 Reports (extended)
Spending by category, spending by account, monthly trend, budget utilization, and savings progress. Extended to optionally scope any report to a single group instead of the whole user.

### 6.10 Groups (new)
A named collection of members who share expenses. Any user can create a group and becomes its first member with the owner role. Groups have a name and, optionally, a monthly budget (6.13).

### 6.11 Group Members (new)
Membership of a user in a group, with a role of owner or member. Owners can add or remove members and rename the group; both roles can add expenses and settle up. A user can belong to any number of groups.

### 6.12 Expense Participants / Splitting (new)
When an expense is attached to a group, it records who benefited from it (the participant list) in addition to who paid. MVP supports two split types: **equal** (the amount is divided evenly across the chosen participants) and **just me** (a group-tagged expense with only the payer as participant, for a cost that happened during a trip but wasn't actually shared). Percentage and exact-amount splits are deferred — see Section 14.

### 6.13 Group Budgets & Settlements (new)
Each group can optionally have a monthly planned amount, compared against the sum of that group's expenses — the same planned-vs-actual shape as personal budgets (6.5). Settlements are explicit records of a payment between two members that clears (all or part of) what one owes the other; see Section 9 for how balances and settlements are computed.

### 6.14 AI Natural-Language Expense Entry (new)
The user types a description in plain language (e.g. "paid 1200 for groceries at Shwapno, split evenly with the mess"). The backend sends the text to Claude and receives a structured suggestion — amount, category, short description, and split type — which is shown in an editable form. Nothing is saved until the user confirms.

### 6.15 AI Auto-Categorization (new)
For manually-entered expenses, the description can optionally be sent for a category suggestion, reducing the friction of picking from a dropdown every time. Always overridable.

### 6.16 AI Monthly Insights (new)
On request, the backend assembles the user's actual category totals, budget, and a short prior-period comparison, and asks Claude to produce a short narrative summary, one anomaly note, and one forecast note — grounded in real numbers, not generic advice. Framed as informational, never as prescriptive financial advice (see Section 11 guardrails).

### 6.17 AI Anomaly & Duplicate Detection (new)
Statistical checks (not requiring an LLM call) flag: an expense far outside a category's recent range, and two expenses in the same group with matching amount and near-identical timestamp/description (a likely double-entry, common when two group members log the same purchase).

### 6.18 AI Recurring-Pattern Detection (new)
When the same category, approximate amount, and payer repeat for several consecutive periods without an existing recurring template, the user is prompted to convert the pattern into a Recurring Expense template (6.7) instead of continuing to log it by hand.

---

## 7. End-to-End Workflow

The map below is the full application at a glance: the home dashboard branches into the four main sections, and each section's internal flow is shown underneath it, including the two ways to add an expense (typed and parsed by AI, or filled in manually) and the group settlement chain (split calculation → balance update → debt simplification → settle up).

![PocketPlan end-to-end workflow — home, groups, add expense, insights, and profile.](prd-assets/e2e-workflow-diagram.png)

*Figure 1. PocketPlan end-to-end workflow — home, groups, add expense, insights, and profile.*

Two loops close the workflow back to the numbers the user sees on Home: settling up in a group recomputes that group's balances immediately, and saving any expense (personal or group) updates the relevant totals without a page reload or background job.

---

## 8. Database Schema

Tables carried forward from v3 are listed first, followed by the new tables this revision adds. Field notes for unchanged tables are unchanged from v3.

### users
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | References auth.users.id (Supabase Auth) |
| name | text | |
| email | text | Kept in sync with auth provider |
| created_at / updated_at | timestamp | |

### accounts
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | |
| name | text | e.g. "Cash", "City Bank", "bKash" |
| type | enum | Cash / Bank / Card / Mobile Wallet / Other |
| balance | numeric | Manually adjustable / informational — unchanged v3 decision, see Section 13 |
| created_at / updated_at | timestamp | |

### categories, budgets, recurring_expenses, savings_goals
Unchanged from v3 — categories (name, icon, unique per user); budgets (category + month/year + planned_amount, unique per user/category/month); recurring_expenses (template with frequency and next_due_date); savings_goals (monthly target_amount; saved_amount is computed, not stored, as `SUM(expenses.amount)` where category = "Savings" for that month).

### expenses (extended)
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users.id | The user who recorded the expense |
| account_id | uuid, FK → accounts.id | |
| category_id | uuid, FK → categories.id | |
| amount | numeric | |
| description | text | |
| expense_date | date | |
| group_id | uuid, FK → groups.id, nullable (new) | Null = personal expense |
| paid_by | uuid, FK → users.id, nullable (new) | Who actually paid; defaults to user_id when null |
| created_at / updated_at | timestamp | |

### groups (new)
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| created_by | uuid, FK → users.id | |
| monthly_budget | numeric, nullable | Optional group-level budget, see 6.13 |
| created_at / updated_at | timestamp | |

### group_members (new)
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| group_id | uuid, FK → groups.id | |
| user_id | uuid, FK → users.id | UNIQUE per (group_id, user_id) |
| role | enum | owner / member |
| joined_at | timestamp | |

### expense_participants (new)
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| expense_id | uuid, FK → expenses.id | |
| user_id | uuid, FK → users.id | UNIQUE per (expense_id, user_id) |
| share_amount | numeric | This participant's portion of the expense |

### settlements (new)
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| group_id | uuid, FK → groups.id | |
| from_user_id | uuid, FK → users.id | The member who paid |
| to_user_id | uuid, FK → users.id | The member who received |
| amount | numeric | |
| settled_at | timestamp | |

![New group and split tables and how they relate to the existing expenses table.](prd-assets/group-split-data-model.png)

*Figure 2. New group and split tables and how they relate to the existing expenses table.*

### Indexes, Constraints & Transactions
- Foreign keys on every `*_id` column, with `ON DELETE CASCADE` for user-owned data (unchanged).
- Composite index on `expenses(user_id, expense_date)` — unchanged, still the most common query pattern.
- New: index on `expenses(group_id, expense_date)` for group expense feeds and balance computation.
- New: unique constraint on `group_members(group_id, user_id)` and `expense_participants(expense_id, user_id)`.
- Any write touching more than one table (confirming a recurring expense, saving a split expense across expenses + expense_participants, recording a settlement) is wrapped in a database transaction — unchanged principle, extended to the new multi-table writes.

---

## 9. Split & Settlement Algorithm

This section specifies exactly how a group member's split is calculated and how balances are reduced to a minimal set of payments — the core logic that makes group expenses trustworthy.

### 9.1 Computing each member's share
For every expense, the participant list defaults to all group members (equal split) unless a smaller list was chosen (e.g. "just me"). The payer's balance is credited the full amount; every participant's balance is debited an equal share of the amount:

- `share = amount ÷ number of participants`
- `balance[payer] += amount`
- `balance[participant] -= share`, for every participant (the payer included, if they are also a participant)

This is applied cumulatively across every expense in the group, so a member's running balance is always the net of everything they've paid for the group minus everything they've benefited from, computed fresh from the expense list rather than stored as a separately-maintained counter that could drift out of sync.

### 9.2 Reducing balances to the fewest payments
Without simplification, a group of *n* members could need up to *n×(n−1)/2* separate IOUs to settle fully. PocketPlan runs a greedy debt-simplification pass instead: members with a positive balance (owed money) and members with a negative balance (owing money) are each sorted by amount, and the largest debtor is matched against the largest creditor repeatedly until every balance reaches zero. Each match produces one settlement-shaped payment (from, to, amount); the result is the minimum number of payments needed to clear the group, computed live every time balances are viewed.

### 9.3 Recording a settlement
Tapping Settle on a suggested payment writes one row to `settlements` (from_user_id, to_user_id, amount). A settlement is treated exactly like an expense paid by the debtor with the creditor as its sole participant for the purposes of the balance calculation in 9.1 — no separate code path is needed to make the balance land back at zero for that pair.

---

## 10. API Surface (high level)

### Carried forward from v3
| Route prefix | Purpose | Auth |
|---|---|---|
| /auth | Register, login, logout, refresh, password reset | No* |
| /users | Get/update profile | Yes |
| /accounts | CRUD for wallets/accounts | Yes |
| /categories | CRUD for categories | Yes |
| /budgets | Set/get planned amounts per category per month | Yes |
| /expenses | CRUD, filterable by date range / category / account / group | Yes |
| /recurring-expenses | CRUD; `?due=true` lists templates currently due | Yes |
| /recurring-expenses/:id/confirm | Creates an expense from the template, advances next_due_date | Yes |
| /savings-goals | Get/set monthly target; returns computed saved_amount | Yes |
| /reports | Aggregated summaries for dashboard and charts; optional `?group_id` filter (new) | Yes |

### New in v4
| Route prefix | Purpose | Auth |
|---|---|---|
| /groups | Create/list groups the user belongs to | Yes |
| /groups/:id/members | Add/remove members, change role | Yes |
| /groups/:id/expenses | CRUD for expenses scoped to this group, with participant split | Yes |
| /groups/:id/balances | Computed per-member balances and simplified settlement suggestions | Yes |
| /groups/:id/settlements | Record a settlement between two members | Yes |
| /ai/parse-expense | Send free text, receive a structured expense suggestion | Yes |
| /ai/categorize | Send a description, receive a category suggestion | Yes |
| /ai/insights | Generate the monthly summary/anomaly/forecast panel for a user or group | Yes |

---

## 11. AI Feature Specification & Guardrails

Every AI feature below follows the same contract: the backend calls the Anthropic Claude API server-side, the response is treated as a suggestion, the user reviews and can edit it, and nothing is written to the database until the user confirms. If the AI call fails or times out, the user always has a manual fallback — no workflow is AI-only.

| Feature | Real-world problem it solves | Guardrail / fallback |
|---|---|---|
| NL expense entry | Manual form-filling is the top reason people abandon expense apps. | Parsed fields shown in an editable card before saving; falls back to the manual form on failure. |
| Auto-categorization | Repeated manual category selection for every entry. | Always overridable; never blocks saving. |
| Monthly insights | Raw charts go unread; users want to know what changed and why. | Grounded only in the user's real numbers; phrased as informational, never as prescriptive financial advice. |
| Anomaly detection | Typos and genuine spikes both go unnoticed in a long list. | Statistical, not LLM-based — fast, deterministic, no external call required. |
| Duplicate detection | Two group members independently logging the same purchase. | Flagged, never auto-deleted; the user decides which entry (if either) to remove. |
| Recurring-pattern detection | Users forget to convert a repeating cost into a template. | A suggestion only; declining it has no effect on existing data. |

> **Note:** no AI feature in this revision gives individualized financial advice (e.g. "you should invest in X"). A prescriptive financial-advice engine remains explicitly out of scope — see Section 14.

---

## 12. Non-Functional Requirements

### Carried forward from v3
- All financial data is scoped strictly to the authenticated user (row-level access control).
- Input validation on every write endpoint (class-validator in NestJS).
- Consistent error response shape across the whole API.
- Database transactions for any multi-table write.
- Environment-based configuration — no secrets committed to source control.
- PWA offline behavior is a design decision for the implementation phase, not fixed here.

### New in v4
- Group data is scoped to members of that group only (row-level access control extended to group_id membership, not just user_id ownership) — a user must never be able to read a group's expenses without an active group_members row.
- Every AI endpoint has a request timeout with a clear failure state in the client; the app never appears to hang waiting on an external model call.
- AI responses are never persisted directly — only what the user explicitly confirms is written to the database.
- Settlement and balance calculations must be covered by automated tests before any group feature ships — money-correctness bugs are the highest-trust-cost failure mode in this product.

---

## 13. Confirmed Decisions Log

### From v3 (unchanged)
| # | Item | Decision |
|---|---|---|
| 1 | Auth mechanism | Supabase Auth — confirmed |
| 2 | Mobile / PWA | In scope, PWA → later Capacitor wrap — confirmed |
| 3 | Savings goals | Added back — confirmed |
| 4 | ORM | Prisma — confirmed |
| 5 | Recurring expenses | Reminder + manual confirm — confirmed |
| 6 | Account balance | Manually adjustable / informational — recommendation, flagged |
| — | Currency | ৳ BDT hardcoded — restored from v1 |

### New in v4
| # | Item | Decision |
|---|---|---|
| 7 | Product direction | Option D (collaborative groups + AI layer) selected over a single-user-only or collaboration-only path, after evaluating four options — see Section 1. |
| 8 | Personal vs. group data model | One expenses table serves both; a personal expense is a group-less expense with the owner as sole participant, rather than a separate schema. |
| 9 | Split types for MVP | ~~Equal split and "just me" only.~~ **Revised 2026-11-16:** four methods ship: equal (one person = "just me"), exact amounts, percentages, and shares. Shares are stored per person in taka, so balances (§9) work the same for all four. |
| 10 | Currency for groups | Stays ৳ BDT only for v4, including the trip use case, despite that being the one scenario that would benefit most from multi-currency — explicitly deferred, not overlooked. |
| 11 | AI provider | Anthropic Claude API, called server-side only; every AI output is a suggestion, never auto-saved. |
| 12 | Build sequencing | Collaborative core (groups, splitting, settlement) ships and is tested before any AI feature is layered on — money-correctness first, intelligence second. See Section 15. |

---

## 14. Explicitly Out of Scope / Deferred

AI features and collaborative expense management — both listed as deferred in v3 — are now in scope as of this revision and are removed from this list. Everything below remains deferred:

- Receipt scanning.
- Bank integrations.
- Cryptocurrency tracking.
- Multi-organization support (a group is not a company/org construct).
- Voice input.
- Prescriptive financial advice engine (AI insights remain informational only — see Section 11).
- Multi-currency support, including for the trip use case (Section 4) — the scenario most likely to want it, deferred anyway to keep v4 shippable.
- Income/deposit tracking (would be required for a true auto-updating account-balance ledger).
- Percentage or exact-amount custom expense splits (equal split and "just me" only for MVP).
- Push notifications for smart reminders (the reminder banner is computed on load, not delivered via push, for v4).

---

## 15. Roadmap

Phases 0–8 are the original v3 sequence (personal tracker). Phase 9 onward is the v4 addition, deliberately sequenced so the collaborative core is correct and tested before AI is layered on top, per Decision 12.

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
| 9 (new) | Groups & Group Members: schema, membership API, group creation/join UI |
| 10 (new) | Expense splitting: expense_participants, equal / just-me split, group expense feed |
| 11 (new) | Balances & settlement: Section 9 algorithm, settlements table, Settle Up UI — fully tested before moving on |
| 12 (new) | AI layer, stage 1: natural-language expense entry, auto-categorization |
| 13 (new) | AI layer, stage 2: anomaly detection, duplicate detection, recurring-pattern detection |
| 14 (new) | AI layer, stage 3: monthly insights (summary, anomaly note, forecast) |
| 15 | Capacitor wrap (deferred/optional) — app store distribution |
| 16 | Testing, validation, deployment |

---

## 16. Change Log

- **v1** — Initial finalized PRD (Next.js full-stack + PWA + Capacitor plan).
- **v2** — Fresh rewrite: separate NestJS backend, Accounts/Wallets, Recurring Expenses added; several v1 items (mobile, savings) omitted pending confirmation.
- **v3** — Finalized: all v2 open items resolved (auth, mobile, savings, ORM, recurring-expense model, account-balance policy); currency restored after being dropped in v2 by mistake.
- **v4 (this document)** — End-to-end revision following the Option D R&D pass: added Groups, Group Members, Expense Participants, Settlements, and an AI layer (natural-language entry, categorization, insights, anomaly and duplicate detection, recurring-pattern detection). Added the split & settlement algorithm spec (Section 9), the end-to-end workflow diagram (Section 7), and the group/split data model diagram (Section 8). Re-sequenced the roadmap so the collaborative core ships and is tested before AI features are layered on.