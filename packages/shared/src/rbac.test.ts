import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, STAFF_ROLES, can, isStaff } from "./rbac";

describe("permission matrix", () => {
  it("customers get nothing in the admin", () => {
    expect(ROLE_PERMISSIONS.CUSTOMER).toEqual([]);
    expect(isStaff("CUSTOMER")).toBe(false);
  });

  it("every staff role can open the admin", () => {
    for (const role of STAFF_ROLES) expect(can(role, "admin:access")).toBe(true);
  });

  it("only managers and super admins change prices", () => {
    expect(can("AGENT", "pricing:write")).toBe(false);
    expect(can("ACCOUNTANT", "pricing:write")).toBe(false);
    expect(can("MANAGER", "pricing:write")).toBe(true);
    expect(can("SUPER_ADMIN", "pricing:write")).toBe(true);
  });

  it("only super admins change settings and staff", () => {
    for (const role of ["AGENT", "ACCOUNTANT", "MANAGER"] as const) {
      expect(can(role, "settings:write")).toBe(false);
      expect(can(role, "staff:manage")).toBe(false);
    }
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toEqual(PERMISSIONS);
  });

  it("agents cannot read the audit log; accountants can", () => {
    expect(can("AGENT", "audit:read")).toBe(false);
    expect(can("ACCOUNTANT", "audit:read")).toBe(true);
  });
});
