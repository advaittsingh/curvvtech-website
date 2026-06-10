import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLeads } from "../context/LeadsContext";
import { isManualLead, type Lead } from "../services/api";
import {
  appStorage,
  defaultUserProfileDetails,
  type BusinessProfile,
} from "../storage/appStorage";
import { colors } from "../theme/colors";
import { useMontserratUiFonts } from "../theme/authUi";
import type { NotificationsScreenProps } from "../navigation/types";
import { buildBusinessInsight } from "../utils/businessInsight";
import { displayNameFromIdentifier } from "../utils/profileDisplay";
import { labelColor, statusToLabel } from "../utils/leadDisplay";
import { navigateToLeadDetail } from "../utils/leadNavigation";

/** Matches `HomeScreen` insight card gradient. */
const GRAD_INSIGHT = ["#5B21B6", "#7C3AED", "#A855F7"] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function greetingForHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatTimeShort(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function manualActive(l: Lead) {
  if (!isManualLead(l)) return false;
  const s = l.status.toLowerCase();
  return s !== "closed" && s !== "not_lead";
}

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const f = useMontserratUiFonts();
  const { leads, loading, error, refresh } = useLeads();
  const [displayName, setDisplayName] = useState("there");
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  const loadUser = useCallback(async () => {
    const [u, stored] = await Promise.all([
      appStorage.getUserData(),
      appStorage.getUserProfileDetails(),
    ]);
    const details = defaultUserProfileDetails(stored ?? undefined);
    const id = u?.identifier ?? "";
    const name =
      details.displayName.trim() ||
      (id ? displayNameFromIdentifier(id) : "there");
    setDisplayName(name);
    const bp = await appStorage.getBusinessProfile();
    setProfile(bp);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUser();
    }, [loadUser])
  );

  const now = Date.now();
  const sod = startOfDay(new Date());
  const eod = endOfDay(new Date());
  const fourHours = 4 * 3600 * 1000;

  const stats = useMemo(() => {
    const manual = leads.filter(isManualLead);
    let urgentCount = 0;
    let scheduledLaterToday = 0;
    for (const l of manual) {
      if (!l.follow_up_at) continue;
      const t = new Date(l.follow_up_at).getTime();
      if (Number.isNaN(t)) continue;
      if (t < now || t <= now + fourHours) {
        urgentCount += 1;
        continue;
      }
      if (t > now + fourHours && t >= sod && t <= eod) {
        scheduledLaterToday += 1;
      }
    }
    const activeTotal = manual.filter(manualActive).length;
    return { urgentCount, scheduledLaterToday, activeTotal };
  }, [leads, now, sod, eod, fourHours]);

  const urgentLeadsSorted = useMemo(() => {
    return [...leads]
      .filter(isManualLead)
      .filter((l) => {
        if (!l.follow_up_at) return false;
        const t = new Date(l.follow_up_at).getTime();
        if (Number.isNaN(t)) return false;
        return t < now || t <= now + fourHours;
      })
      .sort((a, b) => {
        const ta = new Date(a.follow_up_at!).getTime();
        const tb = new Date(b.follow_up_at!).getTime();
        return ta - tb;
      });
  }, [leads, now, fourHours]);

  const comingUpToday = useMemo(() => {
    return [...leads]
      .filter(isManualLead)
      .filter((l) => {
        if (!l.follow_up_at) return false;
        const t = new Date(l.follow_up_at).getTime();
        if (Number.isNaN(t)) return false;
        return t > now + fourHours && t >= sod && t <= eod;
      })
      .sort((a, b) => {
        const ta = new Date(a.follow_up_at!).getTime();
        const tb = new Date(b.follow_up_at!).getTime();
        return ta - tb;
      })
      .slice(0, 4);
  }, [leads, now, fourHours, sod, eod]);

  const insight = useMemo(() => buildBusinessInsight(leads, profile), [leads, profile]);

  const onTrack =
    stats.urgentCount === 0 && stats.scheduledLaterToday <= 3
      ? "You're on track"
      : stats.urgentCount === 0
        ? "Stay consistent today"
        : "Prioritize urgent follow-ups";

  const footerLine =
    stats.urgentCount === 0 && stats.scheduledLaterToday < 2
      ? "You're ahead. Let's keep it that way."
      : "Small daily actions compound into big wins.";

  const fontTitle = f.title ? { fontFamily: f.title } : null;
  const fontBody = f.body ? { fontFamily: f.body } : null;
  const fontCta = f.cta ? { fontFamily: f.cta } : null;

  return (
    <View style={styles.screen}>
      {error ? (
        <Pressable onPress={() => void refresh()}>
          <Text style={styles.banner}>{error} · Tap to retry</Text>
        </Pressable>
      ) : null}

      {loading && leads.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading && leads.length > 0}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
            />
          }
        >
          <Text style={[styles.greeting, fontTitle]}>
            {greetingForHour(new Date().getHours())}, {displayName}
          </Text>
          <Text style={[styles.greetingSub, fontBody]}>Here's your follow-up status today</Text>

          {/* Today overview — same surface language as Home `leadsCard` */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="stats-chart" size={18} color={colors.accent} />
                <Text style={[styles.cardTitle, fontTitle]}>Today overview</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: colors.hot }]} />
              <Text style={[styles.statText, fontBody]}>
                <Text style={styles.statStrong}>{stats.urgentCount}</Text> urgent follow-ups
              </Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: colors.followUp }]} />
              <Text style={[styles.statText, fontBody]}>
                <Text style={styles.statStrong}>{stats.scheduledLaterToday}</Text> scheduled later today
              </Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: colors.cold }]} />
              <Text style={[styles.statText, fontBody]}>
                <Text style={styles.statStrong}>{stats.activeTotal}</Text> total active leads
              </Text>
            </View>
            <View style={styles.cardDivider} />
            <Text style={[styles.onTrack, fontCta]}>
              <Text style={{ color: colors.accentSecondary }}>✨ </Text>
              {onTrack}
            </Text>
          </View>

          {/* Urgent */}
          <View style={[styles.card, styles.cardSpaced]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accentSecondary} />
                <Text style={[styles.cardTitle, fontTitle]}>Urgent follow-ups</Text>
              </View>
            </View>
            {urgentLeadsSorted.length === 0 ? (
              <>
                <Text style={[styles.caughtUp, fontTitle]}>You're all caught up</Text>
                <Text style={[styles.caughtUpSub, fontBody]}>No urgent actions right now.</Text>
              </>
            ) : (
              <View style={styles.urgentList}>
                {urgentLeadsSorted.slice(0, 5).map((item) => {
                  const label = statusToLabel(item.status);
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.urgentRow, pressed && { opacity: 0.88 }]}
                      onPress={() => navigateToLeadDetail(navigation, item)}
                    >
                      <View style={styles.urgentRowTop}>
                        <Text style={[styles.urgentName, fontBody]} numberOfLines={1}>
                          {item.contact_name}
                        </Text>
                        <Text style={[styles.urgentBadge, { color: labelColor(label) }]}>{label}</Text>
                      </View>
                      <Text style={[styles.urgentWhen, fontBody]}>
                        {formatTimeShort(item.follow_up_at!)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.accentSecondary} />
              <Text style={[styles.tipText, fontBody]}>
                Tip: Follow up within 24h to close more deals while interest is high.
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.card, styles.gridHalf]}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                <Text style={[styles.cardTitleSm, fontTitle]}>Coming up today</Text>
              </View>
              {comingUpToday.length === 0 ? (
                <Text style={[styles.gridEmpty, fontBody]}>Nothing scheduled later today.</Text>
              ) : (
                comingUpToday.map((item) => {
                  const label = statusToLabel(item.status);
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.comingRow, pressed && { opacity: 0.88 }]}
                      onPress={() => navigateToLeadDetail(navigation, item)}
                    >
                      <Text style={[styles.comingLine, fontBody]} numberOfLines={3}>
                        {formatTimeShort(item.follow_up_at!)} — {item.contact_name}{" "}
                        <Text style={{ color: labelColor(label), fontWeight: "700" }}>({label})</Text>
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            <LinearGradient
              colors={[...GRAD_INSIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.insightMini, styles.gridHalf]}
            >
              <View style={styles.insightIconWrap}>
                <Ionicons name="sparkles" size={22} color="#E9D5FF" />
              </View>
              <Text style={[styles.insightMiniTitle, fontTitle]}>AI insight</Text>
              <Text style={[styles.insightMiniBody, fontBody]} numberOfLines={9}>
                {insight.body}
              </Text>
            </LinearGradient>
          </View>

          <Text style={[styles.footerMotivation, fontBody]}>{footerLine}</Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.88 }]}
              onPress={() => navigation.navigate("LeadsList")}
            >
              <Ionicons name="people-outline" size={18} color={colors.accentSecondary} />
              <Text style={[styles.actionPillText, fontCta]}>View all leads</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.88 }]}
              onPress={() => navigation.navigate("AddChat")}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.accentSecondary} />
              <Text style={[styles.actionPillText, fontCta]}>Add follow-up</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  banner: {
    color: colors.hot,
    paddingHorizontal: 20,
    paddingTop: 8,
    fontSize: 13,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  greetingSub: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSpaced: { marginTop: 4 },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  cardTitleSm: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statText: { fontSize: 15, color: colors.textMuted, flex: 1, lineHeight: 22 },
  statStrong: { color: colors.text, fontWeight: "700" },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  onTrack: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.followUp,
  },
  caughtUp: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  caughtUpSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 14,
    lineHeight: 20,
  },
  urgentList: { marginBottom: 4 },
  urgentRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urgentRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  urgentName: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 },
  urgentBadge: { fontSize: 12, fontWeight: "800" },
  urgentWhen: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 6 },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  gridRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  gridHalf: { flex: 1, marginBottom: 0, minHeight: 168 },
  gridEmpty: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  comingRow: { marginBottom: 10 },
  comingLine: { fontSize: 13, color: colors.text, lineHeight: 20 },
  insightMini: {
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  insightMiniTitle: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  insightMiniBody: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 20,
  },
  footerMotivation: {
    textAlign: "center",
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
    lineHeight: 21,
  },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentSecondary,
    textAlign: "center",
  },
});
