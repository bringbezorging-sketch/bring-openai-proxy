
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { RateLimiterMemory } from "rate-limiter-flexible";

const app = express();
app.use(express.json());

const ALLOWED = ["http://localhost:3000","https://bringbezorging.nl","https://www.bringbezorging.nl"];
app.use(cors({ origin: (o, cb) => cb(null, !o || ALLOWED.includes(o)), methods: ["POST","OPTIONS"] }));

const limiter = new RateLimiterMemory({ points: 60, duration: 60 });

app.post("/api/ai", async (req, res) => {
  try { await limiter.consume(req.ip); } catch { return res.status(429).json({ error: "Too many requests" }); }
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  const { messages, model = "gpt-4.1-mini", temperature = 0.7 } = req.body || {};
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature })
  });
  const data = await r.json();
  res.status(r.status).json(data);
});

app.listen(3000, () => console.log("Local dev server on http://localhost:3000"));
