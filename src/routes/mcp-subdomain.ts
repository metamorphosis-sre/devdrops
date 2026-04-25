import type { Context } from "hono";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { cdpAuthHeaders } from "../lib/cdp-auth";
import type { Env } from "../types";
import { TOOLS, toolUrl } from "./mcp";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "devdrops-mcp", version: "1.0.0" };
const MCP_ENDPOINT = "https://mcp.devdrops.run";
const MCP_PRICE = "$0.01";

// Free handshake methods — no payment required
const FREE_METHODS = new Set(["initialize", "notifications/initialized", "tools/list"]);

export async function handleMcpSubdomain(c: Context<{ Bindings: Env }>): Promise<Response> {
  if (c.req.method === "GET") {
    return c.json({
      protocol: "mcp",
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      transport: "streamable-http",
      endpoint: MCP_ENDPOINT,
      pricing: `Tool calls: ${MCP_PRICE} USDC per call on Base. Handshake methods (initialize, tools/list) are free.`,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      docs: "https://devdrops.run/docs",
    });
  }

  if (c.req.method !== "POST") {
    return c.json({ error: "Method not allowed" }, 405);
  }

  let rpc: any;
  try {
    rpc = await c.req.json();
  } catch {
    return c.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const { method, id, params } = rpc;

  // Free handshake methods — respond directly without payment check
  if (method === "initialize") {
    return c.json({ jsonrpc: "2.0", id, result: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    }});
  }

  if (method === "notifications/initialized") {
    return c.body(null, 204);
  }

  if (method === "tools/list") {
    return c.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments ?? {};

    const tool = TOOLS.find((t) => t.name === toolName);
    if (!tool) {
      return c.json({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${toolName}` } });
    }

    const payTo = c.env.PAY_TO_ADDRESS;
    const network = c.env.NETWORK;
    const facilitatorUrl = c.env.FACILITATOR_URL;

    if (!payTo) {
      return c.json({ error: "Server misconfigured: PAY_TO_ADDRESS not set" }, 500);
    }

    // Build a minimal x402 route config for POST / on this subdomain
    const mcpRoute = {
      "POST /": {
        accepts: { scheme: "exact", price: MCP_PRICE, network, payTo },
        description: `MCP tool call — ${toolName}`,
        mimeType: "application/json",
        extensions: {},
      },
    };

    const facilitatorConfig: { url: string; createAuthHeaders?: () => Promise<Record<string, Record<string, string>>> } = { url: facilitatorUrl };
    if (c.env.CDP_API_KEY_ID && c.env.CDP_API_KEY_SECRET) {
      facilitatorConfig.createAuthHeaders = cdpAuthHeaders(c.env.CDP_API_KEY_ID, c.env.CDP_API_KEY_SECRET);
    }

    const facilitator = new HTTPFacilitatorClient(facilitatorConfig as any);
    const schemes = [{ network, server: new ExactEvmScheme() }];
    const paymentMiddleware = paymentMiddlewareFromConfig(mcpRoute as any, facilitator, schemes as any);

    // next() runs only after x402 payment is verified
    return paymentMiddleware(c, async () => {
      const headers: Record<string, string> = { Accept: "application/json" };
      for (const key of ["x-402-payment", "x-402-receipt", "authorization"]) {
        const val = c.req.header(key);
        if (val) headers[key] = val;
      }

      try {
        const url = toolUrl(toolName, args);
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        const data = await res.json();
        return c.json({ jsonrpc: "2.0", id, result: {
          content: [{ type: "text", text: JSON.stringify(data) }],
        }});
      } catch {
        return c.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "Tool call failed" } });
      }
    }) as Response;
  }

  return c.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
}
