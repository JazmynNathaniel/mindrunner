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
  /** answered uplink threads, newest first (max 5) */
  downlink: DownlinkThreadDTO[];
  nowPlaying: NowPlayingDTO | null;
  vitals: OperatorVitalsDTO;
  system: {
    flora: string;
    catProcesses: string[];
    thoughtsServed: number;
    diagnostics: DiagnosticsDTO;
  };
  stats: RecipientStats;
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
  /** the downlink: her answer to this transmission (null = not answered) */
  responseText: string | null;
  respondedAt: string | null;
  /** what he was replying to, if it still exists */
  thoughtExcerpt: string | null;
};

/** One answered uplink thread, as the recipient sees it: his words, her answer. */
export type DownlinkThreadDTO = {
  id: string;
  /** his transmission (his own words — never redacted from him) */
  sent: string;
  mischief: number;
  sentAt: string;
  /** her answer */
  response: string;
  respondedAt: string;
};

export type SettingsDTO = {
  minIntervalMin: number;
  maxIntervalMin: number;
  lifetimeMin: number;
  selectionMode: "FIFO" | "RANDOM";
};

export type MeDTO = { username: string; role: "ADMIN" | "RECIPIENT" };
