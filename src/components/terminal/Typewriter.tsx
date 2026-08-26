"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export type Segment = {
  text: string;
  className?: string;
  /** ms per character; the app-wide default lives here */
  charMs?: number;
  /** pause after the segment finishes, ms */
  pauseAfter?: number;
};

const DEFAULT_CHAR_MS = 22;

/**
 * Types an array of line segments one character at a time.
 * - click / Enter / Space / the [skip] button reveals everything instantly
 * - prefers-reduced-motion renders everything instantly
 * - full text is always present for screen readers; the animation is aria-hidden
 * Re-key the component (key={...}) to restart for new content.
 */
export function TerminalScript({
  segments,
  onDone,
  className,
  showSkip = true,
}: {
  segments: Segment[];
  onDone?: () => void;
  className?: string;
  showSkip?: boolean;
}) {
  const reduced = useReducedMotion();
  const [pos, setPos] = useState({ seg: 0, chars: 0 });
  const [skipped, setSkipped] = useState(false);

  // done is derived, never set synchronously inside an effect
  const done = skipped || reduced || pos.seg >= segments.length;

  // typing engine: all state updates happen inside timeout callbacks
  useEffect(() => {
    if (done) return;
    const seg = segments[pos.seg];
    const delay =
      pos.chars < seg.text.length ? (seg.charMs ?? DEFAULT_CHAR_MS) : (seg.pauseAfter ?? 140);
    const t = window.setTimeout(() => {
      setPos((p) => {
        const cur = segments[p.seg];
        if (!cur) return p;
        return p.chars < cur.text.length
          ? { seg: p.seg, chars: p.chars + 1 }
          : { seg: p.seg + 1, chars: 0 };
      });
    }, delay);
    return () => clearTimeout(t);
  }, [pos, done, segments]);

  // fire onDone exactly once
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (done && !notifiedRef.current) {
      notifiedRef.current = true;
      onDoneRef.current?.();
    }
  }, [done]);

  const finish = () => setSkipped(true);
  const fullText = segments.map((s) => s.text).join("\n");

  return (
    <div
      className={className}
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          finish();
        }
      }}
      tabIndex={0}
      role="log"
      aria-label="terminal output"
    >
      {/* real content for assistive tech, always complete */}
      <p className="sr-only">{fullText}</p>

      <div aria-hidden="true">
        {segments.map((s, i) => {
          if (!done && i > pos.seg) return null;
          const text = done || i < pos.seg ? s.text : s.text.slice(0, pos.chars);
          const isTyping = !done && i === pos.seg;
          return (
            <div key={i} className={`whitespace-pre-wrap break-words ${s.className ?? ""}`}>
              {text || " "}
              {isTyping && <span className="cursor-blink" aria-hidden="true" />}
            </div>
          );
        })}
        {done && <span className="cursor-blink mt-1" aria-hidden="true" />}
      </div>

      {showSkip && !done && (
        <button
          type="button"
          className="mt-3 text-xs text-faint underline decoration-dotted hover:text-dim"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
        >
          [ skip ]
        </button>
      )}
    </div>
  );
}
