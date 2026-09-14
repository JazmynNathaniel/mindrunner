"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ReminderDTO } from "@/lib/types";

const POLL_MS = 60_000;
// countdown labels re-render on a timer so "T-2m" doesn't fossilize
const TICK_MS = 30_000;

/**
 * REMINDER SIREN — the same severe red window on both terminals. He arms
 * reminders for the owner; while one is past due and unacknowledged the whole
 * panel blares. Only the owner can acknowledge (the server enforces it);
 * either side can arm or purge.
 */
export function SirenPanel({ role }: { role: "OWNER" | "RECIPIENT" }) {
  const [reminders, setReminders] = useState<ReminderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await api<{ reminders: ReminderDTO[] }>("/api/reminders");
      setReminders(res.reminders);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "siren unreachable.");
    }
  }, []);

  useEffect(() => {
    // initial fetch + poll: setState happens after awaited network I/O
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  async function act(id: string, action: "ack" | "delete") {
    try {
      const res = await api<{ reminders: ReminderDTO[] }>(`/api/reminders/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setReminders(res.reminders);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "siren unreachable.");
    }
  }

  const armed = (reminders ?? []).filter((r) => r.ackAt === null);
  const silenced = (reminders ?? []).filter((r) => r.ackAt !== null);
  const blaring = armed.filter((r) => new Date(r.dueAt).getTime() <= now);

  return (
    <section
      className={`panel p-4 ${blaring.length > 0 ? "panel-alarm alarm-blink" : ""}`}
      aria-label="reminder siren"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grid pb-2">
        <h2 className="panel-title glow-siren text-lg tracking-widest">
          REMINDER SIREN :: {armed.length} ARMED
        </h2>
        {blaring.length > 0 && (
          <span className="glow-siren text-xs tracking-widest" role="alert">
            !! {blaring.length} {blaring.length === 1 ? "REMINDER" : "REMINDERS"} DUE — ATTENTION
            REQUIRED !!
          </span>
        )}
      </div>

      {reminders === null && !error && (
        <p className="mt-3 text-xs text-dim">
          &gt; polling the siren... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}

      {reminders !== null && armed.length === 0 && (
        <p className="mt-3 text-xs text-faint">
          &gt; nothing armed. the owner is, allegedly, on top of things.
        </p>
      )}

      {armed.length > 0 && (
        <ul className="mt-3 space-y-2">
          {armed.map((r) => (
            <SirenItem key={r.id} r={r} role={role} now={now} act={act} />
          ))}
        </ul>
      )}

      {silenced.length > 0 && (
        <div className="mt-3 border-t border-grid pt-2">
          <p className="text-xs tracking-widest text-faint">RECENTLY SILENCED</p>
          <ul className="mt-1 space-y-1">
            {silenced.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
                <span className="line-through">{r.task}</span>
                <span>
                  ack {new Date(r.ackAt as string).toLocaleString()}{" "}
                  <button
                    type="button"
                    className="underline decoration-dotted hover:text-dim"
                    onClick={() => void act(r.id, "delete")}
                  >
                    [clear]
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ArmForm onArmed={setReminders} onError={setError} />

      {error && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; {error}
        </p>
      )}
    </section>
  );
}

function SirenItem({
  r,
  role,
  now,
  act,
}: {
  r: ReminderDTO;
  role: "OWNER" | "RECIPIENT";
  now: number;
  act: (id: string, action: "ack" | "delete") => Promise<void>;
}) {
  const due = new Date(r.dueAt).getTime();
  const isDue = due <= now;
  const by =
    r.createdBy === "OWNER" ? (role === "OWNER" ? "you" : "jaz") : role === "OWNER" ? "him" : "you";

  return (
    <li className={`rounded border p-3 text-sm ${isDue ? "border-siren" : "border-grid"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={isDue ? "glow-siren tracking-widest" : "text-faint tracking-widest"}>
          {countdown(due, now)}
        </span>
        <span className="text-faint">
          {new Date(r.dueAt).toLocaleString()} · armed by {by}
        </span>
      </div>
      <p className={`mt-1 whitespace-pre-wrap ${isDue ? "glow-siren" : "text-ink"}`}>{r.task}</p>
      {r.note && <p className="mt-1 whitespace-pre-wrap text-xs text-dim">{r.note}</p>}
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        {role === "OWNER" && (
          <button type="button" className="btn text-xs" onClick={() => void act(r.id, "ack")}>
            acknowledge
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger text-xs"
          onClick={() => void act(r.id, "delete")}
        >
          purge
        </button>
      </div>
    </li>
  );
}

function countdown(due: number, now: number): string {
  const ms = due - now;
  if (Math.abs(ms) < 60_000) return "DUE NOW";
  const span = (abs: number) => {
    const m = Math.floor(abs / 60_000);
    const d = Math.floor(m / 1440);
    const h = Math.floor((m % 1440) / 60);
    const mm = m % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${mm}m`;
    return `${mm}m`;
  };
  return ms > 0 ? `T-${span(ms)}` : `OVERDUE ${span(-ms)}`;
}

function ArmForm({
  onArmed,
  onError,
}: {
  onArmed: (rs: ReminderDTO[]) => void;
  onError: (e: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState("");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  const whenDate = when ? new Date(when) : null;
  const valid = task.trim().length > 0 && whenDate !== null && !Number.isNaN(whenDate.getTime());

  async function arm() {
    if (!valid || busy || !whenDate) return;
    setBusy(true);
    try {
      const res = await api<{ reminders: ReminderDTO[] }>("/api/reminders", {
        method: "POST",
        body: JSON.stringify({ task: task.trim(), note: note.trim(), dueAt: whenDate.toISOString() }),
      });
      onArmed(res.reminders);
      onError(null);
      setTask("");
      setNote("");
      setWhen("");
      setOpen(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "the siren refused.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3">
        <button type="button" className="btn text-xs" onClick={() => setOpen(true)}>
          arm new reminder
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded border border-grid p-3">
      <p className="text-xs tracking-widest text-faint">ARM NEW REMINDER</p>
      <input
        className="field mt-2"
        value={task}
        maxLength={200}
        placeholder="what must not be forgotten..."
        aria-label="reminder task"
        onChange={(e) => setTask(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          type="datetime-local"
          className="field flex-1"
          value={when}
          aria-label="when the siren blares"
          onChange={(e) => setWhen(e.target.value)}
        />
      </div>
      <input
        className="field mt-2"
        value={note}
        maxLength={500}
        placeholder="optional note (context, threats, encouragement)..."
        aria-label="reminder note"
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="btn text-xs" onClick={() => setOpen(false)}>
          cancel
        </button>
        <button
          type="button"
          className="btn btn-primary text-xs"
          disabled={busy || !valid}
          onClick={arm}
        >
          {busy ? "arming..." : "arm siren"}
        </button>
      </div>
    </div>
  );
}
