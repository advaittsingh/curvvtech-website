import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeContainer } from "../components/layout/KeyboardSafeContainer";
import { ChatInputBar } from "../components/chat/ChatInputBar";
import {
  deleteAiChatMessages,
  fetchAiChatMessages,
  sendAiChatMessage,
} from "../services/api";
import { colors } from "../theme/colors";
import { inbox } from "../theme/inbox";
import { useKeyboardVisible } from "../hooks/useKeyboardVisible";
import { formatChatBubbleTime } from "../utils/chatTime";
import type { AskAITabProps } from "../navigation/types";

const AI_CHAT_QUERY_KEY = ["ai-chat"] as const;

const HEADER_ICON_W = 44;

type ChatBubble = {
  id: string;
  text: string;
  createdAt: string;
  sender: "user" | "bot";
};

function mapServerRow(row: {
  id: string;
  role: string;
  content: string;
  created_at: string;
}): ChatBubble {
  return {
    id: row.id,
    text: row.content,
    createdAt: row.created_at,
    sender: row.role === "user" ? "user" : "bot",
  };
}

export default function AskAIScreen({ navigation }: AskAITabProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const queryClient = useQueryClient();
  const [currMessage, setCurrMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const {
    data: chatMessages = [],
    isPending: loading,
    isError: loadError,
    error: loadErr,
    refetch,
  } = useQuery({
    queryKey: AI_CHAT_QUERY_KEY,
    queryFn: async () => {
      const rows = await fetchAiChatMessages();
      return rows.map(mapServerRow);
    },
    staleTime: 15_000,
  });

  const clearMutation = useMutation({
    mutationFn: () => deleteAiChatMessages(),
    onSuccess: () => {
      queryClient.setQueryData<ChatBubble[]>(AI_CHAT_QUERY_KEY, []);
    },
  });

  const handleDeleteChat = useCallback(() => {
    if (chatMessages.length === 0) return;
    Alert.alert(
      "Clear chat",
      "This deletes your Ask AI history on FollowUp’s servers for your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearMutation.mutate(undefined, {
              onError: (e) => {
                Alert.alert(
                  "Could not clear",
                  e instanceof Error ? e.message : "Try again when you’re online."
                );
              },
            });
          },
        },
      ]
    );
  }, [chatMessages.length, clearMutation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: "center",
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.navigate("HomeTab")}
          style={({ pressed }) => [styles.headerIconHit, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleDeleteChat}
          disabled={clearMutation.isPending}
          style={({ pressed }) => [styles.headerIconHit, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear chat"
        >
          {clearMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.hot} />
          ) : (
            <Ionicons name="trash-outline" size={22} color={colors.hot} />
          )}
        </Pressable>
      ),
    });
  }, [navigation, handleDeleteChat, clearMutation.isPending]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => sendAiChatMessage(msg),
    onMutate: () => setSendError(null),
    onSuccess: () => {
      setCurrMessage("");
      void queryClient.invalidateQueries({ queryKey: AI_CHAT_QUERY_KEY });
    },
    onError: (e: unknown) => {
      setSendError(e instanceof Error ? e.message : "Could not send. Try again.");
      void queryClient.invalidateQueries({ queryKey: AI_CHAT_QUERY_KEY });
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = currMessage.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }, [currMessage, sendMutation]);

  const insertEmoji = useCallback((emoji: string) => {
    setCurrMessage((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
  }, []);

  const renderItem = useCallback(({ item: message }: { item: ChatBubble }) => {
    const isUser = message.sender === "user";
    const timeLabel = formatChatBubbleTime(message.createdAt);
    return (
      <View
        style={[
          styles.bubbleWrap,
          isUser ? styles.bubbleWrapUser : styles.bubbleWrapBot,
        ]}
      >
        {isUser ? (
          <LinearGradient
            colors={[inbox.purple, inbox.bubbleSentEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleUserGrad]}
          >
            <Text style={styles.messageTextUser}>{message.text}</Text>
            <Text style={styles.metaUser}>{timeLabel}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleBot]}>
            <Text style={styles.messageTextBot}>{message.text}</Text>
            <Text style={styles.metaBot}>{timeLabel}</Text>
          </View>
        )}
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: ChatBubble) => item.id, []);

  const loadErrorText =
    loadError && loadErr instanceof Error ? loadErr.message : "Could not load chat history.";

  return (
    <KeyboardSafeContainer style={styles.flex} keyboardVerticalOffsetExtra={56}>
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <View style={[styles.container, { flex: 1 }]}>
          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : loadError ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.errText}>{loadErrorText}</Text>
              <Pressable style={styles.retryBtn} onPress={() => void refetch()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.flex}>
              <View style={styles.flex}>
                {chatMessages.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyHint}>
                      Ask about follow-ups, leads, or messaging. Replies are generated on FollowUp’s
                      servers when you’re signed in.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    style={styles.flex}
                    data={[...chatMessages].reverse()}
                    keyExtractor={keyExtractor}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    inverted
                    contentContainerStyle={styles.listContent}
                    renderItem={renderItem}
                  />
                )}
              </View>

              {sendError ? <Text style={styles.inlineErr}>{sendError}</Text> : null}

              <ChatInputBar
                variant="ai"
                value={currMessage}
                onChangeText={setCurrMessage}
                onSend={handleSend}
                sending={sendMutation.isPending}
                onAttach={undefined}
                onEmoji={() => setEmojiOpen(true)}
                bottomInset={keyboardVisible ? 8 : insets.bottom}
              />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
      <Modal visible={emojiOpen} transparent animationType="fade" onRequestClose={() => setEmojiOpen(false)}>
        <Pressable style={styles.emojiBackdrop} onPress={() => setEmojiOpen(false)}>
          <Pressable style={[styles.emojiSheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
            <Text style={styles.emojiTitle}>Pick emoji</Text>
            <View style={styles.emojiGrid}>
              {["😀", "😂", "🙏", "👍", "🔥", "✅", "💬", "❤️"].map((e) => (
                <Pressable key={e} onPress={() => insertEmoji(e)} style={styles.emojiCell}>
                  <Text style={styles.emojiGlyph}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardSafeContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 0,
  },
  headerIconHit: {
    width: HEADER_ICON_W,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: { opacity: 0.72 },
  listContent: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyHint: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  errText: {
    textAlign: "center",
    fontSize: 14,
    color: colors.hot,
    marginBottom: 16,
  },
  retryBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  retryBtnText: { color: colors.onPrimary, fontWeight: "600" },
  inlineErr: {
    color: colors.hot,
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  bubbleWrap: {
    width: "100%",
    marginBottom: 10,
  },
  bubbleWrapUser: {
    alignItems: "flex-end",
  },
  bubbleWrapBot: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleUserGrad: {
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: "#121218",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageTextUser: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onPrimary,
  },
  messageTextBot: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  metaUser: {
    marginTop: 6,
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    alignSelf: "flex-end",
    fontVariant: ["tabular-nums"],
  },
  metaBot: {
    marginTop: 6,
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
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
    width: "22%",
    minWidth: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  emojiGlyph: { fontSize: 24 },
});
