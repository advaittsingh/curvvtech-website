import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardWrapper } from "../components/KeyboardWrapper";
import { useLeads } from "../context/LeadsContext";
import { createLead, type ParseLeadResponse } from "../services/api";
import { colors } from "../theme/colors";
import { statusToLabel } from "../utils/leadDisplay";
import type { AddChatScreenProps } from "../navigation/types";

type Phase = "input" | "saving" | "result";

export default function AddChatScreen({ navigation, route }: AddChatScreenProps) {
  const insets = useSafeAreaInsets();
  const { refresh } = useLeads();
  const initial = route.params?.sharedText ?? "";
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState(initial);
  const [result, setResult] = useState<ParseLeadResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const runParseLead = async () => {
    const t = text.trim();
    if (!t) return;
    setErr(null);
    setPhase("saving");
    try {
      const data = await createLead(t);
      setResult(data);
      await refresh();
      setPhase("result");
    } catch (e) {
      setPhase("input");
      setErr(e instanceof Error ? e.message : "Could not parse lead");
    }
  };

  const onDone = () => {
    navigation.popToTop();
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Close</Text>
      </Pressable>

      {phase === "input" && (
        <KeyboardWrapper style={styles.fill} bottomInset={insets.bottom + 20}>
          <Text style={styles.title}>Add chat</Text>
          <Text style={styles.hint}>
            Paste a WhatsApp conversation or notes. We’ll extract a lead using FollowUp’s servers.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Chat text…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable
            style={[styles.btn, !text.trim() && styles.btnDisabled]}
            onPress={runParseLead}
            disabled={!text.trim()}
          >
            <Text style={styles.btnText}>Save lead</Text>
          </Pressable>
        </KeyboardWrapper>
      )}

      {phase === "saving" && (
        <View style={styles.center}>
          <Text style={styles.analyzingTitle}>Parsing with AI…</Text>
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
        </View>
      )}

      {phase === "result" && result && (
        <View style={styles.preview}>
          <Text style={styles.title}>Lead saved</Text>
          <Text style={styles.subHint}>Here’s what we stored from your text.</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{result.contact_name}</Text>
            <Text style={styles.label}>Summary</Text>
            <Text style={styles.value}>{result.summary}</Text>
            <Text style={styles.label}>Intent</Text>
            <Text style={[styles.intent, { color: colors.accent }]}>
              {statusToLabel(result.status)}
            </Text>
          </View>
          <Pressable style={styles.btn} onPress={onDone}>
            <Text style={styles.btnText}>Done</Text>
          </Pressable>
          <Pressable
            style={[styles.btnSecondary, { marginTop: 12 }]}
            onPress={() => {
              setResult(null);
              setPhase("input");
            }}
          >
            <Text style={styles.btnSecondaryText}>Add another</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  fill: { flex: 1 },
  back: { alignSelf: "flex-start", marginBottom: 12 },
  backText: { color: colors.accent, fontSize: 16 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  subHint: { color: colors.textMuted, marginBottom: 16, fontSize: 14 },
  hint: { color: colors.textMuted, marginBottom: 16, fontSize: 14 },
  input: {
    minHeight: 160,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: colors.onPrimary, fontWeight: "600", fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 80 },
  analyzingTitle: { fontSize: 18, color: colors.text, fontWeight: "600" },
  preview: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  label: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginTop: 10 },
  value: { fontSize: 15, color: colors.text, marginTop: 4, lineHeight: 22 },
  intent: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  btnSecondary: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  btnSecondaryText: { color: colors.text, fontWeight: "600", fontSize: 16 },
  err: { color: colors.hot, marginBottom: 12 },
});
