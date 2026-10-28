/** Keep in sync with `enum UserRole` in packages/db/prisma/schema.prisma. */
export const USER_ROLES = ["CUSTOMER", "AGENT", "ACCOUNTANT", "MANAGER", "SUPER_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES = ["AGENT", "ACCOUNTANT", "MANAGER", "SUPER_ADMIN"] as const satisfies readonly UserRole[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaff(role: UserRole): role is StaffRole {
  return (STAFF_ROLES as readonly UserRole[]).includes(role);
}

/**
 * Every permission the API checks. Grouped `resource:action`; later phases add orders, payments, etc.
 * The API is the enforcement point — the admin UI only uses this to hide controls.
 */
export const PERMISSIONS = [
  "admin:access",
  "catalog:read",
  "catalog:write",
  "pricing:write",
  "content:read",
  "content:write",
  "settings:read",
  "settings:write",
  "contact:read",
  "contact:write",
  "audit:read",
  "orders:read",
  "orders:write",
  "finance:read",
  "staff:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const STAFF_BASE: Permission[] = ["admin:access", "catalog:read", "content:read", "settings:read", "contact:read"];

/**
 * The permission matrix.
 * - AGENT works orders (messages, documents) and the inbox; reads the catalog.
 * - ACCOUNTANT reads orders, invoices and payments, and the audit log; changes nothing.
 * - MANAGER runs the catalog, prices and content.
 * - SUPER_ADMIN additionally manages settings and staff.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  CUSTOMER: [],
  AGENT: [...STAFF_BASE, "contact:write", "orders:read", "orders:write"],
  ACCOUNTANT: [...STAFF_BASE, "audit:read", "orders:read", "finance:read"],
  MANAGER: [...STAFF_BASE, "contact:write", "catalog:write", "pricing:write", "content:write", "audit:read", "orders:read", "orders:write", "finance:read"],
  SUPER_ADMIN: PERMISSIONS,
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
