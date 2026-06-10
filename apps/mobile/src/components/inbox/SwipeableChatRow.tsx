import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { colors } from "../../theme/colors";
import { inbox } from "../../theme/inbox";

type Props = {
  children: React.ReactNode;
  onReply: () => void;
  enabled?: boolean;
};

export function SwipeableChatRow({ children, onReply, enabled = true }: Props) {
  const ref = useRef<Swipeable>(null);

  const renderLeftActions = () => (
    <View style={styles.leftActions}>
      <Pressable
        style={styles.replyPill}
        onPress={() => {
          ref.current?.close();
          onReply();
        }}
        accessibilityLabel="Reply"
      >
        <Ionicons name="return-down-back" size={20} color={colors.onPrimary} style={styles.replyIcon} />
        <Text style={styles.replyText}>Reply</Text>
      </Pressable>
    </View>
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={ref}
      friction={2}
      leftThreshold={56}
      renderLeftActions={renderLeftActions}
      overshootLeft={false}
    >
      <View style={styles.rowWrap}>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    width: "100%",
  },
  leftActions: {
    justifyContent: "center",
    paddingRight: 8,
  },
  replyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: inbox.purple,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
  },
  replyIcon: { marginTop: 1 },
  replyText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
});
