// npm run check: every check on the code, then npm test. It keeps going past a
// failure, so one run shows everything that needs fixing, and fails if any failed.
//
// With --quick, npm test leaves out the end-to-end tests.

import path from "node:path";

import { ROOT, runSync, setup } from "./setup.mjs";

const quick = process.argv.includes("--quick");
const node = process.execPath;
const bin = (...parts) => path.join(ROOT, "node_modules", ...parts);
const frontend = path.join(ROOT, "frontend");
const uv = (...args) => ["uv", ["run", "--no-sync", ...args]];

const GITLEAKS_HELP =
  "gitleaks isn't installed. Get it from https://github.com/gitleaks/gitleaks#installing, such as with brew install gitleaks.";

const checks = [
  // Only this branch's history, because other local branches may be experiments.
  { name: "Secrets in history", command: ["gitleaks", ["git", "--redact", "--no-banner", "--log-opts=HEAD", "."]] },
  // Everything on disk, committed or not. .gitleaks.toml allows the git-ignored .env.
  { name: "Secrets in files", command: ["gitleaks", ["dir", "--redact", "--no-banner", "."]] },
  { name: "Frontend format", command: [node, [bin("prettier", "bin", "prettier.cjs"), "--check", "."]], cwd: frontend },
  {
    name: "Frontend lint",
    command: [node, [bin("eslint", "bin", "eslint.js"), "--max-warnings", "0", "."]],
    cwd: frontend,
  },
  { name: "Backend format", command: uv("ruff", "format", "--check", "backend") },
  { name: "Backend lint", command: uv("ruff", "check", "backend") },
  { name: "Backend types", command: uv("ty", "check", "backend") },
  // Includes the frontend type check, and fails below 80% unit test coverage.
  {
    name: quick ? "Tests, no end to end" : "Tests",
    command: [node, ["scripts/test.mjs", ...(quick ? ["--quick"] : [])]],
  },
];

setup();

if (runSync("gitleaks", ["version"], { stdio: "ignore" }).status !== 0) {
  console.error(GITLEAKS_HELP);
  process.exit(1);
}

const results = checks.map(({ name, command: [command, args], cwd }) => {
  console.log(`\n${name}\n`);
  const began = performance.now();
  const passed = runSync(command, args, cwd ? { cwd } : {}).status === 0;
  return { name, passed, seconds: (performance.now() - began) / 1000 };
});

const width = Math.max(...results.map((result) => result.name.length));
console.log("\nChecks");
for (const { name, passed, seconds } of results) {
  console.log(
    `  ${name.padEnd(width)}  ${(passed ? "passed" : "FAILED").padEnd(6)}  ${seconds.toFixed(1).padStart(6)}s`,
  );
}

const failed = results.filter((result) => !result.passed);
console.log(
  failed.length === 0 ? "\nAll checks passed." : `\nFailed: ${failed.map((result) => result.name).join(", ")}.`,
);
process.exit(failed.length === 0 ? 0 : 1);
