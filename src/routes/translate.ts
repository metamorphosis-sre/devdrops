import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "translate";
const CACHE_TTL = 86400; // 24 hours (translations don't change)
const LIBRE_URL = "https://libretranslate.com";

const translate = new Hono<{ Bindings: Env }>();

// POST /api/translate — translate text
translate.post("/", async (c) => {
  const body = await c.req.json<{ q: string; source?: string; target: string }>();
  const { q, source, target } = body;

  if (!q || !target) return c.json({ error: "Missing 'q' (text) and 'target' (language code)" }, 400);

  const cacheKey = `translate:${source ?? "auto"}:${target}:${hashString(q)}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const res = await fetchUpstream(`${LIBRE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, source: source ?? "auto", target, format: "text" }),
  });
  const raw: any = await res.json();

  const data = {
    original: q,
    translated: raw.translatedText,
    source_language: raw.detectedLanguage?.language ?? source ?? "auto",
    target_language: target,
    confidence: raw.detectedLanguage?.confidence,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/translate/languages — list supported languages
translate.get("/languages", async (c) => {
  const cacheKey = "languages";
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const res = await fetchUpstream(`${LIBRE_URL}/languages`);
  const data = await res.json();

  await setCache(c.env.DB, PRODUCT, cacheKey, data, 86400);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/translate/detect — detect language
translate.post("/detect", async (c) => {
  const body = await c.req.json<{ q: string }>();
  if (!body.q) return c.json({ error: "Missing 'q' (text)" }, 400);

  const res = await fetchUpstream(`${LIBRE_URL}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: body.q }),
  });
  const data = await res.json();

  return c.json({ product: PRODUCT, data, timestamp: new Date().toISOString() });
});

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export default translate;
