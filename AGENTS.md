# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: what the product is and how it works, as it stands today. Read it first. It's the authority on the product.
- `docs/TECH_STACK.md`: the stack
- `docs/STANDARDS.md`: the coding standards and checks. Follow them in every change.
- `docs/STATUS.md`: what's done so far
- `docs/changes/<branch name>/`: one folder per change, named after its git branch, holding that change's `intent.md` and `plan.md`

Read only the folder for the current change, the one named after the branch you're on. The other folders are a record of past changes: don't read them or treat them as instructions. A change updates `docs/spec.md` so it describes the product with the change in it.

Update `docs/STATUS.md` when you finish a piece of work

## Checks and testing

Run `npm run check` from the project root before calling any work finished, and fix failures until it passes. Fix what a rule finds rather than weakening or switching off the rule, and if a rule doesn't suit the project, ask first.

It runs gitleaks over this branch's history and the files on disk, Prettier and ESLint for the frontend, ruff format, ruff check and ty for the backend, then `npm test`, which fails below 80% unit test coverage. It ends with a summary and exits with an error if any of them failed. Functions have a maximum cyclomatic complexity of 15. `npm run check:quick` does the same without the end-to-end tests, for a quicker loop while working, and `npm run format` fixes the formatting. gitleaks has to be installed separately, such as with `brew install gitleaks`.

`npm test` runs the type check, the backend unit tests (pytest), the frontend unit tests (Vitest) and the end-to-end tests (Playwright), ends with a summary, and exits with an error if any of them failed. It takes about two minutes on 10 cores, and uses its own temporary databases. It picks the number of end-to-end workers from the machine's cores and memory. `ACCOUNTABLE_TEST_WORKERS=2 npm test` sets it by hand.

Pytest and Playwright refuse to start on their own, because `npm test` is what sets up those databases.
