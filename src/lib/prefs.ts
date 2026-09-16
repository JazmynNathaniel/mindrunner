"use client";

import { useSyncExternalStore } from "react";

/**
 * Terminal preferences — theme + panel layout, per device, in localStorage.
 * Exposed as an external store (same pattern as bootFlag) so React reads it
 * through useSyncExternalStore: the server snapshot is the factory default and
 * the client snapshot swaps in right after hydration, no mismatch.
 * The theme is ALSO applied pre-hydration by an inline script in layout.tsx
 * (which duplicates KEY — keep them in sync) so a re-skinned brain never
 * flashes factory pink on load.
 */

export const THEMES = [
  {
    id: "synth-rose",
    label: "SYNTH ROSE",
    blurb: "factory firmware. pink lightning in a dark room.",
    swatch: ["#ff5cd6", "#a06bff", "#52ff9e", "#5df3ff"],
  },
  {
    id: "ghost",
    label: "GHOST",
    blurb: "green phosphor. the terminal your mother warned you about.",
    swatch: ["#52ff9e", "#7dffb0", "#d8ffb0", "#b4ffd9"],
  },
  {
    id: "ember",
    label: "EMBER",
    blurb: "amber glass. warm like a machine about to overheat.",
    swatch: ["#ffb054", "#ffc06b", "#ffe14f", "#ffe9b4"],
  },
  {
    id: "ice",
    label: "ICE",
    blurb: "arctic signal. feelings at absolute zero.",
    swatch: ["#5cb8ff", "#6b8cff", "#52ffe0", "#5df3ff"],
  },
  {
    id: "bloodline",
    label: "BLOODLINE",
    blurb: "crimson protocol. the brain runs hot.",
    swatch: ["#ff5c6b", "#ff6b9e", "#ff7a52", "#ff9eb4"],
  },
  {
    id: "vaporwave",
    label: "VAPORWAVE",
    blurb: "pastel static from a mall that no longer exists.",
    swatch: ["#ff8ad8", "#b48aff", "#5cffc4", "#7ae4ff"],
  },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];

export const PANELS = [
  { key: "thoughts", label: "JAZ://THOUGHTS", locked: true, note: "core process. cannot be killed." },
  { key: "siren", label: "REMINDER SIREN", locked: false, note: "armed reminders. blares when due." },
  { key: "uplink", label: "UPLINK :: REPLY", locked: false, note: "transmissions back to the brain." },
  { key: "comms", label: "COMMS", locked: false, note: "open chat channels." },
  { key: "facts", label: "DECLASSIFIED INTEL", locked: false, note: "fun facts not cleared for public release." },
  { key: "archive", label: "MEMORY BANKS", locked: false, note: "every thought ever aired." },
  { key: "now-playing", label: "NOW PLAYING", locked: false, note: "what jaz is listening to." },
  { key: "vitals", label: "OPERATOR VITALS", locked: false, note: "coolant and payload intake." },
  { key: "node", label: "HIM://STATUS", locked: false, note: "the node's self-reported telemetry." },
] as const;
export type PanelKey = (typeof PANELS)[number]["key"];

export type Prefs = {
  theme: ThemeId;
  order: PanelKey[];
  hidden: PanelKey[];
};

const KEY = "bos_prefs_v1";
const DEFAULT_ORDER = PANELS.map((p) => p.key);
const DEFAULT_PREFS: Prefs = { theme: "synth-rose", order: DEFAULT_ORDER, hidden: [] };

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));
const PANEL_KEYS = new Set<string>(DEFAULT_ORDER);
const LOCKED_KEYS = new Set<string>(PANELS.filter((p) => p.locked).map((p) => p.key));

/** Coerce whatever is in storage into a valid Prefs (drops unknowns, appends new panels). */
function normalize(raw: unknown): Prefs {
  const r = (raw ?? {}) as Partial<Record<keyof Prefs, unknown>>;
  const theme = typeof r.theme === "string" && THEME_IDS.has(r.theme) ? (r.theme as ThemeId) : DEFAULT_PREFS.theme;
  const seen = new Set<string>();
  const order: PanelKey[] = [];
  if (Array.isArray(r.order)) {
    for (const k of r.order) {
      if (typeof k === "string" && PANEL_KEYS.has(k) && !seen.has(k)) {
        seen.add(k);
        order.push(k as PanelKey);
      }
    }
  }
  for (const k of DEFAULT_ORDER) if (!seen.has(k)) order.push(k);
  const hidden = Array.isArray(r.hidden)
    ? (r.hidden.filter(
        (k): k is PanelKey => typeof k === "string" && PANEL_KEYS.has(k) && !LOCKED_KEYS.has(k)
      ) as PanelKey[])
    : [];
  return { theme, order, hidden };
}

const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  let raw: unknown = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    /* corrupted storage falls back to defaults */
  }
  cache = normalize(raw);
  return cache;
}

export function getPrefs(): Prefs {
  return read();
}

export function getServerPrefs(): Prefs {
  return DEFAULT_PREFS;
}

export function subscribePrefs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}

export function setPrefs(patch: Partial<Prefs>) {
  cache = normalize({ ...read(), ...patch });
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full/blocked: prefs live for the session only */
  }
  applyTheme(cache.theme);
  listeners.forEach((l) => l());
}

export function resetPrefs() {
  setPrefs(DEFAULT_PREFS);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribePrefs, getPrefs, getServerPrefs);
}
