import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardWrapper } from "../components/KeyboardWrapper";
import {
  QuestionnairePageFields,
  QuestionnaireSectionHeading,
} from "../components/QuestionnaireSections";
import { appStorage, type BusinessQuestionnaire } from "../storage/appStorage";
import { colors } from "../theme/colors";
import {
  AUTH_CONTENT_TOP,
  AUTH_PAD_H,
  AUTH_TEXT_INSET,
  useMontserratUiFonts,
} from "../theme/authUi";
import type { BusinessOnboardingScreenProps } from "../navigation/types";
import {
  initialQuestionnaire,
  pageValid,
  questionnaireToProfile,
} from "../business/questionnaireShared";
import { patchServerBusiness } from "../services/api";

export default function BusinessOnboardingScreen({ navigation }: BusinessOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const kasvRef = useRef<{ scrollToPosition?: (x: number, y: number, animated?: boolean) => void } | null>(
    null
  );
  const f = useMontserratUiFonts();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState<BusinessQuestionnaire>(initialQuestionnaire);

  const canNext = pageValid(page, q);
  const totalPages = 4;

  const next = useCallback(async () => {
    if (page < totalPages - 1) {
      setPage((p) => p + 1);
      return;
    }
    const profile = questionnaireToProfile(q);
    await appStorage.setBusinessProfile(profile);
    try {
      await patchServerBusiness(profile);
    } catch (e) {
      if (__DEV__) console.warn("business sync", e);
    }
    await appStorage.setBusinessDone();
    navigation.replace("Main", { screen: "Tabs", params: { screen: "HomeTab" } });
  }, [navigation, page, q]);

  const bodyFont = useMemo(() => (f.body ? { fontFamily: f.body } : null), [f.body]);
  const titleFont = useMemo(() => (f.title ? { fontFamily: f.title } : null), [f.title]);
  const brandFont = useMemo(() => (f.brand ? { fontFamily: f.brand } : null), [f.brand]);

  const bottomInset = Math.max(insets.bottom, 28) + 24;

  useEffect(() => {
    kasvRef.current?.scrollToPosition?.(0, 0, false);
  }, [page]);

  const pageIndex = page as 0 | 1 | 2 | 3;

  return (
    <View style={[styles.screenRoot, { paddingTop: insets.top }]}>
      <KeyboardWrapper
        ref={kasvRef}
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        bottomInset={bottomInset}
        showsVerticalScrollIndicator
      >
        <Text style={[styles.brand, brandFont]}>FollowUp</Text>
        <View style={styles.progressBarOuter}>
          <View style={styles.progressBarRow}>
            {Array.from({ length: totalPages }, (_, i) => (
              <View
                key={i}
                style={[styles.progressSegment, i <= page && styles.progressSegmentActive]}
              />
            ))}
          </View>
        </View>

        <QuestionnaireSectionHeading pageIndex={pageIndex} titleFont={titleFont} />
        <QuestionnairePageFields pageIndex={pageIndex} q={q} setQ={setQ} bodyFont={bodyFont} />

        <View style={styles.actionsInScroll}>
          <View style={styles.actionsRow}>
            {page > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.actionLink, pressed && styles.actionLinkPressed]}
                onPress={() => setPage((p) => Math.max(0, p - 1))}
              >
                <Text style={[styles.linkBackText, bodyFont]}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
            <Pressable
              style={({ pressed }) => [
                styles.actionLink,
                pressed && canNext && styles.actionLinkPressed,
              ]}
              onPress={next}
              disabled={!canNext}
            >
              <Text
                style={[styles.linkNextText, bodyFont, !canNext && styles.linkNextTextDisabled]}
              >
                {page === totalPages - 1 ? "Complete setup" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingTop: AUTH_CONTENT_TOP,
    paddingHorizontal: AUTH_PAD_H,
  },
  actionsInScroll: {
    marginTop: 28,
    paddingTop: 16,
    paddingHorizontal: AUTH_TEXT_INSET,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  brand: {
    alignSelf: "stretch",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 20,
    color: colors.textPrimary,
  },
  progressBarOuter: {
    marginHorizontal: -AUTH_PAD_H,
    marginBottom: 20,
  },
  progressBarRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: AUTH_PAD_H,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  actionLink: {
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  actionLinkPressed: { opacity: 0.72 },
  linkBackText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  linkNextText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  linkNextTextDisabled: {
    color: colors.textMuted,
    opacity: 0.55,
  },
  backPlaceholder: { minWidth: 52 },
});
