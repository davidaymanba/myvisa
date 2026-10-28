import { createConnection } from "node:net";
import type { Readable } from "node:stream";

export type ScanVerdict = { clean: true } | { clean: false; signature: string };

/**
 * Minimal clamd client (INSTREAM): streams the file in length-prefixed chunks and reads the verdict.
 * https://docs.clamav.net/manual/Usage/Scanning.html#clamd
 */
export function clamScan(host: string, port: number, body: Readable, timeoutMs = 60_000): Promise<ScanVerdict> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let reply = "";
    const fail = (err: Error) => {
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(timeoutMs, () => fail(new Error("clamd timeout")));
    socket.on("error", fail);
    socket.on("data", (d) => (reply += d.toString("utf8")));
    socket.on("end", () => {
      const text = reply.replace(/\0/g, "").trim();
      if (text.endsWith("OK")) resolve({ clean: true });
      else if (text.endsWith("FOUND")) resolve({ clean: false, signature: text.replace(/^stream:\s*/, "").replace(/\s*FOUND$/, "") });
      else reject(new Error(`clamd: ${text || "no reply"}`));
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      body.on("data", (chunk: Buffer) => {
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      });
      body.on("end", () => socket.write(Buffer.alloc(4)));
      body.on("error", fail);
    });
  });
}
