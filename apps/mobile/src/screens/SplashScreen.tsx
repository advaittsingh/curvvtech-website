import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { useMontserratUiFonts } from "../theme/authUi";
import type { SplashScreenProps } from "../navigation/types";

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const f = useMontserratUiFonts();

  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace("Loading");
    }, 500);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Image source={require("../../icons/app-icon.png")} style={styles.logo} />
      <Text style={[styles.title, f.title ? { fontFamily: f.title } : null]}>FollowUp</Text>
      <Text style={[styles.sub, f.body ? { fontFamily: f.body } : null]}>Chats → leads → reminders</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 20 },
  title: {
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
