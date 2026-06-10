import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLeads } from "../context/LeadsContext";
import { colors } from "../theme/colors";
import type { Lead } from "../services/api";
import type { LeadsListScreenProps } from "../navigation/types";
import { formatRelativeTime } from "../utils/relativeTime";
import { homeLeadRowMeta } from "../utils/homeLeadStatus";
import { navigateToLeadDetail } from "../utils/leadNavigation";

function leadInitials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]!.charAt(0) + p[1]!.charAt(0)).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export default function LeadsListScreen({ navigation }: LeadsListScreenProps) {
  const insets = useSafeAreaInsets();
  const { leads, loading, error, refresh } = useLeads();

  const sorted = useMemo(
    () =>
      [...leads].sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return tb - ta;
      }),
    [leads]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Lead; index: number }) => {
      const meta = homeLeadRowMeta(item);
      const isLast = index === sorted.length - 1;
      return (
        <Pressable
          onPress={() => navigateToLeadDetail(navigation, item)}
          style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{leadInitials(item.contact_name)}</Text>
          </View>
          <View style={styles.rowMid}>
            <Text style={styles.name} numberOfLines={1}>
              {item.contact_name}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: meta.dotColor }]} />
              <Text style={styles.statusLabel}>{meta.label}</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </Pressable>
      );
    },
    [navigation, sorted]
  );

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      {error ? <Text style={styles.banner}>{error}</Text> : null}
      {loading && sorted.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) =>
            item.source === "whatsapp" ? `wa-${item.id}` : `m-${item.id}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading && sorted.length > 0}
              onRefresh={refresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.empty}>
                No leads yet. WhatsApp auto-leads and manual Add chat leads show up here.
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  banner: { color: colors.hot, paddingHorizontal: 20, paddingTop: 8 },
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.88 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124, 58, 237, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  rowMid: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { color: colors.textMuted, fontSize: 13 },
  rowRight: { alignItems: "flex-end", gap: 4, marginLeft: 8 },
  time: { color: colors.textMuted, fontSize: 12 },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 24,
    lineHeight: 22,
  },
});
