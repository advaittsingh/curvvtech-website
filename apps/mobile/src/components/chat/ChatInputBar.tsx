import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors } from "../../theme/colors";
import { inbox } from "../../theme/inbox";

export type ChatInputBarVariant = "inbox" | "ai";

export type ChatReplyPreview = {
  /** One-line preview of the message being replied to */
  preview: string;
  /** e.g. contact name or "You" */
  authorLabel?: string;
};

type Props = {
  variant: ChatInputBarVariant;
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  sending: boolean;
  onAttach?: () => void;
  onEmoji?: () => void;
  /** WhatsApp-style bar above the composer */
  replyTo?: ChatReplyPreview | null;
  onCancelReply?: () => void;
  /** Extra bottom padding (safe area only; keyboard handled by parent KAV). */
  bottomInset?: number;
  inputRef?: React.RefObject<TextInput | null>;
  textInputProps?: Omit<TextInputProps, "value" | "onChangeText" | "style">;
};

export function ChatInputBar({
  variant,
  value,
  onChangeText,
  onSend,
  sending,
  onAttach,
  onEmoji,
  replyTo,
  onCancelReply,
  bottomInset = 0,
  inputRef,
  textInputProps,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const placeholder = variant === "ai" ? "Type something…" : "Message";

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const canSend = value.trim().length > 0 && !sending;

  const dockShadow = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    android: { elevation: 14 },
  });

  return (
    <View style={[styles.composerDock, dockShadow, { paddingBottom: 6 + bottomInset }]}>
      {replyTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyAccent} />
          <View style={styles.replyBody}>
            <Text style={styles.replyLabel}>
              Replying to{replyTo.authorLabel ? ` ${replyTo.authorLabel}` : ""}
            </Text>
            <Text numberOfLines={2} style={styles.replySnippet}>
              {replyTo.preview}
            </Text>
          </View>
          {onCancelReply ? (
            <Pressable
              onPress={onCancelReply}
              hitSlop={12}
              style={styles.replyDismiss}
              accessibilityLabel="Cancel reply"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={styles.row}>
      {onAttach ? (
        <Pressable onPress={onAttach} style={styles.iconHit} hitSlop={8} accessibilityLabel="Attach">
          <Ionicons name="attach" size={24} color={inbox.purple} />
        </Pressable>
      ) : (
        <View style={styles.iconSpacer} />
      )}
      <View
        style={[
          styles.inputShell,
          variant === "inbox" && styles.inputShellInbox,
          variant === "ai" && styles.inputShellAi,
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, variant === "ai" && styles.inputAi]}
          multiline
          maxLength={variant === "ai" ? 4000 : 4096}
          editable={!sending}
          {...textInputProps}
        />
        {onEmoji ? (
          <Pressable onPress={onEmoji} style={styles.iconInner} hitSlop={8} accessibilityLabel="Emoji">
            <Ionicons name="happy-outline" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={() => {
            if (!canSend) return;
            pulse();
            onSend();
          }}
          disabled={!canSend}
          style={[styles.send, !canSend && styles.sendOff]}
          accessibilityLabel="Send"
        >
          <Ionicons name="send" size={20} color="#FFF" />
        </Pressable>
      </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Raised dock on every chat-style screen so the composer is obviously separate from messages */
  composerDock: {
    backgroundColor: inbox.composerDockBg,
    borderTopWidth: 2,
    borderTopColor: inbox.composerDockTopLine,
    paddingTop: 10,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "stretch",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  replyAccent: {
    width: 4,
    backgroundColor: inbox.purple,
  },
  replyBody: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: inbox.purple,
    marginBottom: 2,
  },
  replySnippet: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  replyDismiss: {
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  iconHit: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  /** Keeps input aligned when attach is hidden (matches attach column width). */
  iconSpacer: { width: 40 },
  inputShell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inbox.cardBorder,
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 44,
    maxHeight: 120,
  },
  inputShellInbox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.28)",
    borderRadius: 24,
  },
  inputShellAi: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.22)",
    borderRadius: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 10,
    lineHeight: 22,
  },
  inputAi: {
    fontSize: 15,
  },
  iconInner: {
    padding: 8,
    marginBottom: 2,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: inbox.purple,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    shadowColor: inbox.purple,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  sendOff: {
    opacity: 0.4,
  },
});
