"use client";

// The "has this session booted" flag lives in sessionStorage (external to
// React), so it's exposed as a proper external store for useSyncExternalStore.

const KEY = "bos_booted";
const listeners = new Set<() => void>();

export function subscribeBooted(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getBooted(): boolean {
  return sessionStorage.getItem(KEY) === "1";
}

// Server snapshot: pretend not booted; the boot screen's first frame is blank,
// so the post-hydration swap for already-booted sessions is invisible.
export function getBootedServer(): boolean {
  return false;
}

export function setBooted(value: boolean) {
  if (value) sessionStorage.setItem(KEY, "1");
  else sessionStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}
