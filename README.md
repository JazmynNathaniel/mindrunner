# thoughts.py — JAZ://BRAIN_OS

A private, authenticated, deliberately over-engineered digital experience for exactly one
recipient. One person (Jaz) writes thoughts; the machine reveals them at unpredictable times;
he checks whenever he wants. A cybernetic greenhouse: terminal, music, flowers, cats with
root access.

Both parties know how it works — including that visits are counted. Mutual game, not
surveillance.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — one deployable unit
- **Prisma 6 + PostgreSQL** (Neon via Vercel Storage; local dev points at the same DB)
- **Tailwind CSS 4** + custom CRT effects
- Session auth (httpOnly / Secure / SameSite=Strict cookies), bcrypt password hashing

## Setup

```bash
cp .env.example .env      # fill in DB URLs, passwords, CRON_SECRET
npm install               # postinstall runs `prisma generate`
npm run db:deploy         # applies migrations to the database in .env
npm run db:seed           # creates the two accounts (never overwrites existing passwords)
npm run dev               # http://localhost:3000
```

Useful scripts:

| script | purpose |
| --- | --- |
| `npm run db:deploy` | apply committed migrations |
| `npm run db:seed` | (re)create the two users + singletons |
| `npx tsx scripts/set-password.ts <user> <pw>` | rotate a password + revoke sessions |
| `npx tsx scripts/verify-scheduler.ts` | time-travels the DB and asserts every scheduler transition |

## Deploying on Vercel

1. Import the GitHub repo into Vercel (framework auto-detected; the `vercel-build`
   script runs `prisma migrate deploy && next build`).
2. Create a Postgres database: project → **Storage** → **Create database** → Neon
   (Postgres). Connect it to the project.
3. Project → **Settings → Environment Variables**: make sure `DATABASE_URL` (pooled) and
   `DIRECT_URL` (direct/unpooled) exist — the Neon integration usually injects
   `DATABASE_URL` and `DATABASE_URL_UNPOOLED`; add `DIRECT_URL` with the unpooled value.
   Add `CRON_SECRET` (same value as local `.env`).
4. Deploy. Then seed **once from your machine**: put the same URLs in local `.env` and run
   `npm run db:seed`.
5. `vercel.json` registers a daily cron for `/api/cron/tick` (daily works on every plan;
   on Pro you can raise it to `*/15 * * * *`). Frequency is deliberately low-stakes: every
   API request runs the same `tick()` lazily, so state is always correct whenever anyone
   actually looks.

## How the scheduler works

The thought lifecycle is `DRAFT → QUEUED → SCHEDULED → PUBLISHED → EXPIRED → ARCHIVED`.
At most one thought is PUBLISHED and at most one is SCHEDULED. When a thought publishes,
the next queued one is promoted to SCHEDULED at `now + random(min_interval, max_interval)`.
If the queue is empty, the first thought queued later gets a fresh randomized slot from then.

State advances two ways, both calling the same idempotent, transactional `tick()`
(`src/server/scheduler.ts`):

1. **Lazy evaluation** — every state-reading API request ticks first, so the system is
   always correct with zero infrastructure.
2. **Cron safety net** — `GET /api/cron/tick` (guarded by `CRON_SECRET` as a bearer token).
   On a VPS: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/tick`

A long no-traffic gap never burns through the queue invisibly: `tick()` publishes only the
single due thought and schedules the next from *now*, so he never misses one.

The recipient-facing API never exposes scheduling times, unpublished thoughts, or admin data.

## Architecture

```
routes (src/app/api/**)  →  services (src/server/**)  →  Prisma  →  DB
```

| module | file |
| --- | --- |
| auth & sessions | `src/server/auth.ts` |
| scheduler (source of truth) | `src/server/scheduler.ts` |
| thoughts CRUD + DTOs | `src/server/thoughts.ts` |
| music (`MusicService` interface — Spotify presence with manual fallback) | `src/server/music.ts`, `src/server/spotify.ts` |
| recipient state composition | `src/server/state.ts` |
| stats / visit tracking | `src/server/stats.ts` |
| input validation (zod) | `src/server/validation.ts` |

Frontend: `src/components/terminal/*` (boot sequence, typewriter, cats, flora,
diagnostics), `src/components/admin/*` (composer with live preview, pipeline, scheduler
config, now playing, access log).

## Security notes

- Role checks server-side on every route; the client is never trusted.
- Session tokens are stored only as SHA-256 hashes; cookies are httpOnly/Secure/Strict.
- CSRF: SameSite=Strict plus an Origin check on all state-changing requests.
- Login rate-limited per IP (5 / 15 min) and per username; recipient polling rate-limited.
  (In-memory windows — per-instance on serverless, which still bounds abuse for a 2-user app.)
- Unpublished thoughts are unreachable via any recipient API; IDs are UUIDs.
- Strict security headers incl. CSP (`next.config.ts`). Decorative diagnostics are fiction
  and never leak real infrastructure data.
- Accessibility: full `prefers-reduced-motion` support (boot skipped, typing instant,
  cats static), screen-reader plain-text thoughts, keyboard-skippable animations.
