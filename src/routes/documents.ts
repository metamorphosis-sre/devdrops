import { Hono } from "hono";
import type { Env } from "../types";
import { missingKeyResponse } from "../lib/fetch";

const PRODUCT = "documents";

const documents = new Hono<{ Bindings: Env }>();

// POST /api/documents/summarize — summarize a document
documents.post("/summarize", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json(missingKeyResponse("ANTHROPIC_API_KEY"), 503);

  const contentType = c.req.header("content-type") ?? "";

  let text: string;
  if (contentType.includes("application/json")) {
    const body = await c.req.json<{ text: string; type?: string }>();
    if (!body.text) return c.json({ error: "Missing 'text' in request body" }, 400);
    text = body.text;
  } else {
    text = await c.req.text();
  }

  if (!text || text.length < 50) return c.json({ error: "Text too short (minimum 50 characters)" }, 400);
  if (text.length > 100000) return c.json({ error: "Text too long (maximum 100,000 characters)" }, 400);

  const summary = await summarizeWithClaude(text, c.env.ANTHROPIC_API_KEY);

  return c.json({
    product: PRODUCT,
    data: {
      input_length: text.length,
      summary,
    },
    timestamp: new Date().toISOString(),
  });
});

// POST /api/documents/extract — extract key terms, dates, obligations
documents.post("/extract", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json(missingKeyResponse("ANTHROPIC_API_KEY"), 503);

  const body = await c.req.json<{ text: string }>();
  if (!body.text) return c.json({ error: "Missing 'text' in request body" }, 400);

  const extracted = await extractWithClaude(body.text, c.env.ANTHROPIC_API_KEY);

  return c.json({
    product: PRODUCT,
    data: {
      input_length: body.text.length,
      extraction: extracted,
    },
    timestamp: new Date().toISOString(),
  });
});

async function summarizeWithClaude(text: string, apiKey: string) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: `Summarize this document. Return a JSON object with: title (inferred), type (contract/report/filing/letter/other), summary (2-3 paragraphs), key_points (array of strings), risks (array of strings), obligations (array of {party, obligation, deadline?}), dates_mentioned (array of {date, context}).\n\nDocument:\n${text.substring(0, 50000)}` }],
        system: "You are a professional document analysis engine. Always respond with valid JSON only.",
      }),
    });
    const raw: any = await res.json();
    return JSON.parse(raw.content?.[0]?.text ?? "{}");
  } catch (e) {
    return { error: "Summarization failed", detail: String(e) };
  }
}

async function extractWithClaude(text: string, apiKey: string) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: `Extract structured data from this document. Return a JSON object with: entities (array of {name, type: person/org/location}), dates (array of {date, context}), monetary_values (array of {amount, currency, context}), key_terms (array of strings), obligations (array of {party, obligation, deadline?}), contact_info (array of {type: email/phone/address, value}).\n\nDocument:\n${text.substring(0, 50000)}` }],
        system: "You are a professional data extraction engine. Always respond with valid JSON only.",
      }),
    });
    const raw: any = await res.json();
    return JSON.parse(raw.content?.[0]?.text ?? "{}");
  } catch (e) {
    return { error: "Extraction failed", detail: String(e) };
  }
}

export default documents;
