import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ModeToggle } from "./ModeToggle";

const isDark = () => document.documentElement.getAttribute("data-mode") === "dark";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-mode");
});

describe("the mode toggle", () => {
  it("offers dark mode, with a moon and the same words as its tooltip", () => {
    render(<ModeToggle />);
    const toggle = screen.getByRole("button", { name: "Switch to dark mode" });
    expect(toggle).toHaveProperty("title", "Switch to dark mode");
    expect(toggle.querySelector(".lucide-moon")).not.toBeNull();
  });

  it("switches to dark and back on a click", async () => {
    render(<ModeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    const toggle = screen.getByRole("button", { name: "Switch to light mode" });
    expect(isDark()).toBe(true);
    expect(toggle).toHaveProperty("title", "Switch to light mode");
    expect(toggle.querySelector(".lucide-sun")).not.toBeNull();

    await userEvent.click(toggle);
    expect(isDark()).toBe(false);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeDefined();
  });

  it("works from the keyboard with Enter and Space", async () => {
    render(<ModeToggle />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(isDark()).toBe(true);
    await userEvent.keyboard(" ");
    expect(isDark()).toBe(false);
  });
});
