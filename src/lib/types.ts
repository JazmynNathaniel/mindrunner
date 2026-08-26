// Shared DTO types — the exact shapes the API returns to the browser.

export type SongDTO = {
  artist: string;
  title: string;
  album: string | null;
  artworkUrl: string | null;
  externalUrl: string | null;
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

export type BrainState = {
  /** thought = one is live; idle-scheduled = brain is processing; idle-empty = buffer empty */
  mode: "thought" | "idle-scheduled" | "idle-empty";
  thought: RecipientThoughtDTO | null;
  nowPlaying: (SongDTO & { updatedAt: string }) | null;
  system: {
    flora: string;
    catProcesses: string[];
    thoughtsServed: number;
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

export type SettingsDTO = {
  minIntervalMin: number;
  maxIntervalMin: number;
  lifetimeMin: number;
  selectionMode: "FIFO" | "RANDOM";
};

export type MeDTO = { username: string; role: "ADMIN" | "RECIPIENT" };
