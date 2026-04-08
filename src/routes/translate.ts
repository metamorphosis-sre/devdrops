import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "translate";
const CACHE_TTL = 86400; // 24 hours (translations don't change)

// MyMemory — free translation API, no key required, 1000 words/day free tier
// API docs: https://mymemory.translated.net/doc/spec.php
const MYMEMORY_URL = "https://api.mymemory.translated.net";

const translate = new Hono<{ Bindings: Env }>();

// POST /api/translate/text — translate text
// Body: { q: string, source?: string (default "auto"), target: string (BCP-47 code e.g. "es", "fr", "zh") }
translate.post("/text", async (c) => {
  let body: { q: string; source?: string; target: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }
  const { q, source, target } = body;

  if (!q || !target) return c.json({ error: "Missing 'q' (text) and 'target' (language code, e.g. 'es')" }, 400);
  if (q.length > 500) return c.json({ error: "Text too long (maximum 500 characters per request)" }, 400);

  const srcLang = source ?? "auto";
  const cacheKey = `translate:${srcLang}:${target}:${hashString(q)}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // MyMemory langpair format: "source|target" (use "autodetect" for auto-detect)
  const langpair = srcLang === "auto" ? `autodetect|${target}` : `${srcLang}|${target}`;
  const url = `${MYMEMORY_URL}/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(langpair)}`;

  let res: Response;
  let raw: any;
  try {
    res = await fetchUpstream(url);
    raw = await res.json();
  } catch {
    return c.json({ error: "Translation service unavailable" }, 503);
  }

  if (raw.responseStatus !== 200) {
    return c.json({ error: "Translation failed", detail: raw.responseDetails ?? raw.responseStatus }, 502);
  }

  const data = {
    original: q,
    translated: raw.responseData.translatedText,
    source_language: srcLang === "auto"
      ? (raw.matches?.[0]?.source ?? "auto")
      : srcLang,
    target_language: target,
    match_quality: raw.responseData.match,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/translate/languages — list supported language codes
translate.get("/languages", async (c) => {
  // MyMemory supports all ISO 639-1 language codes + regional variants.
  // This is a curated static list of the most common ones.
  const languages = [
    { code: "af", name: "Afrikaans" }, { code: "sq", name: "Albanian" },
    { code: "ar", name: "Arabic" }, { code: "hy", name: "Armenian" },
    { code: "az", name: "Azerbaijani" }, { code: "eu", name: "Basque" },
    { code: "be", name: "Belarusian" }, { code: "bn", name: "Bengali" },
    { code: "bs", name: "Bosnian" }, { code: "bg", name: "Bulgarian" },
    { code: "ca", name: "Catalan" }, { code: "hr", name: "Croatian" },
    { code: "cs", name: "Czech" }, { code: "da", name: "Danish" },
    { code: "nl", name: "Dutch" }, { code: "en", name: "English" },
    { code: "et", name: "Estonian" }, { code: "tl", name: "Filipino" },
    { code: "fi", name: "Finnish" }, { code: "fr", name: "French" },
    { code: "gl", name: "Galician" }, { code: "ka", name: "Georgian" },
    { code: "de", name: "German" }, { code: "el", name: "Greek" },
    { code: "gu", name: "Gujarati" }, { code: "ht", name: "Haitian Creole" },
    { code: "he", name: "Hebrew" }, { code: "hi", name: "Hindi" },
    { code: "hu", name: "Hungarian" }, { code: "is", name: "Icelandic" },
    { code: "id", name: "Indonesian" }, { code: "ga", name: "Irish" },
    { code: "it", name: "Italian" }, { code: "ja", name: "Japanese" },
    { code: "kn", name: "Kannada" }, { code: "kk", name: "Kazakh" },
    { code: "ko", name: "Korean" }, { code: "lv", name: "Latvian" },
    { code: "lt", name: "Lithuanian" }, { code: "mk", name: "Macedonian" },
    { code: "ms", name: "Malay" }, { code: "ml", name: "Malayalam" },
    { code: "mt", name: "Maltese" }, { code: "mr", name: "Marathi" },
    { code: "mn", name: "Mongolian" }, { code: "ne", name: "Nepali" },
    { code: "no", name: "Norwegian" }, { code: "fa", name: "Persian" },
    { code: "pl", name: "Polish" }, { code: "pt", name: "Portuguese" },
    { code: "ro", name: "Romanian" }, { code: "ru", name: "Russian" },
    { code: "sr", name: "Serbian" }, { code: "sk", name: "Slovak" },
    { code: "sl", name: "Slovenian" }, { code: "es", name: "Spanish" },
    { code: "sw", name: "Swahili" }, { code: "sv", name: "Swedish" },
    { code: "ta", name: "Tamil" }, { code: "te", name: "Telugu" },
    { code: "th", name: "Thai" }, { code: "tr", name: "Turkish" },
    { code: "uk", name: "Ukrainian" }, { code: "ur", name: "Urdu" },
    { code: "uz", name: "Uzbek" }, { code: "vi", name: "Vietnamese" },
    { code: "cy", name: "Welsh" }, { code: "yi", name: "Yiddish" },
    { code: "zu", name: "Zulu" }, { code: "zh", name: "Chinese (Simplified)" },
    { code: "zh-TW", name: "Chinese (Traditional)" },
  ];

  return c.json({
    product: PRODUCT,
    cached: false,
    data: { count: languages.length, languages },
    timestamp: new Date().toISOString(),
  }, 200, { "Cache-Control": "public, max-age=86400" });
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

translate.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["POST /api/translate/text (body: {q, target})", "/api/translate/languages"],
}, 400));

export default translate;
