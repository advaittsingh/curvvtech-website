import AsyncStorage from "@react-native-async-storage/async-storage";

const K = {
  onboardingSlides: "@fu/onboarding_slides_done",
  signedIn: "@fu/is_signed_in",
  userData: "@fu/user_data",
  userProfileDetails: "@fu/user_profile_details",
  businessDone: "@fu/business_onboarding_done",
  businessProfile: "@fu/business_profile",
  mockSignupIndex: "@fu/mock_signup_index",
  notifications: "@fu/notifications_enabled",
  pendingShare: "@fu/pending_shared_text",
} as const;

export type UserData = {
  identifier: string;
  accessAllowed: boolean;
  waitlistPosition?: number;
};

/** Govt ID: none → not uploaded; pending → uploaded, awaiting review; verified → approved. */
export type IdVerificationStatus = "none" | "pending" | "verified";

export type UserProfileDetails = {
  displayName: string;
  phone: string;
  email: string;
  businessAddress: string;
  businessWebsite: string;
  profilePhotoUri: string | null;
  idDocumentUri: string | null;
  idVerificationStatus: IdVerificationStatus;
};

export function defaultUserProfileDetails(partial?: Partial<UserProfileDetails>): UserProfileDetails {
  return {
    displayName: partial?.displayName ?? "",
    phone: partial?.phone ?? "",
    email: partial?.email ?? "",
    businessAddress: partial?.businessAddress ?? "",
    businessWebsite: partial?.businessWebsite ?? "",
    profilePhotoUri: partial?.profilePhotoUri ?? null,
    idDocumentUri: partial?.idDocumentUri ?? null,
    idVerificationStatus: partial?.idVerificationStatus ?? "none",
  };
}

/** Full business onboarding questionnaire (stored alongside legacy summary fields). */
export type BusinessQuestionnaire = {
  businessType: string | null;
  primaryOffer: string;
  customerSources: string[];
  customersAskFirst: string;
  conversationLength: string | null;
  afterConversation: string | null;
  leadTracking: string[];
  biggestChallenge: string | null;
  followUpFrequency: string | null;
  priorities: string[];
  dailyCustomerVolume: string | null;
  successVision: string;
};

export type BusinessProfile = {
  whatYouDo: string;
  customerAsks: string;
  customerSource: string;
  description: string;
  questionnaire?: BusinessQuestionnaire;
};

async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const appStorage = {
  async getOnboardingSlidesDone(): Promise<boolean> {
    return (await AsyncStorage.getItem(K.onboardingSlides)) === "1";
  },
  async setOnboardingSlidesDone() {
    await AsyncStorage.setItem(K.onboardingSlides, "1");
  },

  async getSignedIn(): Promise<boolean> {
    return (await AsyncStorage.getItem(K.signedIn)) === "1";
  },
  async setSignedIn(v: boolean) {
    await AsyncStorage.setItem(K.signedIn, v ? "1" : "0");
  },

  async getUserData(): Promise<UserData | null> {
    return getJson<UserData>(K.userData);
  },
  async setUserData(data: UserData) {
    await setJson(K.userData, data);
  },

  async getUserProfileDetails(): Promise<UserProfileDetails | null> {
    return getJson<UserProfileDetails>(K.userProfileDetails);
  },
  async setUserProfileDetails(data: UserProfileDetails) {
    await setJson(K.userProfileDetails, data);
  },

  async getBusinessDone(): Promise<boolean> {
    return (await AsyncStorage.getItem(K.businessDone)) === "1";
  },
  async setBusinessDone() {
    await AsyncStorage.setItem(K.businessDone, "1");
  },

  async getBusinessProfile(): Promise<BusinessProfile | null> {
    return getJson<BusinessProfile>(K.businessProfile);
  },
  async setBusinessProfile(p: BusinessProfile) {
    await setJson(K.businessProfile, p);
  },

  /** Increments once per new signup; first 100 allowed (MVP mock). */
  async nextSignupIndex(): Promise<number> {
    const raw = await AsyncStorage.getItem(K.mockSignupIndex);
    const n = (raw ? parseInt(raw, 10) : 0) || 0;
    const next = n + 1;
    await AsyncStorage.setItem(K.mockSignupIndex, String(next));
    return next;
  },

  async getNotificationsEnabled(): Promise<boolean> {
    const v = await AsyncStorage.getItem(K.notifications);
    if (v === null) return true;
    return v === "1";
  },
  async setNotificationsEnabled(on: boolean) {
    await AsyncStorage.setItem(K.notifications, on ? "1" : "0");
  },

  async getPendingSharedText(): Promise<string | null> {
    return AsyncStorage.getItem(K.pendingShare);
  },
  async setPendingSharedText(text: string | null) {
    if (text == null) await AsyncStorage.removeItem(K.pendingShare);
    else await AsyncStorage.setItem(K.pendingShare, text);
  },

  /** Log out: clear signed-in flag only; keeps user/business data for same-device sign-in. */
  async clearSession() {
    await AsyncStorage.setItem(K.signedIn, "0");
  },

  async clearAllForFreshDemo() {
    await AsyncStorage.multiRemove([
      ...Object.values(K),
      "ai_chat_history",
      "@fu/ai_chat_messages",
      "@fu/payment_methods",
    ]);
  },
};
