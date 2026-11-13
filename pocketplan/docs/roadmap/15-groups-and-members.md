# Step 15: Groups & members

**Status:** ⏳ Not started · **PRD:** 6.10, 6.11, 12 · **Depends on:** Step 14

## Goal
Real groups saved in the database and linked to real user accounts, replacing the browser-only demo group.

## Tasks
1. **Data:** use the existing `groups` and `group_members` tables. Adjust them with a migration if anything is missing.
2. **API:**
   - `POST /groups` (the creator becomes OWNER), `GET /groups` (only groups I belong to), `GET /groups/:id`, `PATCH /groups/:id` (rename; owner only).
   - `POST /groups/:id/members` (add an existing user by email), `DELETE /groups/:id/members/:userId`, `PATCH` to change role. Owner only.
   - Members can leave a group. A member who has expenses or settlements can't be removed (same rule as the demo).
3. **Access control (PRD 12):** every group route checks that the caller is a member. Non-members get 404, so they can't even tell the group exists. Extend the row-level security rules from Step 11 to the group tables.
4. **Web:** a **Groups** list, a create-group sheet, and a Members tab connected to the API. The **Groups** item in the navigation opens the list. Keep `/groups/demo` working until Step 17.
5. Tests: membership rules, owner-only actions, a non-member trying to read a group.

## Out of scope
Group expenses (Step 16), balances (Step 17), email or link invites.

## Done when
- [ ] Users can create groups and add or remove members by email
- [ ] Non-members can't see or change a group (tested)
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
