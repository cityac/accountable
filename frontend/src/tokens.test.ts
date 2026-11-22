import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { MODE_KEY } from "./lib/mode";

const SOURCE = path.dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(path.join(SOURCE, "styles.css"), "utf8");

type Palette = Record<string, string>;

function colorsIn(block: string): Palette {
  const pairs = [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(([, name, hex]) => [name, hex]);
  return Object.fromEntries(pairs);
}

function blockAfter(selector: string) {
  const start = styles.indexOf(`${selector} {`);
  return styles.slice(start, styles.indexOf("\n}", start));
}

const light = colorsIn(blockAfter("@theme"));
const dark = { ...light, ...colorsIn(blockAfter('[data-mode="dark"]')) };

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(one: string, other: string) {
  const [high, low] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

// [text or mark, background, the ratio it needs], from the spec's color tokens.
const PAIRS: [string, string, number][] = [
  ["ink", "panel", 4.5],
  ["ink", "page", 4.5],
  ["muted", "panel", 4.5],
  ["muted", "page", 4.5],
  ["ink", "late-tint", 4.5],
  ["muted", "late-tint", 4.5],
  ["sea-green-text", "panel", 4.5],
  ["sea-green-text", "page", 4.5],
  ["marigold-text", "panel", 4.5],
  ["marigold-text", "page", 4.5],
  ["on-color", "sea-green", 4.5],
  ["on-color", "marigold", 4.5],
  ["on-color", "coral", 4.5],
  ["on-color", "sea-mist", 4.5],
  ["won-ink", "won", 4.5],
  ["on-strong", "chip-info", 4.5],
  ["on-strong", "chip-alert", 4.5],
  ["chip-alert", "panel", 4.5],
  ["cerulean", "panel", 3],
  ["cerulean", "page", 3],
];

// The spec states this one for dark mode only. Light mode's softer bar is unchanged.
const DARK_PAIRS: typeof PAIRS = [["bar-soft", "panel", 3]];

describe("the color tokens", () => {
  it("give every dark value a light one", () => {
    for (const name of Object.keys(colorsIn(blockAfter('[data-mode="dark"]')))) {
      expect(light, name).toHaveProperty(name);
    }
  });

  it.each([
    ["light", light, PAIRS],
    ["dark", dark, [...PAIRS, ...DARK_PAIRS]],
  ])("meet the spec's contrast ratios in %s mode", (_mode, palette: Palette, pairs: typeof PAIRS) => {
    for (const [front, back, needed] of pairs) {
      expect(contrast(palette[front], palette[back]), `${front} on ${back}`).toBeGreaterThanOrEqual(needed);
    }
  });

  it("keep light mode's values as they were before dark mode", () => {
    expect(light).toMatchObject({
      page: "#f0f4f5",
      panel: "#ffffff",
      ink: "#073b4c",
      muted: "#4a6b76",
      "sea-green": "#06d6a0",
      "sea-green-text": "#047a5b",
      marigold: "#ffc145",
      "marigold-text": "#866522",
      coral: "#f78c6b",
      cerulean: "#118ab2",
      raspberry: "#ef476f",
      "sea-mist": "#cdd8db",
      "chip-info": "#107fa4",
      "chip-alert": "#d23e62",
      "late-tint": "#fdecf1",
      grid: "#e4ecee",
      "bar-soft": "#839da5",
      midnight: "#073b4c",
      "on-color": "#073b4c",
      "on-strong": "#ffffff",
      won: "#073b4c",
      "won-ink": "#cdd8db",
    });
  });

  it("use the spec's dark surfaces", () => {
    expect(dark).toMatchObject({ page: "#04232e", panel: "#000000", ink: "#cdd8db", won: "#cdd8db" });
  });
});

describe("the script that sets the mode before the page draws", () => {
  it("reads the same storage key as lib/mode.ts", () => {
    const html = readFileSync(path.join(SOURCE, "..", "index.html"), "utf8");
    expect(html).toContain(`localStorage.getItem("${MODE_KEY}")`);
  });
});
