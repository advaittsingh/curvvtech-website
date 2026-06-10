import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logoutRemote } from "../services/api";
import { authStorage } from "../services/authStorage";
import { appStorage } from "../storage/appStorage";
import { navigationRef } from "../navigation/navigationRef";
import { colors } from "../theme/colors";
import type { SettingsScreenProps } from "../navigation/types";

export default function SettingsScreen(_props: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [notif, setNotif] = useState(true);

  const load = useCallback(async () => {
    setNotif(await appStorage.getNotificationsEnabled());
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleNotif = async (v: boolean) => {
    setNotif(v);
    await appStorage.setNotificationsEnabled(v);
  };

  const logout = () => {
    Alert.alert("Log out?", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logoutRemote();
          await authStorage.clearTokens();
          await appStorage.clearSession();
          navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "AuthChoice" }],
            })
          );
        },
      },
    ]);
  };

  return (
    <View style={[styles.wrap, { paddingTop: 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Notifications</Text>
          <Text style={styles.rowSub}>Reminders for follow-ups (local preference)</Text>
        </View>
        <Switch
          value={notif}
          onValueChange={toggleNotif}
          trackColor={{ false: colors.border, true: colors.accentMuted }}
          thumbColor={notif ? colors.onPrimary : colors.textMuted}
        />
      </View>
      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  logout: {
    borderWidth: 1,
    borderColor: colors.hot,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: colors.hot, fontWeight: "600", fontSize: 16 },
});
