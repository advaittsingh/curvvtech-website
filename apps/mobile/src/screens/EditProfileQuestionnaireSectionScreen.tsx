import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  pageValid,
  questionnaireFromProfile,
  questionnaireToProfile,
} from "../business/questionnaireShared";
import { QuestionnairePageFields } from "../components/QuestionnaireSections";
import { KeyboardWrapper } from "../components/KeyboardWrapper";
import { patchServerBusiness } from "../services/api";
import { appStorage, type BusinessQuestionnaire } from "../storage/appStorage";
import { colors } from "../theme/colors";
import { AUTH_PAD_H, useMontserratUiFonts } from "../theme/authUi";
import type { EditProfileQuestionnaireSectionScreenProps } from "../navigation/types";

const CARD_BG = "#15121B";

export default function EditProfileQuestionnaireSectionScreen({
  route,
}: EditProfileQuestionnaireSectionScreenProps) {
  const { pageIndex } = route.params;
  const insets = useSafeAreaInsets();
  const f = useMontserratUiFonts();
  const [q, setQ] = useState<BusinessQuestionnaire>(() => questionnaireFromProfile(null));

  const load = useCallback(async () => {
    const p = await appStorage.getBusinessProfile();
    setQ(questionnaireFromProfile(p));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const bodyFont = useMemo(() => (f.body ? { fontFamily: f.body } : null), [f.body]);

  const save = async () => {
    if (!pageValid(pageIndex, q)) {
      Alert.alert("Incomplete", "Please fill all required fields in this section before saving.");
      return;
    }
    const profile = questionnaireToProfile(q);
    await appStorage.setBusinessProfile(profile);
    try {
      await patchServerBusiness(profile);
    } catch (e) {
      if (__DEV__) console.warn("business sync", e);
    }
    Alert.alert("Saved", "Business questionnaire was updated.");
  };

  const bottomInset = Math.max(insets.bottom, 24) + 20;

  return (
    <KeyboardWrapper
      style={styles.flex}
      contentContainerStyle={styles.scrollInner}
      bottomInset={bottomInset}
      showsVerticalScrollIndicator
    >
      <View style={styles.sectionCard}>
        <QuestionnairePageFields
          pageIndex={pageIndex}
          q={q}
          setQ={setQ}
          bodyFont={bodyFont}
        />
        <Pressable style={styles.primaryBtn} onPress={save}>
          <Text style={styles.primaryBtnText}>Save</Text>
        </Pressable>
      </View>
    </KeyboardWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scrollInner: {
    paddingHorizontal: AUTH_PAD_H,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: colors.onPrimary, fontWeight: "600", fontSize: 16 },
});
