// The mischief scale — shared vocabulary between his meter and her admin panel.
// 1 is safe to open in public. 5 is not safe to open anywhere.
export const MISCHIEF_LEVELS = [
  { level: 1, label: "harmless", colorClass: "glow-green" },
  { level: 2, label: "mildly feral", colorClass: "glow-lime" },
  { level: 3, label: "questionable intent", colorClass: "glow-cyan" },
  { level: 4, label: "the cats are involved", colorClass: "glow-pink" },
  { level: 5, label: "CONTAINMENT BREACH", colorClass: "text-alert" },
] as const;

export function mischiefMeta(level: number) {
  return MISCHIEF_LEVELS[Math.min(5, Math.max(1, level)) - 1];
}

export function mischiefBar(level: number, cells = 10): string {
  const filled = Math.round((Math.min(5, Math.max(1, level)) / 5) * cells);
  return "█".repeat(filled) + "░".repeat(cells - filled);
}
