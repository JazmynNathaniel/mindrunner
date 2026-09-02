"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AdminThoughtDTO } from "@/lib/types";
import { buildThoughtSegments } from "@/components/terminal/thoughtSegments";
import { TerminalScript } from "@/components/terminal/Typewriter";

const CATEGORIES = [
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
];

type SongForm = { artist: string; title: string; album: string; artworkUrl: string; externalUrl: string };
const emptySong: SongForm = { artist: "", title: "", album: "", artworkUrl: "", externalUrl: "" };

export function Composer({
  editing,
  onDone,
  onError,
  onCancelEdit,
}: {
  editing: AdminThoughtDTO | null;
  onDone: () => void;
  onError: (msg: string) => void;
  onCancelEdit: () => void;
}) {
  const [text, setText] = useState(editing?.text ?? "");
  const [category, setCategory] = useState(editing?.category ?? "random");
  const [tags, setTags] = useState(editing?.tags.join(", ") ?? "");
  const [mood, setMood] = useState(editing?.mood ?? "");
  const [song, setSong] = useState<SongForm>(
    editing?.song
      ? {
          artist: editing.song.artist,
          title: editing.song.title,
          album: editing.song.album ?? "",
          artworkUrl: editing.song.artworkUrl ?? "",
          externalUrl: editing.song.externalUrl ?? "",
        }
      : emptySong
  );
  const [busy, setBusy] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  // AdminApp keys this component by editing id, so picking a thought to edit
  // remounts it and a collapsed composer reopens with the edit form visible
  const [open, setOpen] = useState(true);

  function payload(queue: boolean) {
    return {
      text: text.trim(),
      category,
      tags: tags
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      mood: mood.trim() || null,
      song:
        song.artist.trim() && song.title.trim()
          ? {
              artist: song.artist.trim(),
              title: song.title.trim(),
              album: song.album.trim(),
              artworkUrl: song.artworkUrl.trim(),
              externalUrl: song.externalUrl.trim(),
            }
          : null,
      queue,
    };
  }

  async function submit(mode: "draft" | "queue" | "publish") {
    if (!text.trim()) {
      onError("a thought needs words.");
      return;
    }
    setBusy(true);
    try {
      let id = editing?.id;
      if (editing) {
        const { queue: _q, ...patch } = payload(false);
        void _q;
        await api(`/api/admin/thoughts/${editing.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      } else {
        const res = await api<{ thought: AdminThoughtDTO }>("/api/admin/thoughts", {
          method: "POST",
          body: JSON.stringify(payload(mode === "queue")),
        });
        id = res.thought.id;
      }
      if (mode === "publish" && id) {
        await api(`/api/admin/thoughts/${id}/action`, {
          method: "POST",
          body: JSON.stringify({ action: "publish" }),
        });
      }
      if (mode === "queue" && editing && editing.status === "DRAFT" && id) {
        await api(`/api/admin/thoughts/${id}/action`, {
          method: "POST",
          body: JSON.stringify({ action: "queue" }),
        });
      }
      onDone();
    } catch (e) {
      onError(e instanceof Error ? e.message : "connection to brain lost.");
    } finally {
      setBusy(false);
    }
  }

  const previewSegments = useMemo(
    () =>
      buildThoughtSegments(
        {
          text: text.trim() || "…",
          mood: mood.trim() || null,
          song: song.artist.trim() && song.title.trim() ? { artist: song.artist.trim(), title: song.title.trim() } : null,
        },
        false
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewNonce]
  );

  return (
    <section className="panel p-4 sm:p-5" aria-label="thought composer">
      <div className="flex items-center justify-between border-b border-grid pb-2">
        <h2 className="panel-title glow-green text-lg tracking-widest">
          <button
            type="button"
            className="flex cursor-pointer items-baseline gap-2 text-left tracking-widest hover:brightness-125"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden="true">{open ? "[-]" : "[+]"}</span>
            <span>
              {editing ? `EDIT THOUGHT :: ${editing.status}` : "NEW THOUGHT"}
              {!open && text.trim() && " :: unsaved"}
            </span>
          </button>
        </h2>
        {editing && (
          <button type="button" className="btn text-xs" onClick={onCancelEdit}>
            cancel edit
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="thought-text" className="mb-1 block text-xs tracking-widest text-faint">
                THOUGHT
              </label>
              <textarea
                id="thought-text"
                className="field min-h-24 resize-y"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={4000}
                placeholder="what is the brain doing right now…"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="thought-category" className="mb-1 block text-xs tracking-widest text-faint">
                  CATEGORY
                </label>
                <select
                  id="thought-category"
                  className="field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="thought-tags" className="mb-1 block text-xs tracking-widest text-faint">
                  TAGS <span className="normal-case">(comma separated)</span>
                </label>
                <input
                  id="thought-tags"
                  className="field"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="him, late-night"
                />
              </div>
              <div>
                <label htmlFor="thought-mood" className="mb-1 block text-xs tracking-widest text-faint">
                  MOOD <span className="normal-case">(optional)</span>
                </label>
                <input
                  id="thought-mood"
                  className="field"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  maxLength={60}
                  placeholder="feral but soft"
                />
              </div>
            </div>

            <fieldset className="rounded border border-grid p-3">
              <legend className="px-1 text-xs tracking-widest text-faint">
                ♫ LISTENING TO WHILE WRITING (optional)
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  aria-label="artist"
                  className="field"
                  value={song.artist}
                  onChange={(e) => setSong({ ...song, artist: e.target.value })}
                  placeholder="artist"
                />
                <input
                  aria-label="song title"
                  className="field"
                  value={song.title}
                  onChange={(e) => setSong({ ...song, title: e.target.value })}
                  placeholder="song"
                />
                <input
                  aria-label="album"
                  className="field"
                  value={song.album}
                  onChange={(e) => setSong({ ...song, album: e.target.value })}
                  placeholder="album (optional)"
                />
                <input
                  aria-label="external link"
                  className="field"
                  value={song.externalUrl}
                  onChange={(e) => setSong({ ...song, externalUrl: e.target.value })}
                  placeholder="link (optional)"
                />
                <input
                  aria-label="artwork url"
                  className="field sm:col-span-2"
                  value={song.artworkUrl}
                  onChange={(e) => setSong({ ...song, artworkUrl: e.target.value })}
                  placeholder="artwork url (optional)"
                />
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" disabled={busy} onClick={() => submit("draft")}>
                {editing ? "save changes" : "save draft"}
              </button>
              {!editing && (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => submit("queue")}>
                  save to queue
                </button>
              )}
              {editing && editing.status === "DRAFT" && (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => submit("queue")}>
                  save + queue
                </button>
              )}
              {(!editing || ["DRAFT", "QUEUED", "SCHEDULED"].includes(editing.status)) && (
                <button type="button" className="btn glow-pink" disabled={busy} onClick={() => submit("publish")}>
                  publish now
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-grid pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs tracking-widest text-faint">LIVE PREVIEW — RECIPIENT TERMINAL</h3>
              <button type="button" className="btn text-xs" onClick={() => setPreviewNonce((n) => n + 1)}>
                replay
              </button>
            </div>
            <div className="mt-2 rounded border border-grid bg-abyss p-3">
              <p className="panel-title glow-green mb-2 text-sm tracking-widest">JAZ://THOUGHTS</p>
              <TerminalScript
                key={previewNonce}
                segments={previewSegments}
                className="text-sm sm:text-base"
                showSkip={false}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
