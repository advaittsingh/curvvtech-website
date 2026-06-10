import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import type { PaymentMethodsScreenProps } from "../navigation/types";

const PROFILE_BG = "#0B0812";
const CARD_BG = "#15121B";

/** Placeholder until Razorpay + server-backed tokens exist — no fake stored cards. */
export default function PaymentMethodsScreen({ navigation }: PaymentMethodsScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: 8, paddingBottom: insets.bottom + 24 }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.card}>
        <Ionicons name="time-outline" size={48} color={colors.accentSecondary} style={styles.icon} />
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.body}>
          Saved payment methods aren’t available yet. When billing launches, you’ll add cards or UPI here
          through Razorpay — we’ll never store full card numbers on the device.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PROFILE_BG,
    paddingHorizontal: 20,
  },
  back: { alignSelf: "flex-start", marginBottom: 20 },
  backText: { color: colors.accent, fontSize: 16 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { alignSelf: "center", marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
});
