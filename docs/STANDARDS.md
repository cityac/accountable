Follow these coding guidelines:

- Be thoughtful and careful about naming things so that code is expressive and easy to read
- Don't comment out unused code; delete it
- Favor short functions and methods with one purpose
- Make code readable so that only very short comments are needed, and mostly comment the why
- Clean abstractions with clear separation of concerns, but don't abstract before it's needed
- Avoid brittle tests that are tied to implementation specifics

Add three hooks:
- A lefthook pre-commit hook that formats the staged files, then runs lint, types and gitleaks. Skip the tests, so that it stays quick.
- A hook for this coding agent that runs npm run check:quick when you finish a turn and sends any failure back to you to fix. It should block once and then let you stop, so it can't loop forever.
- A hook for this coding agent that blocks any edit to .env.
Test each one and tell me how you tested it. If this coding agent doesn't support one of these hooks, tell me.