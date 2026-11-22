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

## Testing

Run `npm test` from the project root before calling any work finished, and fix failures until it passes.

It runs the type check, the backend unit tests (pytest), the frontend unit tests (Vitest) and the end-to-end tests (Playwright), ends with a summary, and exits with an error if any of them failed. It takes about two minutes on 10 cores, and uses its own temporary databases. It picks the number of end-to-end workers from the machine's cores and memory. `ACCOUNTABLE_TEST_WORKERS=2 npm test` sets it by hand.

Pytest and Playwright refuse to start on their own, because `npm test` is what sets up those databases.
