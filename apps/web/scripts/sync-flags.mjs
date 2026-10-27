// Copies 3:2 flag SVGs into public/flags/<iso2>.svg so flags are static, cacheable <img> assets (zero JS).
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve("country-flag-icons/package.json")), "3x2");
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "flags");

await mkdir(target, { recursive: true });
const files = (await readdir(source)).filter((f) => /^[A-Z]{2}\.svg$/.test(f));
await Promise.all(files.map((f) => copyFile(join(source, f), join(target, f.toLowerCase()))));
console.log(`Synced ${files.length} flags → public/flags`);
