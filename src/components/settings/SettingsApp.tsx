"use client";

import Link from "next/link";
import { PANELS, THEMES, resetPrefs, setPrefs, usePrefs, type PanelKey } from "@/lib/prefs";

/**
 * SETTINGS :: CONFIGURATION DECK — his requested control panel.
 * Theme + panel layout are per-device (localStorage), applied live; the
 * subsystem pages (diagnostics / brain access) moved here off the terminal.
 */
export function SettingsApp({ isAdmin }: { isAdmin: boolean }) {
  const prefs = usePrefs();

  function move(key: PanelKey, dir: -1 | 1) {
    const order = [...prefs.order];
    const i = order.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setPrefs({ order });
  }

  function toggleHidden(key: PanelKey) {
    setPrefs({
      hidden: prefs.hidden.includes(key)
        ? prefs.hidden.filter((k) => k !== key)
        : [...prefs.hidden, key],
    });
  }

  return (
    <SettingsChrome isAdmin={isAdmin}>
      <section className="panel p-4" aria-label="color theme">
        <h2 className="panel-title glow-violet text-lg tracking-widest">SKIN :: COLOR THEME</h2>
        <p className="mt-1 text-xs text-faint">
          &gt; re-lamps every phosphor in the machine. stored on this device only.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {THEMES.map((t) => {
            const active = prefs.theme === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setPrefs({ theme: t.id })}
                  aria-pressed={active}
                  className={`w-full cursor-pointer rounded border p-3 text-left transition-all ${
                    active ? "border-violet" : "border-grid hover:border-violet"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-sm tracking-widest ${active ? "glow-violet" : "text-ink"}`}>
                      {t.label}
                      {active && <span className="text-xs"> :: ACTIVE</span>}
                    </span>
                    <span className="flex gap-1" aria-hidden="true">
                      {t.swatch.map((c) => (
                        <span
                          key={c}
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-faint">{t.blurb}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel p-4" aria-label="panel layout">
        <h2 className="panel-title glow-cyan text-lg tracking-widest">LAYOUT :: PANEL ORDER</h2>
        <p className="mt-1 text-xs text-faint">
          &gt; rearrange the brain. raise, lower, or power panels down entirely.
        </p>
        <ul className="mt-3 space-y-2">
          {prefs.order.map((key, i) => {
            const meta = PANELS.find((p) => p.key === key);
            if (!meta) return null;
            const hidden = prefs.hidden.includes(key);
            return (
              <li
                key={key}
                className={`flex flex-wrap items-center justify-between gap-2 rounded border border-grid p-2 ${
                  hidden ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm tracking-widest text-ink">{meta.label}</p>
                  <p className="text-xs text-faint">{meta.note}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn px-2 py-1 text-xs"
                    aria-label={`raise ${meta.label}`}
                    disabled={i === 0}
                    onClick={() => move(key, -1)}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="btn px-2 py-1 text-xs"
                    aria-label={`lower ${meta.label}`}
                    disabled={i === prefs.order.length - 1}
                    onClick={() => move(key, 1)}
                  >
                    ▼
                  </button>
                  {meta.locked ? (
                    <span className="px-2 text-xs text-faint">core</span>
                  ) : (
                    <button
                      type="button"
                      className={`btn px-2 py-1 text-xs ${hidden ? "" : "text-greendim"}`}
                      aria-pressed={hidden}
                      onClick={() => toggleHidden(key)}
                    >
                      {hidden ? "powered down" : "online"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-end">
          <button type="button" className="btn btn-danger text-xs" onClick={resetPrefs}>
            restore factory settings
          </button>
        </div>
      </section>

      <section className="panel p-4" aria-label="subsystems">
        <h2 className="panel-title glow-lime text-lg tracking-widest">SUBSYSTEMS</h2>
        <p className="mt-1 text-xs text-faint">
          &gt; relocated off the terminal. everything still runs; it just runs in its own room.
        </p>
        <ul className="mt-3 space-y-2">
          <li>
            <Link
              href="/settings/diagnostics"
              className="block rounded border border-grid p-3 no-underline transition-all hover:border-violet"
            >
              <span className="glow-lime text-sm tracking-widest">SYSTEM DIAGNOSTICS</span>
              <span className="mt-1 block text-xs text-faint">
                cpu, memory, cat interference. authored fiction, as always.
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/settings/stats"
              className="block rounded border border-grid p-3 no-underline transition-all hover:border-violet"
            >
              <span className="glow-violet text-sm tracking-widest">BRAIN ACCESS</span>
              <span className="mt-1 block text-xs text-faint">
                checks, sessions, thoughts served. the machine keeps score.
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </SettingsChrome>
  );
}

// local chrome (not SettingsShell) so the root settings page can show the
// admin link where relevant without widening the shared shell's API
function SettingsChrome({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  return (
    <main className="crt flicker mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-3 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="panel-title glow-pink glitchable text-2xl sm:text-3xl">
            JAZ://BRAIN_OS <span className="glow-violet">:: SETTINGS</span>
          </h1>
          <p className="text-xs tracking-widest text-dim">configuration deck. touch responsibly.</p>
        </div>
        <nav className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/admin" className="btn no-underline">
              admin
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
