import { afterEach, describe, expect, it, vi } from "vitest";

import { MODE_KEY, applyMode, readMode } from "./mode";

const isDark = () => document.documentElement.getAttribute("data-mode") === "dark";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-mode");
});

describe("reading the mode", () => {
  it("is light when nothing is stored", () => {
    expect(readMode()).toBe("light");
  });

  it("is dark only when dark is stored", () => {
    localStorage.setItem(MODE_KEY, "dark");
    expect(readMode()).toBe("dark");
    localStorage.setItem(MODE_KEY, "midnight");
    expect(readMode()).toBe("light");
  });

  it("is light when storage can't be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readMode()).toBe("light");
  });
});

describe("applying the mode", () => {
  it("sets dark on the page and remembers it", () => {
    applyMode("dark");
    expect(isDark()).toBe(true);
    expect(localStorage.getItem(MODE_KEY)).toBe("dark");
  });

  it("takes dark off the page and remembers light", () => {
    applyMode("dark");
    applyMode("light");
    expect(document.documentElement.hasAttribute("data-mode")).toBe(false);
    expect(localStorage.getItem(MODE_KEY)).toBe("light");
  });

  it("still changes the page when storage can't be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => applyMode("dark")).not.toThrow();
    expect(isDark()).toBe(true);
  });
});
