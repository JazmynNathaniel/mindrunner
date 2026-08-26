import { z } from "zod";

export const CATEGORIES = [
  "random",
  "funny",
  "flirty",
  "philosophical",
  "programming",
  "unhinged",
  "him",
  "late-night",
  "dance",
  "music",
  "cats",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["DRAFT", "QUEUED", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"] as const;
export type ThoughtStatus = (typeof STATUSES)[number];

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

// http(s) only — these render as <a href> / <img src>, so javascript: URLs must not pass.
const httpUrl = z.preprocess(
  emptyToUndef,
  z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), { message: "must be an http(s) url" })
    .optional()
);

export const songInput = z.object({
  artist: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  album: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
  artworkUrl: httpUrl,
  externalUrl: httpUrl,
});
export type SongInput = z.infer<typeof songInput>;

export const thoughtInput = z.object({
  text: z.string().trim().min(1).max(4000),
  category: z.enum(CATEGORIES).default("random"),
  tags: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9][a-z0-9-]{0,23}$/, "tags: lowercase letters, digits, dashes; max 24 chars")
    )
    .max(8)
    .default([]),
  mood: z.preprocess(emptyToUndef, z.string().trim().max(60).nullish()), // null = clear on PATCH
  song: songInput.nullish(),
  queue: z.boolean().default(false),
});
export type ThoughtInput = z.infer<typeof thoughtInput>;

export const thoughtPatch = thoughtInput.omit({ queue: true }).partial();
export type ThoughtPatch = z.infer<typeof thoughtPatch>;

const MONTH_MIN = 60 * 24 * 30;
export const settingsInput = z
  .object({
    minIntervalMin: z.number().int().min(1).max(MONTH_MIN),
    maxIntervalMin: z.number().int().min(1).max(MONTH_MIN),
    lifetimeMin: z.number().int().min(0).max(MONTH_MIN), // 0 = until next thought replaces it
    selectionMode: z.enum(["FIFO", "RANDOM"]),
  })
  .refine((s) => s.maxIntervalMin >= s.minIntervalMin, {
    message: "max interval must be >= min interval",
    path: ["maxIntervalMin"],
  });
export type SettingsInput = z.infer<typeof settingsInput>;

const vital = z.string().trim().min(1).max(60);
export const diagnosticsInput = z.object({
  cpu: vital,
  memory: vital,
  storage: vital,
  uptime: vital,
  latency: vital,
  catInterference: z.string().trim().min(1).max(30),
  occupiedPct: z.number().int().min(0).max(100),
  warning: z.string().trim().min(1).max(80),
  flora: z.string().trim().min(1).max(30),
});
export type DiagnosticsInput = z.infer<typeof diagnosticsInput>;

export const loginInput = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const thoughtAction = z.object({
  action: z.enum(["queue", "unqueue", "publish", "expire", "archive"]),
});
