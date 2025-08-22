
# Bring OpenAI Proxy (Vercel)

**Doel:** je OpenAI key blijft geheim. Shopify praat met deze proxy, proxy praat met OpenAI.

## Deploy in 3 stappen
1. Ga naar vercel.com → New Project → Importeer deze map.
2. In Project Settings → Environment Variables:
   - `OPENAI_API_KEY = sk-proj-...` (Service account key)
3. Deploy. Je endpoint: `https://<jouw>.vercel.app/api/ai`

## Test (optioneel)
curl -X POST https://<jouw>.vercel.app/api/ai -H "Content-Type: application/json" -d '{ "messages": [{"role":"user","content":"Hallo!"}] }'

## Shopify
Gebruik `fetch("https://<jouw>.vercel.app/api/ai", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ messages:[{role:"user",content:"Hallo"}] }) })`
