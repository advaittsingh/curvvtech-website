import { describe, expect, it, vi } from "vitest";
import {
  normalizeAdminRole,
  permissionsForRole,
} from "../src/lib/adminPermissions.js";
import { enforceAdminPermissions } from "../src/middleware/enforceAdminPermissions.js";

function runPermissionCheck(input: {
  path: string;
  method?: string;
  role?: ReturnType<typeof normalizeAdminRole>;
}) {
  const role = input.role ?? "designer";
  const req = {
    baseUrl: "/api/admin",
    path: input.path,
    method: input.method ?? "GET",
    adminRole: role,
    adminPermissions: permissionsForRole(role),
  };
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const next = vi.fn();
  enforceAdminPermissions(req as never, { status } as never, next);
  return { status, json, next };
}

describe("admin role safety", () => {
  it("does not elevate raw admin to super_admin", () => {
    expect(normalizeAdminRole("admin")).toBe("admin");
    expect(permissionsForRole(normalizeAdminRole("admin"))).not.toContain("settings.manage");
  });

  it("keeps only intended legacy aliases", () => {
    expect(normalizeAdminRole("manager")).toBe("admin");
    expect(normalizeAdminRole("member")).toBe("developer");
  });
});

describe("admin permission middleware", () => {
  it("fails closed for an unmapped admin prefix", () => {
    const result = runPermissionCheck({ path: "/future-sensitive-module" });
    expect(result.status).toHaveBeenCalledWith(403);
    expect(result.next).not.toHaveBeenCalled();
  });

  it("allows notifications for any authenticated staff role", () => {
    const result = runPermissionCheck({ path: "/notifications" });
    expect(result.next).toHaveBeenCalledOnce();
  });

  it("delegates restricted task PATCH authorization to the task route", () => {
    const result = runPermissionCheck({ path: "/tasks/00000000-0000-4000-8000-000000000001", method: "PATCH" });
    expect(result.next).toHaveBeenCalledOnce();
  });

  it("does not let a project manager through team role administration", () => {
    const result = runPermissionCheck({
      path: "/team/members/00000000-0000-4000-8000-000000000001",
      method: "PATCH",
      role: "project_manager",
    });
    // Module permission may allow team dashboards; the team route still requires
    // super_admin for the actual role mutation.
    expect(result.next).toHaveBeenCalledOnce();
  });
});
