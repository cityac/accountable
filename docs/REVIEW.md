# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't.
- **Matches spec.md and plan.md:** the change does what `docs/spec.md` and its own `docs/changes/<branch name>/plan.md` say, with nothing missing and nothing extra. Go through the plan's "Files that change" table one row at a time against the diff.
- **Follows STANDARDS.md:** the change follows the coding guidelines in `docs/STANDARDS.md`.
- **Described by spec.md:** flag any code that does something `docs/spec.md` doesn't describe, even if the plan asked for it. Also flag any place where `docs/spec.md` disagrees with itself, or gives a figure, such as a color or a ratio, that the code doesn't have.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.
