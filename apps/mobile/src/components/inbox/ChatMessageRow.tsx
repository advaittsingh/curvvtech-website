import { Ionicons } from "@expo/vector-icons";
import { setStringAsync } from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { InboxMessage } from "../../services/inboxApi";
import { colors } from "../../theme/colors";
import { inbox } from "../../theme/inbox";
import { formatChatBubbleTime } from "../../utils/chatTime";
import { splitReplyFromBody } from "../../utils/inboxReplyFormat";
import { deliveryMeta } from "./messageTicks";

type Props = {
  item: InboxMessage;
  onReply?: () => void;
  /** Previous message in list is older (same sender = tighter cluster). */
  compactTop?: boolean;
};

export function ChatMessageRow({ item, onReply, compactTop = false }: Props) {
  const mine = item.sender === "business";
  const rawBody = item.body?.trim() ? item.body : "(No text)";
  const { quote, main: displayBody } = splitReplyFromBody(rawBody);
  const body = displayBody.trim() ? displayBody : rawBody;
  const meta = deliveryMeta(item.delivery_status);
  const isImage = item.message_type === "image";
  const isAudio = item.message_type === "audio";
  const timeLabel = formatChatBubbleTime(item.created_at);

  const onLongPress = () => {
    Alert.alert("Message", undefined, [
      {
        text: "Reply",
        onPress: () => onReply?.(),
      },
      {
        text: "Copy",
        onPress: () => void setStringAsync(rawBody),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Not available", "Deleting messages from this device will be supported once the server supports it."),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[styles.wrap, mine ? styles.wrapMine : styles.wrapTheirs, compactTop ? styles.wrapTight : styles.wrapGap]}
    >
      {mine ? (
        <LinearGradient
          colors={[inbox.purple, inbox.bubbleSentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bubbleMine}
        >
          {quote ? (
            <View style={styles.replyPreviewMine}>
              <Text style={styles.replyPreviewTextMine} numberOfLines={3}>
                {quote}
              </Text>
            </View>
          ) : null}
          {isImage ? (
            <View style={styles.mediaRow}>
              <Ionicons name="image" size={20} color="#FFF" />
              <Text style={styles.bubbleTextMine}>Photo</Text>
            </View>
          ) : isAudio ? (
            <View style={styles.mediaRow}>
              <Ionicons name="mic" size={20} color="#FFF" />
              <Text style={styles.bubbleTextMine}>Voice message</Text>
            </View>
          ) : (
            <Text style={styles.bubbleTextMine}>{body}</Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.timeMine}>{timeLabel}</Text>
            <Text style={[styles.ticks, { color: meta.tickColor }]}>{meta.ticks}</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.bubbleTheirs}>
          {quote ? (
            <View style={styles.replyPreviewTheirs}>
              <Text style={styles.replyPreviewTextTheirs} numberOfLines={3}>
                {quote}
              </Text>
            </View>
          ) : null}
          {isImage ? (
            <View style={styles.mediaRowTheirs}>
              <Ionicons name="image" size={20} color={colors.textPrimary} />
              <Text style={styles.bubbleTextTheirs}>Photo</Text>
            </View>
          ) : isAudio ? (
            <View style={styles.mediaRowTheirs}>
              <Ionicons name="mic" size={20} color={colors.textPrimary} />
              <Text style={styles.bubbleTextTheirs}>Voice message</Text>
            </View>
          ) : (
            <Text style={styles.bubbleTextTheirs}>{body}</Text>
          )}
          <Text style={styles.timeTheirs}>{timeLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: "88%",
  },
  wrapGap: {
    marginTop: 10,
  },
  wrapTight: {
    marginTop: 2,
  },
  wrapMine: { alignSelf: "flex-end" },
  wrapTheirs: { alignSelf: "flex-start" },
  bubbleMine: {
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleTheirs: {
    backgroundColor: inbox.bubbleReceived,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  bubbleTextMine: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  bubbleTextTheirs: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaRowTheirs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 6,
  },
  timeMine: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    fontVariant: ["tabular-nums"],
  },
  ticks: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeTheirs: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  replyPreviewMine: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(255,255,255,0.55)",
    paddingLeft: 8,
    marginBottom: 8,
  },
  replyPreviewTextMine: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 16,
  },
  replyPreviewTheirs: {
    borderLeftWidth: 3,
    borderLeftColor: inbox.purple,
    paddingLeft: 8,
    marginBottom: 8,
  },
  replyPreviewTextTheirs: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
