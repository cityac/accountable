# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Look at what went wrong on this change: the review's findings, what the person corrected and what the checks caught. Count only findings that turned out to be real. Drop any that were wrong when checked, and note why the review got them wrong.
2. Find out whether each mistake has happened before. Check the watch list below, the review sections in `docs/STATUS.md` and `git log`. Don't read other changes' folders in `docs/changes/`.
3. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead, and prove the check fails by bringing the mistake back for a moment.
4. Add mistakes seen once to the watch list, with the change they came from. Take an item off the list once it's been handled in step 3.
5. Remove anything out of date, including items in `docs/STATUS.md` marked as still open that have since been fixed.
6. Improve this file, so that the next round makes a better change. Keep this as the last step.

## Watch list

Mistakes seen once. A second time means step 3.

- **The spec overrode a decision the project owner made in the intent** (`dark-mode`: black panels against intent decision 2). The plan only noted it as a risk, and nobody asked the owner until the review.
- **An agreed intent was edited during Build** (`dark-mode`: a stray line in `intent.md`).
- **An end-to-end test depended on the dev server's file paths** (`dark-mode`: it blocked `/src/main.tsx` to hold back the app).
- **The review repeated a claim from `docs/STATUS.md` without checking the code** (`dark-mode`: a Won header underline that does show).
