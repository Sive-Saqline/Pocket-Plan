---
status: final
updated: 2026-08-30
project: pocket_plan
intent: create
run: ux-pocket_plan-2026-08-30
sources:
  - docs/PocketPlan-PRD-v3.md
  - EXPERIENCE.md (cross-referenced)

# DESIGN.md tokens
colors:
  light:
    accent: "#1F7A8C"        # teal — primary brand color
    accent-hover: "#266F7F"
    accent-pressed: "#185965"
    warning: "#E0A92A"       # amber — budget nearing limit
    danger: "#C0392B"        # red — budget over, destructive
    success: "#2E8B57"       # green — savings goal hit, confirm
    surface: "#FFFFFF"       # card / sheet background
    surface-muted: "#F5F7F8" # screen background
    surface-elevated: "#FFFFFF" # raised surfaces (same as surface; elevation from shadow)
    border: "#E3E7E8"
    text: "#0F1B1F"          # primary text
    text-muted: "#5C6B70"    # secondary text
    text-inverse: "#FFFFFF"
    chart-1: "#1F7A8C"       # primary series
    chart-2: "#E0A92A"
    chart-3: "#8E44AD"
    chart-4: "#2E8B57"
    chart-5: "#C0392B"
    chart-6: "#3D5A80"
    overlay: "rgba(15, 27, 31, 0.5)"   # modals, sheets
  dark:
    accent: "#4FB6C9"        # brighter teal for dark surfaces
    accent-hover: "#62C5D6"
    accent-pressed: "#3A98AA"
    warning: "#F2C45A"
    danger: "#E76B5E"
    success: "#5BC07F"
    surface: "#152024"
    surface-muted: "#0F1B1F"
    surface-elevated: "#1C2C32"
    border: "#2A3A3F"
    text: "#F0F4F5"
    text-muted: "#A4B2B6"
    text-inverse: "#0F1B1F"
    chart-1: "#4FB6C9"
    chart-2: "#F2C45A"
    chart-3: "#B57BC9"
    chart-4: "#5BC07F"
    chart-5: "#E76B5E"
    chart-6: "#7B96B8"
    overlay: "rgba(0, 0, 0, 0.6)"

typography:
  font-sans: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  font-mono: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
  scale:
    display: "32px / 40 / 700"   # dashboard hero numbers
    h1: "24px / 32 / 600"
    h2: "20px / 28 / 600"
    h3: "16px / 24 / 600"
    body: "16px / 24 / 400"
    body-sm: "14px / 20 / 400"
    caption: "12px / 16 / 400"
    mono-lg: "20px / 28 / 600"   # amount display in lists
  weights: [400, 500, 600, 700]

rounded:
  none: "0"
  sm: "4px"     # chips
  md: "8px"     # buttons, inputs
  lg: "12px"    # cards
  xl: "16px"    # sheets, modals
  pill: "9999px" # tags, badges

spacing:
  0: "0"
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  16: "64px"

components:
  button:
    height-sm: "36px"
    height-md: "44px"      # primary tap height
    height-lg: "52px"
    padding-x: "16px"
    radius: "{rounded.md}"
    font: "{typography.h3}"
  input:
    height: "48px"          # tap-friendly
    padding-x: "12px"
    radius: "{rounded.md}"
    border: "1px solid {colors.border}"
    focus-ring: "2px solid {colors.accent}, offset 2px"
  appbar:
    height-mobile: "56px"
    height-desktop: "64px"
  tabbar:
    mobile:
      height: "64px"
      item-min-width: "56px"
  card:
    padding: "16px"
    radius: "{rounded.lg}"
    shadow: "0 1px 2px rgba(15, 27, 31, 0.06), 0 1px 3px rgba(15, 27, 31, 0.08)"
  banner:
    radius: "{rounded.md}"
    padding: "12px 16px"
  badge:
    size: "8px"             # red dot
    color: "{colors.danger}"
  toast:
    radius: "{rounded.md}"
    padding: "12px 16px"
    max-width-mobile: "calc(100% - 32px)"
    max-width-desktop: "360px"
  budgetCard:
    padding: "16px"
    radius: "{rounded.lg}"
    bar-height: "8px"
    bar-radius: "{rounded.pill}"
  expenseRow:
    height: "64px"
    padding-x: "16px"
  savingsGoalCard:
    padding: "20px"
    radius: "{rounded.lg}"
    bar-height: "10px"
  categoryScroller:
    item-width: "84px"
    item-height: "92px"
    gap: "12px"
    icon-size: "40px"
  sheet:
    radius: "{rounded.xl}"
    handle-height: "4px"
    handle-width: "40px"
  chart:
    legend-height: "32px"
    grid-stroke: "{colors.border}"
    label-font: "{typography.body-sm}"
  modal:
    radius: "{rounded.xg-xl}"
    padding: "24px"
    max-width: "440px"

