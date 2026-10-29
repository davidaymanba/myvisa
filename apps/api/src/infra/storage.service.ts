import { createHmac } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type { Request, Response } from "express";
import { ENV, type Env } from "../config/env";
import { safeEqual } from "../common/crypto";

/** Path of the signed-link route used by local-disk storage (see `serveLocal`). */
export const LOCAL_FILES_PATH = "/api/v1/files";

interface LocalGrant {
  k: string; // object key
  m: "PUT" | "GET";
  e: number; // expiry, epoch seconds
  t?: string; // PUT: exact content type
  l?: number; // PUT: exact length
  n?: string; // GET: download name
}

/**
 * Private object storage (S3 API: AWS S3, Cloudflare R2, or SeaweedFS locally).
 * Nothing is public: browsers upload and download through short-lived presigned URLs only.
 * Demo hosts with no object storage set STORAGE_DIR: files live on local disk and the same presigned-URL
 * contract is served by `serveLocal`, with HMAC-signed links instead of S3 signatures.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly dir?: string;
  private readonly signingKey: Buffer;
  readonly bucket: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.bucket = env.S3_BUCKET;
    this.dir = env.STORAGE_DIR ? resolve(env.STORAGE_DIR) : undefined;
    this.signingKey = createHmac("sha256", env.HASH_PEPPER).update("local-storage-links").digest();
    this.s3 = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
      // Third-party S3 implementations reject the SDK's default CRC32 checksums on presigned URLs.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  get isLocal() {
    return Boolean(this.dir);
  }

  async onModuleInit() {
    if (this.dir) return void (await mkdir(this.dir, { recursive: true }));
    if (!this.env.S3_AUTO_CREATE_BUCKET) return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket })).catch((err: Error) => this.logger.warn(`create bucket ${this.bucket}: ${err.message}`));
    }
  }

  private sse() {
    return this.env.S3_SSE === "AES256" ? { ServerSideEncryption: "AES256" as const } : {};
  }

  /** Signed PUT bound to the exact type and size the API validated. */
  async presignPut(key: string, contentType: string, contentLength: number, expiresIn = 600): Promise<{ url: string; headers: Record<string, string> }> {
    if (this.dir) return { url: this.localLink({ k: key, m: "PUT", e: this.expiry(expiresIn), t: contentType, l: contentLength }), headers: { "content-type": contentType } };
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, ContentLength: contentLength, ...this.sse() });
    const url = await getSignedUrl(this.s3, command, { expiresIn, signableHeaders: new Set(["content-type"]) });
    return { url, headers: { "content-type": contentType, ...(this.env.S3_SSE === "AES256" ? { "x-amz-server-side-encryption": "AES256" } : {}) } };
  }

  presignGet(key: string, downloadName: string, expiresIn = 300): Promise<string> {
    if (this.dir) return Promise.resolve(this.localLink({ k: key, m: "GET", e: this.expiry(expiresIn), n: downloadName }));
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}` });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /** Size and type actually stored, or null when the object doesn't exist (yet). */
  async head(key: string): Promise<{ size: number; contentType: string | undefined } | null> {
    if (this.dir) {
      const file = this.localPath(key);
      const [info, meta] = await Promise.all([stat(file).catch(() => null), readFile(`${file}.meta`, "utf8").catch(() => "")]);
      return info ? { size: info.size, contentType: meta || undefined } : null;
    }
    try {
      const res = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch {
      return null;
    }
  }

  async stream(key: string): Promise<Readable> {
    if (this.dir) return createReadStream(this.localPath(key));
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }

  async put(key: string, body: Buffer, contentType: string) {
    if (this.dir) {
      const file = this.localPath(key);
      await mkdir(dirname(file), { recursive: true });
      await Promise.all([writeFile(file, body), writeFile(`${file}.meta`, contentType)]);
      return;
    }
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, ...this.sse() }));
  }

  async delete(key: string) {
    if (this.dir) {
      const file = this.localPath(key);
      await Promise.all([rm(file, { force: true }), rm(`${file}.meta`, { force: true })]);
      return;
    }
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /**
   * Express handler for `${LOCAL_FILES_PATH}/:token` (local-disk mode only). The signed token is the
   * authorisation, exactly like an S3 presigned URL, so it sits outside the API's cookie/CSRF guards.
   */
  async serveLocal(req: Request, res: Response) {
    const grant = this.verify(req.path.replace(/^\//, ""));
    if (!grant || grant.m !== req.method) return void res.status(403).json({ code: "invalid_link" });
    const file = this.localPath(grant.k);
    if (grant.m === "GET") {
      const meta = await readFile(`${file}.meta`, "utf8").catch(() => null);
      if (meta === null) return void res.status(404).json({ code: "not_found" });
      res.setHeader("content-type", meta);
      res.setHeader("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(grant.n ?? "file")}`);
      res.setHeader("cache-control", "private, no-store");
      return void createReadStream(file).pipe(res);
    }
    const length = Number(req.headers["content-length"]);
    if (req.headers["content-type"] !== grant.t || length !== grant.l) return void res.status(400).json({ code: "signature_mismatch" });
    await mkdir(dirname(file), { recursive: true });
    let received = 0;
    req.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > length) req.destroy(new Error("body larger than signed length"));
    });
    try {
      await pipeline(req, createWriteStream(file));
      await writeFile(`${file}.meta`, grant.t ?? "application/octet-stream");
      res.status(200).end();
    } catch {
      await rm(file, { force: true });
      if (!res.headersSent) res.status(400).json({ code: "upload_failed" });
    }
  }

  private expiry(seconds: number) {
    return Math.floor(Date.now() / 1000) + seconds;
  }

  private localLink(grant: LocalGrant) {
    const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
    const signature = createHmac("sha256", this.signingKey).update(payload).digest("base64url");
    return `${this.env.API_PUBLIC_URL}${LOCAL_FILES_PATH}/${payload}.${signature}`;
  }

  private verify(token: string): LocalGrant | null {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    if (!safeEqual(signature, createHmac("sha256", this.signingKey).update(payload).digest("base64url"))) return null;
    const grant = JSON.parse(Buffer.from(payload, "base64url").toString()) as LocalGrant;
    return grant.e >= Math.floor(Date.now() / 1000) ? grant : null;
  }

  /** Keys come from the API, but never let one escape the storage directory. */
  private localPath(key: string) {
    const file = resolve(this.dir!, key);
    if (!file.startsWith(this.dir! + sep)) throw new Error(`storage key escapes STORAGE_DIR: ${key}`);
    return file;
  }
}
