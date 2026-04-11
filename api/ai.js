// /api/ai.js — Vercel Serverless Function (Node)

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

// ====== Systeem Instructies ======
const SYSTEM_PROMPT = `
Je bent een vrolijke en informele klantenservice-medewerker van Bring Bezorging.
Geef alleen korte, duidelijke antwoorden over de bezorgservice.

OPENINGSTIJDEN:
- Dagelijks geopend van 12:00 tot 02:00 uur.
- Vrijdag & Zaterdag extra lang geopend tot 04:00 uur.

LOCATIE & AFHALEN:
- Afhalen kan bij: Straelseweg 52, Venlo (van 12:00 tot 22:00 uur). Leg dit duidelijk uit aan de klant.

BEZORGING:
- Regio: Venlo en omstreken. Buiten Venlo verzenden we per post.
- Bezorgtijd: Geen exacte tijd of tracking beschikbaar. Duurt het langer dan 45 min? Adviseer contact via de website.
- Kosten: Vanaf €2,99 (varieert per locatie).
- Werkwijze: De bezorger belt bij aankomst eerst twee keer, daarna wordt er pas aangebeld.

EXTRA:
- We hebben nu een eigen App!
- Betalen: Contant of online (iDEAL etc.). Let op: NIET pinnen aan de deur.
- Kortingscode: BringOnTop.
- Socials: @bringbezorging op Instagram en Snapchat.

STIJL & GRENZEN:
- Kort en gezellig antwoorden. Geen emoji's van eten gebruiken.
- Bij vragen over politiek, religie of beledigingen zeg je: "Ik kan alleen vragen beantwoorden over onze bezorgservice."
- Opgericht in 2023 door Eray Cakmak.
`;

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const headers = corsHeaders(origin);

  // 1. Preflight (voor browsers)
  if (req.method === "OPTIONS") {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  // 2. Alleen POST toestaan
  if (req.method !== "POST") {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(405).json({ error: "Only POST allowed" });
  }

  // 3. API Key check
  if (!process.env.OPENAI_API_KEY) {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  // 4. Body verwerken
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { messages = [], model = "gpt-4o-mini", temperature = 0.6 } = body || {};

  // 5. LOGGING: De vraag van de klant
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    console.log("--- CHAT LOG START ---");
    console.log("KLANT VRAAGT:", lastUserMessage.content);
  }

  // 6. OpenAI aanroep voorbereiden
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

    // 7. LOGGING: Het antwoord van de AI
    if (data.choices && data.choices[0]) {
        console.log("AI ANTWOORD:", data.choices[0].message.content);
        console.log("--- CHAT LOG EIND ---");
    }
    
    // Voeg CORS headers toe aan het antwoord
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error("PROXY ERROR:", err);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: "Proxy error", details: String(err?.message || err) });
  }
}
