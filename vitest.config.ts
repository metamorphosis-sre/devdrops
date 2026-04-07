import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
  plugins: [
    cloudflareTest({
      main: "./src/index.ts",
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        // Override vars so payment middleware is skipped
        bindings: { ENVIRONMENT: "development" },
        // In-memory KV and D1 — no real cloud bindings needed
        kvNamespaces: ["CACHE"],
        d1Databases: ["DB"],
      },
    }),
  ],
});
