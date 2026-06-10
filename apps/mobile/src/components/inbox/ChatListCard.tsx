import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { EnrichedConversation } from "../../services/inboxConversationDisplay";
import { colors } from "../../theme/colors";
import { inbox } from "../../theme/inbox";
import { formatRelativeTime } from "../../utils/relativeTime";
import { InitialAvatar } from "./InitialAvatar";

type Props = {
  row: EnrichedConversation;
  onPress: () => void;
};

export function ChatListCard({ row, onPress }: Props) {
  const { conversation, displayName, subtitleLine, initials, avatarUri, isLead } = row;
  const unread = conversation.unread_count > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <InitialAvatar uri={avatarUri} initials={initials} size={52} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(conversation.last_message_at)}</Text>
        </View>
        {subtitleLine ? (
          <Text style={styles.phone} numberOfLines={1}>
            {subtitleLine}
          </Text>
        ) : null}
        <View style={styles.previewRow}>
          <Text style={styles.preview} numberOfLines={2}>
            {conversation.last_message_preview?.trim() || " "}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unread_count > 99 ? "99+" : String(conversation.unread_count)}
              </Text>
            </View>
          ) : null}
        </View>
        {isLead ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>Lead</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: inbox.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inbox.cardBorder,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  body: { flex: 1, minWidth: 0 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  time: { fontSize: 12, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  phone: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  previewRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  preview: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  badge: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: inbox.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tag: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    color: inbox.purple,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
