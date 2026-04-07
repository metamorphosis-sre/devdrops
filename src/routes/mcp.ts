import { Hono } from "hono";
import type { Env } from "../types";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "devdrops", version: "1.0.0" };
const BASE = "https://api.devdrops.run";

const TOOLS = [
  {
    name: "get_weather",
    description: "Get current weather conditions or forecast for a location",
    inputSchema: {
      type: "object" as const,
      properties: {
        city: { type: "string", description: "City name (e.g. London)" },
        lat: { type: "number", description: "Latitude" },
        lon: { type: "number", description: "Longitude" },
        forecast: { type: "boolean", description: "If true, return 5-day forecast instead of current" },
      },
    },
  },
  {
    name: "get_fx_rate",
    description: "Get currency exchange rates or convert between currencies",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Source currency code (e.g. USD)" },
        to: { type: "string", description: "Target currency code (e.g. GBP)" },
        amount: { type: "number", description: "Amount to convert (default 1)" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_crypto_price",
    description: "Get cryptocurrency price and market data",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string", description: "Crypto symbol (e.g. bitcoin, ethereum)" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_stock_quote",
    description: "Get a live stock quote by ticker symbol",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string", description: "Stock ticker (e.g. AAPL, MSFT)" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "search_papers",
    description: "Search academic papers by keyword — returns titles, citations, DOIs",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        page: { type: "number", description: "Page number (default 1)" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_filings",
    description: "Search SEC filings (10-K, 10-Q, 8-K) by keyword",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        forms: { type: "string", description: "Comma-separated form types (e.g. 10-K,10-Q)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_company_filings",
    description: "Get recent SEC filings for a specific company",
    inputSchema: {
      type: "object" as const,
      properties: {
        ticker: { type: "string", description: "Stock ticker (e.g. AAPL)" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_ip_info",
    description: "Get geolocation info for an IP address or the caller's IP",
    inputSchema: {
      type: "object" as const,
      properties: {
        ip: { type: "string", description: "IP address to look up (omit for caller's IP)" },
      },
    },
  },
  {
    name: "analyze_sentiment",
    description: "AI-powered sentiment analysis on a topic using current news",
    inputSchema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "Topic to analyze (e.g. 'Tesla stock')" },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_odds",
    description: "Get sports betting odds from multiple bookmakers",
    inputSchema: {
      type: "object" as const,
      properties: {
        sport: { type: "string", description: "Sport key (e.g. soccer_epl, basketball_nba)" },
      },
      required: ["sport"],
    },
  },
  {
    name: "search_food",
    description: "Search food nutrition data — calories, allergens, ingredients",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Food search query (e.g. banana)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_domain_info",
    description: "Get WHOIS, DNS, and tech stack info for a domain",
    inputSchema: {
      type: "object" as const,
      properties: {
        domain: { type: "string", description: "Domain name (e.g. example.com)" },
      },
      required: ["domain"],
    },
  },
  {
    name: "verify_vat",
    description: "Verify an EU or UK VAT number",
    inputSchema: {
      type: "object" as const,
      properties: {
        number: { type: "string", description: "VAT number (e.g. GB123456789)" },
      },
      required: ["number"],
    },
  },
  {
    name: "check_sanctions",
    description: "Check a name against global sanctions lists",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name to check" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_history_today",
    description: "Get historical events that happened on today's date",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "generate_qr",
    description: "Generate a QR code from text or URL",
    inputSchema: {
      type: "object" as const,
      properties: {
        data: { type: "string", description: "Text or URL to encode" },
        format: { type: "string", description: "Output format: svg, png, or json (default svg)" },
      },
      required: ["data"],
    },
  },
  {
    name: "research_topic",
    description: "AI research brief — synthesizes news, papers, and Wikipedia into a briefing",
    inputSchema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "Research topic" },
      },
      required: ["topic"],
    },
  },
  {
    name: "summarize_url",
    description: "Fetch and summarize a web page using AI",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "URL to summarize" },
        length: { type: "string", description: "Summary length: short, medium, long (default medium)" },
      },
      required: ["url"],
    },
  },
];

