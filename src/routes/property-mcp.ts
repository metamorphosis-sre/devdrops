import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "property";
const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "devdrops-property", version: "1.0.0" };

const TOOLS = [
  {
    name: "get_uk_property_prices",
    description: "Search UK property transaction prices by postcode. Returns recent sales with price paid, date, property type, tenure (freehold/leasehold), and full address from HM Land Registry.",
    inputSchema: {
      type: "object",
      properties: {
        postcode: { type: "string", description: "UK postcode (e.g. SW1A 1AA, EC1A 1BB, M1 1AE)" },
      },
      required: ["postcode"],
    },
  },
  {
    name: "get_uk_company_property_charges",
    description: "Look up property charges (mortgages and secured loans) registered against a UK company via Companies House. Useful for due diligence and beneficial ownership research.",
    inputSchema: {
      type: "object",
      properties: {
        company_number: { type: "string", description: "Companies House registration number (e.g. 00445790, 12345678)" },
      },
      required: ["company_number"],
    },
  },
  {
    name: "get_uk_house_price_index",
    description: "Get the UK House Price Index (HPI) for a region. Returns average prices, annual and monthly percentage changes, and sales volumes for up to 12 months.",
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "UK region slug. Options: united-kingdom, england, london, south-east, south-west, east-of-england, east-midlands, west-midlands, north-west, north-east, yorkshire-and-the-humber, wales, scotland, northern-ireland",
          default: "united-kingdom",
        },
      },
      required: [],
    },
  },
];

const propertyMcp = new Hono<{ Bindings: Env }>();

// GET /api/property/mcp — capability discovery
propertyMcp.get("/", (c) =>
  c.json({
    product: PRODUCT,
    mcp: {
      endpoint: "https://api.devdrops.run/api/property/mcp",
      protocol: "MCP",
      version: PROTOCOL_VERSION,
      transport: "streamable-http",
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    },
    usage: "POST https://api.devdrops.run/api/property/mcp with JSON-RPC 2.0 body",
    price: "$0.01 USDC per call via x402",
    docs: "https://api.devdrops.run/openapi.json",
  })
);

// POST /api/property/mcp — MCP JSON-RPC 2.0 endpoint
propertyMcp.post("/", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(rpcError(null, -32700, "Parse error"), 200);
  }

  const { jsonrpc, id, method, params } = body ?? {};

  if (jsonrpc !== "2.0") {
    return c.json(rpcError(id ?? null, -32600, "Invalid Request: jsonrpc must be '2.0'"), 200);
  }

  switch (method) {
    case "initialize":
      return c.json(
        rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        })
      );

    case "notifications/initialized":
      return new Response(null, { status: 204 });

    case "tools/list":
      return c.json(rpcResult(id, { tools: TOOLS }));

    case "tools/call": {
      const toolName = params?.name as string | undefined;
      const args = (params?.arguments ?? {}) as Record<string, unknown>;

      if (!toolName) {
        return c.json(rpcError(id, -32602, "Invalid params: missing tool name"), 200);
      }

      try {
        const text = await callTool(toolName, args, c.env);
        return c.json(rpcResult(id, { content: [{ type: "text", text }] }));
      } catch (e: any) {
        return c.json(
          rpcResult(id, {
            content: [{ type: "text", text: `Error: ${e?.message ?? "unknown error"}` }],
            isError: true,
          })
        );
      }
    }

    default:
      return c.json(rpcError(id, -32601, `Method not found: ${method}`), 200);
  }
});

