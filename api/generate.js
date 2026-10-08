/**
 * Serverless proxy for the Anthropic Messages API (Vercel-style function).
 * Keeps your API key on the server so it is never exposed in the browser.
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY  (required)
 *   ANTHROPIC_MODEL    (optional, default "claude-sonnet-5-5")
 *   ALLOWED_ORIGIN     (optional) e.g. "https://<user>.github.io" — only needed
 *                      if the front-end is hosted on a different origin
 */
const MAX_INPUT_CHARS = 30000;
const MAX_OUTPUT_TOKENS = 4096;

/* ---- Simple per-IP rate limiting (sliding window, in memory) ----
 * One prep kit = 4 API calls, so the default of 12 per 10 minutes allows
 * about 3 kits per person per 10 minutes.
 * Best-effort only: serverless instances each keep their own counters and
 * reset on cold start. For strict limits use a shared store (e.g. Upstash Redis).
 * Env overrides: RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC
 */
const RATE_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 12;
const RATE_WINDOW_MS = (parseInt(process.env.RATE_LIMIT_WINDOW_SEC, 10) || 600) * 1000;
const hits = new Map(); // ip -> array of request timestamps

function clientIp(req) {
  const fwd = req.headers && req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

/* Returns 0 if allowed, otherwise the number of seconds until retry. */
function checkRateLimit(ip, now = Date.now()) {
  const recent = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return Math.max(1, Math.ceil((recent[0] + RATE_WINDOW_MS - now) / 1000));
  }
  recent.push(now);
  hits.set(ip, recent);

  // Occasional cleanup so the map can't grow without bound.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some(t => now - t < RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return 0;
}

module.exports = async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const retryAfter = checkRateLimit(clientIp(req));
  if (retryAfter) {
    res.setHeader("Retry-After", String(retryAfter));
    const mins = Math.ceil(retryAfter / 60);
    return res.status(429).json({
      error: "Too many requests. Please wait about " + mins + " minute" + (mins === 1 ? "" : "s") + " and try again."
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });

  const { system, user, maxTokens } = req.body || {};
  if (typeof system !== "string" || typeof user !== "string" || !user.trim()) {
    return res.status(400).json({ error: "Body must include string fields 'system' and 'user'" });
  }
  if (system.length + user.length > MAX_INPUT_CHARS) {
    return res.status(413).json({ error: "Input too large" });
  }

  const max_tokens = Math.min(Math.max(parseInt(maxTokens, 10) || 1024, 256), MAX_OUTPUT_TOKENS);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens,
        system,
        messages: [{ role: "user", content: user }]
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: (data && data.error && data.error.message) || "Upstream error" });
    }
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach the Anthropic API" });
  }
};

module.exports.checkRateLimit = checkRateLimit; // exposed for testing
