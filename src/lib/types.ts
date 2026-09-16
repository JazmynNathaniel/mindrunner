// Shared DTO types — the exact shapes the API returns to the browser —
// plus the few constants both sides render/validate against.

/** The one category list: zod validation and UI selects both draw from here. */
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

export type SongDTO = {
  artist: string;
  title: string;
  album: string | null;
  artworkUrl: string | null;
  externalUrl: string | null;
};

export type NowPlayingDTO = SongDTO & {
  updatedAt: string;
  /** false = deck is idle; the song shown is the last one played */
  isPlaying: boolean;
  /** real playback position/length in seconds when the provider knows them */
  progressSec: number | null;
  durationSec: number | null;
};

export type RecipientThoughtDTO = {
  id: string;
  text: string;
  category: string;
  tags: string[];
  mood: string | null;
  /** owner context: what she was doing when the thought struck */
  doing: string | null;
  /** owner context: where she was */
  location: string | null;
  publishedAt: string;
  song: SongDTO | null;
  alreadySeen: boolean;
};

export type RecipientStats = {
  checks: number;
  sessions: number;
  firstVisit: string | null;
  lastVisit: string | null;
  thoughtsServed: number;
};

export type DiagnosticsDTO = {
  cpu: string;
  memory: string;
  storage: string;
  uptime: string;
  latency: string;
  catInterference: string;
  occupiedPct: number;
  warning: string;
  flora: string;
};

export type OperatorVitalsDTO = {
  /** water, in fiction: coolant refills logged today (ET) */
  coolant: { today: number; target: number };
  /** meals, in fiction: payload packets received today (ET) */
  packetsToday: number;
  lastPacket: { at: string; payload: string } | null;
};

export type AdminOperatorVitalsDTO = OperatorVitalsDTO & {
  /** ISO timestamps of his coolant top-up requests, last 24h, newest first */
  pings: string[];
};

/**
 * One MEMORY BANKS record. Chronology follows the moment the thought was HAD
 * (`thoughtAt` = when she wrote it), never when the machine aired it.
 */
export type ArchiveThoughtDTO = {
  id: string;
  /** 1-based ordinal in thought-had order (oldest = 1) */
  index: number;
  /** when she had the thought */
  thoughtAt: string;
  text: string;
  category: string;
  tags: string[];
  mood: string | null;
  doing: string | null;
  location: string | null;
  song: SongDTO | null;
};

export type ArchivePageDTO = {
  entries: ArchiveThoughtDTO[];
  /** records matching the current filters */
  matched: number;
  /** all records in the archive */
  total: number;
};

export type BrainState = {
  /** thought = one is live; idle-scheduled = brain is processing; idle-empty = buffer empty */
  mode: "thought" | "idle-scheduled" | "idle-empty";
  thought: RecipientThoughtDTO | null;
  /** records currently in MEMORY BANKS (shown on the collapsed panel header) */
  archiveCount: number;
  /** recipient-only: the machine's one-shot commentary on his absence / unread thought */
  snark: string | null;
  /** open comms channels, most recently active first */
  channels: ChannelDTO[];
  nowPlaying: NowPlayingDTO | null;
  vitals: OperatorVitalsDTO;
};

export type AdminThoughtDTO = {
  id: string;
  text: string;
  status: string;
  category: string;
  tags: string[];
  mood: string | null;
  doing: string | null;
  location: string | null;
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  /** read receipt: when he first decrypted it (spec §19 amended by owner, 2026-09-13) */
  seenAt: string | null;
  queuePosition: number | null;
  song: SongDTO | null;
};

export type AdminReplyDTO = {
  id: string;
  /** null until the owner decrypts it — the mischief rating is the only preview */
  text: string | null;
  mischief: number;
  createdAt: string;
  seenAt: string | null;
  /** sealed-attachment teasers: visible before decrypt, like the mischief meter */
  hasSong: boolean;
  hasGif: boolean;
  /** attachment payloads: null until decrypted */
  songUrl: string | null;
  gifUrl: string | null;
  /** chat messages in this transmission's channel (0 = never answered) */
  messageCount: number;
  /** what he was replying to, if it still exists */
  thoughtExcerpt: string | null;
};

