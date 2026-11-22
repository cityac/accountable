# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A dark mode with a toggle on every page, across every section.

## Constraints

- Light mode stays the default, and the app remembers the choice.
- Light mode looks exactly as it does today, apart from the toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- Text in dark mode meets the same contrast rules as spec.md.
- Charts, dialogs and messages follow the mode too.
- No new dependencies unless the plan makes the case for one.

## Decisions

Answers from the project owner on points the intent left open.

1. **The toggle** is a sun/moon icon button at the far right of the top bar, beside today's date. It has a label for screen readers and can be reached and used by keyboard.
2. **The dark surfaces** are dark navy tones derived from Midnight `#073B4C`, so the app still feels like Accountable. Panels sit slightly lighter than the page, with no outlines or shadows, as in light mode.
3. **Stage colors** keep their brand fills in dark mode, along with the agreed small-chip shades and large-fill exceptions in spec.md decision 2. Only Won changes: its fill becomes Sea Mist `#CDD8DB` with Midnight text, because a Midnight fill would vanish on a dark page.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.

## Success criteria

1. npm run check passes.
2. A new end-to-end test proves that the toggle works and is remembered after a reload.
3. Screenshots of the dashboard and the pipeline in both modes are saved in docs/changes/dark-mode/.
