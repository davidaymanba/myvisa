import { SetMetadata } from "@nestjs/common";

export const AUDIT_KEY = "audit:meta";

export interface AuditMeta {
  /** Dotted verb, e.g. "price_rule.update". */
  action: string;
  /** Prisma model name, e.g. "PriceRule". */
  entityType: string;
}

/** Names the audit entry for a staff mutation. Unnamed mutations are still logged, under their route. */
export const Audit = (action: string, entityType: string) => SetMetadata(AUDIT_KEY, { action, entityType } satisfies AuditMeta);
