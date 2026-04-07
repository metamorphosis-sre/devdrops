import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "food";
const CACHE_TTL = 86400; // 24 hours (nutrition data is stable)

const food = new Hono<{ Bindings: Env }>();

// GET /api/food/search?q=banana&page=1
food.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const page = c.req.query("page") ?? "1";
  const cacheKey = `search:${q}:${page}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // Open Food Facts search
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&page=${page}&page_size=10&json=1`;
  const res = await fetchUpstream(url);
  const raw: any = await res.json();

  const data = {
    count: raw.count,
    page: parseInt(page),
    results: raw.products?.slice(0, 10).map((p: any) => ({
      name: p.product_name,
      brand: p.brands,
      barcode: p.code,
      categories: p.categories,
      nutriscore: p.nutriscore_grade,
      calories_100g: p.nutriments?.["energy-kcal_100g"],
      fat_100g: p.nutriments?.fat_100g,
      carbs_100g: p.nutriments?.carbohydrates_100g,
      protein_100g: p.nutriments?.proteins_100g,
      sugar_100g: p.nutriments?.sugars_100g,
      salt_100g: p.nutriments?.salt_100g,
      fiber_100g: p.nutriments?.fiber_100g,
      allergens: p.allergens_tags,
      image_url: p.image_front_small_url,
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/food/barcode/:code — lookup by barcode
food.get("/barcode/:code", async (c) => {
  const code = c.req.param("code");
  const cacheKey = `barcode:${code}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const url = `https://world.openfoodfacts.org/api/v2/product/${code}`;
  const res = await fetchUpstream(url);
  const raw: any = await res.json();

  if (raw.status !== 1) return c.json({ error: "Product not found", barcode: code }, 404);

  const p = raw.product;
  const data = {
    name: p.product_name,
    brand: p.brands,
    barcode: p.code,
    categories: p.categories,
    ingredients: p.ingredients_text,
    allergens: p.allergens_tags,
    nutriscore: p.nutriscore_grade,
    nutrients: {
      calories_100g: p.nutriments?.["energy-kcal_100g"],
      fat_100g: p.nutriments?.fat_100g,
      saturated_fat_100g: p.nutriments?.["saturated-fat_100g"],
      carbs_100g: p.nutriments?.carbohydrates_100g,
      sugar_100g: p.nutriments?.sugars_100g,
      fiber_100g: p.nutriments?.fiber_100g,
      protein_100g: p.nutriments?.proteins_100g,
      salt_100g: p.nutriments?.salt_100g,
      sodium_100g: p.nutriments?.sodium_100g,
    },
    serving_size: p.serving_size,
    image_url: p.image_front_url,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

// GET /api/food/usda/search?q=chicken — USDA FoodData Central
food.get("/usda/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Missing 'q' query param" }, 400);

  const cacheKey = `usda:${q}`;
  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  const fdcKey = c.env.FDC_API_KEY || "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=10&api_key=${fdcKey}`;
  const res = await fetchUpstream(url);
  const raw: any = await res.json();

  const data = {
    count: raw.totalHits,
    results: raw.foods?.slice(0, 10).map((f: any) => ({
      id: f.fdcId,
      description: f.description,
      brand: f.brandName ?? f.brandOwner,
      category: f.foodCategory,
      nutrients: f.foodNutrients?.slice(0, 10).map((n: any) => ({
        name: n.nutrientName,
        amount: n.value,
        unit: n.unitName,
      })),
    })),
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

food.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: ["/api/food/search?q=banana", "/api/food/barcode/737628064502", "/api/food/usda/search?q=chicken"],
}, 400));

export default food;