layout:
  breakpoint:
    sm: "0px"
    md: "768px"
    lg: "1024px"
  gutter-mobile: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
  content-max-width: "1200px"

assets:
  empty:
    expenses: "{asset.empty.expenses}"      # token — replaced at Finalize render
    budgets: "{asset.empty.budgets}"
    accounts: "{asset.empty.accounts}"
    categories: "{asset.empty.categories}"
    recurring: "{asset.empty.recurring}"
    savings: "{asset.empty.savings}"
    reports: "{asset.empty.reports}"
  category-icons-default:
    Food: "🍔"
    Transport: "🚗"
    Bills: "🧾"
    Shopping: "🛍️"
    Health: "⚕️"
    Education: "🎒"
    Entertainment: "🎬"
    Savings: "💰"
    Miscellaneous: "📦"
---

# DESIGN.md — PocketPlan

> Visual identity. **How it looks.**
> Cross-referenced by `EXPERIENCE.md` via `{path.to.token}` syntax. Spines win on conflict with any mock, wireframe, or import.

---

## 1 · Brand & Style

**PocketPlan** — a personal expense tracker for everyday money management. The visual identity aims for *trustworthy, calm, modern*. We are not playful like a games app, not clinical like an enterprise tool, not aspirational like a wellness app.

### Personality
- **Calm and steady.** Money apps deal with stress; the UI shouldn't add to it.
- **Concrete and local-first.** Currency symbol ৳ is part of the visual identity from the first screen. No abstract iconography.
- **Honest.** Progress bars that say 95% say 95%. No fake confetti on goal hits (per EXPERIENCE.md §5.8).
- **Quietly capable.** Typography is confident, spacing is generous, motion is subtle (per memlog decision).

### Aesthetic direction
A modern, flat, slightly rounded form language. Generous whitespace. Single accent color (teal) does most of the visual work. Charts and data visualizations get a small, restrained palette (5–6 hues) — never rainbow.

### Logo / wordmark
The PRD does not provide a logo. Until brand assets are supplied, the wordmark is the product name set in **Inter 700 at 24px**, with the dot of the "i" in "Pocket" replaced by the ৳ glyph in `{color.accent}`. This is a placeholder pattern, easily swapped for a real logo.

---

## 2 · Colors

### 2.1 Why teal as the accent?
Teal sits between blue (trustworthy, financial) and green (positive, savings) without leaning hard into either. It distinguishes PocketPlan from the sea of green personal-finance apps without veering into playfulness. It also pairs cleanly with the BDT-currency-forward visual identity without becoming a Bangladesh-flag cliché.

### 2.2 Token map (light theme)

| Token | Hex | Use |
|---|---|---|
| `{colors.accent}` | `#1F7A8C` | Primary buttons, active tab indicator, focus ring, primary chart series |
| `{colors.warning}` | `#E0A92A` | Budget nearing limit (80–99%), non-blocking warnings |
| `{colors.danger}` | `#C0392B` | Budget over, destructive actions, due-recurring badge dot |
| `{colors.success}` | `#2E8B57` | Savings goal hit, confirm-recurring success |
| `{colors.surface}` | `#FFFFFF` | Cards, sheets, modals |
| `{colors.surface-muted}` | `#F5F7F8` | Screen background |
| `{colors.border}` | `#E3E7E8` | Input borders, dividers, chart grid |
| `{colors.text}` | `#0F1B1F` | Primary text |
| `{colors.text-muted}` | `#5C6B70` | Secondary text, captions, tab labels (inactive) |

