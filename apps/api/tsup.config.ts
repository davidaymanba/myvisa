import { defineConfig } from "tsup";

/**
 * Bundles the API with esbuild; tsup switches to SWC for files with decorators because
 * tsconfig sets `emitDecoratorMetadata` (Nest's DI reads that metadata).
 * Workspace packages ship TypeScript source, so they are bundled in; npm deps stay external.
 */
export default defineConfig({
  entry: { main: "src/main.ts", "scripts/seed-demo": "src/scripts/seed-demo.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  splitting: false,
  noExternal: [/^@myvisa\//],
});
