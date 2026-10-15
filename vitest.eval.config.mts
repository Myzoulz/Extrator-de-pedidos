import { defineConfig } from "vitest/config";

// Config exclusiva para `npm run eval`: roda a suíte de avaliação contra a
// API real do provedor configurado. A suíte unitária usa vitest.config.mts.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30_000,
    include: ["evals/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
  },
});
