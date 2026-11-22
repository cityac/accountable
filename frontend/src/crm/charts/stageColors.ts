import type { Stage } from "../queries";

export const STAGE_COLORS: Record<Stage, { fill: string; ink: string }> = {
  new: { fill: "var(--color-sea-green)", ink: "var(--color-on-color)" },
  qualified: { fill: "var(--color-marigold)", ink: "var(--color-on-color)" },
  proposal: { fill: "var(--color-coral)", ink: "var(--color-on-color)" },
  negotiation: { fill: "var(--color-cerulean)", ink: "var(--color-on-strong)" },
  won: { fill: "var(--color-won)", ink: "var(--color-won-ink)" },
  lost: { fill: "var(--color-raspberry)", ink: "var(--color-on-strong)" },
};
