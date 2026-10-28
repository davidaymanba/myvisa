import type { Readable } from "node:stream";
import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ENV, type Env } from "../config/env";

/**
 * Private object storage (S3 API: AWS S3, Cloudflare R2, or SeaweedFS locally).
 * Nothing is public: browsers upload and download through short-lived presigned URLs only.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  readonly bucket: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.bucket = env.S3_BUCKET;
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

  async onModuleInit() {
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
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, ContentLength: contentLength, ...this.sse() });
    const url = await getSignedUrl(this.s3, command, { expiresIn, signableHeaders: new Set(["content-type"]) });
    return { url, headers: { "content-type": contentType, ...(this.env.S3_SSE === "AES256" ? { "x-amz-server-side-encryption": "AES256" } : {}) } };
  }

  presignGet(key: string, downloadName: string, expiresIn = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}` });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /** Size and type actually stored, or null when the object doesn't exist (yet). */
  async head(key: string): Promise<{ size: number; contentType: string | undefined } | null> {
    try {
      const res = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch {
      return null;
    }
  }

  async stream(key: string): Promise<Readable> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, ...this.sse() }));
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