function toolUrl(name: string, args: Record<string, any>): string {
  switch (name) {
    case "get_weather": {
      const ep = args.forecast ? "forecast" : "current";
      const q = args.city ? `city=${enc(args.city)}` : `lat=${args.lat}&lon=${args.lon}`;
      return `${BASE}/api/weather/${ep}?${q}`;
    }
    case "get_fx_rate":
      return `${BASE}/api/fx/convert?from=${enc(args.from)}&to=${enc(args.to)}&amount=${args.amount ?? 1}`;
    case "get_crypto_price":
      return `${BASE}/api/crypto/price/${enc(args.symbol)}`;
    case "get_stock_quote":
      return `${BASE}/api/stocks/quote/${enc(args.symbol)}`;
    case "search_papers":
      return `${BASE}/api/papers/search?q=${enc(args.query)}&page=${args.page ?? 1}`;
    case "search_filings": {
      let u = `${BASE}/api/filings/search?q=${enc(args.query)}`;
      if (args.forms) u += `&forms=${enc(args.forms)}`;
      return u;
    }
    case "get_company_filings":
      return `${BASE}/api/filings/company/${enc(args.ticker)}`;
    case "get_ip_info":
      return args.ip ? `${BASE}/api/ip/lookup/${enc(args.ip)}` : `${BASE}/api/ip/me`;
    case "analyze_sentiment":
      return `${BASE}/api/sentiment/analyze?topic=${enc(args.topic)}`;
    case "get_odds":
      return `${BASE}/api/odds/events/${enc(args.sport)}`;
    case "search_food":
      return `${BASE}/api/food/search?q=${enc(args.query)}`;
    case "get_domain_info":
      return `${BASE}/api/domain/lookup/${enc(args.domain)}`;
    case "verify_vat":
      return `${BASE}/api/vat/check/${enc(args.number)}`;
    case "check_sanctions":
      return `${BASE}/api/sanctions/check?name=${enc(args.name)}`;
    case "get_history_today":
      return `${BASE}/api/history/today`;
    case "generate_qr":
      return `${BASE}/api/qr?data=${enc(args.data)}&format=${args.format ?? "json"}`;
    case "research_topic":
      return `${BASE}/api/research/brief?topic=${enc(args.topic)}`;
    case "summarize_url":
      return `${BASE}/api/summarize/url?url=${enc(args.url)}&length=${args.length ?? "medium"}`;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function enc(s: string) { return encodeURIComponent(s); }

const mcp = new Hono<{ Bindings: Env }>();

// GET /api/mcp — capability discovery (free)
mcp.get("/", (c) => {
  return c.json({
    protocol: "mcp",
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: SERVER_INFO,
    transport: "streamable-http",
    endpoint: `${BASE}/api/mcp`,
    pricing: "Per-tool pricing via x402 (USDC on Base). Each tool call is paid individually.",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    docs: "https://devdrops.run",
  });
});

// POST /api/mcp — JSON-RPC 2.0 handler
mcp.post("/", async (c) => {
  let rpc: any;
  try {
    rpc = await c.req.json();
  } catch {
    return c.json(rpcError(null, -32700, "Parse error"), 400);
  }

  const { method, id, params } = rpc;

  if (method === "initialize") {
    return c.json(rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    }));
  }

  if (method === "notifications/initialized") {
    return c.body(null, 204);
  }

  if (method === "tools/list") {
    return c.json(rpcResult(id, { tools: TOOLS }));
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments ?? {};

    const tool = TOOLS.find((t) => t.name === toolName);
    if (!tool) return c.json(rpcError(id, -32602, `Unknown tool: ${toolName}`));

    try {
      const url = toolUrl(toolName, args);

      // Forward payment headers from the original request
      const headers: Record<string, string> = { Accept: "application/json" };
      for (const key of ["x-402-payment", "x-402-receipt", "authorization"]) {
        const val = c.req.header(key);
        if (val) headers[key] = val;
      }

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      const data = await res.json();

      return c.json(rpcResult(id, {
        content: [{ type: "text", text: JSON.stringify(data) }],
      }));
    } catch (e: any) {
      return c.json(rpcError(id, -32000, `Tool call failed: ${e?.message ?? String(e)}`));
    }
  }

  return c.json(rpcError(id, -32601, `Unknown method: ${method}`));
});

function rpcResult(id: any, result: any) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: any, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export default mcp;
