import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../config/env";

const VERSION = "v1";

/**
 * Field-level encryption for identity numbers (AES-256-GCM, random 96-bit IV, auth tag checked on read)
 * plus a keyed blind index so staff can find a passport number without decrypting every row.
 * Ciphertext format: `v1.<iv>.<ciphertext>.<tag>` (base64url). The version prefix allows key rotation.
 * In production the data key comes from a KMS-managed secret (envelope encryption is a deployment concern).
 */
@Injectable()
export class PiiService {
  private readonly key: Buffer;
  private readonly indexKey: string;

  constructor(@Inject(ENV) env: Env) {
    this.key = Buffer.from(env.DATA_ENCRYPTION_KEY, "base64");
    this.indexKey = env.BLIND_INDEX_KEY;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return [VERSION, iv.toString("base64url"), data.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
  }

  decrypt(payload: string): string {
    const [version, iv, data, tag] = payload.split(".");
    if (version !== VERSION || !iv || !data || !tag) throw new Error("unsupported ciphertext");
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  }

  /** Deterministic, normalised (case and spacing don't matter) — equal inputs give equal indexes. */
  blindIndex(value: string): string {
    return createHmac("sha256", this.indexKey).update(value.replace(/\s+/g, "").toUpperCase()).digest("base64url");
  }

  /** "A12345678" → "•••••678" for display. */
  static mask(value: string, visible = 3): string {
    return `${"•".repeat(Math.max(0, value.length - visible))}${value.slice(-visible)}`;
  }
}
