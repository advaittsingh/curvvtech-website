import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef } from "../navigation/navigationRef";
import { logoutRemote } from "../services/api";
import { authStorage } from "../services/authStorage";
import {
  appStorage,
  type IdVerificationStatus,
  type UserProfileDetails,
  defaultUserProfileDetails,
} from "../storage/appStorage";
import { colors } from "../theme/colors";
import { displayNameFromIdentifier, initialsFromName } from "../utils/profileDisplay";
import { pickImage } from "../utils/pickImage";
import type { ProfileTabProps } from "../navigation/types";

const PROFILE_BG = "#0B0812";
const CARD_BG = "#15121B";
const LOGOUT_BG = "#2D1622";
const PRO_BADGE_BG = "#F2C94C";
const PRO_BADGE_TEXT = "#1A1A1A";

const VERIFIED_PURPLE = "#7C3AED";
const PENDING_AMBER = "#F59E0B";
const UNVERIFIED_MUTED = "#71717A";

export default function ProfileScreen({ navigation }: ProfileTabProps) {
  const insets = useSafeAreaInsets();
  const [userIdentifier, setUserIdentifier] = useState<string>("");
  const [details, setDetails] = useState<UserProfileDetails>(() => defaultUserProfileDetails());

  const load = useCallback(async () => {
    const [u, stored] = await Promise.all([
      appStorage.getUserData(),
      appStorage.getUserProfileDetails(),
    ]);
    setUserIdentifier(u?.identifier ?? "");
    const base = defaultUserProfileDetails(stored ?? undefined);
    if (!base.email.trim() && u?.identifier?.includes("@")) {
      base.email = u.identifier.trim();
    }
    if (!base.displayName.trim() && u?.identifier) {
      base.displayName = displayNameFromIdentifier(u.identifier);
    }
    setDetails(base);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const displayName =
    details.displayName.trim() || displayNameFromIdentifier(userIdentifier);
  const emailLine =
    details.email.trim() ||
    (userIdentifier.includes("@") ? userIdentifier.trim() : userIdentifier.trim() || "—");

  const onProfilePhoto = async () => {
    const uri = await pickImage({ aspect: [1, 1] });
    if (!uri) return;
    setDetails((d) => {
      const next = { ...d, profilePhotoUri: uri };
      void appStorage.setUserProfileDetails(next);
      return next;
    });
  };

  const onVerificationBadge = () => {
    const s = details.idVerificationStatus;
    if (s === "verified") {
      Alert.alert("Verified", "Your government ID has been verified.");
      return;
    }
    if (s === "pending") {
      Alert.alert(
        "Verification pending",
        "We’re reviewing your ID. You’ll see a purple badge once it’s approved."
      );
      return;
    }
    Alert.alert("Verify your identity", "Upload a government-issued ID to get verified.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Upload ID",
        onPress: async () => {
          const uri = await pickImage({ aspect: [4, 3] });
          if (!uri) return;
          setDetails((d) => {
            const next = { ...d, idDocumentUri: uri, idVerificationStatus: "pending" as const };
            void appStorage.setUserProfileDetails(next);
            return next;
          });
          Alert.alert(
            "Received",
            "Thanks. Complete verification from Edit profile if you need to mark approval."
          );
        },
      },
      { text: "Edit profile", onPress: () => navigation.getParent()?.navigate("EditProfile") },
    ]);
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

  const parentNav = navigation.getParent();

  return (
    <View style={[styles.wrap, { backgroundColor: PROFILE_BG, paddingTop: insets.top + 8 }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                {details.profilePhotoUri ? (
                  <Image
                    source={{ uri: details.profilePhotoUri }}
                    style={styles.avatarImage}
                    accessibilityLabel="Profile photo"
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{initialsFromName(displayName)}</Text>
                )}
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
              onPress={onProfilePhoto}
              accessibilityLabel="Change profile photo"
            >
              <Ionicons name="camera" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <VerificationBadge status={details.idVerificationStatus} onPress={onVerificationBadge} />
          </View>
          <Text style={styles.email}>{emailLine}</Text>
          {details.phone.trim() ? <Text style={styles.phone}>{details.phone.trim()}</Text> : null}
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <MenuRow
          icon="person-outline"
          label="Edit Profile"
          onPress={() => parentNav?.navigate("EditProfile")}
        />
        <MenuRow
          icon="notifications-outline"
          label="Notification Settings"
          onPress={() => parentNav?.navigate("Settings")}
        />
        <MenuRow
          icon="card-outline"
          label="Manage Subscription"
          onPress={() => parentNav?.navigate("ManageSubscription")}
          trailing={<ProBadge />}
        />
        <MenuRow
          icon="logo-whatsapp"
          label="WhatsApp Business"
          onPress={() => parentNav?.navigate("WhatsAppSettings")}
        />

        <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Support</Text>
        <MenuRow
          icon="help-circle-outline"
          label="Help Center"
          onPress={() => parentNav?.navigate("HelpCenter")}
        />
        <MenuRow
          icon="chatbubble-ellipses-outline"
          label="Give Feedback"
          onPress={() => parentNav?.navigate("Feedback")}
        />
        <MenuRow
          icon="information-circle-outline"
          label="About FollowUp"
          onPress={() => parentNav?.navigate("AboutFollowUp")}
        />

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={colors.text} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function VerificationBadge({
  status,
  onPress,
}: {
  status: IdVerificationStatus;
  onPress: () => void;
}) {
  const purple = status === "verified";
  const pending = status === "pending";
  const ringColor = purple ? VERIFIED_PURPLE : pending ? PENDING_AMBER : UNVERIFIED_MUTED;
  const iconName = purple ? "shield-checkmark" : pending ? "time-outline" : "shield-outline";
  const iconColor = purple ? VERIFIED_PURPLE : pending ? PENDING_AMBER : UNVERIFIED_MUTED;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.verifyHit, pressed && { opacity: 0.75 }]}
      hitSlop={10}
      accessibilityLabel={
        purple ? "Identity verified" : pending ? "Verification pending" : "Verify identity"
      }
    >
      <View style={[styles.verifyRing, { borderColor: ringColor }, purple && styles.verifyRingGlow]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
    </Pressable>
  );
}

function ProBadge() {
  return (
    <View style={styles.proBadge}>
      <Text style={styles.proBadgeText}>Pro</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.accent} style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {trailing}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 28,
  },
  avatarWrap: {
    marginBottom: 16,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  avatarInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(140, 92, 245, 0.35)",
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.accentSecondary,
  },
  photoBtn: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: PROFILE_BG,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: 8,
  },
  verifyHit: {
    marginLeft: 4,
  },
  verifyRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  verifyRingGlow: {
    shadowColor: VERIFIED_PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
    textAlign: "center",
  },
  email: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  phone: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    opacity: 0.9,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  sectionSpaced: {
    marginTop: 28,
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
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: PRO_BADGE_BG,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRO_BADGE_TEXT,
  },
  logoutBtn: {
    marginTop: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: LOGOUT_BG,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
});
