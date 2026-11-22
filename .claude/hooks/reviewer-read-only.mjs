// Claude Code PreToolUse hook for the reviewer subagent: lets through only Bash
// commands that read. The reviewer reports findings and never changes anything, so a
// command that could write a file, move a branch or reach the network is denied.
//
// It reads the command's text, so it's a guard against mistakes, not a sandbox.

import { readFileSync } from "node:fs";

const READ_COMMANDS = new Set([
  "cat",
  "head",
  "tail",
  "wc",
  "ls",
  "grep",
  "rg",
  "find",
  "sed",
  "awk",
  "sort",
  "uniq",
  "cut",
  "tr",
  "diff",
  "pwd",
  "cd",
  "echo",
  "true",
]);
const READ_GIT = new Set([
  "diff",
  "log",
  "show",
  "status",
  "branch",
  "merge-base",
  "rev-parse",
  "ls-files",
  "blame",
  "grep",
  "cat-file",
  "shortlog",
  "describe",
  "name-rev",
  "ls-tree",
  "rev-list",
  "for-each-ref",
  "show-ref",
]);
// Flags that turn a reading command into a writing one.
const SED_WRITES = /(^|\s)(-i\S*|--in-place\S*)(?=\s|$)/;
const FIND_WRITES = /(^|\s)(-exec|-execdir|-ok|-okdir|-delete|-fprint\S*|-fls)(?=\s|$)/;
const AWK_WRITES = /system\s*\(|print\S*\s*>|\|\s*"/;
const GIT_OUTPUT = /(^|\s)--output\S*/;

const WRITE_CHECKS = { sed: SED_WRITES, find: FIND_WRITES, awk: AWK_WRITES };

// Splits a command into its simple commands, each a list of words, keeping quoted
// text as one word. Returns null if, outside quotes, it writes to a file with ">" or
// runs a command inside another with $(...) or backticks.
const parse = (command) => {
  const commands = [[]];
  let word = null;
  let quote = null;
  const endWord = () => {
    if (word !== null) commands.at(-1).push(word);
    word = null;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (quote === '"' && (c === "`" || (c === "$" && command[i + 1] === "("))) return null;
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      word ??= "";
    } else if (c === "`" || (c === "$" && command[i + 1] === "(")) {
      return null;
    } else if (c === ">") {
      // Only 2>&1, >&2 and >/dev/null, which write nowhere.
      const after = command.slice(i + 1);
      const toNull = after.match(/^\s*\/dev\/null/);
      const toFd = after.match(/^&\d/);
      if (!toNull && !toFd) return null;
      if (word !== null && /^\d$/.test(word)) word = null;
      endWord();
      i += (toNull ?? toFd)[0].length;
    } else if (/[|;&\n]/.test(c)) {
      endWord();
      commands.push([]);
    } else if (/\s/.test(c)) {
      endWord();
    } else {
      word = (word ?? "") + c;
    }
  }
  if (quote) return null;
  endWord();
  return commands;
};

const BRANCH_LIST_FLAG =
  /^(-a|-r|-v|-vv|--all|--remotes|--list|--contains|--merged|--no-merged|--points-at|--show-current)$/;
const BRANCH_VALUE_FLAG = /^--(contains|merged|no-merged|points-at)$/;

const gitIsRead = (args) => {
  // `git -C <path>` and `git --no-pager` only change where and how it reads.
  while (args[0] === "-C" || args[0] === "--no-pager") args = args.slice(args[0] === "-C" ? 2 : 1);
  const [sub, ...rest] = args;
  if (!READ_GIT.has(sub) || rest.some((w) => GIT_OUTPUT.test(w))) return false;
  // `git branch` only lists: no branch name, and only listing flags.
  if (sub === "branch")
    return rest.every((w, i) => BRANCH_LIST_FLAG.test(w) || BRANCH_VALUE_FLAG.test(rest[i - 1] ?? ""));
  return true;
};

const commandIsRead = (words) => {
  while (words.length && /^\w+=/.test(words[0])) words = words.slice(1); // VAR=value prefix
  if (!words.length) return true;
  const [name, ...args] = words;
  if (name === "git") return gitIsRead(args);
  if (!READ_COMMANDS.has(name)) return false;
  const writes = WRITE_CHECKS[name];
  return !writes || !args.some((w) => writes.test(w));
};

const isReadOnly = (command) => {
  const commands = parse(command);
  return commands !== null && commands.every(commandIsRead);
};

const { tool_name: tool, tool_input: toolInput = {} } = JSON.parse(readFileSync(0, "utf8"));

if (tool === "Bash" && !isReadOnly(toolInput.command ?? "")) {
  const permissionDecisionReason =
    "The reviewer is read-only: it may run only commands that read, such as git diff, git log, git show, grep and cat. Report the finding instead of changing anything.";
  console.log(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason },
    }),
  );
}
