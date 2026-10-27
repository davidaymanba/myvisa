// Generates src/components/globe/land-dots.json: a lat/lon grid sampled against Natural Earth land (110m).
// Output is a flat Int16Array-friendly list [lat*10, lon*10, ...] so the browser ships ~25 KB, no map library.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topo = JSON.parse(await readFile(require.resolve("world-atlas/land-110m.json"), "utf8"));
const land = feature(topo, topo.objects.land);

const STEP = 1.6; // degrees between dots at the equator
const out = [];
for (let lat = -58; lat <= 78; lat += STEP) {
  // Keep dots evenly spaced on the sphere: fewer longitude samples toward the poles.
  const lonStep = STEP / Math.max(Math.cos((lat * Math.PI) / 180), 0.25);
  for (let lon = -180; lon < 180; lon += lonStep) {
    if (geoContains(land, [lon, lat])) out.push(Math.round(lat * 10), Math.round(lon * 10));
  }
}
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "components", "globe", "land-dots.json");
await writeFile(target, JSON.stringify(out));
console.log(`${out.length / 2} land dots → ${target}`);
