import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useFocusEffect, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLeads } from "../context/LeadsContext";
import { useTenant } from "../context/TenantContext";
import { fetchWhatsappSettings } from "../services/api";
import { appStorage } from "../storage/appStorage";
import { colors } from "../theme/colors";
import type { HomeTabProps, MainStackParamList } from "../navigation/types";
import type { BusinessProfile } from "../storage/appStorage";
import { buildBusinessInsight } from "../utils/businessInsight";
import {
  buildBusinessSummaryModel,
  loadBusinessSummaryInputs,
  type BusinessSummaryModel,
} from "../utils/homeBusinessSummary";
import { homeLeadRowMeta } from "../utils/homeLeadStatus";
import { countFollowUpsToday } from "../utils/leadDisplay";
import { formatRelativeTime } from "../utils/relativeTime";
import { navigateToLeadDetail } from "../utils/leadNavigation";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function leadInitials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]!.charAt(0) + p[1]!.charAt(0)).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

const GRAD_BUSINESS = ["#4C1D95", "#7C3AED", "#C026D3"] as const;
const GRAD_INSIGHT = ["#5B21B6", "#7C3AED", "#A855F7"] as const;

export default function HomeScreen({ navigation }: HomeTabProps) {
  const insets = useSafeAreaInsets();
  const { activeTenantId, tenantResolutionReady } = useTenant();
  const { leads, loading, error, refresh } = useLeads();
  const { data: waSettings } = useQuery({
    queryKey: ["whatsapp-settings", activeTenantId],
    queryFn: () => fetchWhatsappSettings(activeTenantId),
    enabled: !!activeTenantId && tenantResolutionReady,
    staleTime: 120_000,
  });
  const [summary, setSummary] = useState<BusinessSummaryModel>(() =>
    buildBusinessSummaryModel(null, null, [])
  );
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  const topLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return tb - ta;
      })
      .slice(0, 5);
  }, [leads]);

  const insight = useMemo(() => buildBusinessInsight(leads, profile), [leads, profile]);

  const reloadSummary = useCallback(async () => {
    const { profile: p, user } = await loadBusinessSummaryInputs();
    setProfile(p);
    setSummary(buildBusinessSummaryModel(p, user, leads));
  }, [leads]);

  useEffect(() => {
    setTodayCount(countFollowUpsToday(leads));
  }, [leads]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [leads.length, topLeads.length]);

  useEffect(() => {
    void reloadSummary();
  }, [reloadSummary]);

  useFocusEffect(
    useCallback(() => {
      void reloadSummary();
    }, [reloadSummary])
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const p = await appStorage.getPendingSharedText();
        if (p && alive) {
          await appStorage.setPendingSharedText(null);
          navigation.getParent()?.navigate("AddChat", { sharedText: p });
        }
      })();
      return () => {
        alive = false;
      };
    }, [navigation])
  );

  const stackNav = navigation.getParent();
  const onRefresh = useCallback(async () => {
    await refresh();
    await reloadSummary();
  }, [refresh, reloadSummary]);

  const showWaConnect =
    tenantResolutionReady &&
    !!activeTenantId &&
    waSettings &&
    !waSettings.whatsapp_phone_number_id?.trim();

  return (
    <View style={styles.screen}>
      {error ? <Text style={styles.banner}>{error}</Text> : null}
      {showWaConnect ? (
        <Pressable
          onPress={() => stackNav?.navigate("WhatsAppSettings")}
          style={({ pressed }) => [styles.waBanner, pressed && { opacity: 0.92 }]}
        >
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          <View style={styles.waBannerTextCol}>
            <Text style={styles.waBannerTitle}>Connect WhatsApp</Text>
            <Text style={styles.waBannerSub}>
              Add your Meta Phone number ID so inbound messages and inbox work.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
      {todayCount > 0 ? (
        <View style={styles.alertStrip}>
          <Ionicons name="alarm-outline" size={18} color={colors.followUp} />
          <Text style={styles.alertStripText}>
            {todayCount} follow-up{todayCount === 1 ? "" : "s"} due today
          </Text>
        </View>
      ) : null}

      {loading && leads.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading && leads.length > 0}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          <Text style={styles.sectionHeading}>Business Summary</Text>
          <LinearGradient colors={[...GRAD_BUSINESS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bizCard}>
            <View style={styles.bizTopRow}>
              <View style={styles.bizLogo}>
                {summary.profilePhotoUri ? (
                  <Image
                    source={{ uri: summary.profilePhotoUri }}
                    style={styles.bizLogoImage}
                    accessibilityLabel="Business profile photo"
                  />
                ) : (
                  <Text style={styles.bizLogoLetter}>{summary.logoLetter}</Text>
                )}
              </View>
              <View style={styles.bizTitleCol}>
                <Text style={styles.bizName} numberOfLines={2}>
                  {summary.businessName}
                </Text>
                <Text style={styles.bizCategory} numberOfLines={1}>
                  {summary.category}
                </Text>
              </View>
              <View style={styles.bizActions}>
                <Pressable
                  style={({ pressed }) => [styles.bizMiniBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => stackNav?.navigate("Notifications")}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
                  <Text style={styles.bizMiniBtnText}>Follow Up</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.bizMiniBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => stackNav?.navigate("LeadsList")}
                >
                  <Ionicons name="people-outline" size={16} color={colors.text} />
                  <Text style={styles.bizMiniBtnText}>Leads</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>
            </View>
            <Text style={styles.bizDescription}>{summary.description}</Text>
            <View style={styles.bizFooter}>
              <View style={styles.bizLocRow}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.bizLocText} numberOfLines={1}>
                  {summary.location}
                </Text>
              </View>
              <View style={styles.bizStat}>
                <Text style={styles.bizStatLabel}>Monthly leads</Text>
                <View style={styles.bizStatRow}>
                  <Text style={styles.bizStatNum}>{summary.monthlyLeadCount}</Text>
                  <Ionicons name="trending-up" size={16} color="#4ADE80" />
                  <Text style={styles.bizStatDelta}>{summary.weeklyNewCount}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeadingFlat}>Leads</Text>
            <Pressable
              style={({ pressed }) => [styles.viewAllPill, pressed && { opacity: 0.88 }]}
              onPress={() => stackNav?.navigate("LeadsList")}
            >
              <Text style={styles.viewAllPillText}>View all leads</Text>
            </Pressable>
          </View>

          <View style={styles.leadsCard}>
            {topLeads.length === 0 ? (
              <Text style={styles.leadsEmpty}>
                No leads yet. WhatsApp chats with auto-lead appear here, or tap + Add chat to add one manually.
              </Text>
            ) : (
              topLeads.map((item, index) => {
                const meta = homeLeadRowMeta(item);
                const isLast = index === topLeads.length - 1;
                return (
                  <Pressable
                    key={item.source === "whatsapp" ? `wa-${item.id}` : `m-${item.id}`}
                    onPress={() => {
                      if (!stackNav) return;
                      navigateToLeadDetail(
                        stackNav as NavigationProp<MainStackParamList>,
                        item
                      );
                    }}
                    style={({ pressed }) => [
                      styles.leadRow,
                      !isLast && styles.leadRowBorder,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={styles.leadAvatar}>
                      <Text style={styles.leadAvatarText}>{leadInitials(item.contact_name)}</Text>
                    </View>
                    <View style={styles.leadMid}>
                      <Text style={styles.leadName} numberOfLines={1}>
                        {item.contact_name}
                      </Text>
                      <View style={styles.leadStatusRow}>
                        <View style={[styles.leadDot, { backgroundColor: meta.dotColor }]} />
                        <Text style={styles.leadStatus}>{meta.label}</Text>
                      </View>
                    </View>
                    <View style={styles.leadRight}>
                      <Text style={styles.leadTime}>{formatRelativeTime(item.created_at)}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          <Text style={[styles.sectionHeadingFlat, styles.insightsHeading]}>Business Insights</Text>
          <LinearGradient colors={[...GRAD_INSIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.insightCard}>
            <View style={styles.insightIconWrap}>
              <Ionicons name="bulb" size={28} color="#E9D5FF" />
            </View>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightBody}>{insight.body}</Text>
            <Pressable
              style={({ pressed }) => [styles.viewAllInsightBtn, pressed && { opacity: 0.9 }]}
              onPress={() => stackNav?.navigate("BusinessInsights")}
            >
              <Text style={styles.viewAllInsightBtnText}>View all</Text>
            </Pressable>
          </LinearGradient>
        </ScrollView>
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => stackNav?.navigate("AddChat", {})}
      >
        <Text style={styles.fabText}>+ Add chat</Text>
      </Pressable>
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
  waBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waBannerTextCol: { flex: 1, minWidth: 0 },
  waBannerTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  waBannerSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  alertStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  alertStripText: {
    color: colors.followUp,
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  sectionHeadingFlat: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 14,
  },
  insightsHeading: {
    marginTop: 28,
    marginBottom: 14,
  },
  viewAllPill: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
  },
  viewAllPillText: {
    color: colors.accentSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
  bizCard: {
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
  },
  bizTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  bizLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  bizLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  bizLogoLetter: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  bizTitleCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  bizName: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  bizCategory: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
  },
  bizActions: {
    gap: 8,
  },
  bizMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bizMiniBtnText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  bizDescription: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  bizFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  bizLocRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  bizLocText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    flex: 1,
  },
  bizStat: { alignItems: "flex-end" },
  bizStatLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bizStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bizStatNum: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  bizStatDelta: {
    color: "#4ADE80",
    fontSize: 13,
    fontWeight: "600",
  },
  leadsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  leadsEmpty: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    padding: 20,
    textAlign: "center",
  },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leadRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124, 58, 237, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  leadAvatarText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  leadMid: { flex: 1, minWidth: 0 },
  leadName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  leadStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  leadStatus: {
    color: colors.textMuted,
    fontSize: 13,
  },
  leadRight: {
    alignItems: "flex-end",
    gap: 4,
    marginLeft: 8,
  },
  leadTime: {
    color: colors.textMuted,
    fontSize: 12,
  },
  insightCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
  },
  insightIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  insightTitle: {
    color: colors.onPrimary,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 10,
  },
  insightBody: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  viewAllInsightBtn: {
    alignSelf: "flex-end",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  viewAllInsightBtnText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
});
