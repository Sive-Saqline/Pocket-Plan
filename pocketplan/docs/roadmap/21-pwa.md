# Step 21: Installable app (PWA)

**Status:** ⏳ Not started · **PRD:** 5, Phase 8 · **Depends on:** Step 20 (uses the icons from Step 10)

## Goal
PocketPlan can be installed on a phone's home screen and feels like an app.

## Tasks
1. A web app manifest: name, theme colours, and the icons already in `apps/web/public/icons/` (Step 10).
2. A service worker: cache the app files so it opens quickly and shows a friendly "You're offline" screen. **Decide and write down** what works offline. The recommended minimum is viewing only, with no offline saving (PRD 12 leaves this to the implementation).
3. An "Install app" prompt, and instructions for iOS Safari.
4. Check it on a real Android phone and an iPhone.

## Out of scope
Push notifications and the Capacitor app-store wrap (both deferred).

## Done when
- [ ] Installs on Android and iOS and opens in its own window
- [ ] Offline behaviour decided, written down, and working
- [ ] Bugs found during this step fixed and logged in [ongoing-bug-fixing.md](ongoing-bug-fixing.md)
- [ ] Lint, tests, and build pass
