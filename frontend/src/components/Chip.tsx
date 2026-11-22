import type { ReactNode } from "react";

const TONES = {
  seaGreen: "bg-sea-green text-on-color",
  marigold: "bg-marigold text-on-color",
  coral: "bg-coral text-on-color",
  info: "bg-chip-info text-on-strong",
  won: "bg-won text-won-ink",
  alert: "bg-chip-alert text-on-strong",
  quiet: "bg-page text-muted",
};

export type ChipTone = keyof typeof TONES;

export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[13px] leading-[18px] font-semibold whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
