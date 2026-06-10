import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUESTIONNAIRE_HEADINGS } from "../business/questionnaireShared";
import { colors } from "../theme/colors";
import type { EditProfileHubScreenProps } from "../navigation/types";

const PROFILE_BG = "#0B0812";
const CARD_BG = "#15121B";

export default function EditProfileHubScreen({ navigation }: EditProfileHubScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: PROFILE_BG }]}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 28,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lead}>
        Choose a section to update. Each screen has its own save button.
      </Text>

      <Text style={styles.sectionLabel}>Sections</Text>
      <MenuRow
        icon="person-outline"
        label="User details"
        onPress={() => navigation.navigate("EditProfileUserDetails")}
      />
      {([0, 1, 2, 3] as const).map((pageIndex) => (
        <MenuRow
          key={pageIndex}
          icon="briefcase-outline"
          label={QUESTIONNAIRE_HEADINGS[pageIndex]}
          onPress={() => navigation.navigate("EditProfileQuestionnaire", { pageIndex })}
        />
      ))}
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={colors.accent} style={styles.menuIcon} />
      <View style={styles.menuTextCol}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  lead: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  menuCardPressed: {
    opacity: 0.92,
    backgroundColor: "#1a1722",
  },
  menuIcon: { marginRight: 14 },
  menuTextCol: { flex: 1, marginRight: 8 },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  menuSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
});
