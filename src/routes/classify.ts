import { Hono } from "hono";
import type { Env } from "../types";

const PRODUCT = "classify";

const DEFAULT_CATEGORIES = [
  "business", "technology", "science", "health", "politics",
  "sports", "entertainment", "finance", "education", "other",
];

const classify = new Hono<{ Bindings: Env }>();

// POST /api/classify/text — classify text into categories
classify.post("/text", async (c) => {
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

  const categories: string[] = Array.isArray(body?.categories) && body.categories.length > 0
    ? body.categories.map((c: any) => String(c))
    : DEFAULT_CATEGORIES;

  try {
    const classification = await callClaude(text, categories, c.env.ANTHROPIC_API_KEY);

    return c.json({
      product: PRODUCT,
      data: {
        text_length: text.length,
        categories_used: categories,
        classification,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return c.json({ error: "Classification failed" }, 503);
  }
});

async function callClaude(text: string, categories: string[], apiKey: string) {
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
        system: "You are a text classification engine. Always respond with valid JSON only, no markdown or explanation. Classify the text into the provided categories. Return a JSON object with: primary_category (string), confidence (number 0-1), secondary_categories (array of {category: string, confidence: number}), reasoning (string, 1 sentence).",
        messages: [{
          role: "user",
          content: `Classify the following text into these categories: ${categories.join(", ")}.\n\nText:\n${text}`,
        }],
      }),
    });
    const raw: any = await res.json();
    const responseText = raw.content?.[0]?.text ?? "{}";
    return JSON.parse(responseText);
  } catch (e) {
    return { error: "AI classification failed" };
  }
}

classify.get("/", (c) => c.json({
  error: "POST to /api/classify/text",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    { endpoint: "POST /api/classify/text", body: { text: "Apple reported record quarterly revenue driven by iPhone sales." } },
    { endpoint: "POST /api/classify/text", body: { text: "The team won the championship.", categories: ["sports", "politics", "entertainment"] } },
  ],
}, 400));

export default classify;
