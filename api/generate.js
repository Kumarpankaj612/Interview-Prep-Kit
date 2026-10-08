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
