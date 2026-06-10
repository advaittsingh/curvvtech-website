import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLeads } from "../context/LeadsContext";
import { useTenant } from "../context/TenantContext";
import {
  formatUserFacingApiError,
  isManualLead,
  isWhatsAppLead,
  postManualLeadFollowUpDraft,
  postManualLeadGenerateInsights,
  postWaLeadFollowUpDraft,
  postWaLeadGenerateInsights,
  type Lead,
  type LeadInsightsResponse,
  updateLead,
} from "../services/api";
import { sendInboxTextMessage } from "../services/inboxApi";
import { colors } from "../theme/colors";
import type { LeadDetailScreenProps } from "../navigation/types";
import { labelColor, statusToLabel } from "../utils/leadDisplay";

const OPTIONS = [
  { label: "HOT" as const, value: "hot" },
  { label: "WARM" as const, value: "follow-up" },
  { label: "COLD" as const, value: "closed" },
];

const LABEL = "#6B7280";
const PAYWALL_RED = "#F87171";
const CARD = colors.card;
const RADIUS = 16;
const H_PAD = 20;

function isProPaywallCopy(text: string): boolean {
  return (
    /Business insights require a Pro or Pro\+ plan/i.test(text) ||
    (/Pro or Pro\+/i.test(text) && /plan/i.test(text))
  );
}

