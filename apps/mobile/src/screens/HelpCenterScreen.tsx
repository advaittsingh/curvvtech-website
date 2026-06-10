import React, { useState } from "react";
import {
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import type { HelpCenterScreenProps } from "../navigation/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Customer-facing support — update when you have production contacts. */
const SUPPORT_EMAIL = "support@curvvtech.in";
const SUPPORT_PHONE_DISPLAY = "+91 7405670180";
const SUPPORT_PHONE_TEL = "+917405670180";
const SUPPORT_HOURS = "Monday–Friday, 9:00 AM – 6:00 PM (IST)";
const SUPPORT_WEB = "https://followup.curvvtech.com/";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do follow-up reminders work?",
    a: "FollowUp tracks each lead’s follow-up time. Open Notifications from the home header to see who needs attention soon.",
  },
  {
    q: "How do I add a lead from another app?",
    a: "Use your device’s Share menu on text (e.g. from WhatsApp), choose Follow-up, and confirm in Add chat.",
  },
  {
    q: "What is Ask AI?",
    a: "Ask AI helps draft replies and next steps from your context. It’s a guide—always review before sending to customers.",
  },
  {
    q: "How do I verify my account?",
    a: "Open Edit profile, choose User details, then upload your government ID. After approval, your profile shows a purple verification badge.",
  },
  {
    q: "Where are my data stored?",
    a: "This build stores preferences and profile data on your device. When we connect a backend, you’ll sign in and sync securely.",
  },
];

export default function HelpCenterScreen(_props: HelpCenterScreenProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(0);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => (o === i ? null : i));
  };

  const openMail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=FollowUp%20support`);
  };

  const openTel = () => {
    void Linking.openURL(`tel:${SUPPORT_PHONE_TEL}`);
  };

  const openWeb = () => {
    void Linking.openURL(SUPPORT_WEB);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <Text style={styles.blockTitle}>Contact support</Text>
      <View style={styles.contactCard}>
        <Pressable style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]} onPress={openMail}>
          <Ionicons name="mail-outline" size={22} color={colors.accent} style={styles.contactIcon} />
          <View style={styles.contactTextCol}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]} onPress={openTel}>
          <Ionicons name="call-outline" size={22} color={colors.accent} style={styles.contactIcon} />
          <View style={styles.contactTextCol}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{SUPPORT_PHONE_DISPLAY}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <View style={styles.contactRowStatic}>
          <Ionicons name="time-outline" size={22} color={colors.textMuted} style={styles.contactIcon} />
          <View style={styles.contactTextCol}>
            <Text style={styles.contactLabel}>Hours</Text>
            <Text style={styles.contactValueMuted}>{SUPPORT_HOURS}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <Pressable style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]} onPress={openWeb}>
          <Ionicons name="globe-outline" size={22} color={colors.accent} style={styles.contactIcon} />
          <View style={styles.contactTextCol}>
            <Text style={styles.contactLabel}>Help online</Text>
            <Text style={styles.contactValue}>{SUPPORT_WEB}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.blockTitle, styles.faqTitle]}>Common questions</Text>
      <Text style={styles.lead}>
        Quick answers below. For account-specific issues, use Give feedback from your profile.
      </Text>

      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <View key={i} style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              onPress={() => toggle(i)}
            >
              <Text style={styles.question}>{item.q}</Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
            {isOpen ? <Text style={styles.answer}>{item.a}</Text> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  blockTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  faqTitle: {
    marginTop: 28,
  },
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  contactRowStatic: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.85 },
  contactIcon: { marginRight: 12 },
  contactTextCol: { flex: 1 },
  contactLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "500",
  },
  contactValueMuted: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 48,
  },
  lead: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 22,
  },
  answer: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
});
