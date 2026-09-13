import { z } from "zod";
import { CATEGORIES } from "@/lib/types";

// single source of truth is src/lib/types.ts (the UI selects use it too)
export { CATEGORIES, type Category } from "@/lib/types";

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
  doing: z.preprocess(emptyToUndef, z.string().trim().max(120).nullish()),
  location: z.preprocess(emptyToUndef, z.string().trim().max(120).nullish()),
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

// MEMORY BANKS query params (they arrive as strings, hence the coercion).
export const archiveQuery = z.object({
  q: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
  category: z.preprocess(emptyToUndef, z.enum(CATEGORIES).optional()),
  tag: z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]{0,23}$/)
      .optional()
  ),
  sort: z.preprocess(emptyToUndef, z.enum(["newest", "oldest"]).default("newest")),
  offset: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).default(0)),
  limit: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(50).default(20)),
});
export type ArchiveQuery = z.infer<typeof archiveQuery>;

export const loginInput = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const thoughtAction = z.object({
  action: z.enum(["queue", "unqueue", "publish", "expire", "archive"]),
});

export const replyInput = z.object({
  text: z.string().trim().min(1).max(1000),
  mischief: z.number().int().min(1).max(5),
  thoughtId: z.string().uuid().nullish(),
});
export type ReplyInput = z.infer<typeof replyInput>;

export const replyAction = z.object({
  action: z.enum(["decrypt", "delete"]),
});

// COMMS: one chat message (answering moved from the respond action to chat)
export const chatMessageInput = z.object({
  text: z.string().trim().min(1).max(1000),
});

export const vitalsAction = z
  .object({
    action: z.enum(["coolant", "uncoolant", "packet"]),
    payload: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  })
  .refine((v) => v.action !== "packet" || !!v.payload, {
    message: "a packet needs contents",
    path: ["payload"],
  });
export type VitalsAction = z.infer<typeof vitalsAction>;
