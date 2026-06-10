import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardWrapper } from "../components/KeyboardWrapper";
import {
  describeAuthHttpError,
  fetchMe,
  loginPassword,
  signupPassword,
} from "../services/api";
import { authStorage } from "../services/authStorage";
import { appStorage } from "../storage/appStorage";
import { colors } from "../theme/colors";
import { heroImageWidth } from "../theme/heroLayout";
import {
  AUTH_CTA_HEIGHT,
  AUTH_HERO_IMAGE,
  AUTH_PAD_H,
  AUTH_TEXT_INSET,
  useMontserratUiFonts,
} from "../theme/authUi";
import type { AuthScreenProps } from "../navigation/types";

const MIN_PASSWORD_LEN = 6;

export default function AuthScreen({ navigation, route }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const f = useMontserratUiFonts();
  const flow = route.params?.flow ?? "signin";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);

  /** Shorter hero on phones so the form + CTA fit and scroll reliably above the keyboard. */
  const heroImageHeight = Math.round(Math.min(winH * 0.24, 200));

  const idOk = identifier.trim().length > 0;
  const passOk = password.length >= MIN_PASSWORD_LEN;
  const canSubmit = idOk && passOk && !busy;

  const onForgotPassword = () => {
    Alert.alert(
      "Forgot password?",
      "When FollowUp is connected to an account server, you’ll reset your password by email or SMS. In this preview, try signing up again or use any password with 6+ characters to continue.",
      [{ text: "OK" }]
    );
  };

  const navigateAfterSession = async () => {
    const existing = await appStorage.getUserData();
    if (!existing?.accessAllowed) {
      navigation.replace("Waitlist", { position: existing?.waitlistPosition ?? 101 });
      return;
    }
    const biz = await appStorage.getBusinessDone();
    if (!biz) {
      navigation.replace("BusinessOnboarding");
      return;
    }
    navigation.replace("Main", { screen: "Tabs", params: { screen: "HomeTab" } });
  };

  const onContinue = async () => {
    const id = identifier.trim();
    if (!canSubmit || submitLock.current) return;
    const email = id.toLowerCase();
    if (!email.includes("@")) {
      Alert.alert("Use your email", "Sign in with the email address you used to register.");
      return;
    }
    submitLock.current = true;
    setBusy(true);
    try {
      let payload;
      try {
        payload =
          flow === "signup"
            ? await signupPassword(email, password)
            : await loginPassword(email, password);
      } catch (e) {
        const { title, message } = describeAuthHttpError(e, flow === "signup" ? "signup" : "signin");
        Alert.alert(title, message);
        return;
      }

      await authStorage.setTokens(
        payload.access_token,
        payload.refresh_token,
        payload.expires_in
      );

      try {
        const me = await fetchMe();
        await appStorage.setUserData({
          identifier: me.email || email,
          accessAllowed: me.access_allowed,
          waitlistPosition: me.waitlist_position ?? undefined,
        });
      } catch (e) {
        Alert.alert(
          "Couldn’t load your profile",
          describeAuthHttpError(e, flow === "signup" ? "signup" : "signin").message
        );
        return;
      }
      await appStorage.setSignedIn(true);
      await navigateAfterSession();
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  const hintCopy =
    flow === "signin"
      ? "Enter your email and password. You’ll stay signed in on this device."
      : "Use your work email and a password (6+ characters).";

  const bottomInset = Math.max(insets.bottom, 20) + AUTH_CTA_HEIGHT + 20;

  return (
    <KeyboardWrapper
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      bottomInset={bottomInset}
    >
      <View style={styles.formColumn}>
        <Text style={[styles.brand, f.brand ? { fontFamily: f.brand } : null]}>FollowUp</Text>

        <RNImage
          source={{ uri: AUTH_HERO_IMAGE }}
          style={[styles.hero, { height: heroImageHeight, width: heroImageWidth }]}
          resizeMode="cover"
        />

        <Text style={[styles.title, f.title ? { fontFamily: f.title } : null]}>
          {flow === "signup" ? "Sign up" : "Sign in"}
        </Text>
        <Text style={[styles.hint, f.body ? { fontFamily: f.body } : null]}>{hintCopy}</Text>

        <Text style={[styles.fieldLabel, f.cta ? { fontFamily: f.cta } : null]}>Email</Text>
        <TextInput
          style={[styles.input, f.body ? { fontFamily: f.body } : null]}
          placeholder="you@business.com"
          placeholderTextColor={colors.textMuted}
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced, f.cta ? { fontFamily: f.cta } : null]}>
          Password
        </Text>
        <TextInput
          style={[styles.input, f.body ? { fontFamily: f.body } : null]}
          placeholder="Enter your password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={flow === "signin" ? "password" : "newPassword"}
        />

        {flow === "signin" ? (
          <View style={styles.linkRow}>
            <Pressable
              onPress={() => navigation.navigate("Auth", { flow: "signup" })}
              style={({ pressed }) => [styles.linkPill, pressed && styles.pressed]}
            >
              <Text style={[styles.linkRowText, f.body ? { fontFamily: f.body } : null]}>
                New? <Text style={[styles.linkEm, f.cta ? { fontFamily: f.cta } : null]}>Sign up</Text>
              </Text>
            </Pressable>
            <Pressable
              onPress={onForgotPassword}
              style={({ pressed }) => [styles.linkPill, pressed && styles.pressed]}
              hitSlop={6}
            >
              <Text style={[styles.forgotInline, f.cta ? { fontFamily: f.cta } : null]}>Forgot password?</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => navigation.navigate("Auth", { flow: "signin" })}
            style={({ pressed }) => [styles.switchRowSignup, pressed && styles.pressed]}
          >
            <Text style={[styles.switchText, f.body ? { fontFamily: f.body } : null]}>
              Already have an account?{" "}
              <Text style={[styles.switchEm, f.cta ? { fontFamily: f.cta } : null]}>Sign in</Text>
            </Text>
          </Pressable>
        )}

        {flow === "signup" ? (
          <Text style={[styles.helper, f.body ? { fontFamily: f.body } : null]}>
            By continuing, you agree to use this preview responsibly.
          </Text>
        ) : null}

        <View style={styles.ctaWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              !canSubmit && styles.ctaDisabled,
              pressed && canSubmit && styles.pressed,
            ]}
            onPress={onContinue}
            disabled={!canSubmit}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.ctaText, f.cta ? { fontFamily: f.cta } : null]}>
                {flow === "signin" ? "Sign in" : "Create account"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: AUTH_PAD_H,
    paddingTop: 10,
  },
  formColumn: {
    alignSelf: "stretch",
  },
  hero: {
    alignSelf: "center",
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 80,
    marginTop: 12,
  },
  brand: {
    alignSelf: "stretch",
    textAlign: "center",
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 0,
    letterSpacing: -0.2,
  },
  title: {
    marginHorizontal: AUTH_TEXT_INSET,
    marginTop: 16,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    marginHorizontal: AUTH_TEXT_INSET,
    marginBottom: 14,
  },
  fieldLabel: {
    marginHorizontal: AUTH_TEXT_INSET,
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  fieldLabelSpaced: {
    marginTop: 4,
  },
  input: {
    marginHorizontal: AUTH_TEXT_INSET,
    marginBottom: 4,
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: AUTH_TEXT_INSET,
    marginTop: 10,
    gap: 8,
  },
  linkPill: {
    paddingVertical: 4,
    flexShrink: 1,
  },
  linkRowText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  linkEm: {
    color: colors.accentSecondary,
  },
  forgotInline: {
    fontSize: 14,
    color: colors.accentSecondary,
  },
  switchRowSignup: {
    marginHorizontal: AUTH_TEXT_INSET,
    marginTop: 10,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  switchText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  switchEm: {
    color: colors.accentSecondary,
  },
  helper: {
    marginHorizontal: AUTH_TEXT_INSET,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  ctaWrap: {
    marginTop: 28,
    alignSelf: "stretch",
  },
  cta: {
    height: AUTH_CTA_HEIGHT,
    borderRadius: AUTH_CTA_HEIGHT / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { fontSize: 16, color: colors.onPrimary },
  pressed: { opacity: 0.88 },
});
