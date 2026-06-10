import { labelFrom, PAGE1_TYPE } from "../business/questionnaireShared";
import { appStorage, type BusinessProfile, type UserProfileDetails } from "../storage/appStorage";
import type { Lead } from "../services/api";

export type BusinessSummaryModel = {
  businessName: string;
  category: string;
  description: string;
  location: string;
  monthlyLeadCount: number;
  weeklyNewCount: string;
  logoLetter: string;
  /** Profile photo from Edit profile / Profile screen; null → show initial letter. */
  profilePhotoUri: string | null;
};

function firstLine(s: string) {
  return s.split("\n").map((x) => x.trim()).find(Boolean) ?? "";
}

/** Derive card copy from profile + user details. */
export function buildBusinessSummaryModel(
  profile: BusinessProfile | null,
  user: UserProfileDetails | null,
  leads: Lead[]
): BusinessSummaryModel {
  const q = profile?.questionnaire;
  const typeLabel = q?.businessType ? labelFrom(PAGE1_TYPE, q.businessType) : "";

  let businessName = user?.displayName?.trim() ?? "";
  if (!businessName && profile?.whatYouDo) {
    const line = firstLine(profile.whatYouDo);
    businessName = line.split("—")[0]?.trim() || line;
  }
  if (!businessName) businessName = "Your business";

  const category =
    typeLabel ||
    (profile?.whatYouDo ? firstLine(profile.whatYouDo).split("—")[1]?.trim() : "") ||
    "Your industry";

  let description =
    (q?.primaryOffer?.trim() && q.primaryOffer.trim()) ||
    profile?.customerAsks?.trim() ||
    firstLine(profile?.description ?? "") ||
    profile?.whatYouDo?.replace(/^[^\n]+/, "").trim() ||
    "Add your business story in Edit profile to personalize this card.";

  if (description.length > 160) {
    description = `${description.slice(0, 157)}…`;
  }

  const location =
    user?.businessAddress?.trim() ||
    (user?.businessWebsite?.trim() ? `Web · ${user.businessWebsite.trim()}` : "") ||
    "Add location in profile";

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const monthlyLeadCount = leads.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return !Number.isNaN(t) && now - t <= 30 * day;
  }).length;

  const weeklyNew = leads.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return !Number.isNaN(t) && now - t <= 7 * day;
  }).length;

  const logoLetter = businessName.charAt(0).toUpperCase() || "F";

  return {
    businessName,
    category,
    description,
    location,
    monthlyLeadCount,
    weeklyNewCount: `+ ${weeklyNew} this week`,
    logoLetter,
    profilePhotoUri: user?.profilePhotoUri?.trim() ? user.profilePhotoUri.trim() : null,
  };
}

export async function loadBusinessSummaryInputs(): Promise<{
  profile: BusinessProfile | null;
  user: UserProfileDetails | null;
}> {
  const [profile, userRaw] = await Promise.all([
    appStorage.getBusinessProfile(),
    appStorage.getUserProfileDetails(),
  ]);
  const user = userRaw;
  return { profile, user };
}
