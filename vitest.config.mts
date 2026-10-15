import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30_000,
    // evals/eval.test.ts chama a API real; roda só via `npm run eval`.
    exclude: ["**/node_modules/**", "**/evals/eval.test.ts"],
  },
});
