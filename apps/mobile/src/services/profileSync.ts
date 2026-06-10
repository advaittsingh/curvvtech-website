import {
  appStorage,
  defaultUserProfileDetails,
  type BusinessProfile,
  type UserProfileDetails,
} from "../storage/appStorage";
import { displayNameFromIdentifier } from "../utils/profileDisplay";
import { fetchServerBusiness, fetchServerProfile } from "./api";

/** Pull latest profile + business from the API into AsyncStorage (source of truth on server). */
export async function hydrateLocalUserCacheFromServer(): Promise<void> {
  const [userData, storedUser, storedBiz] = await Promise.all([
    appStorage.getUserData(),
    appStorage.getUserProfileDetails(),
    appStorage.getBusinessProfile(),
  ]);

  const base = defaultUserProfileDetails(storedUser ?? undefined);
  if (userData?.identifier?.includes("@") && !base.email.trim()) {
    base.email = userData.identifier.trim();
  }
  if (!base.displayName.trim() && userData?.identifier) {
    base.displayName = displayNameFromIdentifier(userData.identifier);
  }

  try {
    const [sProfile, sBiz] = await Promise.all([fetchServerProfile(), fetchServerBusiness()]);

    if (sProfile.display_name.trim()) base.displayName = sProfile.display_name;
    if (sProfile.phone.trim()) base.phone = sProfile.phone;
    if (sProfile.email.trim()) base.email = sProfile.email;
    if (sProfile.business_address.trim()) base.businessAddress = sProfile.business_address;
    if (sProfile.business_website.trim()) base.businessWebsite = sProfile.business_website;
    if (sProfile.id_verification_status) {
      base.idVerificationStatus = sProfile.id_verification_status as UserProfileDetails["idVerificationStatus"];
    }

    await appStorage.setUserProfileDetails(base);

    const bp: BusinessProfile = {
      whatYouDo: sBiz.what_you_do ?? "",
      customerAsks: sBiz.customer_asks ?? "",
      customerSource: sBiz.customer_source ?? "",
      description: sBiz.description ?? "",
      questionnaire: sBiz.questionnaire ?? storedBiz?.questionnaire,
    };
    await appStorage.setBusinessProfile(bp);
  } catch {
    /* offline / timeout — keep existing cache */
  }
}
