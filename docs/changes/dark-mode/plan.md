# Plan: dark mode

The intent is `intent.md` in this folder. The spec describes the product with dark mode in it: N3, N7 and N8, decisions 8 and 9, the **Mode** note under Frontend, the Shell screen, and the two-mode color token table. This plan says how to get there.

## Files that change

| File | Change |
|---|---|
| `frontend/src/styles.css` | Every color token gets its light value in `@theme`, as today, and a dark value in one `[data-mode="dark"]` block. New tokens: `midnight` (the fixed brand color), `on-color` (Midnight text on Sea Green, Marigold, Coral and Sea Mist fills), `on-strong` (white text on Cerulean, Raspberry and the chip shades), `won` and `won-ink`, `shadow-*` and `overlay`. Sonner's CSS variables are pointed at the tokens here. |
| `frontend/index.html` | A short inline script that reads `accountable-mode` from `localStorage` and sets `data-mode="dark"` on `<html>` before the page draws. It catches a storage error and leaves the page light. |
| `frontend/src/lib/mode.ts` (new) | The storage key, `readMode()`, `applyMode()` and a `useMode()` hook. Storage errors are caught, so the toggle still works for the session. |
| `frontend/src/components/ModeToggle.tsx` (new) | The sun and moon icon button, from lucide-react, labelled "Switch to dark mode" or "Switch to light mode", with the same words as its `title`. |
| `frontend/src/components/Shell.tsx` | Puts the toggle after today's date. Styles the Toaster through the tokens. |
| `frontend/src/components/Chip.tsx`, `crm/board/Column.tsx`, `crm/Timeline.tsx`, `components/ConnectionMessage.tsx` | `text-ink` on colored fills becomes `text-on-color`, `text-white` becomes `text-on-strong`, and Won's `bg-ink text-sea-mist` becomes `bg-won text-won-ink`. |
| `frontend/src/components/FormDialog.tsx`, `ConfirmDelete.tsx` | The `bg-ink` backdrop becomes `bg-overlay`, and the inline Midnight shadow becomes a shadow token. |
| `frontend/src/components/RecordPicker.tsx`, `crm/board/DealCard.tsx`, `crm/charts/ChartTooltip.tsx` | Inline `rgba(7,59,76,…)` shadows become shadow tokens. |
| `frontend/src/crm/charts/stageColors.ts` | Won uses `won` and `won-ink`, the other stages' text uses `on-color` and `on-strong`, and the literal `#ffffff` goes. |
| `frontend/src/crm/charts/RevenueChart.tsx` | The line and its current-month dot use `midnight`, the dot's `#fff` ring uses `panel`, and the month labels on the fill use `on-color`. |
| `frontend/src/crm/charts/DealsWonChart.tsx` | Bars use `won`, the current month keeps `bar-soft`. |
| `frontend/src/crm/charts/SalesFunnel.tsx` | Segment text from `stageColors`, leader lines and values in Ink and Muted ink. |
| Any other file found using `bg-sea-green`, `bg-marigold`, `bg-coral` or `bg-sea-mist` with inherited text | Gets `text-on-color`. Contacts and Dashboard are known so far. |
| `frontend/src/layout.test.ts` | New rules, listed under Proof. |
| `frontend/src/lib/mode.test.ts`, `components/ModeToggle.test.tsx`, `frontend/src/tokens.test.ts` (new) | Unit tests, listed under Proof. |
| `e2e/mode.spec.ts` (new) | End-to-end tests, listed under Proof. |
| `e2e/quality.spec.ts` | The console walk and the focus ring check run once more in dark mode. |
| `docs/STATUS.md` | Dark mode is done, and how to switch. |
| `docs/changes/dark-mode/*.png` | Dashboard and pipeline, each in both modes. |

No new dependencies. lucide-react already supplies the sun and moon.

## Order of work

### Phase 1: a baseline of light mode

Before touching any code, start the app on a fresh seeded database and save full-page screenshots of every section, a record page of each kind, an open dialog and the pipeline at 1440 by 900 into the scratchpad. These are the "looks exactly as it does today" reference, and they stay out of git.

### Phase 2: split the tokens, light mode unchanged

1. Add the new tokens to `@theme` with light values equal to what each place uses today.
2. Move every component off `ink` where it means the Midnight fill or Midnight-on-color text, off `text-white`, and off inline hex and `rgba` values, onto the new tokens.
3. Add the layout rules that forbid color literals and `dark:` outside `styles.css`, so nothing slips back.
4. Retake the Phase 1 screenshots and compare them pixel by pixel. Light mode must match exactly, apart from the date if the day has changed. Run `npm run check:quick`.

Nothing visible changes in this phase, which is the point: it proves the refactor is safe before dark values exist.

### Phase 3: dark values

1. Add the `[data-mode="dark"]` block with the dark column of the spec's token table.
2. Point Sonner's variables (`--normal-bg`, `--normal-text`, `--normal-border`) at the tokens.
3. Add `tokens.test.ts`, which reads `styles.css` and checks every contrast ratio the spec states.
4. Set the attribute by hand in the browser and look at every screen, dialog, picker, tooltip and message. Fix any place still showing a light color.

### Phase 4: the toggle and remembering it

