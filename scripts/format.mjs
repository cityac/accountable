// npm run format: fixes the formatting that npm run check looks for.

import path from "node:path";

import { ROOT, runSync, setup } from "./setup.mjs";

setup();

const prettier = path.join(ROOT, "node_modules", "prettier", "bin", "prettier.cjs");
const steps = [
  [process.execPath, [prettier, "--write", "--log-level=warn", "."], path.join(ROOT, "frontend")],
  ["uv", ["run", "--no-sync", "ruff", "format", "backend"], ROOT],
];

const failed = steps.some(([command, args, cwd]) => runSync(command, args, { cwd }).status !== 0);
process.exit(failed ? 1 : 0);
