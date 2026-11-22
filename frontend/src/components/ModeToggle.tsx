import { Moon, Sun } from "lucide-react";

import { useMode } from "../lib/mode";

export function ModeToggle() {
  const { mode, toggle } = useMode();
  const label = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={toggle}>
      {mode === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  );
}
