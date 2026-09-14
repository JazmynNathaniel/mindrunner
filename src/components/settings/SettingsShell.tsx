"use client";

import Link from "next/link";

/** Shared chrome for the settings pages: same CRT room, calmer furniture. */
export function SettingsShell({
  title,
  subtitle,
  showSettingsLink = false,
  children,
}: {
  title: string;
  subtitle: string;
  /** true on sub-pages so they can climb back to the settings menu */
  showSettingsLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="crt flicker mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-3 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="panel-title glow-pink glitchable text-2xl sm:text-3xl">{title}</h1>
          <p className="text-xs tracking-widest text-dim">{subtitle}</p>
        </div>
        <nav className="flex items-center gap-2">
          {showSettingsLink && (
            <Link href="/settings" className="btn no-underline">
              settings
            </Link>
          )}
          <Link href="/" className="btn no-underline">
            terminal
          </Link>
        </nav>
      </header>
      {children}
      <footer className="mt-auto pb-2 text-center text-xs text-faint">
        configuration deck. the cats prefer factory settings.
      </footer>
    </main>
  );
}
