// Claude Code PreToolUse hook: blocks the agent from editing .env, which holds this
// computer's own keys. .env.example is fine, because it has none.
//
// A shell can change .env as easily as the edit tools can, so a Bash command that
// names .env is blocked too. That check reads the command's text, so it's a guard
// against mistakes, not a sandbox.

import { readFileSync } from "node:fs";
import path from "node:path";

const ENV_FILE = /^\.env(\..+)?$/;
const ENV_IN_COMMAND = /(^|[\s'"=/<>|;&(])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'"<>|;&)])/;

const isEnvFile = (file) => {
  const name = path.basename(file ?? "");
  return ENV_FILE.test(name) && name !== ".env.example";
};

const { tool_name: tool, tool_input: toolInput = {} } = JSON.parse(readFileSync(0, "utf8"));
const blocked =
  tool === "Bash" ? ENV_IN_COMMAND.test(toolInput.command ?? "") : isEnvFile(toolInput.file_path ?? toolInput.notebook_path);

if (blocked) {
  const permissionDecisionReason =
    ".env holds this computer's own keys, so the agent may not change it. Ask the user to edit it by hand.";
  console.log(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason },
    }),
  );
}
