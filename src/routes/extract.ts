import { Hono } from "hono";
import type { Env } from "../types";
import { getTiered, setTiered } from "../lib/cache";

const PRODUCT = "extract";
const CACHE_TTL = 3600; // 1 hour

const extract = new Hono<{ Bindings: Env }>();

// GET /api/extract/url?url=https://example.com — extract clean text from a URL
extract.get("/url", async (c) => {
  const targetUrl = c.req.query("url");
  if (!targetUrl) return c.json({ error: "Missing 'url' query param" }, 400);

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return c.json({ error: "Only http and https URLs are supported" }, 400);
    }
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  const cacheKey = `url:${targetUrl}`;
  const cached = await getTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DevDrops/1.0; +https://devdrops.run)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return c.json({ error: `Target URL returned ${res.status}` }, 502);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      return c.json({ error: "URL does not return HTML content" }, 422);
    }

    const html = await res.text();
    const extracted = extractFromHTML(html, parsed.origin);

    const data = {
      url: targetUrl,
      domain: parsed.hostname,
      ...extracted,
    };

    await setTiered(c.env.CACHE, c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    if (e?.name === "TimeoutError") return c.json({ error: "Target URL timed out" }, 504);
    return c.json({ error: "Failed to fetch URL", detail: String(e) }, 502);
  }
});

// POST /api/extract/html — extract from raw HTML submitted in body
extract.post("/html", async (c) => {
  const body = await c.req.json<{ html: string; url?: string }>();
  if (!body.html) return c.json({ error: "Missing 'html' in request body" }, 400);
  if (body.html.length > 500000) return c.json({ error: "HTML too large (max 500KB)" }, 400);

  const origin = body.url ? new URL(body.url).origin : "";
  const extracted = extractFromHTML(body.html, origin);

  return c.json({
    product: PRODUCT,
    data: { url: body.url ?? null, ...extracted },
    timestamp: new Date().toISOString(),
  });
});

extract.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/extract/url?url=https://example.com",
    "POST /api/extract/html (body: {html, url?})",
  ],
}, 400));

function extractFromHTML(html: string, baseOrigin: string): Record<string, unknown> {
  // Title
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().replace(/\s+/g, " ") ?? null;

  // Meta description
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]
    ?? null;

  // OG tags
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
  const ogDescription = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
  const ogType = html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;

  // Author
  const author = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? null;

  // Published date
  const publishedDate = html.match(/<meta[^>]+(?:property=["']article:published_time["']|name=["']date["'])[^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/(?:datePublished|publishedAt|publish_date)['":\s]+["']([0-9T:\-Z+]+)["']/i)?.[1]
    ?? null;

  // Strip scripts, styles, nav, footer, header, aside
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Extract main content if available
  const mainMatch = body.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  if (mainMatch) body = mainMatch[1];

  // Strip remaining HTML tags
  const text = body
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Extract headings
  const headings: string[] = [];
  const hRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hMatch;
  while ((hMatch = hRegex.exec(html)) !== null && headings.length < 10) {
    const h = hMatch[1].replace(/<[^>]+>/g, "").trim();
    if (h) headings.push(h);
  }

  // Extract links
  const links: Array<{ text: string; href: string }> = [];
  const linkRegex = /<a[^>]+href=["']([^"'#][^"']*?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lMatch;
  while ((lMatch = linkRegex.exec(html)) !== null && links.length < 20) {
    const href = lMatch[1];
    const linkText = lMatch[2].replace(/<[^>]+>/g, "").trim();
    if (linkText && href && !href.startsWith("javascript:")) {
      const fullHref = href.startsWith("http") ? href : `${baseOrigin}${href.startsWith("/") ? href : "/" + href}`;
      links.push({ text: linkText, href: fullHref });
    }
  }

  // Word count
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    title: ogTitle ?? title,
    description: ogDescription ?? description,
    author,
    published_date: publishedDate,
    og: { title: ogTitle, description: ogDescription, image: ogImage, type: ogType },
    headings,
    links: links.slice(0, 20),
    text: text.substring(0, 10000),
    text_full_length: text.length,
    word_count: wordCount,
  };
}

export default extract;
