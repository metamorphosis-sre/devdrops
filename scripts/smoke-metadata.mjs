const BASE = process.env.DEVDROPS_BASE || "https://api.devdrops.run";

async function readJson(path) {
  const started = Date.now();
  const response = await fetch(`${BASE}${path}`);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${path} did not return JSON: ${text.slice(0, 120)}`);
  }
  return { path, status: response.status, ms: Date.now() - started, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [];
checks.push(await readJson("/health"));
checks.push(await readJson("/catalog"));
checks.push(await readJson("/openapi.json"));
checks.push(await readJson("/.well-known/x402"));
checks.push(await readJson("/.well-known/mcp.json"));
checks.push(await readJson("/.well-known/mcp/server-card.json"));

const health = checks.find((c) => c.path === "/health").body;
const catalog = checks.find((c) => c.path === "/catalog").body;
const openapi = checks.find((c) => c.path === "/openapi.json").body;
const x402 = checks.find((c) => c.path === "/.well-known/x402").body;
const mcp = checks.find((c) => c.path === "/.well-known/mcp.json").body;
const serverCard = checks.find((c) => c.path === "/.well-known/mcp/server-card.json").body;

assert(["healthy", "degraded"].includes(health.status), "health.status should be healthy or degraded");
assert(health.checks?.d1, "health should include d1 check");
assert(health.checks?.kv, "health should include kv check");
const backup = health.backup ?? {
  configured: null,
  status: "not_deployed",
  reason: "Production health has not yet deployed backup readiness diagnostics.",
};
assert(catalog.product_count === 43, `catalog product_count expected 43, got ${catalog.product_count}`);
assert(Array.isArray(catalog.products) && catalog.products.length === 43, "catalog should expose 43 products");
assert(openapi.openapi?.startsWith("3."), "openapi should be v3");
assert(openapi.info?.description?.includes("43 pay-per-query"), "openapi description should reflect 43 products");
assert(x402.version === "x402/1", "x402 manifest should declare x402/1");
assert(Array.isArray(x402.endpoints) && x402.endpoints.length >= 43, "x402 manifest should expose endpoints");
assert(mcp.api?.type === "mcp", "mcp.json should describe MCP API");
assert(Array.isArray(mcp.tools) && mcp.tools.length === 18, "mcp.json should expose 18 tools");
assert(serverCard.serverInfo?.name === "devdrops", "server card should identify devdrops");

console.log(JSON.stringify({
  base: BASE,
  checks: checks.map(({ path, status, ms }) => ({ path, status, ms })),
  product_count: catalog.product_count,
  x402_endpoints: x402.endpoints.length,
  mcp_tools: mcp.tools.length,
  backup,
}, null, 2));
