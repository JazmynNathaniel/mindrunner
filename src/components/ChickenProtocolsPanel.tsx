"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { uploadSelfie } from "@/lib/selfie";
import { PlateRain } from "@/components/PlateRain";
import type { Dish, DishStateDTO, ProtocolsStateDTO } from "@/lib/types";

const POLL_MS = 30_000;

// dish → display name + who wears it + which sprite rains
const DISH_META: Record<
  Dish,
  { title: string; meal: string; subjectLabel: string; plate: "honey" | "jerk" }
> = {
  HONEY: {
    title: "HONEY CHICKEN PROTOCOL",
    meal: "chinese honey chicken + fried rice",
    subjectLabel: "jaz",
    plate: "honey",
  },
  JERK: {
    title: "JERK CHICKEN PROTOCOL",
    meal: "jerk chicken + rice and peas",
    subjectLabel: "him",
    plate: "jerk",
  },
};

/**
 * CHICKEN PROTOCOLS — each dish names a person: HONEY is the owner, JERK is
 * the recipient. You press the OTHER dish; if their stash has stock a selfie
 * unseals instantly (and it rains dinner), otherwise the demand blares on
 * their side until they comply. You stock/comply only for your OWN dish —
 * the server derives whose face from the session, never from the client.
 */
export function ChickenProtocolsPanel({ role }: { role: "OWNER" | "RECIPIENT" }) {
  const [state, setState] = useState<ProtocolsStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rain, setRain] = useState<{ burst: number; dish: "honey" | "jerk" }>({
    burst: 0,
    dish: "honey",
  });

  const load = useCallback(async () => {
    try {
      const res = await api<{ protocols: ProtocolsStateDTO }>("/api/protocols");
      setState(res.protocols);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "kitchen unreachable.");
    }
  }, []);

  useEffect(() => {
    // initial fetch + poll: setState happens after awaited network I/O
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function press(dish: Dish) {
    setBusy(true);
    try {
      const res = await api<{ protocols: ProtocolsStateDTO; unlocked: boolean }>(
        "/api/protocols",
        { method: "POST", body: JSON.stringify({ action: "press", dish }) }
      );
      setState(res.protocols);
      setError(null);
      // it rains dinner either way: instant unlock or freshly armed demand
      setRain((r) => ({ burst: r.burst + 1, dish: DISH_META[dish].plate }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "the kitchen refused.");
    } finally {
      setBusy(false);
    }
  }

  async function rescind(dish: Dish) {
    setBusy(true);
    try {
      const res = await api<{ protocols: ProtocolsStateDTO }>("/api/protocols", {
        method: "POST",
        body: JSON.stringify({ action: "rescind", dish }),
      });
      setState(res.protocols);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "the kitchen refused.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      setState(await uploadSelfie(file));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "transmission failed.");
    } finally {
      setBusy(false);
    }
  }

  async function purge(id: string) {
    try {
      const res = await api<{ protocols: ProtocolsStateDTO }>(`/api/selfie/${id}`, {
        method: "DELETE",
      });
      setState(res.protocols);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "purge failed.");
    }
  }

  const mine: Dish = role === "OWNER" ? "HONEY" : "JERK";

  return (
    <section className="panel p-4" aria-label="chicken protocols">
      <div className="border-b border-grid pb-2">
        <h2 className="panel-title glow-pink text-lg tracking-widest">CHICKEN PROTOCOLS</h2>
      </div>

      {state === null && !error && (
        <p className="mt-3 text-xs text-dim">
          &gt; checking the kitchen... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}

      {state !== null && (
        <div className="mt-2 space-y-4">
          {([state.honey, state.jerk] as DishStateDTO[]).map((d) => (
            <DishSection
              key={d.dish}
              d={d}
              isMe={d.dish === mine}
              role={role}
              busy={busy}
              press={press}
              rescind={rescind}
              upload={upload}
              purge={purge}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; {error}
        </p>
      )}

      <PlateRain burst={rain.burst} dish={rain.dish} />
    </section>
  );
}

function DishSection({
  d,
  isMe,
  role,
  busy,
  press,
  rescind,
  upload,
  purge,
}: {
  d: DishStateDTO;
  isMe: boolean;
  role: "OWNER" | "RECIPIENT";
  busy: boolean;
  press: (dish: Dish) => Promise<void>;
  rescind: (dish: Dish) => Promise<void>;
  upload: (file: File) => Promise<void>;
  purge: (id: string) => Promise<void>;
}) {
  const meta = DISH_META[d.dish];
  const fileRef = useRef<HTMLInputElement>(null);
  const demanded = d.demand !== null;
  const canPurgeLatest = role === "OWNER" || isMe;

  function pickFile() {
    fileRef.current?.click();
  }

  return (
    <div className={`rounded border p-3 ${demanded && isMe ? "border-alert" : "border-grid"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={`text-sm tracking-widest ${d.dish === "HONEY" ? "glow-pink" : "glow-cyan"}`}>
          {meta.title}
        </h3>
        <span className="text-xs tracking-widest text-faint">
          STASH :: {d.stock} SEALED · {d.unsealedCount} UNSEALED
        </span>
      </div>
      <p className="mt-1 text-xs text-dim">
        {meta.meal} — the {d.dish.toLowerCase()} chicken is{" "}
        <span className={d.dish === "HONEY" ? "glow-pink" : "glow-cyan"}>
          {isMe ? "you" : meta.subjectLabel}
        </span>
        .
      </p>

      {/* demand states */}
      {demanded && isMe && (
        <p className="mt-2 text-sm text-alert" role="alert">
          !! SELFIE DEMANDED :: since {new Date(d.demand!.at).toLocaleString()} — comply !!
        </p>
      )}
      {demanded && !isMe && (
        <p className="glow-lime mt-2 text-xs" role="status">
          &gt; demand transmitted {new Date(d.demand!.at).toLocaleString()}. the{" "}
          {d.dish.toLowerCase()} chicken has been notified.
        </p>
      )}

      {/* the most recent unsealed selfie */}
      {d.latest && (
        <div className="mt-2">
          <p className="text-xs tracking-widest text-faint">
            UNSEALED {new Date(d.latest.at).toLocaleString()}
            {canPurgeLatest && (
              <>
                {" "}
                <button
                  type="button"
                  className="underline decoration-dotted hover:text-dim"
                  onClick={() => void purge(d.latest!.id)}
                >
                  [purge]
                </button>
              </>
            )}
          </p>
          {/* authed same-origin route; next/image would proxy and cache it */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/selfie/${d.latest.id}`}
            alt={`the ${d.dish.toLowerCase()} chicken`}
            className="mt-1 max-h-80 w-auto max-w-full rounded border border-grid"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isMe && !demanded && (
          <button
            type="button"
            className="btn text-xs"
            disabled={busy}
            onClick={() => void press(d.dish)}
          >
            initiate {d.dish.toLowerCase()} chicken protocol
          </button>
        )}
        {!isMe && demanded && (
          <button
            type="button"
            className="btn text-xs"
            disabled={busy}
            onClick={() => void rescind(d.dish)}
          >
            rescind demand
          </button>
        )}
        {isMe && (
          <>
            <button
              type="button"
              className={`btn text-xs ${demanded ? "btn-primary" : ""}`}
              disabled={busy}
              onClick={pickFile}
            >
              {busy ? "developing..." : demanded ? "comply — transmit selfie" : "stock the stash"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              aria-label={`upload a selfie for the ${d.dish.toLowerCase()} chicken stash`}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
