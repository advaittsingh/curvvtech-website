import { describe, expect, it } from "vitest";
import { hasPermission, normalizeAdminRole, permissionsForRole } from "./permissions";

describe("permissions", () => {
  it("maps legacy admin role to super_admin", () => {
    expect(normalizeAdminRole("admin")).toBe("super_admin");
  });

  it("grants super_admin all permissions", () => {
    const perms = permissionsForRole("super_admin");
    expect(hasPermission(perms, "team.manage")).toBe(true);
    expect(hasPermission(perms, "settings.manage")).toBe(true);
  });

  it("restricts accountant to finance modules", () => {
    const perms = permissionsForRole("accountant");
    expect(hasPermission(perms, "invoices.view")).toBe(true);
    expect(hasPermission(perms, "team.manage")).toBe(false);
  });
});
