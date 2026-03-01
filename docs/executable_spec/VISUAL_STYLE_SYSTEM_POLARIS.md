# Visual style system spec (Polaris-inspired)

Audience: product designers + engineers.

Goal: make Camber Map look and feel like a polished product surface (calm, scannable, executive-friendly) without introducing a heavy component library.

This spec adopts:
- **Shopify Polaris** for visual system (layout rhythm, cards, typography hierarchy, depth/shadows, tokens)
- **Material Design** for mobile interaction behaviors (bottom sheets)
- **Apple HIG + Material** for minimum touch targets and spacing

This is a *reference-accurate adaptation*, not a pixel-perfect copy.

---

## 1) Design principles

1) Scannable over decorative: reduce visual noise and emphasize hierarchy.
2) One primary surface: the content area should feel like a single page with clear sections.
3) Progressive disclosure: VP-friendly summaries first; technical detail behind an explicit action.
4) Consistent spacing + type rhythm: use a small set of sizes everywhere.
5) Depth is functional: shadows only to indicate hierarchy/interactivity.

---

## 2) Token system (CSS variables)

### 2.1 Base grid
- Use a **4px base unit** for spacing and line-height alignment.

### 2.2 Spacing tokens
Implement a minimal subset of Polaris spacing semantics.

Create `public/tokens.css` and define:

- `--space-0: 0px`
- `--space-025: 1px`
- `--space-050: 2px`
- `--space-100: 4px`
- `--space-150: 6px`
- `--space-200: 8px`
- `--space-300: 12px`
- `--space-400: 16px`
- `--space-500: 20px`
- `--space-600: 24px`
- `--space-800: 32px`
- `--space-1000: 40px`
- `--space-1200: 48px`

Also define semantic tokens used by the UI:
- `--space-card-padding: var(--space-400)`
- `--space-card-gap: var(--space-400)`

### 2.3 Radius tokens
- `--radius-200: 8px`
- `--radius-300: 12px`
- `--radius-400: 16px`

### 2.4 Shadow tokens (depth)
Define a small elevation scale (3 levels + modal):
- `--shadow-100`: subtle card shadow
- `--shadow-200`: raised interactive surface
- `--shadow-300`: popover/menu
- `--shadow-600`: modal / full-screen sheet

Rule: only these shadows are allowed.

### 2.5 Type tokens
Define a tight ramp:
- `--font-size-75: 12px`
- `--font-size-100: 14px` (default body)
- `--font-size-200: 16px` (dense headings, key labels)
- `--font-size-300: 20px` (page/section titles)

Line heights must align to the 4px grid:
- `--line-height-1: 16px`
- `--line-height-2: 20px`
- `--line-height-3: 24px`
- `--line-height-4: 28px`

---

## 3) Layout patterns

### 3.1 Cards and sections
Use a Polaris-like card structure everywhere:

- Card padding: `--space-card-padding`.
- Separation between major card sections: `--space-400`.
- Spacing inside a card section: default `--space-200`, bump to `--space-300` for irregular blocks.
- Spacing between simple list items: `--space-100`.

### 3.2 Page rhythm
Each view should have at most:
- 1 page title
- 2–4 sections
- each section is one card (or a stack of cards)

### 3.3 Navigation
The left side menu should be treated as the *frame navigation*:
- text-first labels
- icons only when they add meaning (not decoration)
- no duplicated legend/controls floating on top of the map

---

## 4) Depth and layering rules

Depth indicates hierarchy and interactivity.

Allowed layering:
- Base page surface (0)
- Cards (1)
- Popovers (2)
- Modal bottom sheet (3)

Rules:
- Don’t overuse shadows.
- Don’t introduce new, inconsistent shadows.
- Don’t let elements visually “protrude” beyond their parents.

---

## 5) Mobile interactions

### 5.1 Bottom sheet behavior (System / Details)
Use a Material-style modal bottom sheet:

- Open from bottom.
- Initial height should not exceed a **~16:9 keyline**; allow swipe up to full height.
- Content scrolls internally when sheet is expanded.
- Dismiss by swipe down, tap scrim, or explicit close.

### 5.2 Touch targets and spacing
Minimum interactive sizes:
- iOS-style minimum: **44×44 pt**
- Android-style minimum: **48×48 dp**

Spacing between adjacent controls:
- ensure at least ~8dp equivalent spacing (or padding around controls).

Practical rule in CSS:
- buttons/rows: `min-height: 44px` (prefer 48px)
- icon-only buttons must include invisible padding to reach the minimum

---

## 6) Copy & language guidelines (designer-friendly)

Preferred words:
- “Flow” (user-facing narrative)
- “System” (how pieces connect)
- “Details” (technical)
- “Areas” (groups of related pieces)
- “Links” (relationships)
- “Notes” (comments)

Avoid:
- “Dev”, “RPC”, “Edge Function” (unless in Details view)

In System view, use:
- “Backend step” instead of “Edge Function”
- “Database function” instead of “RPC”
- “Stored data” instead of “table”

---

## 7) View-specific UI rules

### 7.1 Flow view
- Default view on mobile.
- Card-based stages.
- Each stage card shows: what it is + why it matters.
- Health/freshness badge (from facts.json/vp.json) at top.

### 7.2 System view
- Mobile: list + search + sheet drill-down (no full spider graph).
- Desktop: map canvas is allowed, but default to “fit readable” and keep controls in the side menu.
- Detail shown is summary-level only.

### 7.3 Details view
- Same explorer as System view.
- Technical text is behind “Show full details”.

---

## 8) Redundancy removal

Remove UI elements that repeat side menu content:
- floating legend overlays
- “1:1” zoom buttons and duplicated zoom clusters

Keep a single control locus:
- side menu has “Zoom: smaller / fit / bigger”

---

## 9) Implementation tasks

1) Add `public/tokens.css` and import it in `index.html`.
2) Replace hard-coded spacing values with tokens.
3) Replace ad-hoc shadows with `--shadow-*` tokens.
4) Normalize typography across cards, lists, and sheets.
5) Standardize bottom sheet behavior (height, scroll, dismiss).
6) Enforce touch target minimums for:
   - list rows
   - menu items
   - icon buttons
7) Remove duplicate legend/zoom UI.

---

## 10) Acceptance criteria

Visual:
- Consistent card padding + section gaps.
- No mixed shadow styles.
- Headings establish rhythm; text never feels cramped.

Mobile usability:
- No tiny illegible full-map view in System/Details.
- Bottom sheet opens at a comfortable height and expands.
- All tap targets meet minimum sizes.

Comprehension:
- System view reads like a product explanation.
- Details view contains the engineering truth without overwhelming.

---

## 11) References

- Shopify Polaris: card layout, spacing tokens, typography hierarchy, depth/shadows.
- Material Design: bottom sheet behavior and touch target guidance.
- Apple HIG: minimum touch target sizing and spacing recommendations.
