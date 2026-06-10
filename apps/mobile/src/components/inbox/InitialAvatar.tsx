import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { inbox } from "../../theme/inbox";

type Props = {
  uri?: string | null;
  initials: string;
  size?: number;
};

export function InitialAvatar({ uri, initials, size = 52 }: Props) {
  const fontSize = size * 0.36;
  if (uri) {
    return (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    );
  }
  return (
    <LinearGradient
      colors={[inbox.purple, inbox.bubbleSentEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.initials, { fontSize }]} numberOfLines={1}>
        {initials.slice(0, 2)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