### 2.3 Token map (dark theme)
Same names, different values. See frontmatter. Dark theme inverts surface tones; accent shifts to a brighter teal (`#4FB6C9`) to maintain AA contrast on dark surfaces.

### 2.4 Status semantics
- `{color.warning}` is **informational**, not destructive. Used for budget nearing limit; never for save/delete errors.
- `{color.danger}` is **destructive or urgent**. Budget over, delete confirmations, due-recurring red dot.
- `{color.success}` is **positive completion**. Goal hit, expense confirmed.

### 2.5 Chart palette
Five-to-six-hue restrained palette: `{colors.chart-1}` through `{colors.chart-6}`. Pie and donut charts use these in order; category reports map to the same hues when possible so colors are stable across screens.

### 2.6 Contrast guarantees (WCAG 2.1 AA)
- Primary text (`{colors.text}` on `{colors.surface}`): 16.4:1 — passes AAA.
- Muted text (`{colors.text-muted}` on `{colors.surface}`): 6.1:1 — passes AA at body size.
- Accent button (`{colors.text-inverse}` on `{colors.accent}`): 4.8:1 — passes AA.
- Warning text (`{colors.text}` on `{colors.warning}` background): use the warning only as a **chip background**, not as text color. Text remains `{colors.text}`.

### 2.7 Do not
- Don't use accent, warning, danger, success as text colors. They're for backgrounds, borders, dots, icons.
- Don't introduce additional accent colors per feature. One accent, used everywhere.

---

## 3 · Typography

### 3.1 Font choice
**Inter** as the primary sans-serif — excellent for tabular numbers and supports Bengali glyph fallback if the app is ever localized. **JetBrains Mono** for amount display in lists and reports — financial data benefits from monospaced digits.

Both are available via Google Fonts (open license, easy to self-host).

### 3.2 Scale
Token map: `{typography.scale.display}`, `{typography.scale.h1}` … `{typography.scale.caption}`.

| Token | Size / line / weight | Use |
|---|---|---|
| `{typography.scale.display}` | 32 / 40 / 700 | Dashboard "spent this month" hero number |
| `{typography.scale.h1}` | 24 / 32 / 600 | Screen titles (desktop) |
| `{typography.scale.h2}` | 20 / 28 / 600 | Card titles, section headers |
| `{typography.scale.h3}` | 16 / 24 / 600 | Button labels, list row primary text |
| `{typography.scale.body}` | 16 / 24 / 400 | Default body |
| `{typography.scale.body-sm}` | 14 / 20 / 400 | Secondary text, captions, form helper text |
| `{typography.scale.caption}` | 12 / 16 / 400 | Smallest text — only used for timestamps, units, badges |
| `{typography.scale.mono-lg}` | 20 / 28 / 600 | Amount display in list rows and reports (monospaced) |

### 3.3 Weights
Only 400, 500, 600, 700 are loaded. Avoid 300/800 — they break the rhythm at this size scale.

### 3.4 Amounts and currency
- The currency glyph ৳ is part of the amount string, always prefixed, **never suffixed**. No "BDT" suffix.
- Thousands separator: comma (`1,200`). Decimals shown only when non-zero (`৳1,200` for whole, `৳1,200.50` when fractional). Storage allows full numeric precision; display applies this rule.
- All amount display uses `{typography.scale.mono-lg}` in lists/reports, and `{typography.scale.display}` for the dashboard hero number.

---

## 4 · Layout & Spacing

### 4.1 Breakpoints
- **sm** (0–767px): mobile-first, single column, bottom tab bar.
- **md** (768–1023px): tablet, two-column on list+detail, bottom tab bar still.
- **lg** (≥1024px): desktop, left sidebar replaces bottom tabs, content max-width `{layout.content-max-width}` = 1200px centered.

