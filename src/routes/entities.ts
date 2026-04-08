import { Hono } from "hono";
import type { Env } from "../types";

const PRODUCT = "entities";

const DEFAULT_ENTITY_TYPES = [
  "person", "organization", "location", "date", "money", "product", "event",
];

const entities = new Hono<{ Bindings: Env }>();

// POST /api/entities/extract — extract named entities from text
entities.post("/extract", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be JSON" }, 400);
  }

  const text = String(body?.text ?? "").trim();
  if (!text) return c.json({ error: "Missing 'text' in request body" }, 400);
  if (text.length > 10000) return c.json({ error: "Text too long (max 10000 characters)" }, 400);

  const types: string[] = Array.isArray(body?.types) && body.types.length > 0
    ? body.types.map((t: any) => String(t))
    : DEFAULT_ENTITY_TYPES;

  try {
    const extraction = await callClaude(text, types, c.env.ANTHROPIC_API_KEY);

    return c.json({
      product: PRODUCT,
      data: {
        text_length: text.length,
        entity_types_used: types,
        ...extraction,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return c.json({ error: "Entity extraction failed" }, 503);
  }
});

async function callClaude(text: string, types: string[], apiKey: string) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: "You are a named entity recognition engine. Always respond with valid JSON only, no markdown or explanation. Extract named entities from the text. Return a JSON object with: entities (array of {text: string, type: string, confidence: number 0-1, context: string}), summary ({total_entities: number, by_type: {type: count}}).",
        messages: [{
          role: "user",
          content: `Extract named entities of these types: ${types.join(", ")}.\n\nText:\n${text}`,
        }],
      }),
    });
    const raw: any = await res.json();
    const responseText = raw.content?.[0]?.text ?? "{}";
    return JSON.parse(responseText);
  } catch (e) {
    return { error: "AI entity extraction failed" };
  }
}

entities.get("/", (c) => c.json({
  error: "POST to /api/entities/extract",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    { endpoint: "POST /api/entities/extract", body: { text: "Elon Musk announced that Tesla will invest $10 billion in a new factory in Austin, Texas by 2026." } },
    { endpoint: "POST /api/entities/extract", body: { text: "The event was held in London.", types: ["location", "event"] } },
  ],
}, 400));

export default entities;
