"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdminThoughtDTO, RevealDTO, VaultStateDTO } from "@/lib/types";

const POLL_MS = 60_000;
const EXCERPT_LEN = 70;

const excerpt = (s: string) =>
  s.length > EXCERPT_LEN ? `${s.slice(0, EXCERPT_LEN)}...` : s;

/**
 * JAZ://VAULT — the owner's private journal (her DRAFT thoughts), visible
 * from outside only as a count. The recipient can petition for ONE entry to
 * be unsealed; the owner approves (picking which entry) or denies. The
 * control room passes `drafts` so the approve picker can list her journal;
 * the terminal never receives entry text — only approved snapshots come back.
 */
export function VaultPanel({
  role,
  drafts,
}: {
  role: "OWNER" | "RECIPIENT";
  drafts?: AdminThoughtDTO[];
}) {
  const [vault, setVault] = useState<VaultStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ vault: VaultStateDTO }>("/api/vault");
      setVault(res.vault);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "vault unreachable.");
    }
  }, []);

  useEffect(() => {
    // initial fetch + poll: setState happens after awaited network I/O
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function petition() {
    setBusy(true);
    try {
      const res = await api<{ vault: VaultStateDTO }>("/api/vault", { method: "POST" });
      setVault(res.vault);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "petition failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(id: string, action: "approve" | "deny", thoughtId?: string) {
    setBusy(true);
    try {
      const res = await api<{ vault: VaultStateDTO }>(`/api/admin/vault/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action, thoughtId }),
      });
      setVault(res.vault);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "resolution failed.");
    } finally {
      setBusy(false);
    }
  }

  const isOwner = role === "OWNER";
  const canResolve = isOwner && drafts !== undefined;

  return (
    <section className="panel p-4" aria-label="the vault">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grid pb-2">
        <h2 className="panel-title glow-violet text-lg tracking-widest">JAZ://VAULT</h2>
        {vault && (
          <span className="text-xs tracking-widest text-faint">
            {vault.sealed} {vault.sealed === 1 ? "ENTRY" : "ENTRIES"} SEALED
          </span>
        )}
      </div>

      {vault === null && !error && (
        <p className="mt-3 text-xs text-dim">
          &gt; checking the seals... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}

      {vault !== null && (
        <div className="mt-2 space-y-2 text-xs sm:text-sm">
          <p className="text-dim">
            {isOwner
              ? "> your journal. drafts count as sealed entries; he sees only the number."
              : vault.sealed > 0
                ? `> ${vault.sealed} private ${vault.sealed === 1 ? "entry" : "entries"} on file. contents beyond your clearance.`
                : "> the vault stands empty. for now."}
          </p>

          {vault.pending && !canResolve && (
            <p className="glow-lime" role="status">
              &gt; petition pending since {new Date(vault.pending.at).toLocaleString()}.{" "}
              {isOwner ? "judgment awaits you in the control room." : "the vault is deliberating."}
            </p>
          )}

          {vault.pending && canResolve && (
            <PetitionBench
              pendingId={vault.pending.id}
              pendingAt={vault.pending.at}
              drafts={drafts}
              busy={busy}
              resolve={resolve}
            />
          )}

          {!vault.pending && role === "RECIPIENT" && (
            <button
              type="button"
              className="btn text-xs"
              disabled={busy || vault.sealed === 0}
              onClick={() => void petition()}
            >
              petition the vault for one entry
            </button>
          )}

          {vault.reveals.length > 0 && (
            <div className="border-t border-grid pt-2">
              <p className="text-xs tracking-widest text-faint">RESOLUTIONS</p>
              <ul className="mt-1 max-h-72 space-y-2 overflow-y-auto">
                {vault.reveals.map((r) => (
                  <Resolution key={r.id} r={r} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; {error}
        </p>
      )}
    </section>
  );
}

function PetitionBench({
  pendingId,
  pendingAt,
  drafts,
  busy,
  resolve,
}: {
  pendingId: string;
  pendingAt: string;
  drafts: AdminThoughtDTO[];
  busy: boolean;
  resolve: (id: string, action: "approve" | "deny", thoughtId?: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState("");

  return (
    <div className="rounded border border-alert p-3" role="alert">
      <p className="text-alert">
        !! DECLASSIFICATION PETITION :: {new Date(pendingAt).toLocaleString()} !!
      </p>
      <p className="mt-1 text-xs text-dim">
        he requests one journal entry be unsealed. choose the entry — or deny him.
      </p>
      {drafts.length === 0 ? (
        <p className="mt-2 text-xs text-faint">
          &gt; the journal is empty. nothing can be unsealed — deny, or go write a secret.
        </p>
      ) : (
        <select
          className="field mt-2"
          value={choice}
          aria-label="journal entry to unseal"
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="">choose the entry to unseal...</option>
          {drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {new Date(d.createdAt).toLocaleDateString()} :: {excerpt(d.text)}
            </option>
          ))}
        </select>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-danger text-xs"
          disabled={busy}
          onClick={() => void resolve(pendingId, "deny")}
        >
          deny
        </button>
        <button
          type="button"
          className="btn btn-primary text-xs"
          disabled={busy || !choice}
          onClick={() => void resolve(pendingId, "approve", choice)}
        >
          unseal this entry
        </button>
      </div>
    </div>
  );
}

function Resolution({ r }: { r: RevealDTO }) {
  if (r.status === "DENIED") {
    return (
      <li className="text-xs text-faint">
        DENIED {new Date(r.resolvedAt).toLocaleString()} :: the vault stays shut.
      </li>
    );
  }
  return (
    <li className="rounded border border-grid p-2">
      <p className="text-xs tracking-widest text-faint">
        UNSEALED {new Date(r.resolvedAt).toLocaleString()}
        {r.thoughtAt && <> :: written {new Date(r.thoughtAt).toLocaleString()}</>}
      </p>
      <p className="glow-pink mt-1 whitespace-pre-wrap text-sm">{r.text}</p>
    </li>
  );
}