export default function LeadDetailScreen({ navigation, route }: LeadDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { refresh } = useLeads();
  const { activeTenantId, tenantResolutionReady } = useTenant();
  const { lead: initial } = route.params;
  const [lead, setLead] = useState<Lead>(initial);

  const [saving, setSaving] = useState(false);
  const [draftDate, setDraftDate] = useState(
    () =>
      new Date(
        isManualLead(initial) && initial.follow_up_at ? new Date(initial.follow_up_at) : Date.now()
      )
  );
  const [iosOpen, setIosOpen] = useState(false);
  const [androidPhase, setAndroidPhase] = useState<"idle" | "date" | "time">("idle");

  const [insights, setInsights] = useState<LeadInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isWhatsAppLead(lead) && !tenantResolutionReady) {
      setInsightsLoading(true);
      setInsightsError(null);
      return;
    }
    let cancelled = false;
    setInsightsLoading(true);
    setInsightsError(null);
    (async () => {
      try {
        if (isWhatsAppLead(lead)) {
          if (!activeTenantId) {
            if (!cancelled) {
              setInsights(null);
              setInsightsError("Select a workspace to load AI insights.");
            }
            return;
          }
          const data = await postWaLeadGenerateInsights(activeTenantId, lead.id);
          if (!cancelled) setInsights(data);
        } else {
          const data = await postManualLeadGenerateInsights(lead.id);
          if (!cancelled) setInsights(data);
        }
      } catch (e) {
        if (!cancelled) {
          setInsightsError(formatUserFacingApiError(e));
        }
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lead, activeTenantId, tenantResolutionReady]);

  const applyFollowUp = async (d: Date) => {
    if (!isManualLead(lead)) return;
    setSaving(true);
    try {
      const updated = await updateLead(lead.id, { follow_up_at: d.toISOString() });
      setLead(updated);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!isManualLead(lead)) return;
    setSaving(true);
    try {
      const updated = await updateLead(lead.id, { status });
      setLead(updated);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const clearReminder = async () => {
    if (!isManualLead(lead)) return;
    setSaving(true);
    try {
      const updated = await updateLead(lead.id, { follow_up_at: null });
      setLead(updated);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const onIosChange = (event: DateTimePickerEvent, date?: Date) => {
    setIosOpen(false);
    if (event.type === "set" && date) void applyFollowUp(date);
  };

  const onAndroidDate = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== "set" || !date) {
      setAndroidPhase("idle");
      return;
    }
    setDraftDate(date);
    setAndroidPhase("time");
  };

  const onAndroidTime = (event: DateTimePickerEvent, date?: Date) => {
    setAndroidPhase("idle");
    if (event.type !== "set" || !date) return;
    const next = new Date(draftDate);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    void applyFollowUp(next);
  };

  const openPicker = () => {
    if (!isManualLead(lead)) return;
    setDraftDate(lead.follow_up_at ? new Date(lead.follow_up_at) : new Date());
    if (Platform.OS === "ios") setIosOpen(true);
    else setAndroidPhase("date");
  };

  const onGenerateFollowUp = useCallback(async () => {
    setGeneratingDraft(true);
    try {
      if (isWhatsAppLead(lead)) {
        if (!activeTenantId) return;
        const { text } = await postWaLeadFollowUpDraft(activeTenantId, lead.id);
        setFollowUpDraft(text);
      } else {
        const { text } = await postManualLeadFollowUpDraft(lead.id);
        setFollowUpDraft(text);
      }
    } catch (e) {
      setFollowUpDraft(e instanceof Error ? e.message : "Could not generate draft");
    } finally {
      setGeneratingDraft(false);
    }
  }, [lead, activeTenantId]);

  const onSendInWhatsApp = async () => {
    const t = followUpDraft.trim();
    if (!t || !isWhatsAppLead(lead) || !activeTenantId) return;
    setSending(true);
    try {
      await sendInboxTextMessage(activeTenantId, lead.conversation_id, t);
      await refresh();
      navigation.navigate("InboxChat", {
        conversationId: lead.conversation_id,
        title: lead.contact_name,
      });
    } finally {
      setSending(false);
    }
  };

  const onShareDraft = async () => {
    const t = followUpDraft.trim();
    if (!t) return;
    try {
      await Share.share({ message: t });
    } catch {
      /* user dismissed */
    }
  };

  const currentLabel = statusToLabel(lead.status);
  const summaryFallback = lead.summary ?? "";
  const businessBlock = (insights?.business_summary?.trim() || summaryFallback).trim();
  const paywallLocked =
    !insightsLoading && !insightsError && isProPaywallCopy(businessBlock);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: H_PAD,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={8}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.heroTitle}>{lead.contact_name}</Text>
      <Text style={[styles.statusBadge, { color: labelColor(currentLabel) }]}>{currentLabel}</Text>

      {isWhatsAppLead(lead) ? <Text style={styles.scoreLine}>Lead score: {lead.score}</Text> : null}

      {/* Understanding from chat */}
      {paywallLocked && !insightsLoading ? (
        <View style={styles.sectionGap}>
          <LinearGradient
            colors={["#A855F7", "#DC2626", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightGradientOuter}
          >
            <View style={styles.insightGradientInner}>
              <View style={styles.paywallRow}>
                <Ionicons name="warning" size={22} color={PAYWALL_RED} style={styles.paywallIcon} />
                <View style={styles.paywallTextCol}>
                  <Text style={styles.sectionLabel}>UNDERSTANDING FROM CHAT</Text>
                  <Text style={styles.paywallBody}>{businessBlock || "Business insights require a Pro or Pro+ plan."}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      ) : (
        <View style={styles.sectionGap}>
          <Text style={styles.sectionLabel}>UNDERSTANDING FROM CHAT</Text>
          <View style={styles.card}>
            {insightsLoading ? (
              <View style={styles.insightsLoading}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.muted}>Analyzing conversation…</Text>
              </View>
            ) : insightsError ? (
              <Text style={styles.err}>{insightsError}</Text>
            ) : (
              <Text style={styles.summary}>{businessBlock || "—"}</Text>
            )}
          </View>
        </View>
      )}

      {/* Suggestions */}
      <View style={styles.sectionGap}>
        <Text style={styles.sectionLabel}>SUGGESTIONS</Text>
        <View style={styles.card}>
          {insightsLoading ? (
            <ActivityIndicator color={colors.accent} style={{ alignSelf: "flex-start" }} />
          ) : insights?.suggestions?.length ? (
            <View style={styles.sugList}>
              {insights.suggestions.map((s, i) => (
                <View key={i} style={styles.sugRow}>
                  <Text style={styles.sugBullet}>•</Text>
                  <Text style={styles.sugText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>
              {insights && !insights.ai_enabled && !paywallLocked
                ? "Add OPENAI_API_KEY on the server for AI suggestions."
                : "No suggestions yet."}
            </Text>
          )}
        </View>
      </View>

      {/* Follow-up message */}
      <View style={styles.sectionGap}>
        <View style={styles.card}>
          <Text style={styles.sectionLabelInCard}>FOLLOW-UP MESSAGE</Text>
          <Text style={styles.hintInCard}>Generate a draft, edit it, then send or share.</Text>
          <TextInput
            multiline
            value={followUpDraft}
            onChangeText={setFollowUpDraft}
            placeholder="Tap “Generate follow-up” or type your own..."
            placeholderTextColor={LABEL}
            style={styles.draftInput}
            maxLength={4096}
          />
          <Pressable
            onPress={onGenerateFollowUp}
            disabled={generatingDraft}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.pressed,
              generatingDraft && styles.btnDisabled,
            ]}
          >
            {generatingDraft ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.btnPrimaryText}>Generate follow-up</Text>
            )}
          </Pressable>

          {isWhatsAppLead(lead) && activeTenantId ? (
            <>
              <Pressable
                onPress={onSendInWhatsApp}
                disabled={sending || !followUpDraft.trim()}
                style={({ pressed }) => [
                  styles.btnWa,
                  pressed && styles.pressed,
                  (!followUpDraft.trim() || sending) && styles.btnDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <>
                    <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                    <Text style={styles.btnWaText}>Review & send in WhatsApp</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={() =>
                  navigation.navigate("InboxChat", {
                    conversationId: lead.conversation_id,
                    title: lead.contact_name,
                  })
                }
                style={styles.linkBtn}
              >
                <Text style={styles.linkBtnText}>Open full chat</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={onShareDraft}
              disabled={!followUpDraft.trim()}
              style={({ pressed }) => [
                styles.btnWa,
                pressed && styles.pressed,
                !followUpDraft.trim() && styles.btnDisabled,
              ]}
            >
              <Text style={styles.btnWaText}>Share draft</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isManualLead(lead) ? (
        <View style={styles.sectionGap}>
          <Text style={styles.sectionLabel}>STATUS</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              {OPTIONS.map(({ label, value }) => (
                <Pressable
                  key={value}
                  onPress={() => setStatus(value)}
                  style={[styles.chip, lead.status === value && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      lead.status === value && styles.chipTextActive,
                      { color: lead.status === value ? colors.accent : labelColor(label) },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>REMINDER</Text>
          <View style={styles.card}>
            <Text style={styles.hintInCard}>
              {lead.follow_up_at
                ? new Date(lead.follow_up_at).toLocaleString()
                : "No reminder set"}
            </Text>
            <Pressable style={styles.btnPrimary} onPress={openPicker}>
              <Text style={styles.btnPrimaryText}>Set reminder</Text>
            </Pressable>
            {lead.follow_up_at ? (
              <Pressable style={styles.btnGhost} onPress={clearReminder}>
                <Text style={styles.btnGhostText}>Clear reminder</Text>
              </Pressable>
            ) : null}
          </View>

          {Platform.OS === "ios" && iosOpen ? (
            <DateTimePicker
              value={draftDate}
              mode="datetime"
              display="spinner"
              onChange={onIosChange}
            />
          ) : null}
          {Platform.OS === "android" && androidPhase === "date" ? (
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="default"
              onChange={onAndroidDate}
            />
          ) : null}
          {Platform.OS === "android" && androidPhase === "time" ? (
            <DateTimePicker
              value={draftDate}
              mode="time"
              display="default"
              onChange={onAndroidTime}
            />
          ) : null}
        </View>
      ) : null}

      {saving ? <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  back: { marginBottom: 16, alignSelf: "flex-start" },
  backText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  statusBadge: { fontSize: 15, fontWeight: "700", marginBottom: 6, letterSpacing: 0.5 },
  scoreLine: { fontSize: 14, color: LABEL, marginBottom: 8 },
  sectionGap: { marginTop: 24 },
  sectionLabel: {
    fontSize: 12,
    color: LABEL,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    fontWeight: "600",
  },
  sectionLabelInCard: {
    fontSize: 12,
    color: LABEL,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: "600",
  },
  card: {
    backgroundColor: CARD,
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightGradientOuter: {
    borderRadius: RADIUS,
    padding: 1.5,
  },
  insightGradientInner: {
    backgroundColor: CARD,
    borderRadius: RADIUS - 1,
    padding: 16,
  },
  paywallRow: { flexDirection: "row", alignItems: "flex-start" },
  paywallIcon: { marginRight: 12, marginTop: 2 },
  paywallTextCol: { flex: 1, minWidth: 0 },
  paywallBody: {
    fontSize: 15,
    lineHeight: 22,
    color: PAYWALL_RED,
    marginTop: 6,
    fontWeight: "500",
  },
  summary: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  err: { color: colors.hot, fontSize: 14 },
  insightsLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sugList: {},
  sugRow: { flexDirection: "row", gap: 8, marginBottom: 10, paddingRight: 4 },
  sugBullet: { color: colors.accent, fontSize: 16, lineHeight: 22 },
  sugText: { flex: 1, fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  hintInCard: { color: LABEL, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  draftInput: {
    minHeight: 112,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
    textAlignVertical: "top",
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: RADIUS,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  btnPrimaryText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },
  btnWa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginBottom: 8,
  },
  btnWaText: { color: colors.accent, fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkBtnText: { color: colors.accent, fontWeight: "600", fontSize: 15 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHover,
  },
  chipText: { fontSize: 14, fontWeight: "700" },
  chipTextActive: {},
  btnGhost: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnGhostText: { color: colors.textMuted, fontSize: 15 },
});
