import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTenant } from "../context/TenantContext";
import {
  fetchWhatsappSettings,
  patchWhatsappSettings,
} from "../services/api";
import { colors } from "../theme/colors";
import type { WhatsAppSettingsScreenProps } from "../navigation/types";

export default function WhatsAppSettingsScreen({ navigation }: WhatsAppSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { whatsapp_phone_number_id } = await fetchWhatsappSettings(activeTenantId);
      setValue(whatsapp_phone_number_id ?? "");
    } catch (e) {
      Alert.alert("Could not load", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    const trimmed = value.trim();
    setSaving(true);
    try {
      await patchWhatsappSettings(trimmed === "" ? null : trimmed, activeTenantId);
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-settings", activeTenantId] });
      Alert.alert("Saved", "Webhook traffic for this Phone number ID will map to your workspace.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.p}>
          Enter the <Text style={styles.bold}>Phone number ID</Text> (numeric ID from Meta), not your
          customer-facing phone number. Find it in Meta Business Suite → WhatsApp → API setup.
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <>
            <Text style={styles.label}>Phone number ID (from Meta)</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder="Digits only, e.g. 1045769691955096"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, saving && styles.btnDisabled]}
              onPress={() => void onSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Save</Text>
              )}
            </Pressable>
            <Text style={styles.hint}>
              Clear the field and save to unlink. Your webhook URL in Meta must point at this API
              (HTTPS) and use the same verify token as the server.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  p: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  bold: { fontWeight: "700", color: colors.text },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  hint: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  mono: { fontFamily: "Menlo" },
});
