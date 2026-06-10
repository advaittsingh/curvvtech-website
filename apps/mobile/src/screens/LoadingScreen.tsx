import axios from "axios";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMe, tryRefreshAccessToken } from "../services/api";
import { hydrateLocalUserCacheFromServer } from "../services/profileSync";
import { authStorage } from "../services/authStorage";
import { appStorage } from "../storage/appStorage";
import { colors } from "../theme/colors";
import { AUTH_PAD_H, useMontserratUiFonts } from "../theme/authUi";
import type { LoadingScreenProps } from "../navigation/types";

const MESSAGES = [
  "Setting up your workspace...",
  "Preparing smart follow-ups...",
] as const;

export default function LoadingScreen({ navigation }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const f = useMontserratUiFonts();
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const flip = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1200);
    return () => clearInterval(flip);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [slides, signedIn, userInitial, businessDone] = await Promise.all([
        appStorage.getOnboardingSlidesDone(),
        appStorage.getSignedIn(),
        appStorage.getUserData(),
        appStorage.getBusinessDone(),
      ]);
      let user = userInitial;

      if (cancelled) return;

      if (signedIn && user) {
        const access = await authStorage.getAccessToken();
        if (!access) {
          await tryRefreshAccessToken();
        }
        try {
          const me = await fetchMe({ timeout: 8000 });
          user = {
            identifier: me.email || user.identifier,
            accessAllowed: me.access_allowed,
            waitlistPosition: me.waitlist_position ?? undefined,
          };
          await appStorage.setUserData(user);
          await hydrateLocalUserCacheFromServer();
        } catch (e) {
          // Only treat a real 401 from the server as logged out (refresh already attempted via api client).
          if (axios.isAxiosError(e) && e.response?.status === 401) {
            await authStorage.clearTokens();
            await appStorage.setSignedIn(false);
            if (!cancelled) navigation.replace("AuthChoice");
            return;
          }
          // Network / timeout / 5xx: keep local session and continue with cached profile (screens refetch).
        }
      }

      if (!slides) {
        navigation.replace("Onboarding");
        return;
      }
      if (!signedIn || !user) {
        navigation.replace("AuthChoice");
        return;
      }
      if (!user.accessAllowed) {
        navigation.replace("Waitlist", {
          position: user.waitlistPosition ?? 101,
        });
        return;
      }
      if (!businessDone) {
        navigation.replace("BusinessOnboarding");
        return;
      }
      navigation.replace("Main", { screen: "Tabs", params: { screen: "HomeTab" } });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, f.body ? { fontFamily: f.body } : null]}>{MESSAGES[msgIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AUTH_PAD_H,
  },
  text: {
    marginTop: 28,
    fontSize: 16,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