### 4.2 Gutter
- `{layout.gutter-mobile}` = 16px
- `{layout.gutter-tablet}` = 24px
- `{layout.gutter-desktop}` = 32px

### 4.3 Spacing scale
Token map: `{spacing.1}` through `{spacing.16}`. Base unit 4px. Use tokens, not raw px. Common patterns:
- Inside a card: 16px padding (`{spacing.4}`).
- Between cards on Home: 12px (`{spacing.3}`).
- Between major sections on a screen: 24px (`{spacing.6}`).
- Page top padding: 16px (`{spacing.4}`).

### 4.4 Vertical rhythm
Section headers have a 24px top margin and 8px bottom margin. List rows have a 16px internal padding. Card grids on Home use 12px gaps.

### 4.5 Touch targets
All interactive elements ≥44×44 CSS pixels (EXPERIENCE.md §6.1). Button heights: sm 36px (inline), md 44px (default), lg 52px (primary CTAs). Input height 48px.

---

## 5 · Elevation & Depth

### 5.1 Strategy
Subtle elevation via shadows; no neon glows, no neon borders.

### 5.2 Shadow tokens
- **Resting** (cards at rest): `0 1px 2px rgba(15,27,31,0.06), 0 1px 3px rgba(15,27,31,0.08)` — `{components.card.shadow}`.
- **Raised** (FAB, dropdowns): `0 4px 8px rgba(15,27,31,0.08), 0 8px 16px rgba(15,27,31,0.12)`.
- **Modal**: `0 12px 24px rgba(15,27,31,0.16), 0 24px 48px rgba(15,27,31,0.20)`.

In dark mode, shadows are weaker (lower opacity) because dark surfaces already have natural depth. We don't fake elevation with light borders in dark mode.

### 5.3 Z-index layering
- Base content: z=0
- Sticky app bar / bottom tab bar: z=10
- Dropdown menus / popovers: z=20
- Bottom sheet: z=30
- Modal: z=40
- Toast: z=50

---

## 6 · Shapes

### 6.1 Radius scale
- `{rounded.sm}` = 4px — chips, tags
- `{rounded.md}` = 8px — buttons, inputs
- `{rounded.lg}` = 12px — cards
- `{rounded.xl}` = 16px — sheets, large modals
- `{rounded.pill}` = 9999px — pills, badges, progress bar caps

### 6.2 Why 12px on cards, not 16px or 24px?
12px reads as modern-but-restrained at mobile sizes. 16px starts to feel pillowy. 24px feels like a different product (more playful, less financial).

### 6.3 Inputs and buttons
Always use `{rounded.md}` (8px). Consistency makes the input family feel like a set.

---

## 7 · Components

### 7.1 Button — `{components.button}`
Filled, outlined, or destructive. Three sizes (sm 36, md 44, lg 52). Padding-x 16px. Radius `{rounded.md}`. Font `{typography.scale.h3}`. Loading state replaces label with inline spinner (no layout shift). Disabled reduces opacity to 0.5 and removes cursor pointer.

### 7.2 Input — `{components.input}`
Height 48px. Padding-x 12px. Radius `{rounded.md}`. Border 1px `{colors.border}`. Focus ring `2px {colors.accent}` with 2px offset. Inline error state: border becomes `{colors.danger}` and a 12px caption-size error renders below.

### 7.3 AppBar — `{components.appbar}`
Mobile: 56px sticky. Holds back arrow (when applicable), screen title (centered or left-aligned depending on iOS/Android convention), trailing actions. Desktop: 64px, taller, holds search + user menu on the right.

### 7.4 TabBar — `{components.tabbar.mobile}`
Bottom tab bar on mobile, height 64px. Five items in fixed order (Home, Expenses, Budgets, Reports, More). Active tab: top accent stripe + bolded label. Inactive: muted label. Red dot badge (`{components.badge.due}`) on More tab when due-recurring unread.

### 7.5 Card — `{components.card}`
Padding 16px, radius 12px, resting shadow. Surface `{colors.surface}`. Background of the screen is `{colors.surface-muted}`, so cards visibly float.

