import type { Request } from "express";

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/** Client IP (Express resolves X-Forwarded-For when `trust proxy` is on) and user agent, truncated for storage. */
export function requestMeta(req: Request): RequestMeta {
  return {
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
  };
}
