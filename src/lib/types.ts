// Shared DTO types — the exact shapes the API returns to the browser.

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

export type BrainState = {
  /** thought = one is live; idle-scheduled = brain is processing; idle-empty = buffer empty */
  mode: "thought" | "idle-scheduled" | "idle-empty";
  thought: RecipientThoughtDTO | null;
  nowPlaying: NowPlayingDTO | null;
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
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
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
  /** what he was replying to, if it still exists */
  thoughtExcerpt: string | null;
};

export type SettingsDTO = {
  minIntervalMin: number;
  maxIntervalMin: number;
  lifetimeMin: number;
  selectionMode: "FIFO" | "RANDOM";
};

export type MeDTO = { username: string; role: "ADMIN" | "RECIPIENT" };
