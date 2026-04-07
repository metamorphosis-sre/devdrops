import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream, missingKeyResponse } from "../lib/fetch";

const PRODUCT = "research";
const CACHE_TTL = 3600; // 1 hour

const research = new Hono<{ Bindings: Env }>();

// GET /api/research/brief?topic=quantum+computing
research.get("/brief", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json(missingKeyResponse("ANTHROPIC_API_KEY"), 503);

  const topic = c.req.query("topic");
  if (!topic) return c.json({ error: "Missing 'topic' query param" }, 400);

  const cacheKey = `brief:${topic}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Gather data from multiple sources
  const [news, papers, wikipedia] = await Promise.allSettled([
    fetchNewsSnippets(topic),
    fetchPaperSnippets(topic),
    fetchWikipediaSnippet(topic),
  ]);

  const context = {
    news: news.status === "fulfilled" ? news.value : [],
    papers: papers.status === "fulfilled" ? papers.value : [],
    wikipedia: wikipedia.status === "fulfilled" ? wikipedia.value : null,
  };

  // Synthesize with Claude
  const brief = await synthesizeBrief(topic, context, c.env.ANTHROPIC_API_KEY);

  const data = {
    topic,
    sources_consulted: {
      news_articles: (context.news as any[]).length,
      academic_papers: (context.papers as any[]).length,
      wikipedia: context.wikipedia ? true : false,
    },
    brief,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// POST /api/research/brief — custom research brief with specific instructions
research.post("/brief", async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json(missingKeyResponse("ANTHROPIC_API_KEY"), 503);

  const body = await c.req.json<{ topic: string; focus?: string; depth?: "quick" | "standard" | "deep" }>();
  if (!body.topic) return c.json({ error: "Missing 'topic'" }, 400);

  const [news, papers, wikipedia] = await Promise.allSettled([
    fetchNewsSnippets(body.topic),
    fetchPaperSnippets(body.topic),
    fetchWikipediaSnippet(body.topic),
  ]);

  const context = {
    news: news.status === "fulfilled" ? news.value : [],
    papers: papers.status === "fulfilled" ? papers.value : [],
    wikipedia: wikipedia.status === "fulfilled" ? wikipedia.value : null,
  };

  const brief = await synthesizeBrief(body.topic, context, c.env.ANTHROPIC_API_KEY, body.focus);

  return c.json({
    product: PRODUCT,
    data: { topic: body.topic, focus: body.focus, brief },
    timestamp: new Date().toISOString(),
  });
});

async function fetchNewsSnippets(topic: string) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetchUpstream(url);
    const xml = await res.text();
    const items: string[] = [];
    const regex = /<title>(.*?)<\/title>/g;
    let match;
    while ((match = regex.exec(xml)) !== null && items.length < 8) {
      const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/, "$1");
      if (title !== "Google News") items.push(title);
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchPaperSnippets(topic: string) {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(topic)}&per_page=5&select=title,publication_year,cited_by_count`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();
    return raw.results?.map((w: any) => `${w.title} (${w.publication_year}, ${w.cited_by_count} citations)`) ?? [];
  } catch {
    return [];
  }
}

async function fetchWikipediaSnippet(topic: string) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
    const res = await fetchUpstream(url);
    const raw: any = await res.json();
    return raw.extract ?? null;
  } catch {
    return null;
  }
}

async function synthesizeBrief(topic: string, context: any, apiKey: string, focus?: string) {
  const contextStr = [
    context.wikipedia ? `Wikipedia: ${context.wikipedia}` : "",
    context.news.length ? `Recent news headlines:\n${context.news.join("\n")}` : "",
    context.papers.length ? `Academic papers:\n${context.papers.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

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
        max_tokens: 2000,
        messages: [{ role: "user", content: `Create a structured research brief about "${topic}"${focus ? ` with focus on: ${focus}` : ""}. Use this context:\n\n${contextStr}\n\nReturn JSON with: title, executive_summary (2-3 sentences), key_facts (array of strings), recent_developments (array of strings), key_players (array of {name, role}), outlook (string), further_reading (array of strings suggesting what to research next).` }],
        system: "You are a professional research analyst. Always respond with valid JSON only. Be factual and cite specific data points where available.",
      }),
    });
    const raw: any = await res.json();
    return JSON.parse(raw.content?.[0]?.text ?? "{}");
  } catch (e) {
    return { error: "Research synthesis failed", detail: String(e) };
  }
}

research.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/research/brief?topic=quantum+computing", "POST /api/research/brief (body: {topic, focus?})"],
}, 400));

export default research;