/** One message inside a comms channel. GIF: `text` holds the https url. */
export type ChatMessageDTO = {
  id: string;
  sender: "OWNER" | "RECIPIENT";
  kind: "TEXT" | "GIF";
  text: string;
  at: string;
};

/**
 * One open comms channel: a chat room rooted on an uplink transmission.
 * A room exists for the recipient only once the owner has posted in it.
 */
export type ChannelDTO = {
  /** the root uplink's id — also the chat API path segment */
  id: string;
  /** what the opening transmission replied to, if anything (the room's topic) */
  topic: string | null;
  /** his opening transmission — the room's reason to exist ("" = attachment-only) */
  rootText: string;
  /** attachments riding on the opening transmission */
  songUrl: string | null;
  gifUrl: string | null;
  mischief: number;
  openedAt: string;
  lastAt: string;
  lastFrom: "OWNER" | "RECIPIENT";
  messageCount: number;
};

/** One GIF ENGINE search result (server-proxied Giphy). */
export type GifDTO = {
  id: string;
  title: string;
  /** small animated preview for the picker grid */
  previewUrl: string;
  /** full-size url — what actually gets sent */
  url: string;
};

/** One resolved vault petition. APPROVED carries the unsealed entry. */
export type RevealDTO = {
  id: string;
  status: "APPROVED" | "DENIED";
  requestedAt: string;
  resolvedAt: string;
  /** the unsealed entry's text, snapshotted at approval (APPROVED only) */
  text: string | null;
  /** when she originally wrote the unsealed entry (APPROVED only) */
  thoughtAt: string | null;
};

/**
 * JAZ://VAULT — her private journal as seen from outside: a count of sealed
 * entries (DRAFT thoughts), the open petition if any, and the last few
 * resolutions. Entry contents never ride along; only an approval's snapshot
 * is ever exposed.
 */
export type VaultStateDTO = {
  sealed: number;
  pending: { id: string; at: string } | null;
  reveals: RevealDTO[];
};

/**
 * HIM://STATUS — the recipient's self-reported telemetry, his mirror of the
 * owner's mood/doing/location context.
 */
export type NodeStatusDTO = {
  mood: string | null;
  doing: string | null;
  location: string | null;
  note: string | null;
  /** when he last updated the fields above (null = the node has never reported) */
  telemetryAt: string | null;
};

/** The two dishes. Each names a person: HONEY is the owner, JERK is the recipient. */
export const DISHES = ["HONEY", "JERK"] as const;
export type Dish = (typeof DISHES)[number];

/**
 * One dish's protocol state. Selfie images ride separately through the authed
 * /api/selfie/[id] route — this DTO only ever carries ids and counts.
 */
export type DishStateDTO = {
  dish: Dish;
  /** selfies waiting sealed in the stash */
  stock: number;
  /** open demand (the protocol was pressed while the stash was bare) */
  demand: { id: string; at: string } | null;
  /** the most recently unsealed selfie (fetch via /api/selfie/[id]) */
  latest: { id: string; at: string } | null;
  /** total ever unsealed for this dish */
  unsealedCount: number;
};

export type ProtocolsStateDTO = {
  honey: DishStateDTO;
  jerk: DishStateDTO;
};

/**
 * One armed reminder. The siren blares (on both terminals) while a reminder is
 * past due and unacknowledged; only the owner can acknowledge.
 */
export type ReminderDTO = {
  id: string;
  task: string;
  note: string | null;
  /** when the siren starts blaring */
  dueAt: string;
  createdAt: string;
  createdBy: "OWNER" | "RECIPIENT";
  /** when the owner acknowledged it (null = still armed) */
  ackAt: string | null;
};

/** The /api/system view: diagnostics + brain-access stats, side-effect free. */
export type SystemViewDTO = {
  system: {
    flora: string;
    catProcesses: string[];
    thoughtsServed: number;
    diagnostics: DiagnosticsDTO;
  };
  stats: RecipientStats;
};

export type SettingsDTO = {
  minIntervalMin: number;
  maxIntervalMin: number;
  lifetimeMin: number;
  selectionMode: "FIFO" | "RANDOM";
};

export type MeDTO = { username: string; role: "ADMIN" | "RECIPIENT" };
