import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import type { AboutFollowUpScreenProps } from "../navigation/types";

const PROFILE_BG = "#0B0812";
const CARD_BG = "#15121B";
const BORDER_GLOW = "rgba(167, 139, 250, 0.45)";

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}[] = [
  {
    icon: "sparkles",
    title: "AI-Powered Follow-Ups",
    body: "Automate personalized follow-ups to leads based on their interactions and behaviors.",
  },
  {
    icon: "chatbubbles",
    title: "Lead Management",
    body: "Easily organize, track, and manage your leads for better sales efficiency.",
  },
  {
    icon: "stats-chart",
    title: "Business Insights",
    body: "Gain actionable insights to optimize your communication strategy and increase conversions.",
  },
];

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconWrap}>
        <LinearGradient
          colors={["rgba(124, 58, 237, 0.55)", "rgba(192, 38, 211, 0.35)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featureIconGradient}
        >
          <Ionicons name={icon} size={26} color={colors.accentSecondary} />
        </LinearGradient>
      </View>
      <View style={styles.featureTextCol}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function AboutFollowUpScreen(_props: AboutFollowUpScreenProps) {
  const insets = useSafeAreaInsets();
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: PROFILE_BG }]}
      contentContainerStyle={{
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroTop}>
        <View style={styles.appIconWrap}>
          <Image
            source={require("../../assets/App_icon.png")}
            style={styles.appIcon}
            resizeMode="contain"
            accessibilityLabel="FollowUp app icon"
          />
        </View>

        <Text style={styles.sectionHeading}>About FollowUp</Text>
        <Text style={styles.heroDescription}>
          FollowUp is a powerful AI-driven app designed to help businesses manage their leads and
          improve customer communications through intelligent, automated follow-up strategies.
        </Text>
      </View>

      <View style={styles.featuresBlock}>
        {FEATURES.map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
        ))}
      </View>

      <Text style={styles.whyHeading}>Why FollowUp?</Text>
      <Text style={styles.whyBody}>
        Built for busy owners who need clarity—not another complex CRM. FollowUp keeps leads,
        reminders, and AI help in one calm place so you can reply faster and close with confidence.
      </Text>

      <Text style={styles.versionLine}>Version {version}</Text>
      <Text style={styles.footerMuted}>© {new Date().getFullYear()} FollowUp. All rights reserved.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroTop: {
    alignItems: "center",
    marginBottom: 20,
  },
  appIconWrap: {
    marginBottom: 20,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  featuresBlock: {
    marginTop: 4,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_GLOW,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 14,
  },
  featureIconWrap: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  featureIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.35)",
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  featureBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  whyHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  whyBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  versionLine: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  footerMuted: {
    fontSize: 12,
    color: colors.textMuted,
    opacity: 0.85,
    textAlign: "center",
    lineHeight: 18,
  },
});