### 7.6 Banner — `{components.banner}`
Radius 8px, padding 12px 16px. Used for DueRecurringBanner (`{components.banner.recurringDue}`) and page-level errors. Has a left accent stripe in the relevant semantic color.

### 7.7 Badge — `{components.badge}`
8px circle, `{colors.danger}`. Used as the unread dot on tab bar items.

### 7.8 Toast — `{components.toast}`
Radius 8px, padding 12px 16px. Mobile: full-width minus 32px gutter, top-aligned, stacked (max 3 visible). Desktop: max-width 360px, top-right corner. Auto-dismiss 4s.

### 7.9 BudgetCard — `{components.budgetCard}`
Card with: category icon (40px), category name (h3), planned vs spent text (body-sm), progress bar (8px tall, pill-radius). Bar color uses the budget state pattern (EXPERIENCE.md §5.6): accent under 80%, warning 80–99%, danger ≥100%.

### 7.10 ExpenseRow — `{components.expenseRow}`
64px tall. Padding-x 16px. Layout: category icon (left, 32px), category name + description (center, two-line truncate), amount (right, mono-lg). Tap → edit. Long-press → action sheet.

### 7.11 SavingsGoalCard — `{components.savingsGoalCard}`
Larger card on Home (padding 20px). Centered hero number for current saved amount. Progress bar 10px. Below: target + percentage + status copy ("Goal hit" / "X% of Y"). Empty state when no goal set.

### 7.12 CategoryScroller — `{components.categoryScroller}`
Horizontal scroll, scroll-snap to center. Items 84×92px. Icon 40px centered, label below (caption, truncated). Above: search field that filters the scroller. Most-used first ordering (per EXPERIENCE.md §4.2).

### 7.13 Sheet — `{components.sheet}`
Bottom sheet (mobile) / modal (desktop). Radius 16px on the top corners (mobile) or all corners (desktop). Handle bar 4×40px at the top on mobile. Used for ConfirmRecurring, Add Expense, Add Account, Add Category, Add Budget.

### 7.14 Chart — `{components.chart}`
Pie, donut, bar, line. Legend below the chart (32px row height). Tooltip on tap shows exact value. Animated entry on first paint (≤200ms) — disabled under `prefers-reduced-motion`.

### 7.15 Modal — `{components.modal}`
Centered (desktop) / full-screen (mobile). Radius 16px. Padding 24px. Max-width 440px (desktop). Used for destructive confirmations, sign-out, etc.

---

## 8 · Do's and Don'ts

### Do
- ✅ Use the ৳ glyph consistently — never "BDT" as a suffix, never "$" by mistake.
- ✅ Reference colors and spacing by token name, never by hex or px literal.
- ✅ Keep empty-state illustrations monochrome and themed to the surface's semantic color.
- ✅ Use the chart palette in order. Don't pick colors at random per chart.
- ✅ Honor `prefers-reduced-motion` everywhere motion is present (EXPERIENCE.md §7.4).
- ✅ Test dark mode contrast for every new component before shipping.

### Don't
- ❌ Don't introduce additional accent colors per feature. One accent.
- ❌ Don't use emoji as decoration in empty states or hero areas (use the dedicated `{asset.empty.*}` illustrations). Emoji are reserved for category icons (per `{assets.category-icons-default}`).
- ❌ Don't use color alone to convey state — pair with an icon or label (EXPERIENCE.md §7.5).
- ❌ Don't show more than 3 toasts stacked.
- ❌ Don't auto-open sheets or modals — user must always tap to open.
- ❌ Don't add decorative motion. Every animation must serve a feedback or transition purpose.
- ❌ Don't use shadows in dark mode that are stronger than the light-mode equivalent — dark surfaces already provide depth.
- ❌ Don't use a custom font weight not in the loaded set (400, 500, 600, 700).

---

## 9 · Cross-references

This file is referenced from `EXPERIENCE.md` via `{path.to.token}` syntax. The token map is the single source of truth for visual values; both files (and any future component implementation) must read from this token system, not from inline literals.