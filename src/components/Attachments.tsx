"use client";

import { useState } from "react";
import { musicProvider, splitUrls } from "@/lib/links";

/** AUDIO_REF — a song link dressed as a transmission attachment. */
export function SongLinkCard({ url }: { url: string }) {
  const provider = musicProvider(url);
  return (
    <p className="mt-2 rounded border border-grid p-2 text-xs">
      <span className="tracking-widest text-faint">AUDIO_REF :: </span>
      {provider && <span className="glow-lime">[{provider}] </span>}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="glow-cyan break-all underline decoration-dotted underline-offset-4"
      >
        {url.replace(/^https?:\/\//i, "")}
      </a>
    </p>
  );
}

/** An attached/sent gif. Broken url degrades to a plain link, never a dead panel. */
export function GifBlock({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <p className="mt-2 text-xs">
        <span className="text-faint">[gif failed to load] </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline decoration-dotted underline-offset-4 text-dim"
        >
          {url}
        </a>
      </p>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block w-fit">
      {/* plain img: external gif, no Next image optimization wanted */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="gif transmission"
        loading="lazy"
        className="max-h-60 max-w-full rounded border border-grid"
        onError={() => setBroken(true)}
      />
    </a>
  );
}

/**
 * Message text with links made clickable; recognized music links get a
 * provider tag so a pasted song reads as an AUDIO_REF, not just a url.
 */
export function LinkifiedText({ text, className = "" }: { text: string; className?: string }) {
  const chunks = splitUrls(text);
  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {chunks.map((c, i) => {
        if (c.type === "text") return <span key={i}>{c.value}</span>;
        const provider = musicProvider(c.value);
        return (
          <span key={i}>
            {provider && <span className="glow-lime text-xs">[{provider}] </span>}
            <a
              href={c.value}
              target="_blank"
              rel="noopener noreferrer"
              className={`break-all underline decoration-dotted underline-offset-4 ${
                provider ? "glow-cyan" : ""
              }`}
            >
              {c.value}
            </a>
          </span>
        );
      })}
    </p>
  );
}
