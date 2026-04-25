---
name: devdrops-universal-mcp
description: Connect Claude and other MCP clients to DevDrops' 18 data tools via the Model Context Protocol at mcp.devdrops.run. Handshake free, tool calls $0.01 each.
---

## When to use this skill

- You are using Claude Desktop, Cursor, or another MCP-compatible client and want to give it access to DevDrops data tools
- Agent is bootstrapping a session and needs to discover available DevDrops tools before calling them
- User wants to use DevDrops data through natural language in an MCP-aware interface
- You are building a multi-agent system and want to expose DevDrops as an MCP server to your orchestrator

## How it works

`mcp.devdrops.run` implements the Model Context Protocol (MCP) streamable-http transport. It exposes 18 tools covering weather, FX, crypto, stocks, predictions, sanctions, company data, and more. The MCP handshake (`initialize`, `tools/list`) is free — no payment required for discovery. Each `tools/call` request is individually gated by x402 at $0.01 per call. The underlying tool calls forward to the corresponding DevDrops REST endpoints, which carry their own prices (the $0.01 MCP fee covers the coordination layer; the underlying data cost is included).

## Endpoint

| Transport | Endpoint | Handshake | Tool calls |
|-----------|----------|-----------|------------|
| streamable-http | `https://mcp.devdrops.run/` | Free | $0.01 each |

## 18 Available tools

| Tool | Description |
|------|-------------|
| `get_weather` | Current conditions or 5-day forecast by city or coordinates |
| `get_fx_rate` | Currency exchange rates and conversion |
| `get_crypto_price` | Crypto token prices and market data |
| `get_stock_quote` | Live stock quote by ticker |
| `search_papers` | Academic paper search (OpenAlex + Semantic Scholar) |
| `search_filings` | SEC and Companies House filing search |
| `get_company_filings` | All filings for a specific ticker |
| `get_ip_info` | IP geolocation lookup |
| `analyze_sentiment` | News sentiment analysis for a topic |
| `get_odds` | Sports betting odds by sport |
| `search_food` | Food and nutrition data lookup |
| `get_domain_info` | Domain WHOIS, DNS, and SSL data |
| `verify_vat` | EU/UK VAT number verification |
| `check_sanctions` | Sanctions list screening |
| `get_history_today` | Historical events for today's date |
| `generate_qr` | QR code generation (returns base64) |
| `research_topic` | AI research brief on any topic |
| `summarize_url` | Summarise the content of a URL |

## Quick start

### Claude Desktop configuration

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devdrops": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-http-proxy"],
      "env": {
        "MCP_SERVER_URL": "https://mcp.devdrops.run/"
      }
    }
  }
}
```

### Direct MCP client (TypeScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CoinbaseWalletClient } from "@coinbase/wallet-sdk";

// Wallet for paying tool calls
const wallet = new CoinbaseWalletClient({ ... });

const transport = new StreamableHTTPClientTransport(
  new URL("https://mcp.devdrops.run/"),
  {
    requestInit: (req) => ({
      headers: {
        // x402 payment proof injected per-request by your payment middleware
        ...getPaymentHeaders(wallet, req),
      },
    }),
  }
);

const client = new Client({ name: "my-agent", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport); // free — calls initialize

const tools = await client.listTools(); // free — calls tools/list
console.log(tools.tools.map(t => t.name));
```

### Direct JSON-RPC (curl)

```bash
# Initialize (free)
curl -X POST https://mcp.devdrops.run/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}'

# List tools (free)
curl -X POST https://mcp.devdrops.run/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Call a tool (paid — requires x402 payment header)
curl -X POST https://mcp.devdrops.run/ \
  -H "Content-Type: application/json" \
  -H "x-402-payment: <payment-proof>" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_fx_rate","arguments":{"from":"USD","to":"GBP"}}}'
```

## Examples

### Example 1: Discover and call a tool

```typescript
await client.connect(transport); // free

const result = await client.callTool({
  name: "get_fx_rate",
  arguments: { from: "USD", to: "GBP", amount: 100 },
}); // $0.01

const text = (result.content[0] as any).text;
const data = JSON.parse(text);
console.log(`100 USD = £${data.data.result}`);
```

### Example 2: Multi-tool agent session

```typescript
// All discovery is free; only tool calls cost
await client.connect(transport);

const [weather, fx, news] = await Promise.all([
  client.callTool({ name: "get_weather", arguments: { city: "London" } }),
  client.callTool({ name: "get_fx_rate", arguments: { from: "USD", to: "GBP" } }),
  client.callTool({ name: "analyze_sentiment", arguments: { topic: "UK economy" } }),
]);
// Total cost: $0.03 (3 tool calls)
```

### Example 3: Sanctions check via MCP

```typescript
const result = await client.callTool({
  name: "check_sanctions",
  arguments: { name: "Viktor Bout" },
});
const { matched, results } = JSON.parse((result.content[0] as any).text).data;
```

## Errors & limits

| Scenario | Behaviour |
|----------|-----------|
| No payment header on tools/call | Returns JSON-RPC error wrapping a 402 response |
| Unknown tool name | JSON-RPC error code -32602 |
| Tool execution failure | JSON-RPC error code -32000 |
| Parse error in request | JSON-RPC error code -32700, HTTP 400 |

**Per-tool pricing:** Tool calls cost $0.01 each at the MCP layer. This covers the coordination cost; the underlying REST endpoint prices are bundled in.

**Handshake is free:** `initialize`, `tools/list`, and `notifications/initialized` never require payment.

**MCP protocol version:** Implements `2024-11-05`. Clients requiring a newer version should check `mcp.devdrops.run/` (GET) for the current `protocolVersion` field.

**Alternative:** All 18 tools are also available as direct REST endpoints at `api.devdrops.run`. Use REST when you don't need MCP transport.

## Related skills

- [devdrops-sanctions-screening](../devdrops-sanctions-screening/SKILL.md) — direct REST for sanctions (more params available)
- [devdrops-fx-rates](../devdrops-fx-rates/SKILL.md) — direct REST for FX
- [devdrops-weather](../devdrops-weather/SKILL.md) — direct REST for weather
