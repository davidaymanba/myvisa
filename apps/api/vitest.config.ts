import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC so Nest's decorator metadata exists in tests, exactly as in the tsup build.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
});
