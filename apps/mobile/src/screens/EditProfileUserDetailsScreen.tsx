import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardWrapper } from "../components/KeyboardWrapper";
import {
  fetchServerProfile,
  patchServerProfile,
  profileToServerPatch,
} from "../services/api";
import {
  appStorage,
  type UserProfileDetails,
  defaultUserProfileDetails,
} from "../storage/appStorage";
import { colors } from "../theme/colors";
import { AUTH_PAD_H, useMontserratUiFonts } from "../theme/authUi";
import { displayNameFromIdentifier } from "../utils/profileDisplay";
import { pickImage } from "../utils/pickImage";
import type { EditProfileUserDetailsScreenProps } from "../navigation/types";

const CARD_BG = "#15121B";

export default function EditProfileUserDetailsScreen(_props: EditProfileUserDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const f = useMontserratUiFonts();
  const [details, setDetails] = useState<UserProfileDetails>(() => defaultUserProfileDetails());

  const load = useCallback(async () => {
    const [u, stored] = await Promise.all([
      appStorage.getUserData(),
      appStorage.getUserProfileDetails(),
    ]);
    const base = defaultUserProfileDetails(stored ?? undefined);
    if (!base.email.trim() && u?.identifier?.includes("@")) {
      base.email = u.identifier.trim();
    }
    if (!base.displayName.trim() && u?.identifier) {
      base.displayName = displayNameFromIdentifier(u.identifier);
    }
    try {
      const s = await fetchServerProfile();
      if (s.display_name.trim()) base.displayName = s.display_name;
      if (s.phone.trim()) base.phone = s.phone;
      if (s.email.trim()) base.email = s.email;
      if (s.business_address.trim()) base.businessAddress = s.business_address;
      if (s.business_website.trim()) base.businessWebsite = s.business_website;
      if (s.id_verification_status) {
        base.idVerificationStatus = s.id_verification_status as UserProfileDetails["idVerificationStatus"];
      }
    } catch {
      /* offline, unauthorized, or API unavailable */
    }
    setDetails(base);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const bodyFont = useMemo(() => (f.body ? { fontFamily: f.body } : null), [f.body]);

  const saveUserDetails = async () => {
    await appStorage.setUserProfileDetails(details);
    try {
      await patchServerProfile(profileToServerPatch(details));
    } catch (e) {
      if (__DEV__) console.warn("profile sync", e);
    }
    Alert.alert("Saved", "Your details were updated.");
  };

  const onPickGovId = async () => {
    const uri = await pickImage({ aspect: [4, 3] });
    if (!uri) return;
    setDetails((d) => {
      const next = { ...d, idDocumentUri: uri, idVerificationStatus: "pending" as const };
      void appStorage.setUserProfileDetails(next);
      return next;
    });
    Alert.alert(
      "ID submitted",
      "Thanks. Our team will review your document. Your badge will turn purple once verified."
    );
  };

  const markVerifiedPreview = () => {
    Alert.alert(
      "Mark as verified?",
      "Use this only after FollowUp has approved your government ID.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark verified",
          onPress: () => {
            setDetails((prev) => {
              const next = { ...prev, idVerificationStatus: "verified" as const };
              void appStorage.setUserProfileDetails(next);
              return next;
            });
          },
        },
      ]
    );
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
        <LabeledInput
          label="Name"
          value={details.displayName}
          onChangeText={(t) => setDetails((d) => ({ ...d, displayName: t }))}
          bodyFont={bodyFont}
        />
        <LabeledInput
          label="Phone number"
          value={details.phone}
          onChangeText={(t) => setDetails((d) => ({ ...d, phone: t }))}
          keyboardType="phone-pad"
          bodyFont={bodyFont}
        />
        <LabeledInput
          label="Email"
          value={details.email}
          onChangeText={(t) => setDetails((d) => ({ ...d, email: t }))}
          keyboardType="email-address"
          autoCapitalize="none"
          bodyFont={bodyFont}
        />
        <LabeledInput
          label="Business address"
          value={details.businessAddress}
          onChangeText={(t) => setDetails((d) => ({ ...d, businessAddress: t }))}
          multiline
          bodyFont={bodyFont}
        />
        <LabeledInput
          label="Business website"
          value={details.businessWebsite}
          onChangeText={(t) => setDetails((d) => ({ ...d, businessWebsite: t }))}
          keyboardType="url"
          autoCapitalize="none"
          bodyFont={bodyFont}
        />

        <Text style={[styles.subheading, bodyFont]}>Government ID</Text>
        <Text style={[styles.hint, bodyFont]}>
          Upload a clear photo of your ID for verification. Badge on your profile updates when
          approved.
        </Text>
        <Pressable style={styles.secondaryBtn} onPress={onPickGovId}>
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
          <Text style={styles.secondaryBtnText}>
            {details.idDocumentUri ? "Replace ID photo" : "Upload government ID"}
          </Text>
        </Pressable>
        {details.idVerificationStatus === "pending" && (
          <Pressable style={styles.linkBtn} onPress={markVerifiedPreview}>
            <Text style={styles.linkBtnText}>Mark as verified (after approval)</Text>
          </Pressable>
        )}

        <Pressable style={styles.primaryBtn} onPress={saveUserDetails}>
          <Text style={styles.primaryBtnText}>Save</Text>
        </Pressable>
      </View>
    </KeyboardWrapper>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  autoCapitalize,
  bodyFont,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences";
  bodyFont: { fontFamily: string } | null;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, bodyFont]}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 88, textAlignVertical: "top" }, bodyFont]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textMuted}
      />
    </View>
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
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginTop: 8,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
    color: colors.text,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: colors.onPrimary, fontWeight: "600", fontSize: 16 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  secondaryBtnText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 15,
  },
  linkBtn: { paddingVertical: 8, alignItems: "center" },
  linkBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
