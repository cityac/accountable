Follow these coding guidelines:

- Be thoughtful and careful about naming things so that code is expressive and easy to read
- Don't comment out unused code; delete it
- Favor short functions and methods with one purpose
- Make code readable so that only very short comments are needed, and mostly comment the why
- Clean abstractions with clear separation of concerns, but don't abstract before it's needed
- Avoid brittle tests that are tied to implementation specifics

Add npm run check, which runs all of these and fails if any of them fails:
- Prettier and ESLint for the frontend, using the recommended TypeScript, React Hooks and accessibility rules
- ruff format and ruff check for the backend
- A maximum cyclomatic complexity of 15 per function, using ESLint's complexity rule and ruff's C901 rule
- tsc for the frontend and ty for the backend
- gitleaks across the repo, allowing the git-ignored .env
- npm test, with unit test coverage of at least 80%
Add npm run check:quick, which runs the same checks without the end-to-end tests. Add npm run format to fix the formatting. Fix what the checks find, without weakening any rule. If a rule doesn't suit this project, ask me first. Add npm run check to AGENTS.md, run it and show me the output.

Add three hooks:
- A lefthook pre-commit hook that formats the staged files, then runs lint, types and gitleaks. Skip the tests, so that it stays quick.
- A hook for this coding agent that runs npm run check:quick when you finish a turn and sends any failure back to you to fix. It should block once and then let you stop, so it can't loop forever.
- A hook for this coding agent that blocks any edit to .env.
Test each one and tell me how you tested it. If this coding agent doesn't support one of these hooks, tell me.