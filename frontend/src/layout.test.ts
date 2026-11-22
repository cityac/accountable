import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SOURCE = path.dirname(fileURLToPath(import.meta.url));

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const file = path.join(folder, name);
    return statSync(file).isDirectory() ? filesIn(file) : [file];
  });
}

function code(folder: string) {
  return filesIn(path.join(SOURCE, folder)).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
}

describe("the plan's layout rules", () => {
  it.each(["components", "lib"])("%s holds only what any area could use", (folder) => {
    for (const file of code(folder)) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/from "[^"]*\/crm\//);
    }
  });
});

describe("talking to the backend", () => {
  it("only happens in the fetch client, so every reply gets the same error handling", () => {
    const callers = filesIn(SOURCE)
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && !file.endsWith("test-utils.tsx"))
      .filter((file) => /\bfetch\(/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SOURCE, file));
    expect(callers).toEqual(["lib/api.ts"]);
  });
});

describe("files that read data", () => {
  it("never pass a plain date to new Date, which reads it as UTC", () => {
    const allowed = /new Date\((\)|shown\))/; // shown comes from a date and time box, which has no zone either way.
    for (const file of code(".")) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (line.includes("new Date(")) expect(line, file).toMatch(allowed);
      }
    }
  });
});

describe("colors", () => {
  const sourceFiles = () => code(".").map((file) => [path.relative(SOURCE, file), readFileSync(file, "utf8")] as const);

  it("are only named in styles.css, as tokens that follow the mode", () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\b(bg|text|fill|stroke|border)-(white|black)\b|\bdark:/;
    for (const [file, text] of sourceFiles()) {
      expect(text, file).not.toMatch(literal);
    }
  });

  it("only lib/mode.ts stores the mode or sets it on the page", () => {
    const touching = sourceFiles()
      .filter(([, text]) => /localStorage|data-mode/.test(text))
      .map(([file]) => file);
    expect(touching).toEqual(["lib/mode.ts"]);
  });
});
