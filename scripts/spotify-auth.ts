/**
 * One-time Spotify authorization — prints the SPOTIFY_REFRESH_TOKEN for .env.
 *
 * 1. Create an app at https://developer.spotify.com/dashboard (Web API).
 * 2. In the app settings, add this EXACT redirect URI: http://127.0.0.1:8888/callback
 * 3. Put SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET in .env
 * 4. npx tsx scripts/spotify-auth.ts  → approve in the browser → copy the token.
 */
import { randomBytes } from "node:crypto";
import http from "node:http";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env — fine if the vars are already in the environment
}

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env first.");
  process.exit(1);
}

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
// currently-playing for the live deck, recently-played for the idle fallback
const SCOPES = "user-read-currently-playing user-read-recently-played";
const state = randomBytes(16).toString("hex");

const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
authorizeUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  scope: SCOPES,
  redirect_uri: REDIRECT_URI,
  state,
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || !code || url.searchParams.get("state") !== state) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end("authorization failed — see terminal.");
    console.error("authorization failed:", error ?? "missing code or state mismatch");
    process.exit(1);
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
  });
  const data = (await tokenRes.json()) as { refresh_token?: string; error_description?: string };
  if (!tokenRes.ok || !data.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("token exchange failed — see terminal.");
    console.error("token exchange failed:", data.error_description ?? `HTTP ${tokenRes.status}`);
    process.exit(1);
  }

  res
    .writeHead(200, { "Content-Type": "text/plain" })
    .end("done. close this tab — the token is in your terminal.");
  console.log(`\nSPOTIFY_REFRESH_TOKEN="${data.refresh_token}"\n`);
  console.log("add that line to .env locally AND to the Vercel project env, then redeploy.");
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("open this URL in the browser that is logged into YOUR spotify account:\n");
  console.log(authorizeUrl.toString());
  console.log(`\nwaiting for the callback on ${REDIRECT_URI} ...`);
});
