import { z } from "zod";

// Browsers run our Content-Security-Policy without 'unsafe-eval'. Zod probes `Function("")` to compile fast
// validators the first time it parses; telling it up front keeps that probe from tripping a CSP violation.
// Every shared schema imports `z` from here, so this runs before any of them is used. Servers keep the JIT.
if (typeof (globalThis as { window?: unknown }).window !== "undefined") z.config({ jitless: true });

export { z };
