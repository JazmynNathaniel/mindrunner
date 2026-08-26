"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ role: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.push(res.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "connection to brain lost.");
      setBusy(false);
    }
  }

  return (
    <div className="panel w-full max-w-sm p-6 sm:p-8">
      <h1 className="panel-title glow-pink glitchable text-3xl sm:text-4xl">JAZ://BRAIN_OS</h1>
      <p className="mt-2 text-sm text-dim">
        <span className="glow-green">&gt;</span> restricted neural interface.
        <br />
        <span className="glow-green">&gt;</span> identify yourself.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" aria-label="login">
        <div>
          <label htmlFor="username" className="mb-1 block text-xs tracking-widest text-faint">
            HANDLE
          </label>
          <input
            id="username"
            className="field"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs tracking-widest text-faint">
            PASSPHRASE
          </label>
          <input
            id="password"
            type="password"
            className="field"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-alert">
            &gt; {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "> authenticating..." : "> jack in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-faint">
        unauthorized access will be reported to the cats.
      </p>
    </div>
  );
}
