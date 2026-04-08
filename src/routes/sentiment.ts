import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "sentiment";
const CACHE_TTL = 1800; // 30 minutes

const sentiment = new Hono<{ Bindings: Env }>();

// GET /api/sentiment/analyze?topic=AAPL
sentiment.get("/analyze", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json(missingKeyResponse("ANTHROPIC_API_KEY"), 503);

  const topic = c.req.query("topic");
  if (!topic) return c.json({ error: "Missing 'topic' query param" }, 400);

  const cacheKey = `analyze:${topic}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // 1. Fetch news from Google News RSS
  const articles = await fetchNewsRSS(topic);

  if (articles.length === 0) {
    return c.json({ product: PRODUCT, data: { topic, articles: [], sentiment: null, note: "No recent articles found" } });
  }

  // 2. Send to Claude for sentiment analysis
  const analysis = await analyzeWithClaude(articles, topic, c.env.ANTHROPIC_API_KEY);

  const data = {
    topic,
    article_count: articles.length,
    articles: articles.slice(0, 5).map((a) => ({ title: a.title, source: a.source, published: a.published })),
    sentiment: analysis,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// POST /api/sentiment/analyze — analyze custom text
sentiment.post("/analyze", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json(missingKeyResponse("ANTHROPIC_API_KEY"), 503);

  let body: { text: string; topic?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }
  if (!body.text) return c.json({ error: "Missing 'text' in request body" }, 400);

  const analysis = await analyzeTextWithClaude(body.text, body.topic ?? "general", c.env.ANTHROPIC_API_KEY);

  return c.json({ product: PRODUCT, data: { text_length: body.text.length, sentiment: analysis }, timestamp: new Date().toISOString() });
});

async function fetchNewsRSS(topic: string) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetchUpstream(url, { headers: { Accept: "application/xml" } });
    const xml = await res.text();

    // Simple XML parsing for RSS items
    const items: { title: string; source: string; published: string; link: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, "$1") ?? "";
      const source = itemXml.match(/<source.*?>(.*?)<\/source>/)?.[1] ?? "";
      const published = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
      items.push({ title, source, published, link });
    }
    return items;
  } catch {
    return [];
  }
}

async function analyzeWithClaude(articles: { title: string; source: string }[], topic: string, apiKey: string) {
  const headlines = articles.map((a) => `- ${a.title} (${a.source})`).join("\n");

  return callClaude(
    `Analyze the sentiment of these news headlines about "${topic}". Return a JSON object with: overall_score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive), confidence (0 to 1), summary (one sentence), key_themes (array of strings), outlook (bullish/neutral/bearish for financial topics, or positive/neutral/negative for others).\n\nHeadlines:\n${headlines}`,
    apiKey
  );
}

async function analyzeTextWithClaude(text: string, topic: string, apiKey: string) {
  return callClaude(
    `Analyze the sentiment of this text about "${topic}". Return a JSON object with: overall_score (-1 to 1), confidence (0 to 1), summary (one sentence), key_themes (array of strings), entities_mentioned (array of strings).\n\nText:\n${text.substring(0, 5000)}`,
    apiKey
  );
}

async function callClaude(prompt: string, apiKey: string) {
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
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
        system: "You are a financial sentiment analysis engine. Always respond with valid JSON only, no markdown or explanation.",
      }),
    });
    const raw: any = await res.json();
    const text = raw.content?.[0]?.text ?? "{}";
    return JSON.parse(text);
  } catch (e) {
    return { error: "AI analysis failed" };
  }
}

sentiment.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/sentiment/analyze?topic=AAPL", "POST /api/sentiment/analyze (body: {text, topic?})"],
}, 400));

export default sentiment;
