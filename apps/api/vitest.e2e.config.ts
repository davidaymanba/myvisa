import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

/** API e2e: real Nest app + supertest against the disposable `myvisa_test` database and Redis db 15. */
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["test/**/*.e2e.ts"],
    environment: "node",
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
