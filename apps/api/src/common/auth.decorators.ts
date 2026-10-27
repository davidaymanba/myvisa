import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Permission } from "@myvisa/shared";
import type { AuthedRequest, RequestUser } from "./auth.types";

export const AUTH_MODE_KEY = "auth:mode";
export const PERMISSIONS_KEY = "auth:permissions";

export type AuthMode = "required" | "optional";

/** Route needs a signed-in user (any role). */
export const Authenticated = () => SetMetadata(AUTH_MODE_KEY, "required" satisfies AuthMode);

/** Resolve the user when a session is present, but allow anonymous calls. */
export const OptionalAuth = () => SetMetadata(AUTH_MODE_KEY, "optional" satisfies AuthMode);

/** Signed-in user holding every listed permission (see the matrix in packages/shared/src/rbac.ts). */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});
