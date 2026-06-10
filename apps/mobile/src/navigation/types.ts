import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Lead } from "../services/api";

export type MainTabParamList = {
  HomeTab: undefined;
  InboxTab: undefined;
  AskAITab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  InboxChat: {
    conversationId: string;
    title: string;
    subtitle?: string;
    peerAvatarUri?: string;
    peerInitials?: string;
  };
  LeadDetail: { lead: Lead };
  AddChat: { sharedText?: string } | undefined;
  Notifications: undefined;
  Settings: undefined;
  EditProfile: undefined;
  EditProfileUserDetails: undefined;
  EditProfileQuestionnaire: { pageIndex: 0 | 1 | 2 | 3 };
  HelpCenter: undefined;
  Feedback: undefined;
  AboutFollowUp: undefined;
  WhatsAppSettings: undefined;
  LeadsList: undefined;
  BusinessInsights: undefined;
  ManageSubscription: undefined;
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Loading: undefined;
  Onboarding: undefined;
  AuthChoice: undefined;
  Auth: { flow?: "signin" | "signup" } | undefined;
  Waitlist: { position: number };
  BusinessOnboarding: undefined;
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type SplashScreenProps = NativeStackScreenProps<RootStackParamList, "Splash">;
export type LoadingScreenProps = NativeStackScreenProps<RootStackParamList, "Loading">;
export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, "Onboarding">;
export type AuthChoiceScreenProps = NativeStackScreenProps<RootStackParamList, "AuthChoice">;
export type AuthScreenProps = NativeStackScreenProps<RootStackParamList, "Auth">;
export type WaitlistScreenProps = NativeStackScreenProps<RootStackParamList, "Waitlist">;
export type BusinessOnboardingScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "BusinessOnboarding"
>;

export type HomeTabProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "HomeTab">,
  NativeStackScreenProps<MainStackParamList>
>;
export type InboxTabProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "InboxTab">,
  NativeStackScreenProps<MainStackParamList>
>;
export type AskAITabProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "AskAITab">,
  NativeStackScreenProps<MainStackParamList>
>;
export type ProfileTabProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ProfileTab">,
  NativeStackScreenProps<MainStackParamList>
>;

export type NotificationsScreenProps = NativeStackScreenProps<MainStackParamList, "Notifications">;
export type SettingsScreenProps = NativeStackScreenProps<MainStackParamList, "Settings">;

export type InboxChatScreenProps = NativeStackScreenProps<MainStackParamList, "InboxChat">;
export type LeadDetailScreenProps = NativeStackScreenProps<MainStackParamList, "LeadDetail">;
export type AddChatScreenProps = NativeStackScreenProps<MainStackParamList, "AddChat">;
export type EditProfileHubScreenProps = NativeStackScreenProps<MainStackParamList, "EditProfile">;
export type EditProfileUserDetailsScreenProps = NativeStackScreenProps<
  MainStackParamList,
  "EditProfileUserDetails"
>;
export type EditProfileQuestionnaireSectionScreenProps = NativeStackScreenProps<
  MainStackParamList,
  "EditProfileQuestionnaire"
>;
export type HelpCenterScreenProps = NativeStackScreenProps<MainStackParamList, "HelpCenter">;
export type FeedbackScreenProps = NativeStackScreenProps<MainStackParamList, "Feedback">;
export type AboutFollowUpScreenProps = NativeStackScreenProps<MainStackParamList, "AboutFollowUp">;
export type WhatsAppSettingsScreenProps = NativeStackScreenProps<
  MainStackParamList,
  "WhatsAppSettings"
>;
export type LeadsListScreenProps = NativeStackScreenProps<MainStackParamList, "LeadsList">;
export type BusinessInsightsScreenProps = NativeStackScreenProps<
  MainStackParamList,
  "BusinessInsights"
>;
export type ManageSubscriptionScreenProps = NativeStackScreenProps<
  MainStackParamList,
  "ManageSubscription"
>;
export type PaymentMethodsScreenProps = NativeStackScreenProps<MainStackParamList, "PaymentMethods">;
export type AddPaymentMethodScreenProps = NativeStackScreenProps<
  MainStackParamList,
  "AddPaymentMethod"
>;
