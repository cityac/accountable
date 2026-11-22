# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Look at what went wrong on this change: the review's findings, what the person corrected, what the checks caught, and the branch's latest CI runs (`gh run list --branch <branch name>`). A push can fail on CI's smaller machine when everything passed locally. Count only findings that turned out to be real. Drop any that were wrong when checked, and note why the review got them wrong.
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
- **Work was called finished after `npm run check:quick` alone**, though AGENTS.md asks for `npm run check` (`dark-mode`, the first harness round). The full check would have passed locally, and the push failed on CI for another reason, but the rule still went unfollowed.
- **The CI workflow uploaded folders nothing writes** (`dark-mode`: `playwright-report/` and `test-results/`, while Playwright wrote to the temporary folder). Nobody noticed until a failure needed them.
- **Chrome sometimes doesn't start for an end-to-end test on a Mac, and the test times out setting up its context.** This is the second time. `playwright.config.ts` already passes `--disable-gpu` for the first one, but the cause of this one isn't known yet, so there's no fix to add. Find the cause the next time it happens.
