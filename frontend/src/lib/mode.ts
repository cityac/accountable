import { useState } from "react";

// index.html reads the same key before the page draws, so the app never flashes light.
export const MODE_KEY = "accountable-mode";

export type Mode = "light" | "dark";

export function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyMode(mode: Mode) {
  if (mode === "dark") document.documentElement.setAttribute("data-mode", "dark");
  else document.documentElement.removeAttribute("data-mode");
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage can be blocked. The mode still holds until the page is closed.
  }
}

export function useMode() {
  const [mode, setMode] = useState(readMode);
  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    applyMode(next);
    setMode(next);
  };
  return { mode, toggle };
}
