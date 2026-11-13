# Step 18: Smart checks: unusual, duplicate & repeating expenses

**Status:** ⏳ Not started · **PRD:** 6.17, 6.18 · **Depends on:** Step 17

## Goal
Point out expenses that look wrong or repeat. These checks are plain statistics: **no AI call** is needed.

## Tasks
1. **Unusual amount:** flag an expense far outside that category's recent range (e.g. compared with the median of the last 3 months).
2. **Possible duplicate:** in a group, two expenses with the same amount, close in time, and with a similar description (e.g. two members logged the same purchase). **Only flag it; never delete.** The user decides.
3. **Repeating expense:** the same category, a similar amount, and the same payer for several periods in a row, with no recurring template → suggest "Turn this into a recurring expense?" Saying no changes nothing.
4. **Web:** small flags on affected expenses and a suggestions card on Home. Each can be dismissed, and a dismissed suggestion stays hidden.
5. Unit tests for each rule, including cases that must **not** be flagged.

## Done when
- [ ] All three checks work on personal and group data
- [ ] Every flag can be dismissed; nothing changes automatically
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
