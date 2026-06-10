import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EXTRA_BUSINESS_INSIGHTS,
  ILLUSTRATIVE_AVG_RESPONSE_HOURS,
  STRENGTHEN_FOLLOW_UP_TIPS,
} from "../data/businessInsightsContent";
import { useLeads } from "../context/LeadsContext";
import { appStorage, type BusinessProfile } from "../storage/appStorage";
import { colors } from "../theme/colors";
import type { BusinessInsightsScreenProps } from "../navigation/types";
import { buildBusinessInsight } from "../utils/businessInsight";

const GRAD_HERO = ["#4C1D95", "#7C3AED", "#DB2777"] as const;
const GRAD_CARD = ["#5B21B6", "#7C3AED", "#C026D3"] as const;
const GRAD_STATUS = ["#6D28D9", "#9333EA", "#E11D48"] as const;

export default function BusinessInsightsScreen({ navigation }: BusinessInsightsScreenProps) {
  const insets = useSafeAreaInsets();
  const { leads } = useLeads();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const p = await appStorage.getBusinessProfile();
      if (alive) setProfile(p);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const hero = useMemo(() => buildBusinessInsight(leads, profile), [leads, profile]);

  const goAskAi = () => {
    navigation.navigate("Tabs", { screen: "AskAITab" });
  };

  const goLeads = () => {
    navigation.navigate("LeadsList");
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 28 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={[...GRAD_HERO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="bulb" size={30} color="#F5D0FE" />
        </View>
        <Text style={styles.heroHeadline}>{hero.title}</Text>
        <Text style={styles.heroBody}>
          {hero.body}{" "}
          <Text style={styles.heroBodyMuted}>
            Quick replies matter: illustrative average response time on similar businesses is about{" "}
            <Text style={styles.heroBold}>{ILLUSTRATIVE_AVG_RESPONSE_HOURS} hours</Text>. Responding within
            the first hour often improves your chances of success.
          </Text>
        </Text>
        <Pressable
          style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.88 }]}
          onPress={goAskAi}
        >
          <Text style={styles.outlineBtnText}>Improve response speed</Text>
        </Pressable>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Strengthen follow-up messages</Text>
      {STRENGTHEN_FOLLOW_UP_TIPS.map((tip, i) => (
        <Pressable
          key={i}
          style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.92 }]}
          onPress={() => Alert.alert(tip.title, tip.body)}
        >
          <LinearGradient colors={[...GRAD_CARD]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.tipGrad}>
            <View style={styles.tipInner}>
              <View style={styles.tipIconCircle}>
                <Ionicons name={tip.icon} size={22} color="#E9D5FF" />
              </View>
              <View style={styles.tipTextCol}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipPreview} numberOfLines={2}>
                  {tip.body}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.65)" />
            </View>
          </LinearGradient>
        </Pressable>
      ))}

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Keep track of lead statuses</Text>
      <LinearGradient colors={[...GRAD_STATUS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statusCard}>
        <View style={styles.statusIconWrap}>
          <Ionicons name="flag" size={26} color="#FBCFE8" />
        </View>
        <Text style={styles.statusBody}>
          Organize leads into categories like <Text style={styles.statusBold}>New</Text>,{" "}
          <Text style={styles.statusBold}>Follow-up needed</Text>,{" "}
          <Text style={styles.statusBold}>Pending response</Text>, and others. This helps you prioritize and
          manage follow-ups efficiently.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.solidCta, pressed && { opacity: 0.92 }]}
          onPress={goLeads}
        >
          <Text style={styles.solidCtaText}>Organize leads</Text>
        </Pressable>
      </LinearGradient>

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>More insights</Text>
      <Text style={styles.sectionSub}>
        Ideas to refine how you work leads—tap a card for the full note.
      </Text>
      {EXTRA_BUSINESS_INSIGHTS.map((item, i) => (
        <Pressable
          key={i}
          style={({ pressed }) => [styles.extraWrap, pressed && { opacity: 0.92 }]}
          onPress={() => Alert.alert(item.title, item.body)}
        >
          <LinearGradient colors={[...GRAD_CARD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.extraCard}>
            <Text style={styles.extraTitle}>{item.title}</Text>
            <Text style={styles.extraBody} numberOfLines={3}>
              {item.body}
            </Text>
            <View style={styles.extraChevronRow}>
              <Text style={styles.extraTap}>Tap to read</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </View>
          </LinearGradient>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  heroCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroHeadline: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginBottom: 12,
  },
  heroBody: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  heroBodyMuted: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 22,
  },
  heroBold: {
    fontWeight: "800",
    color: colors.onPrimary,
  },
  outlineBtn: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  outlineBtnText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionSpaced: { marginTop: 8 },
  sectionSub: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 20,
    marginBottom: 14,
    lineHeight: 20,
  },
  tipRow: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  tipGrad: { borderRadius: 16 },
  tipInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tipIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipTextCol: { flex: 1, minWidth: 0 },
  tipTitle: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipPreview: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 18,
  },
  statusCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  statusBody: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  statusBold: {
    fontWeight: "800",
    color: colors.onPrimary,
  },
  solidCta: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.28)",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  solidCtaText: {
    color: colors.onPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
  extraWrap: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  extraCard: {
    padding: 16,
    borderRadius: 16,
  },
  extraTitle: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  extraBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  extraChevronRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  extraTap: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },
});
