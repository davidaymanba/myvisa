import type { Request } from "express";
import type { UserRole } from "@myvisa/shared";

export interface RequestUser {
  id: string;
  phone: string;
  role: UserRole;
  fullNameAr: string | null;
  fullNameEn: string | null;
  /** Session family id from the access token. */
  sessionFamily: string;
}

export interface AuditDraft {
  action?: string;
  entityType?: string;
  entityId?: string | null;
  before?: unknown;
}

export interface AuthedRequest extends Request {
  user?: RequestUser;
  /** Filled by handlers/services so the audit interceptor can record before/after. */
  audit?: AuditDraft;
}
