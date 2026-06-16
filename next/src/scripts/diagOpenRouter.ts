#!/usr/bin/env tsx
// Quick diagnostic: make one raw OpenRouter call and print the full response.
// Run with: tsx --env-file=.env.local --env-file=../.env --tsconfig tsconfig.scripts.json src/scripts/diagOpenRouter.ts

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model  = process.env.OPENROUTER_MODEL ?? "moonshotai/kimi-k2.5";

  console.log(`API key: ${apiKey ? apiKey.slice(0, 12) + "…" : "(MISSING)"}`);
  console.log(`Model:   ${model}\n`);

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const body = {
    model,
    max_tokens: 200,
    temperature: 0.3,
    messages: [
      { role: "system", content: "You output only valid JSON objects, no prose." },
      { role: "user",   content: 'Output: {"hello":"world","n":42}' },
    ],
    response_format: { type: "json_object" },
  };

  console.log("Sending request…\n");
  const start = Date.now();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer":  "https://videogpt.local",
      "X-Title":       "VideoGPT",
    },
    body: JSON.stringify(body),
  });

  const elapsed = Date.now() - start;
  console.log(`HTTP ${res.status} ${res.statusText}  (${elapsed}ms)\n`);

  const text = await res.text();
  console.log("Raw response body:\n");
  console.log(text.slice(0, 2000));
}

main().catch((e) => { console.error(e); process.exit(1); });
