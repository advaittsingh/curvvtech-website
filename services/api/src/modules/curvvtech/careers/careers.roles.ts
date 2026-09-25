export type CareerTeam = "Technology" | "Growth";

export type CareerRoleCatalogItem = {
  slug: string;
  title: string;
  team: CareerTeam;
};

/** Keep in sync with apps/website/lib/careers-data.ts */
export const CAREER_ROLES: CareerRoleCatalogItem[] = [
  { slug: "frontend-developer-intern", title: "Frontend Developer Intern", team: "Technology" },
  { slug: "backend-developer-intern", title: "Backend Developer Intern", team: "Technology" },
  { slug: "ui-ux-designer-intern", title: "UI/UX Designer Intern", team: "Technology" },
  { slug: "video-editor-intern", title: "Video Editor Intern", team: "Growth" },
  { slug: "social-media-intern", title: "Social Media Intern", team: "Growth" },
  { slug: "performance-marketing-intern", title: "Performance Marketing (Ads) Intern", team: "Growth" },
];

export function getCareerRole(slug: string): CareerRoleCatalogItem | undefined {
  return CAREER_ROLES.find((role) => role.slug === slug);
}
