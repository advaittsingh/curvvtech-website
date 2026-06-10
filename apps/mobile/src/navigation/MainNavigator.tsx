import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TenantProvider } from "../context/TenantContext";
import { LeadsProvider } from "../context/LeadsContext";
import { queryClient } from "../lib/queryClient";
import { colors } from "../theme/colors";
import { inbox } from "../theme/inbox";
import type { MainStackParamList, MainTabParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import AskAIScreen from "../screens/AskAIScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LeadDetailScreen from "../screens/LeadDetailScreen";
import AddChatScreen from "../screens/AddChatScreen";
import EditProfileHubScreen from "../screens/EditProfileHubScreen";
import EditProfileUserDetailsScreen from "../screens/EditProfileUserDetailsScreen";
import EditProfileQuestionnaireSectionScreen from "../screens/EditProfileQuestionnaireSectionScreen";
import { QUESTIONNAIRE_HEADINGS } from "../business/questionnaireShared";
import HelpCenterScreen from "../screens/HelpCenterScreen";
import FeedbackScreen from "../screens/FeedbackScreen";
import AboutFollowUpScreen from "../screens/AboutFollowUpScreen";
import WhatsAppSettingsScreen from "../screens/WhatsAppSettingsScreen";
import InboxChatScreen from "../screens/InboxChatScreen";
import InboxListScreen from "../screens/InboxListScreen";
import LeadsListScreen from "../screens/LeadsListScreen";
import BusinessInsightsScreen from "../screens/BusinessInsightsScreen";
import ManageSubscriptionScreen from "../screens/ManageSubscriptionScreen";
import PaymentMethodsScreen from "../screens/PaymentMethodsScreen";
import AddPaymentMethodScreen from "../screens/AddPaymentMethodScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

const BELL_PLACEHOLDER_W = 44;

const stackModalHeader = {
  headerShown: true as const,
  headerTitleAlign: "center" as const,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { color: colors.textPrimary, fontWeight: "700" as const },
  contentStyle: { backgroundColor: colors.bg },
};

const TAB_ICON_HOME = require("../../icons/tab-home.png") as ImageSourcePropType;
const TAB_ICON_INBOX = require("../../icons/tab-inbox.png") as ImageSourcePropType;
const TAB_ICON_ASK_AI = require("../../icons/tab-ask-ai.png") as ImageSourcePropType;
const TAB_ICON_PROFILE = require("../../icons/tab-profile.png") as ImageSourcePropType;
const HEADER_BELL_ICON = require("../../icons/tab-notifications.png") as ImageSourcePropType;

const TAB_ICON_SIZE = 26;

/** RN bottom tabs default to `MissingIcon` (broken glyph) when `tabBarIcon` is omitted. */
function TabBarPngIcon({ source, focused }: { source: ImageSourcePropType; focused: boolean }) {
  return (
    <Image
      source={source}
      style={[tabIconStyles.image, !focused && tabIconStyles.imageMuted]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.bg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerTitle: () => (
          <Text style={headerStyles.brandTitle} numberOfLines={1}>
            Follow Up
          </Text>
        ),
        headerTitleAlign: "center",
        headerTintColor: colors.textPrimary,
        headerRight: () => (
          <Pressable
            onPress={() => navigation.getParent()?.navigate("Notifications")}
            style={({ pressed }) => [headerStyles.bellHit, pressed && { opacity: 0.65 }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Image
              source={HEADER_BELL_ICON}
              style={headerStyles.bellImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        ),
        headerLeft: () => <View style={{ width: BELL_PLACEHOLDER_W }} />,
        tabBarStyle: {
          backgroundColor: inbox.glassTab,
          borderTopWidth: 0,
          marginHorizontal: 12,
          marginBottom: 10,
          borderRadius: 22,
          height: 62,
          paddingTop: 6,
          paddingBottom: 6,
          shadowColor: inbox.purple,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 14,
        },
        tabBarActiveTintColor: inbox.purple,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabBarPngIcon source={TAB_ICON_HOME} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxListScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Inbox",
          tabBarIcon: ({ focused }) => <TabBarPngIcon source={TAB_ICON_INBOX} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AskAITab"
        component={AskAIScreen}
        options={{
          tabBarLabel: "Ask AI",
          tabBarIcon: ({ focused }) => <TabBarPngIcon source={TAB_ICON_ASK_AI} focused={focused} />,
          headerTitle: () => (
            <Text style={headerStyles.brandTitle} numberOfLines={1}>
              Ask AI
            </Text>
          ),
          headerLeft: () => <View style={{ width: BELL_PLACEHOLDER_W }} />,
          /** Replaced by AskAIScreen with trash once mounted (avoids bell from tab defaults). */
          headerRight: () => <View style={{ width: BELL_PLACEHOLDER_W }} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => <TabBarPngIcon source={TAB_ICON_PROFILE} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="InboxChat"
        component={InboxChatScreen}
        options={{ ...stackModalHeader, title: "Chat" }}
      />
      <Stack.Screen name="LeadDetail" component={LeadDetailScreen} />
      <Stack.Screen name="AddChat" component={AddChatScreen} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ ...stackModalHeader, title: "Notifications" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ ...stackModalHeader, title: "Settings" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileHubScreen}
        options={{ ...stackModalHeader, title: "Edit profile" }}
      />
      <Stack.Screen
        name="EditProfileUserDetails"
        component={EditProfileUserDetailsScreen}
        options={{ ...stackModalHeader, title: "User details" }}
      />
      <Stack.Screen
        name="EditProfileQuestionnaire"
        component={EditProfileQuestionnaireSectionScreen}
        options={({ route }) => ({
          ...stackModalHeader,
          title: QUESTIONNAIRE_HEADINGS[route.params.pageIndex],
        })}
      />
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{ ...stackModalHeader, title: "Help Center" }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ ...stackModalHeader, title: "Give feedback" }}
      />
      <Stack.Screen
        name="AboutFollowUp"
        component={AboutFollowUpScreen}
        options={{ ...stackModalHeader, title: "About FollowUp" }}
      />
      <Stack.Screen
        name="WhatsAppSettings"
        component={WhatsAppSettingsScreen}
        options={{ ...stackModalHeader, title: "WhatsApp Business" }}
      />
      <Stack.Screen
        name="LeadsList"
        component={LeadsListScreen}
        options={{ ...stackModalHeader, title: "All leads" }}
      />
      <Stack.Screen
        name="BusinessInsights"
        component={BusinessInsightsScreen}
        options={{ ...stackModalHeader, title: "Business insights" }}
      />
      <Stack.Screen
        name="ManageSubscription"
        component={ManageSubscriptionScreen}
        options={{ ...stackModalHeader, title: "Manage subscription" }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ ...stackModalHeader, title: "Payment methods" }}
      />
      <Stack.Screen
        name="AddPaymentMethod"
        component={AddPaymentMethodScreen}
        options={{ ...stackModalHeader, title: "Add payment method" }}
      />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <LeadsProvider>
          <MainStack />
        </LeadsProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

const tabIconStyles = StyleSheet.create({
  image: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
  imageMuted: {
    opacity: 0.5,
  },
});

const headerStyles = StyleSheet.create({
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  bellHit: {
    width: BELL_PLACEHOLDER_W,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  bellImage: {
    width: 28,
    height: 28,
  },
});
