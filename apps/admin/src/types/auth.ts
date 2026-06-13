/** CurvvTech OS admin roles (frontend contract; backend may store legacy aliases). */
export type AdminRole =
  | "super_admin"
  | "admin"
  | "sales"
  | "project_manager"
  | "developer"
  | "designer"
  | "accountant";

export type Permission =
  | "dashboard.view"
  | "leads.view"
  | "leads.edit"
  | "clients.view"
  | "clients.edit"
  | "projects.view"
  | "projects.edit"
  | "invoices.view"
  | "invoices.edit"
  | "proposals.view"
  | "proposals.edit"
  | "content.view"
  | "content.edit"
  | "team.manage"
  | "settings.manage";

export type AuthUser = {
  id: string;
  email: string | null;
  accessAllowed: boolean;
  waitlistPosition: number | null;
  /** Raw value from API (`users.curvvtech_role`). */
  curvvtechRole: string | null;
  role: AdminRole | null;
};

export type MeResponse = {
  id: string;
  email: string | null;
  access_allowed: boolean;
  waitlist_position: number | null;
  curvvtech_role: string | null;
};

export type LoginResponse = {
  user: MeResponse;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
};
