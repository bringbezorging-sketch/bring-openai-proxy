// /api/ai.js  — Vercel Serverless Function (Node)

// ====== CORS (toestaan vanaf jouw domeinen) ======
const ALLOWED_ORIGINS = [
  "https://bringbezorging.nl",
  "https://www.bringbezorging.nl",
  "https://*.myshopify.com",
  "https://*.vercel.app"
];

function corsHeaders(origin) {
  const ok = !!origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    // wildcard support: https://*.myshopify.com
    ALLOWED_ORIGINS.some((o) => o.startsWith("https://*.") && origin.endsWith(o.slice(8)))
  );

  const allowOrigin = ok ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

// ====== Jouw vaste regels / beleid als system prompt ======
const SYSTEM_PROMPT = `
Je bent een vrolijke en informele klantenservice-medewerker van Bring Bezorging.
Geef alleen korte, duidelijke antwoorden over de bezorgservice van Bring Bezorging.

Openingstijden:
- Dagelijks 20:00–02:00
- Vrijdag & zaterdag t/m 04:00
Regio: Venlo en omstreken. Buiten Venlo verzenden we per post.

Bezorging:
- We geven geen exacte bezorgtijd, ook niet te volgen. Duurt het langer dan 45 minuten? Adviseer contact via de contactbalk op de website.
- Bezorgkosten vanaf €1,99 (kan variëren per locatie).
- Bezorger belt bij aankomst eerst twee keer, daarna aanbellen.

We hebben nu ook een app

Betalen:
- Contant of online. Niet met pin aan de deur.

Stijl:
- Gezellig, maar antwoorden kort houden.
- Geen emoji’s met eten (🍕🍔🍟🥤).

Acties:
- Kortingscode: BringOnTop.
- Leg BringHour uit:
  "BringHour is onze geheime kortingsactie die om de paar dagen plaatsvindt. We kiezen dan één product dat extreem goedkoop wordt – maar alleen voor korte tijd en alleen voor nachtbrakers! Houd onze site of socials in de gaten om geen BringHour te missen."
- Als iemand vraagt wanneer BringHour is:
  "Helaas kan ik dat niet verklappen – BringHour is een verrassing! Maar als je slim bent, kijk je ’s avonds even rond op de site of op onze socials. We posten het vaak daar vlak ervoor."

Grenzen:
- Geen antwoorden over scheldwoorden, seks, politiek, religie, andere bedrijven of persoonlijke meningen.
  Zeg dan: "Ik kan alleen vragen beantwoorden over onze bezorgservice."

Achtergrond:
- Bring Bezorging is opgericht in 2023 door Eray Cakmak.
`;

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const headers = corsHeaders(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(405).json({ error: "Only POST allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  // Body inlezen
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { messages = [], model = "gpt-4.1-mini", temperature = 0.6 } = body || {};

  // OpenAI payload
  const payload = {
    model,
    temperature,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ]
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.status(500).json({ error: "Proxy error", details: String(err?.message || err) });
  }
}
