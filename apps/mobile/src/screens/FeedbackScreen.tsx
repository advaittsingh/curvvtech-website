import Constants from "expo-constants";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardWrapper } from "../components/KeyboardWrapper";
import { sendFeedback } from "../services/api";
import { colors } from "../theme/colors";
import type { FeedbackScreenProps } from "../navigation/types";

export default function FeedbackScreen({ navigation }: FeedbackScreenProps) {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!message.trim()) {
      Alert.alert("Message required", "Please describe your feedback or issue.");
      return;
    }
    try {
      await sendFeedback({
        subject: subject.trim(),
        message: message.trim(),
        app_version: Constants.expoConfig?.version ?? undefined,
        platform: Platform.OS,
      });
      Alert.alert("Thank you", "We’ve received your message.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(
        "Could not send",
        e instanceof Error ? e.message : "Please try again when you’re online."
      );
    }
  };

  return (
    <KeyboardWrapper
      style={styles.root}
      contentContainerStyle={styles.inner}
      bottomInset={insets.bottom + 24}
    >
      <Text style={styles.lead}>
        Share bugs, ideas, or anything that would make FollowUp better for you.
      </Text>

      <Text style={styles.label}>Subject (optional)</Text>
      <TextInput
        style={styles.input}
        value={subject}
        onChangeText={setSubject}
        placeholder="Short summary"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, styles.labelSpaced]}>Message</Text>
      <TextInput
        style={[styles.input, styles.inputTall]}
        value={message}
        onChangeText={setMessage}
        placeholder="Tell us more…"
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
      />

      <Pressable style={styles.primary} onPress={submit}>
        <Text style={styles.primaryText}>Send feedback</Text>
      </Pressable>

      <Pressable style={styles.ghost} onPress={() => navigation.goBack()}>
        <Text style={styles.ghostText}>Cancel</Text>
      </Pressable>
    </KeyboardWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { paddingHorizontal: 20, paddingTop: 12 },
  lead: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  labelSpaced: { marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputTall: { minHeight: 160, maxHeight: 280 },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: colors.onPrimary, fontWeight: "600", fontSize: 16 },
  ghost: { padding: 16, alignItems: "center" },
  ghostText: { color: colors.textMuted, fontSize: 16 },
});
