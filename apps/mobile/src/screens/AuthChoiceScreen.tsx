import React, { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { getOnboardingHeroHeight, heroImageWidth } from "../theme/heroLayout";
import {
  AUTH_CONTENT_TOP,
  AUTH_CTA_HEIGHT,
  AUTH_HERO_IMAGE,
  AUTH_PAD_H,
  AUTH_TEXT_INSET,
  useMontserratUiFonts,
} from "../theme/authUi";
import type { AuthChoiceScreenProps } from "../navigation/types";

export default function AuthChoiceScreen({ navigation }: AuthChoiceScreenProps) {
  const insets = useSafeAreaInsets();
  const f = useMontserratUiFonts();

  const heroImageHeight = useMemo(
    () => getOnboardingHeroHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={{ uri: AUTH_HERO_IMAGE }}
          style={[styles.hero, { height: heroImageHeight, width: heroImageWidth }]}
          resizeMode="cover"
        />
        <Text style={[styles.brand, f.brand ? { fontFamily: f.brand } : null]}>FollowUp</Text>
        <Text style={[styles.title, f.title ? { fontFamily: f.title } : null]}>
          How would you like to continue?
        </Text>
        <Text style={[styles.sub, f.body ? { fontFamily: f.body } : null]}>
          Continue to set up your workspace and start managing your leads.
          {"\n\n"}
          Sign in if you've used FollowUp before, or create a new account.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate("Auth", { flow: "signup" })}
          >
            <Text style={[styles.primaryText, f.cta ? { fontFamily: f.cta } : null]}>Sign up</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate("Auth", { flow: "signin" })}
          >
            <Text style={[styles.secondaryText, f.cta ? { fontFamily: f.cta } : null]}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: AUTH_CONTENT_TOP,
    paddingHorizontal: AUTH_PAD_H,
    paddingBottom: 20,
  },
  hero: {
    alignSelf: "center",
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 80,
  },
  brand: {
    marginTop: 24,
    marginHorizontal: AUTH_TEXT_INSET,
    marginBottom: 6,
    fontSize: 20,
    color: colors.textPrimary,
  },
  title: {
    marginHorizontal: AUTH_TEXT_INSET,
    fontSize: 32,
    color: colors.textPrimary,
  },
  sub: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    lineHeight: 25,
    marginLeft: AUTH_TEXT_INSET,
    marginBottom: 4,
  },
  footer: {
    paddingHorizontal: AUTH_PAD_H,
    paddingTop: 12,
    backgroundColor: colors.bg,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  primaryBtn: {
    flex: 1,
    height: AUTH_CTA_HEIGHT,
    borderRadius: AUTH_CTA_HEIGHT / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 16,
    color: colors.onPrimary,
  },
  secondaryBtn: {
    flex: 1,
    height: AUTH_CTA_HEIGHT,
    borderRadius: AUTH_CTA_HEIGHT / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  pressed: { opacity: 0.88 },
});
