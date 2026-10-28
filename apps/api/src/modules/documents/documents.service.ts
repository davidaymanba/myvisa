import { createHash, randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import { HttpStatus, Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type { Job } from "bullmq";
import type { AttachDocumentInput, PresignInput, PresignResult, VaultDocumentView, VaultPresignInput, VaultPresignResult } from "@myvisa/shared";
import { Prisma } from "@myvisa/db";
import { ENV, type Env } from "../../config/env";
import type { RequestUser } from "../../common/auth.types";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { QUEUES, QueueService } from "../../infra/queue";
import { StorageService } from "../../infra/storage.service";
import type { OrderWithRelations } from "../orders/order-view";
import { OrdersService } from "../orders/orders.service";
import { clamScan } from "./clamav";

/** Orders accept new files while the customer is preparing them or owes us something. */
const UPLOADABLE = new Set(["DRAFT", "PENDING_PAYMENT", "ACTION_REQUIRED"]);
const PRESIGN_TTL = 600;

interface ScanJob {
  documentId: string;
}

/**
 * Direct-to-storage uploads: the API validates and signs, the browser PUTs to S3/R2, the API verifies
 * the object, then a worker hashes and virus-scans it. Files are only ever served via short-lived URLs.
 */
@Injectable()
export class DocumentsService implements OnModuleInit {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queues: QueueService,
    private readonly orders: OrdersService,
  ) {}

  onModuleInit() {
    this.queues.process<ScanJob>(QUEUES.scan, (job) => this.scan(job), 2);
  }

  async presign(user: RequestUser, orderId: string, input: Required<Pick<PresignInput, "requirementId" | "fileName" | "mimeType" | "sizeBytes">> & { orderTravelerId: string | null }): Promise<PresignResult> {
    const order = await this.orders.load(user, orderId);
    if (order.customerId !== user.id) throw Problem.notFound("Order");
    if (!UPLOADABLE.has(order.status)) throw Problem.conflict("order_locked", "This order no longer accepts uploads.");

    const { requirement, traveler } = slot(order, input);
    const storageKey = `orders/${order.id}/${randomUUID()}/${safeName(input.fileName)}`;
    const created = await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          ownerId: user.id,
          travelerId: traveler?.travelerId ?? null,
          type: requirement.documentType,
          storageKey,
          originalName: input.fileName.slice(0, 200),
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        },
      });
      return tx.orderDocument.create({ data: { orderId: order.id, documentId: document.id, requirementId: requirement.id, orderTravelerId: traveler?.id ?? null } });
    });
    const { url, headers } = await this.storage.presignPut(storageKey, input.mimeType, input.sizeBytes, PRESIGN_TTL);
    return { id: created.id, documentId: created.documentId, uploadUrl: url, headers, expiresIn: PRESIGN_TTL };
  }

  private async loadLink(user: RequestUser, orderDocumentId: string) {
    const link = await this.prisma.orderDocument.findUnique({ where: { id: orderDocumentId }, include: { document: true, order: { select: { id: true, customerId: true, status: true } } } });
    if (!link || link.document.deletedAt || (link.order.customerId !== user.id && user.role === "CUSTOMER")) throw Problem.notFound("Document");
    return link;
  }

  /** Called by the browser after its PUT. Verifies the object really landed, then queues the scan. */
  async complete(user: RequestUser, orderDocumentId: string) {
    const link = await this.loadLink(user, orderDocumentId);
    if (link.order.customerId !== user.id) throw Problem.notFound("Document");
    const { document } = link;
    if (!document.uploadedAt) {
      const head = await this.storage.head(document.storageKey);
      if (!head) throw Problem.conflict("upload_missing", "The file hasn't reached storage yet.");
      if (head.size !== document.sizeBytes) {
        await this.storage.delete(document.storageKey).catch(() => undefined);
        throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "upload_mismatch", "The uploaded file doesn't match what was announced.");
      }
      await this.prisma.document.update({ where: { id: document.id }, data: { uploadedAt: new Date() } });
      await this.queues.add<ScanJob>(QUEUES.scan, "scan", { documentId: document.id }, { jobId: `scan-${document.id}` });
    }
    return { id: link.id, scanStatus: document.scanStatus };
  }

  /** Worker: hash the bytes and, when ClamAV is configured, scan them. Infected files are deleted. */
  async scan(job: Job<ScanJob>) {
    const document = await this.prisma.document.findUnique({ where: { id: job.data.documentId } });
    if (!document || document.deletedAt || document.scanStatus !== "PENDING") return;
    const source = await this.storage.stream(document.storageKey);
    const hash = createHash("sha256");
    const toHash = new PassThrough();
    source.pipe(toHash);
    toHash.on("data", (chunk: Buffer) => hash.update(chunk));

    let verdict: { clean: boolean; signature?: string };
    if (this.env.CLAMAV_HOST) {
      const toClam = new PassThrough();
      source.pipe(toClam);
      verdict = await clamScan(this.env.CLAMAV_HOST, this.env.CLAMAV_PORT, toClam);
    } else {
      await new Promise<void>((resolve, reject) => toHash.on("end", resolve).on("error", reject));
      verdict = { clean: true };
      this.logger.debug(`scan skipped (CLAMAV_HOST unset) for ${document.id}`);
    }
    if (!toHash.readableEnded) await new Promise<void>((resolve) => toHash.on("end", resolve));

    if (verdict.clean) {
      await this.prisma.document.update({ where: { id: document.id }, data: { scanStatus: "CLEAN", sha256: hash.digest("hex") } });
    } else {
      this.logger.warn(`infected upload ${document.id}: ${verdict.signature}`);
      await this.storage.delete(document.storageKey).catch(() => undefined);
      await this.prisma.document.update({ where: { id: document.id }, data: { scanStatus: "INFECTED", sha256: hash.digest("hex") } });
    }
  }

  async remove(user: RequestUser, orderDocumentId: string) {
    const link = await this.loadLink(user, orderDocumentId);
    if (link.order.customerId !== user.id) throw Problem.notFound("Document");
    if (!UPLOADABLE.has(link.order.status) || link.reviewStatus === "APPROVED") throw Problem.conflict("order_locked", "This document can no longer be removed.");
    // A file kept in the vault (or used by another order) only loses this link.
    const otherLinks = await this.prisma.orderDocument.count({ where: { documentId: link.documentId, id: { not: link.id } } });
    if (link.document.inVault || otherLinks > 0) {
      await this.prisma.orderDocument.delete({ where: { id: link.id } });
      return;
    }
    await this.prisma.$transaction([this.prisma.orderDocument.delete({ where: { id: link.id } }), this.prisma.document.update({ where: { id: link.documentId }, data: { deletedAt: new Date() } })]);
    await this.storage.delete(link.document.storageKey).catch(() => undefined);
  }

  /** Short-lived signed URL; never for files that failed the scan. */
  async viewUrl(user: RequestUser, orderDocumentId: string) {
    const link = await this.loadLink(user, orderDocumentId);
    if (link.document.scanStatus !== "CLEAN") throw Problem.conflict("not_scanned", "The file is still being checked.");
    return { url: await this.storage.presignGet(link.document.storageKey, link.document.originalName), expiresIn: 300 };
  }

  // ── Vault ────────────────────────────────────────────────────────────────

  /** Everything the customer has stored: vault uploads and files uploaded for orders. */
  async vaultList(user: RequestUser): Promise<VaultDocumentView[]> {
    const rows = await this.prisma.document.findMany({
      where: { ownerId: user.id, deletedAt: null, uploadedAt: { not: null } },
      include: { orderLinks: { select: { order: { select: { id: true, number: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return rows.map((d) => ({
      id: d.id,
      type: d.type,
      originalName: d.originalName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      scanStatus: d.scanStatus,
      uploaded: Boolean(d.uploadedAt),
      expiresOn: day(d.expiresOn),
      travelerId: d.travelerId,
      inVault: d.inVault,
      orders: [...new Map(d.orderLinks.map((l) => [l.order.id, l.order])).values()],
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async vaultPresign(user: RequestUser, input: Required<VaultPresignInput> & { travelerId: string | null; expiresOn: string | null }): Promise<VaultPresignResult> {
    if (input.travelerId && !(await this.prisma.traveler.findFirst({ where: { id: input.travelerId, userId: user.id, deletedAt: null }, select: { id: true } }))) throw invalid("travelerId", "traveler");
    const storageKey = `vault/${user.id}/${randomUUID()}/${safeName(input.fileName)}`;
    const document = await this.prisma.document.create({
      data: {
        ownerId: user.id,
        travelerId: input.travelerId,
        type: input.type,
        storageKey,
        originalName: input.fileName.slice(0, 200),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        inVault: true,
        expiresOn: input.expiresOn ? new Date(`${input.expiresOn}T00:00:00.000Z`) : null,
      },
    });
    const { url, headers } = await this.storage.presignPut(storageKey, input.mimeType, input.sizeBytes, PRESIGN_TTL);
    return { documentId: document.id, uploadUrl: url, headers, expiresIn: PRESIGN_TTL };
  }

  private async ownDocument(user: RequestUser, id: string) {
    const document = await this.prisma.document.findFirst({ where: { id, ownerId: user.id, deletedAt: null }, include: { orderLinks: { select: { id: true } } } });
    if (!document) throw Problem.notFound("Document");
    return document;
  }

  async vaultComplete(user: RequestUser, id: string) {
    const document = await this.ownDocument(user, id);
    if (!document.uploadedAt) {
      const head = await this.storage.head(document.storageKey);
      if (!head) throw Problem.conflict("upload_missing", "The file hasn't reached storage yet.");
      if (head.size !== document.sizeBytes) {
        await this.storage.delete(document.storageKey).catch(() => undefined);
        throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "upload_mismatch", "The uploaded file doesn't match what was announced.");
      }
      await this.prisma.document.update({ where: { id: document.id }, data: { uploadedAt: new Date() } });
      await this.queues.add<ScanJob>(QUEUES.scan, "scan", { documentId: document.id }, { jobId: `scan-${document.id}` });
    }
    return { id: document.id, scanStatus: document.scanStatus };
  }

  async vaultUrl(user: RequestUser, id: string) {
    const document = await this.ownDocument(user, id);
    if (document.scanStatus !== "CLEAN") throw Problem.conflict("not_scanned", "The file is still being checked.");
    return { url: await this.storage.presignGet(document.storageKey, document.originalName), expiresIn: 300 };
  }

  /** Files used by an order stay with the order (staff need them); they only leave the vault. */
  async vaultRemove(user: RequestUser, id: string) {
    const document = await this.ownDocument(user, id);
    if (document.orderLinks.length) {
      await this.prisma.document.update({ where: { id: document.id }, data: { inVault: false } });
      return;
    }
    await this.prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date() } });
    await this.storage.delete(document.storageKey).catch(() => undefined);
  }

  /** Reuse a stored, scanned file for an order requirement — no second upload. */
  async attach(user: RequestUser, orderId: string, input: AttachDocumentInput & { orderTravelerId: string | null }) {
    const order = await this.orders.load(user, orderId);
    if (order.customerId !== user.id) throw Problem.notFound("Order");
    if (!UPLOADABLE.has(order.status)) throw Problem.conflict("order_locked", "This order no longer accepts uploads.");
    const document = await this.ownDocument(user, input.documentId);
    if (!document.uploadedAt || document.scanStatus !== "CLEAN") throw Problem.conflict("not_scanned", "The file is still being checked.");
    const { traveler } = slot(order, { requirementId: input.requirementId, orderTravelerId: input.orderTravelerId, mimeType: document.mimeType, sizeBytes: document.sizeBytes });
    try {
      const link = await this.prisma.orderDocument.create({ data: { orderId: order.id, documentId: document.id, requirementId: input.requirementId, orderTravelerId: traveler?.id ?? null } });
      if (!document.travelerId && traveler?.travelerId) await this.prisma.document.update({ where: { id: document.id }, data: { travelerId: traveler.travelerId } });
      return { id: link.id, scanStatus: document.scanStatus };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw Problem.conflict("already_attached", "This file is already attached here.");
      throw err;
    }
  }
}

/** Checks that a file of this type and size may fill this requirement for this traveller. */
function slot(order: OrderWithRelations, input: { requirementId: string; orderTravelerId: string | null; mimeType: string; sizeBytes: number }) {
  const requirement = order.service.requirements.find((r) => r.id === input.requirementId);
  if (!requirement) throw invalid("requirementId", "requirement");
  const traveler = input.orderTravelerId ? order.travelers.find((t) => t.id === input.orderTravelerId) : undefined;
  if (requirement.perTraveler && !traveler) throw invalid("orderTravelerId", "traveler_required");
  if (!requirement.perTraveler && input.orderTravelerId) throw invalid("orderTravelerId", "per_order");
  if (traveler && requirement.applicantType && requirement.applicantType !== traveler.applicantType) throw invalid("requirementId", "not_for_applicant");
  if (!requirement.acceptedMime.includes(input.mimeType)) throw invalid("mimeType", "file_type");
  if (input.sizeBytes > requirement.maxSizeMb * 1024 * 1024) throw invalid("sizeBytes", "file_size");
  return { requirement, traveler };
}

const safeName = (name: string) => name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

function invalid(path: string, message: string) {
  return new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "The upload request is invalid.", { errors: [{ path, code: "custom", message }] });
}
