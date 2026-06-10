import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ManageSubscriptionScreenProps } from "../navigation/types";
import {
  deletePaymentMethod,
  fetchBillingPlans,
  fetchBillingSummary,
  fetchInvoices,
  fetchUsage,
  patchDefaultPaymentMethod,
  postDowngrade,
  postSubscribe,
  type UsageResponse,
} from "../services/billingApi";
import { colors } from "../theme/colors";

const PROFILE_BG = "#0B0812";
const CARD_BG = "#15121B";

const PLAN_PERKS: Record<"pro" | "pro_plus", string[]> = {
  pro: [
    "Unlimited leads, AI replies, and follow-up automations",
    "Full WhatsApp CRM pipeline",
    "Smart reminders and organized inbox",
    "Business insights and analytics",
  ],
  pro_plus: [
    "Everything in Pro",
    "Multi-number and team workflows",
    "Advanced analytics and deeper automation",
    "Priority support and integrations",
  ],
};

type Limits = {
  leads_per_month: number | null;
  ai_assistant_messages_per_month: number | null;
  follow_up_automations_per_month: number | null;
};

function pct(used: number, cap: number | null): number {
  if (cap == null || cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function usageRows(data: UsageResponse) {
  const limits = data.limits as Limits;
  return [
    {
      label: "Leads (this month)",
      used: data.used.leads,
      cap: limits.leads_per_month,
      rem: data.remaining.leads,
    },
    {
      label: "AI assistant messages",
      used: data.used.ai_assistant_messages,
      cap: limits.ai_assistant_messages_per_month,
      rem: data.remaining.ai_assistant_messages,
    },
    {
      label: "Outbound follow-up messages",
      used: data.used.follow_up_messages,
      cap: limits.follow_up_automations_per_month,
      rem: data.remaining.follow_up_automations,
    },
  ];
}

function PerkRow({ text }: { text: string }) {
  return (
    <View style={styles.perkRow}>
      <Ionicons name="checkmark-circle" size={16} color={colors.accentSecondary} style={{ marginTop: 1 }} />
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
}

export default function ManageSubscriptionScreen({}: ManageSubscriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [annualPro, setAnnualPro] = useState(false);
  const [annualProPlus, setAnnualProPlus] = useState(false);

  const summaryQ = useQuery({ queryKey: ["billing", "summary"], queryFn: fetchBillingSummary });
  const plansQ = useQuery({ queryKey: ["billing", "plans"], queryFn: fetchBillingPlans });
  const invoicesQ = useQuery({ queryKey: ["billing", "invoices"], queryFn: fetchInvoices });
  const usageQ = useQuery({ queryKey: ["billing", "usage"], queryFn: fetchUsage });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
      queryClient.invalidateQueries({ queryKey: ["billing", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["billing", "plans"] }),
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] }),
    ]);
  };

  const subscribeMut = useMutation({
    mutationFn: (p: { plan: "pro" | "pro_plus"; interval: "monthly" | "annual" }) =>
      postSubscribe(p.plan, p.interval),
    onSuccess: async (res) => {
      if (res.short_url) {
        await Linking.openURL(res.short_url);
      } else {
        Alert.alert("Subscription created", "Payment link was not returned. Please check billing status.");
      }
      await refreshAll();
    },
    onError: (e) => Alert.alert("Could not subscribe", e instanceof Error ? e.message : "Try again."),
  });

  const downgradeMut = useMutation({
    mutationFn: postDowngrade,
    onSuccess: async () => {
      Alert.alert("Done", "Moved to Free plan.");
      await refreshAll();
    },
    onError: (e) => Alert.alert("Could not downgrade", e instanceof Error ? e.message : "Try again."),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id: string) => patchDefaultPaymentMethod(id),
    onSuccess: refreshAll,
    onError: (e) => Alert.alert("Could not update", e instanceof Error ? e.message : "Try again."),
  });

  const removePmMut = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: refreshAll,
    onError: (e) => Alert.alert("Could not remove", e instanceof Error ? e.message : "Try again."),
  });

  const loading = summaryQ.isLoading || invoicesQ.isLoading || usageQ.isLoading || plansQ.isLoading;
  const error =
    summaryQ.error || invoicesQ.error || usageQ.error || plansQ.error
      ? (summaryQ.error || invoicesQ.error || usageQ.error || plansQ.error)
      : null;

  const summary = summaryQ.data;
  const usage = usageQ.data;
  const invoices = invoicesQ.data ?? [];
  const plans = plansQ.data?.plans ?? [];

  const usageRowsMemo = useMemo(() => (usage ? usageRows(usage) : []), [usage]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: PROFILE_BG }]}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 28 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Plan & billing</Text>
      <Text style={styles.subtitle}>Manage subscription, payment methods, invoices, and usage limits.</Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Loading billing…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.warnCard}>
          <Text style={styles.warnTitle}>Could not load billing</Text>
          <Text style={styles.warnBody}>{error instanceof Error ? error.message : "Please retry."}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void refreshAll()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Current plan</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{summary.plan_tier.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.muted}>
            New accounts start on free. Upgrade below to unlock higher limits and advanced workflows.
          </Text>
          {summary.payment_required ? (
            <Text style={[styles.muted, { color: "#FBBF24", marginTop: 8 }]}>
              Add a payment method to keep charges reliable.
            </Text>
          ) : null}
          {(summary.plan_tier === "pro" || summary.plan_tier === "pro_plus") ? (
            <Pressable
              style={({ pressed }) => [styles.btnOutline, pressed && { opacity: 0.88 }]}
              onPress={() => downgradeMut.mutate()}
              disabled={downgradeMut.isPending}
            >
              <Text style={styles.btnOutlineText}>
                {downgradeMut.isPending ? "Downgrading…" : "Downgrade to Free"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {usage ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Usage</Text>
          <Text style={styles.muted}>
            Period: {usage.period} · Plan: {usage.plan_tier}. Limits reset monthly.
          </Text>
          <View style={{ marginTop: 14, gap: 14 }}>
            {usageRowsMemo.map((r) => (
              <View key={r.label}>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>{r.label}</Text>
                  <Text style={styles.metricValue}>
                    {r.cap == null
                      ? `${r.used.toLocaleString()} used · unlimited`
                      : `${r.used.toLocaleString()} / ${r.cap.toLocaleString()} · ${(r.rem ?? 0).toLocaleString()} left`}
                  </Text>
                </View>
                {r.cap != null ? (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct(r.used, r.cap)}%` }]} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment methods</Text>
          <Text style={styles.muted}>
            Cards are tokenized by Razorpay. Set a default method for subscriptions.
          </Text>
          <Text style={[styles.muted, { marginTop: 8 }]}>
            Add card checkout is available on web right now. Mobile card setup will be enabled soon.
          </Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            {summary.payment_methods.length === 0 ? (
              <Text style={styles.muted}>No saved methods yet.</Text>
            ) : (
              summary.payment_methods.map((pm) => {
                const onlyOnePm = summary.payment_methods.length <= 1;
                return (
                  <View key={pm.id} style={styles.pmRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pmTitle}>
                        {(pm.brand || pm.method).toUpperCase()} ·••• {pm.last4}
                      </Text>
                      <Text style={styles.pmSub}>{pm.is_default ? "Default" : "Saved method"}</Text>
                    </View>
                    {!pm.is_default ? (
                      <Pressable
                        style={styles.pmAction}
                        onPress={() => setDefaultMut.mutate(pm.id)}
                        disabled={setDefaultMut.isPending}
                      >
                        <Text style={styles.pmActionText}>Set default</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.pmAction, onlyOnePm && { opacity: 0.45 }]}
                      onPress={() => removePmMut.mutate(pm.id)}
                      disabled={onlyOnePm || removePmMut.isPending}
                    >
                      <Text style={styles.pmActionText}>Remove</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change plan</Text>
          <Text style={styles.muted}>
            {plans.length ? `Available: ${plans.map((p) => p.name).join(" · ")}` : "Upgrade to Pro or Pro+."}
          </Text>

          <View style={styles.planCard}>
            <View style={styles.planHeaderRow}>
              <View style={styles.planTitleCol}>
                <Text style={styles.planName}>Pro</Text>
                <Text style={styles.planSub}>For teams scaling outreach and inbox.</Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Annual</Text>
                <Switch
                  value={annualPro}
                  onValueChange={setAnnualPro}
                  trackColor={{ false: "#3A3545", true: "#7C3AED" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
            <View style={{ marginTop: 10, gap: 8 }}>
              {PLAN_PERKS.pro.map((line) => (
                <PerkRow key={line} text={line} />
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
              onPress={() =>
                subscribeMut.mutate({
                  plan: "pro",
                  interval: annualPro ? "annual" : "monthly",
                })
              }
              disabled={!summary.has_razorpay || subscribeMut.isPending}
            >
              <Text style={styles.btnPrimaryText}>
                {subscribeMut.isPending ? "Opening checkout…" : `Upgrade to Pro — ${annualPro ? "Annual" : "Monthly"}`}
              </Text>
            </Pressable>
          </View>

          <View style={styles.planCard}>
            <View style={styles.planHeaderRow}>
              <View style={styles.planTitleCol}>
                <Text style={styles.planName}>Pro+</Text>
                <Text style={styles.planSub}>For teams needing scale, control, and support.</Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Annual</Text>
                <Switch
                  value={annualProPlus}
                  onValueChange={setAnnualProPlus}
                  trackColor={{ false: "#3A3545", true: "#DB2777" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
            <View style={{ marginTop: 10, gap: 8 }}>
              {PLAN_PERKS.pro_plus.map((line) => (
                <PerkRow key={line} text={line} />
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.btnPrimaryPink, pressed && { opacity: 0.9 }]}
              onPress={() =>
                subscribeMut.mutate({
                  plan: "pro_plus",
                  interval: annualProPlus ? "annual" : "monthly",
                })
              }
              disabled={!summary.has_razorpay || subscribeMut.isPending}
            >
              <Text style={styles.btnPrimaryText}>
                {subscribeMut.isPending
                  ? "Opening checkout…"
                  : `Upgrade to Pro+ — ${annualProPlus ? "Annual" : "Monthly"}`}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {invoices.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Invoices</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {invoices.map((inv) => {
              const url = inv.host_invoice_url || inv.pdf_url || inv.short_url || null;
              return (
                <View key={inv.id} style={styles.invoiceRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={styles.invoiceId}>
                      {inv.razorpay_invoice_id}
                    </Text>
                    <Text style={styles.pmSub}>
                      {formatMoney(inv.amount_cents, inv.currency)} · {inv.status}
                    </Text>
                  </View>
                  {url ? (
                    <Pressable style={styles.pmAction} onPress={() => void Linking.openURL(url)}>
                      <Text style={styles.pmActionText}>Open</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.pmSub}>—</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
  subtitle: { marginTop: 6, marginBottom: 12, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  warnCard: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  warnTitle: { color: "#FCA5A5", fontWeight: "700", fontSize: 14, marginBottom: 4 },
  warnBody: { color: "#FECACA", fontSize: 13, lineHeight: 18 },
  retryBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  retryBtnText: { color: colors.onPrimary, fontWeight: "700" },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginBottom: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  planBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(124,58,237,0.22)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.6)",
  },
  planBadgeText: { color: colors.accentSecondary, fontSize: 11, fontWeight: "800" },
  btnOutline: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnOutlineText: { color: colors.text, fontWeight: "700" },
  metricLabel: { color: colors.text, fontSize: 13, flex: 1, paddingRight: 8 },
  metricValue: { color: colors.textMuted, fontSize: 12 },
  progressTrack: {
    marginTop: 6,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
  pmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 10,
  },
  pmTitle: { color: colors.text, fontWeight: "600", fontSize: 13 },
  pmSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pmAction: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pmActionText: { color: colors.text, fontWeight: "600", fontSize: 12 },
  planCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.22)",
    padding: 12,
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  planTitleCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  planName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  planSub: { color: colors.textMuted, fontSize: 12, marginTop: 2, flexWrap: "wrap" },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },
  switchLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  perkRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  perkText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
  btnPrimary: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    paddingVertical: 12,
  },
  btnPrimaryPink: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#DB2777",
    alignItems: "center",
    paddingVertical: 12,
  },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 10,
  },
  invoiceId: { color: colors.text, fontSize: 12, fontFamily: "monospace" },
});
