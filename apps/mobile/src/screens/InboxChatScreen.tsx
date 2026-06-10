import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeContainer } from "../components/layout/KeyboardSafeContainer";
import { ChatInputBar } from "../components/chat/ChatInputBar";
import { ChatMessageRow } from "../components/inbox/ChatMessageRow";
import { InitialAvatar } from "../components/inbox/InitialAvatar";
import { SwipeableChatRow } from "../components/inbox/SwipeableChatRow";
import { TypingIndicator } from "../components/inbox/TypingIndicator";
import { useTenant } from "../context/TenantContext";
import { useAppForeground } from "../hooks/useAppForeground";
import { useKeyboardVisible } from "../hooks/useKeyboardVisible";
import type { InboxChatScreenProps } from "../navigation/types";
import {
  fetchInboxMessages,
  inboxErrorMessage,
  markInboxConversationRead,
  sendInboxTextMessage,
  type InboxMessage,
} from "../services/inboxApi";
import { colors } from "../theme/colors";
import { inbox } from "../theme/inbox";
import { formatMessageWithReplyQuote, splitReplyFromBody } from "../utils/inboxReplyFormat";

type InboxReplyTarget = {
  id: string;
  preview: string;
  authorLabel: string;
};

export default function InboxChatScreen({ route, navigation }: InboxChatScreenProps) {
  const { conversationId, title, subtitle, peerAvatarUri, peerInitials } = route.params;
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const isFocused = useIsFocused();
  const appForeground = useAppForeground();
  const { activeTenantId, tenantResolutionReady } = useTenant();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [older, setOlder] = useState<InboxMessage[]>([]);
  const [beforeCursor, setBeforeCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [pendingRetryText, setPendingRetryText] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [peerTyping] = useState(false);
  const [replyTarget, setReplyTarget] = useState<InboxReplyTarget | null>(null);

  const listRef = useRef<FlatList<InboxMessage>>(null);
  const atBottomRef = useRef(true);
  const prevMessageCount = useRef(0);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      /* Native header accepts full ViewStyle; navigation types only list backgroundColor */
      headerStyle: {
        backgroundColor: inbox.gradientTop,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(168, 85, 247, 0.28)",
      } as { backgroundColor: string },
      headerTitle: () => (
        <View style={styles.headerTitleRow}>
          <InitialAvatar uri={peerAvatarUri} initials={peerInitials || "?"} size={36} />
          <View style={styles.headerTitleText}>
            <Text numberOfLines={1} style={styles.headerName}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={styles.headerSub}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      ),
    });
  }, [navigation, title, subtitle, peerAvatarUri, peerInitials]);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["inbox", "messages", activeTenantId, conversationId],
    enabled: !!activeTenantId && tenantResolutionReady,
    queryFn: () => fetchInboxMessages(activeTenantId!, conversationId, { limit: 50 }),
    refetchInterval: isFocused && appForeground ? 8000 : false,
    staleTime: 5000,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (data?.messages) {
      setOlder([]);
      setBeforeCursor(data.next_before);
      setOlderError(null);
      initialScrollDone.current = false;
    }
  }, [activeTenantId, conversationId, data?.messages, data?.next_before]);

  useEffect(() => {
    if (!activeTenantId) return;
    void markInboxConversationRead(activeTenantId, conversationId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["inbox", "conversations", activeTenantId] });
    });
  }, [activeTenantId, conversationId, queryClient]);

  const messages = useMemo(() => {
    const base = data?.messages ?? [];
    return [...older, ...base];
  }, [data?.messages, older]);

  /** Newest first for inverted FlatList (WhatsApp-style). */
  const listData = useMemo(() => [...messages].reverse(), [messages]);

  const scrollToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    atBottomRef.current = y < 96;
  }, []);

  useEffect(() => {
    const n = messages.length;
    if (isLoading || n === 0) {
      prevMessageCount.current = n;
      return;
    }
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
    } else if (n > prevMessageCount.current && atBottomRef.current) {
      requestAnimationFrame(() => scrollToLatest());
    }
    prevMessageCount.current = n;
  }, [messages.length, isLoading, scrollToLatest]);

  const loadOlder = useCallback(async () => {
    if (!activeTenantId || !beforeCursor || loadingOlder) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const more = await fetchInboxMessages(activeTenantId, conversationId, {
        limit: 50,
        before: beforeCursor,
      });
      setOlder((prev) => [...more.messages, ...prev]);
      setBeforeCursor(more.next_before);
    } catch (e) {
      setOlderError(inboxErrorMessage(e));
    } finally {
      setLoadingOlder(false);
    }
  }, [activeTenantId, beforeCursor, conversationId, loadingOlder]);

  const sendMut = useMutation({
    mutationFn: (text: string) => sendInboxTextMessage(activeTenantId!, conversationId, text),
    onMutate: () => {
      setPendingRetryText(null);
    },
    onSuccess: () => {
      setDraft("");
      setReplyTarget(null);
      setPendingRetryText(null);
      sendMut.reset();
      void queryClient.invalidateQueries({
        queryKey: ["inbox", "messages", activeTenantId, conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["inbox", "conversations", activeTenantId] });
      atBottomRef.current = true;
      requestAnimationFrame(() => scrollToLatest());
    },
    onError: (_err, text) => {
      setPendingRetryText(text);
    },
  });

  const beginReply = useCallback(
    (m: InboxMessage) => {
      const raw = m.body?.trim() ? m.body : "(No text)";
      const { main } = splitReplyFromBody(raw);
      const preview = (main || raw).replace(/\s+/g, " ").trim().slice(0, 220);
      setReplyTarget({
        id: m.id,
        preview: preview || "(No text)",
        authorLabel: m.sender === "business" ? "You" : title,
      });
    },
    [title]
  );

  const onSend = useCallback(() => {
    const t = draft.trim();
    if (!t || !activeTenantId || sendMut.isPending) return;
    const payload = replyTarget ? formatMessageWithReplyQuote(replyTarget.preview, t) : t;
    sendMut.mutate(payload);
  }, [draft, activeTenantId, sendMut, replyTarget]);

  const onRetrySend = useCallback(() => {
    if (!pendingRetryText || !activeTenantId || sendMut.isPending) return;
    sendMut.mutate(pendingRetryText);
  }, [pendingRetryText, activeTenantId, sendMut]);

  const pickAttachment = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    const name = uri.split("/").pop() || "image";
    setDraft((prev) => `${prev}${prev.trim().length ? "\n" : ""}📎 ${name}`);
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    setDraft((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
  }, []);

  if (!activeTenantId || !tenantResolutionReady) {
    return (
      <LinearGradient colors={[inbox.gradientTop, inbox.gradientBottom]} style={styles.flex}>
        <View style={styles.center}>
          <ActivityIndicator color={inbox.purple} />
          <Text style={[styles.muted, { marginTop: 12 }]}>Loading workspace…</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[inbox.gradientTop, inbox.gradientBottom]} style={styles.flex}>
      <KeyboardSafeContainer style={styles.flex} keyboardVerticalOffsetExtra={52}>
        <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
          <View style={styles.flex}>
            {error ? (
              <View style={styles.banner}>
                <Text style={styles.bannerErr}>{inboxErrorMessage(error)}</Text>
                <Pressable onPress={() => void refetch()} style={styles.retry}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
            {!error && isFetching && !isLoading && messages.length > 0 ? (
              <View style={styles.syncRow}>
                <ActivityIndicator size="small" color={inbox.purple} />
                <Text style={styles.syncText}>Checking for new messages…</Text>
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.flexCenter}>
                <ActivityIndicator color={inbox.purple} />
                <Text style={styles.loadingHint}>Loading conversation…</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                style={styles.flex}
                data={listData}
                inverted
                keyExtractor={(m) => m.id}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                maintainVisibleContentPosition={
                  beforeCursor
                    ? {
                        minIndexForVisible: 0,
                        autoscrollToTopThreshold: 48,
                      }
                    : undefined
                }
                contentContainerStyle={{
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  paddingBottom: 16,
                  flexGrow: 1,
                }}
                ListHeaderComponent={
                  peerTyping ? (
                    <TypingIndicator label="Typing…" />
                  ) : (
                    <View style={{ height: 4 }} />
                  )
                }
                ListFooterComponent={
                  beforeCursor ? (
                    <View style={styles.loadMoreBlock}>
                      {olderError ? <Text style={styles.olderErr}>{olderError}</Text> : null}
                      <Pressable
                        onPress={() => void loadOlder()}
                        disabled={loadingOlder}
                        style={styles.loadMore}
                      >
                        {loadingOlder ? (
                          <ActivityIndicator color={inbox.purple} />
                        ) : (
                          <Text style={styles.loadMoreText}>Load older messages</Text>
                        )}
                      </Pressable>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyChat}>
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptySub}>Say hello — your reply goes to WhatsApp.</Text>
                  </View>
                }
                renderItem={({ item, index }) => {
                  const olderPrev = listData[index + 1];
                  const compactTop = !!(olderPrev && olderPrev.sender === item.sender);
                  return (
                    <SwipeableChatRow onReply={() => beginReply(item)}>
                      <ChatMessageRow item={item} compactTop={compactTop} onReply={() => beginReply(item)} />
                    </SwipeableChatRow>
                  );
                }}
              />
            )}

            {pendingRetryText ? (
              <View style={styles.failedBanner}>
                <Text style={styles.failedText} numberOfLines={3}>
                  {sendMut.error
                    ? inboxErrorMessage(sendMut.error)
                    : "Message didn’t send. Check your connection and try again."}
                </Text>
                <View style={styles.failedActions}>
                  <Pressable onPress={onRetrySend} disabled={sendMut.isPending} style={styles.failedBtn}>
                    <Text style={styles.failedBtnLabel}>Retry</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setPendingRetryText(null);
                      setDraft(pendingRetryText);
                      sendMut.reset();
                    }}
                    style={styles.failedBtnSecondary}
                  >
                    <Text style={styles.failedBtnSecondaryLabel}>Edit</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {sendMut.isError && !pendingRetryText ? (
              <Text style={styles.sendError}>{inboxErrorMessage(sendMut.error)}</Text>
            ) : null}

            <ChatInputBar
              variant="inbox"
              value={draft}
              onChangeText={setDraft}
              onSend={onSend}
              sending={sendMut.isPending}
              onAttach={pickAttachment}
              onEmoji={() => setEmojiOpen(true)}
              replyTo={
                replyTarget
                  ? { preview: replyTarget.preview, authorLabel: replyTarget.authorLabel }
                  : null
              }
              onCancelReply={() => setReplyTarget(null)}
              bottomInset={keyboardVisible ? 8 : insets.bottom}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardSafeContainer>
      <Modal visible={emojiOpen} transparent animationType="slide" onRequestClose={() => setEmojiOpen(false)}>
        <Pressable style={styles.emojiBackdrop} onPress={() => setEmojiOpen(false)}>
          <Pressable style={[styles.emojiSheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
            <Text style={styles.emojiTitle}>Pick emoji</Text>
            <View style={styles.emojiGrid}>
              {["😀", "😂", "😍", "🙏", "👍", "🔥", "🎉", "✅", "💬", "❤️", "🤝", "📞"].map((e) => (
                <Pressable key={e} onPress={() => insertEmoji(e)} style={styles.emojiCell}>
                  <Text style={styles.emojiGlyph}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  flexCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingHint: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  muted: { color: colors.textMuted },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 260,
  },
  headerTitleText: { flexShrink: 1 },
  headerName: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
  headerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  syncText: { fontSize: 12, color: colors.textMuted },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "rgba(239,68,68,0.12)",
    gap: 12,
  },
  bannerErr: { flex: 1, color: "#FCA5A5", fontSize: 13 },
  retry: { paddingVertical: 6, paddingHorizontal: 10 },
  retryText: { color: inbox.purple, fontWeight: "600" },
  loadMoreBlock: { alignItems: "center", paddingBottom: 4 },
  olderErr: {
    color: colors.hot,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  loadMore: { alignSelf: "center", paddingVertical: 12 },
  loadMoreText: { color: inbox.purple, fontWeight: "600", fontSize: 14 },
  emptyChat: { flex: 1, justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
  failedBanner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  failedText: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  failedActions: { flexDirection: "row", gap: 12 },
  failedBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: inbox.purple,
  },
  failedBtnLabel: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  failedBtnSecondary: { paddingVertical: 8, paddingHorizontal: 12, justifyContent: "center" },
  failedBtnSecondaryLabel: { color: inbox.purple, fontWeight: "600", fontSize: 14 },
  sendError: { color: colors.hot, fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 },
  emojiBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  emojiSheet: {
    backgroundColor: "#111118",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  emojiTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 14, marginBottom: 10 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emojiCell: {
    width: "15%",
    minWidth: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  emojiGlyph: { fontSize: 24 },
});
