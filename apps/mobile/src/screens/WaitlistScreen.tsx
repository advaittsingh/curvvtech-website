import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import {
  AUTH_CONTENT_TOP,
  AUTH_CTA_HEIGHT,
  AUTH_PAD_H,
  AUTH_TEXT_INSET,
  useMontserratUiFonts,
} from "../theme/authUi";
import type { WaitlistScreenProps } from "../navigation/types";

export default function WaitlistScreen({ route }: WaitlistScreenProps) {
  const insets = useSafeAreaInsets();
  const f = useMontserratUiFonts();
  const { position } = route.params;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.emoji}>🚀</Text>
        <Text style={[styles.brand, f.brand ? { fontFamily: f.brand } : null]}>FollowUp</Text>
        <Text style={[styles.title, f.title ? { fontFamily: f.title } : null]}>{"You're in the queue"}</Text>
        <Text style={[styles.position, f.cta ? { fontFamily: f.cta } : null]}>Position #{position}</Text>
        <Text style={[styles.body, f.body ? { fontFamily: f.body } : null]}>
          {"We're onboarding users in batches. We'll notify you when it's your turn."}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Pressable style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]} onPress={() => {}}>
          <Text style={[styles.outlineBtnText, f.cta ? { fontFamily: f.cta } : null]}>Refer friends</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: AUTH_CONTENT_TOP,
    paddingHorizontal: AUTH_PAD_H,
    paddingBottom: 24,
    alignItems: "flex-start",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
    marginLeft: AUTH_TEXT_INSET,
  },
  brand: {
    marginHorizontal: AUTH_TEXT_INSET,
    marginBottom: 6,
    fontSize: 20,
    color: colors.textPrimary,
  },
  title: {
    marginHorizontal: AUTH_TEXT_INSET,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  position: {
    marginHorizontal: AUTH_TEXT_INSET,
    fontSize: 18,
    color: colors.primary,
    marginBottom: 16,
  },
  body: {
    marginHorizontal: AUTH_TEXT_INSET,
    fontSize: 16,
    lineHeight: 25,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: AUTH_PAD_H,
    paddingTop: 12,
    backgroundColor: colors.bg,
  },
  outlineBtn: {
    height: AUTH_CTA_HEIGHT,
    borderRadius: AUTH_CTA_HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  pressed: { opacity: 0.88 },
});
