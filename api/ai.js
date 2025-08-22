// Vercel Serverless Function: /api/ai
import { RateLimiterMemory } from "rate-limiter-flexible";

const limiter = new RateLimiterMemory({ points: 60, duration: 60 });

const ALLOWED_ORIGINS = [
  "https://bringbezorging.nl",
  "https://www.bringbezorging.nl",
  "http://localhost:3000",
  "https://*.vercel.app"
];

function corsHeaders(origin) {
  const allow =
    !origin ||
    ALLOWED_ORIGINS.some((o) => {
      if (o.includes("*")) {
        const [pre, post] = o.split("*");
        return origin.startsWith(pre) && origin.endsWith(post);
      }
      return o === origin;
    });
  return {
    "Access-Control-Allow-Origin": allow ? origin || "*" : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    res.set(headers);
    return res.status(204).end();
  }

  // rate-limit
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  try { await limiter.consume(ip); }
  catch { res.set(headers); return res.status(429).json({ error: "Too many requests" }); }

  if (req.method !== "POST") {
    res.set(headers);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.set(headers);
    return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
  }

  let body = {};
  try { body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); } catch {}

  const { messages = [{ role: "user", content: "Hello" }], model = "gpt-4.1-mini", temperature = 0.7 } = body;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature }),
    });
    const data = await r.json();
    res.set(headers);
    return res.status(r.status).json(data);
  } catch (e) {
    res.set(headers);
    return res.status(500).json({ error: "Proxy error", detail: String(e) });
  }
}
