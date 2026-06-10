import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = { label?: string };

/** Animated typing dots — drive `visible` from backend / websocket later. */
export function TypingIndicator({ label = "Typing…" }: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [a]);

  const opacities = [0.25, 0.55, 0.9].map((base, i) =>
    a.interpolate({
      inputRange: [0, 0.33, 0.66, 1],
      outputRange:
        i === 0
          ? [base, 0.9, 0.55, base]
          : i === 1
            ? [0.55, base, 0.9, 0.55]
            : [0.9, 0.55, base, 0.9],
    })
  );

  return (
    <View style={styles.row} accessibilityRole="text">
      <View style={styles.dots}>
        {opacities.map((o, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: o }]} />
        ))}
      </View>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});
