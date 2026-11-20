# Step 18: AI: plain-language entry & auto-categorize

**Status:** ✅ Done (wrapped up 2026-11-20) · **PRD:** 6.14, 6.15, 11 · **Depends on:** Step 17

> Built 2026-11-20.
> - **Provider:** Google Gemini (AI Studio key) instead of Anthropic Claude, by choice. Settings in `apps/api/.env`: `GEMINI_API_KEY`, optional `AI_MODEL` (default `gemini-2.5-flash`) and `AI_TIMEOUT_MS` (default 10000). With no key, the AI calls answer "not set up" and every form still works by hand. The model sits behind `AiProvider` (`apps/api/src/ai/`), so another provider can be added later without touching the rest.
> - **API:** `POST /ai/parse-expense` (`{text, today?, groupId?}`) and `POST /ai/categorize` (`{description, groupId?}`). Both return 200 and write nothing. Without `groupId` you get a personal suggestion: amount, description, category, wallet, date, and the group, when the sentence names one of yours. With `groupId` you get a shared one: amount, description, category key, date, who paid, split type, and who's in it with their values.
> - **Safety:** the model only sees your own categories, wallets, groups and active group members, and your sentence goes in fenced as data. Every answer is checked before it reaches the form: ids that weren't offered, future or impossible dates, and amounts that are zero, negative or too large are dropped. Each user gets 20 AI calls a minute. Timeouts, quota limits and failures come back as 503/502 with a message the form shows.
> - **Web:** manual entry comes first. Both Add expense and Add shared expense open on the normal form; a small **Ask AI** pill in the header opens (and closes) one chat-style box kept to a single row: the sentence, a mic, and a round send button. Enter sends, Shift+Enter adds a line, Escape closes it. The AI fills only the fields the sentence gave; the box then shrinks to a one-line summary ("Filled amount, category and date") with **Undo** (puts the form back). The user checks the form and taps Save. When a personal sentence mentions a group, a link offers "Add it to <group>", which opens that group's form with Ask AI open and the sentence already typed. When you leave the description field with no category picked, a "Suggested: <category> · Use" chip appears; it only applies when tapped.
> - **Voice input (added 2026-11-20 at your request; PRD §14 had deferred it):** a mic button in the Ask AI box uses the browser's own speech-to-text (Web Speech API), so no new server code or cost. The words appear in the box as you speak; you check them and send. One quiet line under the box ("Voice: EN · BN", the active one highlighted, Bangla by default) switches the listening language (remembered on that device). Works in Chrome, Edge and Safari; the mic is hidden where the browser can't do it (e.g. Firefox). Chrome and Edge send the audio to Google/Microsoft to transcribe. Code: `apps/web/src/lib/use-speech.ts`.
> - **Recurring expenses (added 2026-11-20 at your request):** the same Ask AI pill and box on "New recurring expense". `POST /ai/parse-recurring` (`{text, today?}`) returns name, amount, category, wallet, **how often** (daily/weekly/monthly/yearly) and the **first due date**. Unlike a spent expense, that date may be ahead of today, within a year either way ("on the 5th" = the next 5th). The same answer checks apply, nothing is saved, and Undo puts the form back. Not offered when editing.
> - **Tests:** `src/ai/*.spec.ts` (answer checks, rate limit, and the Gemini client with the network mocked: key in a header, timeout, quota, bad answers) and `test/ai.e2e-spec.ts` with a fake AI (suggestions, dropped bad ids, group members only, non-member refused, errors, nothing saved, manual entry still works, rate limit).

## Goal
Add an expense by typing a sentence, and get a suggested category for typed descriptions.

## Tasks
1. **AI module (API, server only):** wraps the AI provider (*Gemini, see above*).
   - API key and model from environment variables. Nothing hard-coded or committed.
   - A request timeout (e.g. 10 seconds) and a clear error. Easy to replace with a fake in tests.
2. `POST /ai/parse-expense`: text in; suggested amount, category, description, and split type out (including which group, when the user mentions one).
3. `POST /ai/categorize`: description in; suggested category out.
4. **Web:** a "Type it" box on Add Expense. The suggestion fills the normal form for the user to check and edit. **Nothing is saved until the user taps Save.** If the AI fails, the manual form still works.
5. Tests with a fake AI provider: suggestion handling, timeout, AI failure, and that nothing is saved without confirmation.

## Rules (PRD 11)
AI results are suggestions only. They're never saved automatically, and no workflow depends on the AI working.

## Done when
- [ ] Typing a sentence produces a form the user can edit; manual entry still works when the AI is down *(API tests pass; waiting for your check in the app)*
- [ ] A category suggestion appears for typed descriptions and can always be changed *(waiting for your check)*
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass *(lint, type check, unit and e2e tests pass; `next build` not run, because it clashes with the running dev server)*
