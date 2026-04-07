import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Live smoke tests — call the deployed API directly, no Workers runtime needed
    testTimeout: 30_000,
  },
});
