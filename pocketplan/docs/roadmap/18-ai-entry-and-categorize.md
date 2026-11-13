# Step 18: AI: plain-language entry & auto-categorize

**Status:** ⏳ Not started · **PRD:** 6.14, 6.15, 11 · **Depends on:** Step 17

## Goal
Add an expense by typing a sentence, and get a suggested category for typed descriptions.

## Tasks
1. **AI module (API, server only):** wraps the Anthropic Claude API.
   - API key from the `ANTHROPIC_API_KEY` environment variable and model from `AI_MODEL`. Nothing hard-coded or committed.
   - A request timeout (e.g. 10 seconds) and a clear error. Easy to replace with a fake in tests.
2. `POST /ai/parse-expense`: text in; suggested amount, category, description, and split type out (including which group, when the user mentions one).
3. `POST /ai/categorize`: description in; suggested category out.
4. **Web:** a "Type it" box on Add Expense. The suggestion fills the normal form for the user to check and edit. **Nothing is saved until the user taps Save.** If the AI fails, the manual form still works.
5. Tests with a fake AI provider: suggestion handling, timeout, AI failure, and that nothing is saved without confirmation.

## Rules (PRD 11)
AI results are suggestions only. They're never saved automatically, and no workflow depends on the AI working.

## Done when
- [ ] Typing a sentence produces a form the user can edit; manual entry still works when the AI is down
- [ ] A category suggestion appears for typed descriptions and can always be changed
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
