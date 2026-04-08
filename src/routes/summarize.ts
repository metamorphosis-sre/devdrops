import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { validateFetchUrl } from "../lib/url-guard";

const PRODUCT = "summarize";
const CACHE_TTL = 3600; // 1 hour

const summarize = new Hono<{ Bindings: Env }>();

// GET /api/summarize/url?url=https://example.com&length=medium
summarize.get("/url", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 503);

  const targetUrl = c.req.query("url");
  if (!targetUrl) return c.json({ error: "Missing 'url' query param" }, 400);

  const urlError = validateFetchUrl(targetUrl);
  if (urlError) return c.json({ error: urlError }, 400);
  const parsed = new URL(targetUrl);

  const length = (c.req.query("length") ?? "medium").toLowerCase();
  if (!["short", "medium", "long"].includes(length)) {
    return c.json({ error: "Invalid length. Use: short, medium, long" }, 400);
  }

  const cacheKey = `url:${targetUrl}:${length}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    // Fetch the URL
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DevDrops/1.0; +https://devdrops.run)",
        "Accept": "text/html,application/xhtml+xml,text/plain",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return c.json({ error: `Target URL returned ${res.status}` }, 502);
    }

    const html = await res.text();

    // Strip HTML tags to extract text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Truncate to 50K chars
    const truncated = text.substring(0, 50000);

    const lengthInstruction =
      length === "short" ? "1 paragraph" :
      length === "long" ? "4-5 paragraphs" :
      "2-3 paragraphs";

    const summary = await callClaude(
      `Summarize the following text. The summary should be ${lengthInstruction}.\n\nText:\n${truncated}`,
      c.env.ANTHROPIC_API_KEY
    );

    const data = {
      url: targetUrl,
      domain: parsed.hostname,
      length,
      ...summary,
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    if (e?.name === "TimeoutError") return c.json({ error: "Target URL timed out" }, 504);
    return c.json({ error: "Failed to summarize URL" }, 503);
  }
});

async function callClaude(prompt: string, apiKey: string) {
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
        system: "You are a concise summarizer. Always respond with valid JSON only, no markdown or explanation. Return a JSON object with: title (string), summary (string, length as instructed), key_points (array of 3-7 bullet point strings), word_count (number — word count of the original text).",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const raw: any = await res.json();
    const text = raw.content?.[0]?.text ?? "{}";
    return JSON.parse(text);
  } catch (e) {
    return { error: "AI summarization failed" };
  }
}

summarize.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/summarize/url?url=https://example.com",
    "/api/summarize/url?url=https://example.com&length=short",
    "/api/summarize/url?url=https://example.com&length=long",
  ],
}, 400));

export default summarize;
