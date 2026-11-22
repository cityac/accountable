// Claude Code Stop hook: runs npm run check:quick when the agent finishes a turn,
// and sends a failure back to it to fix. It blocks once: when the agent is already
// continuing because of this hook, it lets the agent stop, so it can't loop forever.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The summary and the failures are at the end; the agent can rerun the check for the rest.
const TAIL_LINES = 150;

const input = JSON.parse(readFileSync(0, "utf8"));
if (input.stop_hook_active) process.exit(0);

const check = spawnSync("npm", ["run", "check:quick"], {
  cwd: input.cwd ?? process.cwd(),
  encoding: "utf8",
  env: { ...process.env, NO_COLOR: "1" },
  maxBuffer: 64 * 1024 * 1024,
});
if (check.status === 0) process.exit(0);

const output = `${check.stdout ?? ""}${check.stderr ?? ""}${check.error?.message ?? ""}`;
const tail = output.trimEnd().split("\n").slice(-TAIL_LINES).join("\n");
const reason = `npm run check:quick failed. Fix what it found, then run it again.\n\n${tail}`;
console.log(JSON.stringify({ decision: "block", reason }));
