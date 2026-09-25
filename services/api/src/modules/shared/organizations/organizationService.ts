import { sql, firstRow } from "../../../lib/sqlPool.js";
import type { OrganizationBranding } from "../../client-portal/clientAuth.middleware.js";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  branding_json: OrganizationBranding | null;
  domain_json: { portal_domain?: string } | null;
};

export type ResolvedBranding = {
  organization_id: string;
  slug: string;
  branding: OrganizationBranding;
};

export async function getBrandingBySlug(slug: string): Promise<ResolvedBranding | null> {
  const row = firstRow<OrgRow>(
    await sql`SELECT id, name, slug, branding_json, domain_json FROM organizations WHERE slug = ${slug} LIMIT 1`,
  );
  if (!row) return null;
  return {
    organization_id: row.id,
    slug: row.slug,
    branding: { company_name: row.name, ...(row.branding_json ?? {}) },
  };
}

/** Resolve org by custom portal domain (white-label). Falls back to curvvtech. */
export async function resolveBrandingByHost(host: string | undefined): Promise<ResolvedBranding> {
  const cleanHost = (host ?? "").split(":")[0].trim().toLowerCase();
  if (cleanHost) {
    const row = firstRow<OrgRow>(
      await sql`
        SELECT id, name, slug, branding_json, domain_json
        FROM organizations
        WHERE lower(domain_json->>'portal_domain') = ${cleanHost}
        LIMIT 1
      `,
    );
    if (row) {
      return {
        organization_id: row.id,
        slug: row.slug,
        branding: { company_name: row.name, ...(row.branding_json ?? {}) },
      };
    }
  }
  const fallback = await getBrandingBySlug("curvvtech");
  return (
    fallback ?? {
      organization_id: "",
      slug: "curvvtech",
      branding: { company_name: "Curvvtech", brand_color: "#111111" },
    }
  );
}
