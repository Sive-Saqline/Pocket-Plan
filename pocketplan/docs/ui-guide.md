# PocketPlan UI Guide

How screens should look and which shared pieces to use. Follow this for every new screen.

## Rules

1. **No emojis anywhere in the UI.** Use icons from `lucide-react`.
2. **Never rely on colour alone.** Every coloured bar, dot, or badge has a text label next to it.
3. **Every icon-only button has an `aria-label`.** Decorative icons get `aria-hidden`.
4. **Tap targets are at least 44px** (`h-11` / `size-11`).
5. **Money** is always `formatTaka(...)`, in `font-mono tabular-nums`, so digits line up.
6. **Colours come from tokens** in `src/app/globals.css` (`bg-accent`, `text-text-muted`, `bg-surface`, ...). Don't hard-code hex values in components.

## Brand

| Piece | Where |
|---|---|
| Logo (mark + wordmark) | `components/brand/Logo.tsx`: `<Logo />` or `<Logo variant="mark" />` |
| Browser tab icon | `src/app/icon.svg` |
| Apple touch icon | `src/app/apple-icon.png` |
| App icons for the installable app (Step 21) | `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |

The mark is a pocket with a check mark on a teal (`--accent`) rounded tile. If the artwork changes, update `Logo.tsx`, `icon.svg`, and the paths in `scripts/generate-icons.mjs`, then run `node scripts/generate-icons.mjs` from `apps/web`.

## Icons

- Import from `lucide-react`. Default size 20, `strokeWidth={1.75}`; 16 inside chips and small labels; 22 in the bottom navigation.
- **Category icons:** use `<CategoryIcon icon={category.icon} />` or the round `<CategoryBadge icon={...} />` from `components/ui/icons.tsx`. Categories store a key (`food`, `transport`, `bills`, `shopping`, `health`, `education`, `entertainment`, `savings`, `misc`). Accounts created before Step 10 still store emojis; `icons.tsx` maps those to the same icons. Unknown keys show a generic tag icon. To add a category icon, add a key to `categoryIcons`.
- **Wallet icons:** `<WalletIcon type={wallet.type} />`.
- Avoid icons with a currency symbol other than ৳ (e.g. use `ReceiptText`, not `Receipt`, which shows a $).

Common choices: warning `TriangleAlert`, close `X`, back/forward `ChevronLeft`/`ChevronRight`, add `Plus`, recurring `Repeat`, done `Check`, offline `CloudOff`.

## Shared components (`src/components/ui/`)

| Component | Use for |
|---|---|
| `Button` / `buttonClass()` | All buttons. Variants: `primary`, `secondary`, `ghost`, `danger`; sizes `md` (44px), `sm`. |
| `Card`, `ErrorBanner`, `SkeletonRows` | Content blocks, load errors with Retry, loading placeholders. |
| `EmptyState` | "Nothing here yet": icon, title, short text, optional buttons. |
| `CloseButton` | The close button in the corner of every sheet. |
| `MonthSwitcher` | Previous/next month header. |
| `Toast` | Short confirmation after an action. |
| `StatusDot` (in `budgets/BudgetBar.tsx`) | Small coloured dot next to a status label. |
| `inputClass` (in `expenses/Pickers.tsx`) | Text inputs and selects. |

## Colour & status

| Meaning | Token | Example |
|---|---|---|
| Brand / primary action / "under budget" | `accent` | Buttons, active tab, budget bar under 80% |
| Nearly there (80–99%) | `warning` | Amber bar + dot + "Nearly there" |
| Over / error / due | `danger` | Red bar + warning icon + "Over by ৳X" |
| Done / positive | `success` | Settled, "gets back" |

All text/background pairs above meet WCAG AA (≥ 4.5:1) in light and dark themes (checked 2026-11-13).

## Layout & breakpoints

| Width | Navigation | Content |
|---|---|---|
| Phone (< 640px) | Top bar + bottom tab bar | One column, 16px side padding |
| Tablet (640–1023px) | Top bar + bottom tab bar | Full width, 24px padding; grids may use 2 columns from `md` (768px) |
| Desktop (≥ 1024px, `lg`) | Fixed left sidebar (256px); bottom bar hidden | Up to 1280px wide (`max-w-7xl`), 32px padding, two-column layouts |

- Every signed-in page uses `AppShell`; don't add your own width limit inside it.
- Lay out cards with `grid gap-4 lg:grid-cols-2 lg:gap-6` (or `md:`/`xl:` columns for card lists). Phones always get one column in a sensible reading order. Use `order-*` classes if the desktop columns need a different source order.
- Floating buttons and toasts already sit correctly at every width (`Fab`, `Toast`).
- Sheets (dialogs) stay `max-w-lg`: a bottom sheet on phones, a centred dialog from `sm` up.

## Themes

Light and dark are both required. Check every new screen in both, at phone width (~400px) and desktop.
