import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "papers";
const CACHE_TTL = 3600; // 1 hour
const BASE_URL = "https://api.openalex.org";

const papers = new Hono<{ Bindings: Env }>();

// GET /api/papers/search?q=machine+learning&page=1
papers.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const page = c.req.query("page") ?? "1";
  const perPage = c.req.query("per_page") ?? "10";
  const cacheKey = `search:${q}:${page}:${perPage}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${BASE_URL}/works?search=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}&select=id,doi,title,publication_year,cited_by_count,open_access,authorships,primary_location`;
  const res = await fetchUpstream(url, { headers: { Accept: "application/json" } });
  const raw: any = await res.json();

  const data = {
    count: raw.meta?.count,
    page: parseInt(page),
    per_page: parseInt(perPage),
    results: raw.results?.map((w: any) => ({
      id: w.id,
      doi: w.doi,
      title: w.title,
      year: w.publication_year,
      citations: w.cited_by_count,
      open_access: w.open_access?.is_oa ?? false,
      oa_url: w.open_access?.oa_url,
      authors: w.authorships?.slice(0, 5).map((a: any) => a.author?.display_name),
      journal: w.primary_location?.source?.display_name,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/papers/work/:id — get a specific work by OpenAlex ID
papers.get("/work/:id", async (c) => {
  const id = c.req.param("id");
  const cacheKey = `work:${id}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `${BASE_URL}/works/${id}`;
  const res = await fetchUpstream(url, { headers: { Accept: "application/json" } });
  const w: any = await res.json();

  const data = {
    id: w.id,
    doi: w.doi,
    title: w.title,
    year: w.publication_year,
    citations: w.cited_by_count,
    abstract: w.abstract_inverted_index ? reconstructAbstract(w.abstract_inverted_index) : null,
    open_access: w.open_access?.is_oa ?? false,
    oa_url: w.open_access?.oa_url,
    authors: w.authorships?.map((a: any) => ({
      name: a.author?.display_name,
      institution: a.institutions?.[0]?.display_name,
    })),
    journal: w.primary_location?.source?.display_name,
    type: w.type,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

function reconstructAbstract(inverted: Record<string, number[]>): string {
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map((w) => w[1]).join(" ");
}

papers.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/papers/search?q=machine+learning", "/api/papers/work/W2741809807"],
}, 400));

export default papers;