1. `lib/mode.ts` and its tests.
2. `ModeToggle` in the Shell, and its tests.
3. The inline script in `index.html`, with a unit test that its storage key matches `lib/mode.ts`.
4. `e2e/mode.spec.ts`, and the dark runs in `quality.spec.ts`.

### Phase 5: by hand, screenshots and finishing

1. Use every section in both modes at 1440 by 900 and 1280 by 720, including an emptied database and a restart, as the spec's "By hand" section asks. Check the console each time.
2. Save `dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png` and `pipeline-dark.png` at 1440 by 900 into this folder.
3. Update `docs/STATUS.md`. Run `npm run check` until it passes.

## Risks

- **`ink` does two jobs today.** It's both the text color and the Midnight fill (Won's header and chip, the deals-won bars, the revenue line, dialog backdrops). Flipping `ink` to Sea Mist without splitting it first would turn backdrops pale and put Sea Mist text on Sea Green. Phase 2 splits it before any dark value exists, and the light-mode screenshot diff proves nothing moved.
- **Inherited text on colored fills.** Sea Green, Marigold and Coral fills that don't set their own text color inherit `ink`, which becomes Sea Mist in dark mode at about 1.4:1. The Phase 3 walk looks for these, and the e2e test checks the computed text color on the current-section pill, a Qualified chip and the Won header.
- **The brand and the intent disagree on panels.** Intent decision 2 says panels sit slightly lighter than the page. The brand skill makes them black, darker than `#04232E`, and the spec follows the brand (decision 9). If the owner prefers lighter panels, only the dark value of `panel` changes.
- **Black panels on a dark page are low in contrast** (1.29:1). Panels have no outline by design, so they may read as flat. That's a call for the owner at Phase 5, not something to fix with borders.
- **Recharts writes some colors as SVG attributes.** `var()` works in Chrome's presentation attributes, which the app already relies on, but any color Recharts computes in JavaScript wouldn't follow the token. The Phase 3 walk checks hover tooltips and the active dot.
- **A flash of light mode.** If the inline script runs after the first paint, dark-mode users see a white flash on every load. The script sits in `<head>` with no `defer`, and an e2e test checks the attribute before React mounts.
- **The inline script and `lib/mode.ts` duplicate the key.** A unit test reads `index.html` and checks they match.
- **Blocked storage.** Some browser settings make `localStorage` throw. Both the script and `lib/mode.ts` catch it, and an e2e test proves the toggle still works and logs no console error.
- **Coverage.** The new code is small and fully tested, so the 80% floor shouldn't move. The inline script isn't measured, which is why it holds no logic beyond one read.

## Proof

### Unit tests (Vitest)

- `lib/mode.test.ts`
  - With nothing stored, the mode reads as light.
  - With `dark` stored, it reads as dark. Any other value reads as light.
  - Applying dark sets `data-mode="dark"` on `<html>` and stores it. Applying light removes the attribute and stores `light`.
  - When storage throws on read or write, the mode still applies, and nothing throws.
- `components/ModeToggle.test.tsx`
  - In light mode it shows the moon and is labelled "Switch to dark mode", with the same tooltip.
  - Clicking it switches to dark, flips the icon and the label, and clicking again switches back.
  - It works with Enter and Space.
- `tokens.test.ts`
  - Every token in the dark block also has a light value, and every color token has both.
  - Every ratio in the spec's token table holds for its stated pair, in both modes, including Ink and Muted ink on Panel and Page, Ink and Muted ink on Late tint, On color on Sea Green, Marigold, Coral and Won fill, and the 4.5:1 small chip shades.
  - The light values equal the values the app had before this change.
  - The storage key in `index.html` matches the one in `lib/mode.ts`.
- `layout.test.ts`
  - No `.ts` or `.tsx` file outside the tests holds a hex color, an `rgb()` or `rgba()` value, `bg-white`, `text-white` or a `dark:` class. Only `styles.css` names colors.
  - Only `lib/mode.ts` touches `localStorage` or `data-mode`.

### End-to-end tests (Playwright)

- `e2e/mode.spec.ts`
  - A fresh browser opens in light mode: no `data-mode` attribute, and the page background is `#F0F4F5`.
  - The toggle is in the top bar on all five sections and on a record page.
  - Clicking it turns the page to `#04232E` and the panels to black, and changes its label to "Switch to light mode".
  - After a reload the app is still dark, and the attribute is already set when the page first draws, before React mounts. Switching back to light and reloading stays light.
  - In dark mode, an open dialog, its backdrop, a picker's list, a chart tooltip and a "Deal saved." message all use the dark tokens.
  - In dark mode, the current-section pill, a Qualified chip and the Won column header have Midnight text, and the Won header is filled in Sea Mist.
  - With `localStorage` made to throw, the toggle still switches the mode and no console error is logged.
- `e2e/quality.spec.ts`
  - The walk through every screen and main action logs no console errors in dark mode too.
  - Every control, including the toggle, can be reached by Tab and shows a focus ring in dark mode too.

### By hand

- The Phase 2 screenshot comparison shows light mode unchanged.
- The Phase 5 walk in both modes, and the four screenshots in this folder.
- `npm run check` passes.