async function callTool(name: string, args: Record<string, unknown>, env: Env): Promise<string> {
  switch (name) {
    case "get_uk_property_prices": {
      const postcode = String(args.postcode ?? "").trim();
      if (!postcode) throw new Error("postcode is required");

      const cacheKey = `uk:prices:${postcode.toUpperCase()}`;
      const cached = await getCached(env.DB, PRODUCT, cacheKey);
      if (cached) return formatPrices(cached);

      const encoded = encodeURIComponent(postcode.toUpperCase().replace(/\s+/g, "+"));
      const res = await fetchUpstream(
        `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encoded}&_pageSize=20&_sort=-transactionDate`
      );
      const raw: any = await res.json();

      const data = {
        postcode: postcode.toUpperCase(),
        transactions: raw.result?.items?.map((t: any) => ({
          price: t.pricePaid,
          date: t.transactionDate,
          property_type: t.propertyType?.prefLabel,
          new_build: t.newBuild,
          tenure: t.estateType?.prefLabel,
          address: {
            paon: t.propertyAddress?.paon,
            street: t.propertyAddress?.street?.label,
            town: t.propertyAddress?.town?.label,
          },
        })) ?? [],
      };

      await setCache(env.DB, PRODUCT, cacheKey, data, 3600);
      return formatPrices(data);
    }

    case "get_uk_company_property_charges": {
      const companyNumber = String(args.company_number ?? "").trim().toUpperCase();
      if (!companyNumber) throw new Error("company_number is required");
      if (!env.COMPANIES_HOUSE_API_KEY) throw new Error("Companies House API not configured on this server");

      const cacheKey = `uk:company:${companyNumber}`;
      const cached = await getCached(env.DB, PRODUCT, cacheKey);
      if (cached) return formatCharges(cached);

      const res = await fetchUpstream(
        `https://api.company-information.service.gov.uk/company/${companyNumber}/charges`,
        { headers: { Authorization: `Basic ${btoa(env.COMPANIES_HOUSE_API_KEY + ":")}` } }
      );

      if (!res.ok) {
        if (res.status === 404) return `No company found with number ${companyNumber}`;
        throw new Error(`Companies House returned ${res.status}`);
      }

      const raw: any = await res.json();
      const data = {
        company_number: companyNumber,
        total_charges: raw.total_count ?? 0,
        charges: raw.items?.slice(0, 20).map((ch: any) => ({
          status: ch.status,
          created: ch.created_on,
          delivered: ch.delivered_on,
          description: ch.particulars?.description,
          persons_entitled: ch.persons_entitled?.map((p: any) => p.name),
          secured_type: ch.classification?.type,
        })) ?? [],
      };

      await setCache(env.DB, PRODUCT, cacheKey, data, 3600);
      return formatCharges(data);
    }

    case "get_uk_house_price_index": {
      const region = String(args.region ?? "united-kingdom")
        .toLowerCase()
        .replace(/\s+/g, "-");

      const cacheKey = `uk:index:${region}`;
      const cached = await getCached(env.DB, PRODUCT, cacheKey);
      if (cached) return formatHPI(region, cached);

      const res = await fetchUpstream(
        `https://landregistry.data.gov.uk/data/ukhpi/region/${region}.json?_pageSize=12&_sort=-ukhpi:refMonth`
      );
      const raw: any = await res.json();

      const data = {
        region,
        index_data: raw.result?.items?.map((item: any) => ({
          month: item["ukhpi:refMonth"],
          average_price: item["ukhpi:averagePrice"],
          annual_change: item["ukhpi:percentageAnnualChange"],
          monthly_change: item["ukhpi:percentageChange"],
          sales_volume: item["ukhpi:salesVolume"],
        })) ?? [],
      };

      await setCache(env.DB, PRODUCT, cacheKey, data, 86400);
      return formatHPI(region, data);
    }

    default:
      throw new Error(`Unknown tool: ${name}. Available tools: ${TOOLS.map((t) => t.name).join(", ")}`);
  }
}

function formatPrices(data: any): string {
  const txns = data.transactions ?? [];
  if (txns.length === 0) return `No recent property transactions found for ${data.postcode}.`;

  const lines = txns.slice(0, 10).map((t: any) => {
    const price = t.price ? `£${Number(t.price).toLocaleString("en-GB")}` : "price unknown";
    const date = String(t.date ?? "").split("T")[0] ?? "unknown date";
    const type = Array.isArray(t.property_type) ? t.property_type[0]?.["@value"] ?? "" : (t.property_type ?? "");
    const tenure = Array.isArray(t.tenure) ? t.tenure[0]?.["@value"] ?? "" : (t.tenure ?? "");
    const addr = [t.address?.paon, t.address?.street, t.address?.town].filter(Boolean).join(", ");
    return `• ${addr}: ${price} (${[type, tenure].filter(Boolean).join(", ")}, ${date})`;
  });

  return `UK property transactions for ${data.postcode}:\n\n${lines.join("\n")}`;
}

function formatCharges(data: any): string {
  if (!data.total_charges) return `No property charges found for company ${data.company_number}.`;

  const lines = (data.charges ?? []).slice(0, 10).map((ch: any) => {
    const entitled = ch.persons_entitled?.join(", ") ?? "unknown";
    return `• Status: ${ch.status ?? "unknown"} | Created: ${ch.created ?? "unknown"} | Secured to: ${entitled} | ${ch.description ?? ch.secured_type ?? ""}`;
  });

  return `Property charges for company ${data.company_number} (${data.total_charges} total):\n\n${lines.join("\n")}`;
}

function formatHPI(region: string, data: any): string {
  const items = data.index_data ?? [];
  if (items.length === 0) {
    return `No HPI data for region: ${region}. Valid regions: united-kingdom, england, london, south-east, south-west, east-of-england, east-midlands, west-midlands, north-west, north-east, yorkshire-and-the-humber, wales, scotland, northern-ireland`;
  }

  const lines = items.slice(0, 6).map((item: any) => {
    const avg = item.average_price ? `£${Number(item.average_price).toLocaleString("en-GB")}` : "N/A";
    const annual = item.annual_change != null ? `${Number(item.annual_change).toFixed(1)}%` : "N/A";
    const monthly = item.monthly_change != null ? `${Number(item.monthly_change).toFixed(1)}%` : "N/A";
    const vol = item.sales_volume ? ` | ${item.sales_volume} sales` : "";
    return `${item.month ?? "unknown"}: avg ${avg} | annual ${annual} | monthly ${monthly}${vol}`;
  });

  return `UK House Price Index — ${region}:\n\n${lines.join("\n")}`;
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export default propertyMcp;
