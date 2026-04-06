export interface Env {
  // Cloudflare bindings
  DB: D1Database;
  STORAGE: R2Bucket | undefined;
  CACHE: KVNamespace;

  // x402 payment config
  FACILITATOR_URL: string;
  PAY_TO_ADDRESS: string;
  NETWORK: string;
  ENVIRONMENT: string;

  // Coinbase CDP facilitator auth (set via `wrangler secret put`)
  CDP_API_KEY_ID: string;
  CDP_API_KEY_SECRET: string;  // PEM-encoded EC private key

  // Product API keys (set via `wrangler secret put`)
  WEATHER_API_KEY: string;          // OpenWeatherMap
  ODDS_API_KEY: string;             // The Odds API
  COMPANIES_HOUSE_API_KEY: string;  // UK Companies House
  ANTHROPIC_API_KEY: string;        // Claude API for AI products
  JSEARCH_API_KEY: string;          // JSearch (RapidAPI) job search
  EASYPOST_API_KEY: string;         // EasyPost shipping
}

export interface ProductConfig {
  name: string;
  slug: string;
  description: string;
  endpoint: string;
  priceMin: string;
  priceMax: string;
  tier: "domain" | "aggregation" | "premium";
  tags: string[];
  active: boolean;
}

export interface RoutePrice {
  price: string;
  description: string;
}

export type PricingMap = Record<string, RoutePrice>;

export interface Transaction {
  product: string;
  amount_usd: string;
  payment_method: "x402" | "mpp";
  agent_wallet: string;
  endpoint: string;
  response_time_ms: number;
}

export interface HealthCheckResult {
  source_name: string;
  status: "ok" | "fail";
  response_time_ms: number;
  error_message?: string;
}

export interface DataSource {
  id: number;
  product: string;
  source_name: string;
  source_url: string;
  is_primary: boolean;
  is_active: boolean;
  last_checked: string;
  consecutive_failures: number;
}
