import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatListCard } from "../components/inbox/ChatListCard";
import { InboxToolbar, type InboxFilter } from "../components/inbox/InboxToolbar";
import { useLeads } from "../context/LeadsContext";
import { useTenant } from "../context/TenantContext";
import { useAppForeground } from "../hooks/useAppForeground";
import type { InboxTabProps } from "../navigation/types";
import { refreshContactIndex, type ContactIndex } from "../services/contactIdentityService";
import { enrichConversation, type EnrichedConversation } from "../services/inboxConversationDisplay";
import { fetchInboxConversations, inboxErrorMessage, type InboxConversation } from "../services/inboxApi";
import { colors } from "../theme/colors";
import { inbox } from "../theme/inbox";

function InboxSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.skeletonLineLg} />
            <View style={styles.skeletonLineSm} />
            <View style={styles.skeletonLineMd} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function InboxListScreen({ navigation }: InboxTabProps) {
  const isFocused = useIsFocused();
  const appForeground = useAppForeground();
  const { leads } = useLeads();
  const {
    activeTenantId,
    tenants,
    isLoading: tenantLoading,
    tenantResolutionReady,
    error: tenantError,
  } = useTenant();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [contactIndex, setContactIndex] = useState<ContactIndex>(new Map());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void refreshContactIndex().then((idx) => {
        if (alive) setContactIndex(idx);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
    error,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["inbox", "conversations", activeTenantId],
    enabled: !!activeTenantId && tenantResolutionReady,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchInboxConversations(activeTenantId!, { limit: 30, cursor: pageParam }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 10_000,
    retry: 2,
    refetchInterval: isFocused && appForeground ? 25_000 : false,
    placeholderData: (prev) => prev,
  });

  const rows: InboxConversation[] = useMemo(() => data?.pages.flatMap((p) => p.conversations) ?? [], [data]);

  const enriched: EnrichedConversation[] = useMemo(
    () => rows.map((c) => enrichConversation(c, contactIndex, leads)),
    [rows, contactIndex, leads]
  );

  const filtered = useMemo(() => {
    let out = enriched;
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          r.phoneLine.toLowerCase().includes(q) ||
          (r.conversation.last_message_preview || "").toLowerCase().includes(q)
      );
    }
    if (filter === "unread") out = out.filter((r) => r.conversation.unread_count > 0);
    if (filter === "leads") out = out.filter((r) => r.isLead);
    if (filter === "customers") out = out.filter((r) => !r.isLead);
    return out;
  }, [enriched, search, filter]);

  const onEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useFocusEffect(
    useCallback(() => {
      if (activeTenantId && tenantResolutionReady) void refetch();
    }, [refetch, activeTenantId, tenantResolutionReady])
  );

  const openChat = useCallback(
    (r: EnrichedConversation) => {
      navigation.getParent()?.navigate("InboxChat", {
        conversationId: r.conversation.id,
        title: r.displayName,
        subtitle: r.subtitleLine ?? undefined,
        peerAvatarUri: r.avatarUri,
        peerInitials: r.initials,
      });
    },
    [navigation]
  );

  if (tenantLoading || !tenantResolutionReady || (!activeTenantId && tenants.length > 0 && !tenantError)) {
    return (
      <LinearGradient colors={[inbox.gradientTop, inbox.gradientBottom]} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
          <View style={styles.center}>
            <ActivityIndicator color={inbox.purple} />
            <Text style={styles.muted}>Loading workspace…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (tenantError) {
    return (
      <LinearGradient colors={[inbox.gradientTop, inbox.gradientBottom]} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
          <View style={styles.center}>
            <Text style={styles.error}>{tenantError.message}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!activeTenantId) {
    return (
      <LinearGradient colors={[inbox.gradientTop, inbox.gradientBottom]} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
          <View style={styles.center}>
            <Text style={styles.title}>No organization</Text>
            <Text style={styles.muted}>Ask an admin to invite you to a workspace.</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[inbox.gradientTop, inbox.gradientBottom]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
        {error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerError}>{inboxErrorMessage(error)}</Text>
            <Pressable onPress={() => void refetch()} style={styles.bannerRetry} hitSlop={8}>
              <Text style={styles.bannerRetryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {!error && isFetching && !isRefetching && !isLoading && rows.length > 0 ? (
          <View style={styles.subtleSync}>
            <ActivityIndicator size="small" color={inbox.purple} />
            <Text style={styles.subtleSyncText}>Updating…</Text>
          </View>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.conversation.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={inbox.purple}
            />
          }
          onEndReached={onEnd}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={styles.listHead}>
              <Text style={styles.screenTitle}>Inbox</Text>
              <Text style={styles.screenSub}>WhatsApp threads in one premium workspace</Text>
              <InboxToolbar
                search={search}
                onSearchChange={setSearch}
                filter={filter}
                onFilterChange={setFilter}
              />
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={inbox.purple} />
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <InboxSkeleton />
            ) : error ? (
              <View style={{ marginTop: 24, paddingHorizontal: 24 }}>
                <Text style={[styles.muted, { marginBottom: 16 }]}>{inboxErrorMessage(error)}</Text>
                <Pressable onPress={() => void refetch()} style={styles.emptyRetryBtn}>
                  <Text style={styles.emptyRetryText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.muted, { textAlign: "center", marginTop: 32, paddingHorizontal: 24 }]}>
                No conversations match. When customers message your WhatsApp number, threads appear here.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <ChatListCard row={item} onPress={() => openChat(item)} />
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  muted: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  error: { fontSize: 14, color: colors.hot, textAlign: "center" },
  listHead: { marginBottom: 8 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  screenSub: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  bannerError: { flex: 1, fontSize: 13, color: "#FCA5A5" },
  bannerRetry: { paddingVertical: 6, paddingHorizontal: 10 },
  bannerRetryText: { fontSize: 14, fontWeight: "600", color: inbox.purple },
  subtleSync: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  subtleSyncText: { fontSize: 12, color: colors.textMuted },
  emptyRetryBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: inbox.purple,
  },
  emptyRetryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  skeletonWrap: { paddingTop: 8, gap: 0 },
  skeletonCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 12,
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  skeletonLineLg: { height: 14, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.08)", width: "70%" },
  skeletonLineSm: { height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.05)", width: "40%" },
  skeletonLineMd: { height: 12, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.06)", width: "90%" },
});
