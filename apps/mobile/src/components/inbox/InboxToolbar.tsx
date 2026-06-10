import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/colors";
import { inbox } from "../../theme/inbox";

export type InboxFilter = "all" | "unread" | "leads" | "customers";

type Props = {
  search: string;
  onSearchChange: (q: string) => void;
  filter: InboxFilter;
  onFilterChange: (f: InboxFilter) => void;
};

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "leads", label: "Leads" },
  { id: "customers", label: "Customers" },
];

export function InboxToolbar({ search, onSearchChange, filter, onFilterChange }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search name or number"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => onSearchChange("")} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.chips}>
        {FILTERS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <Pressable
              key={id}
              onPress={() => onFilterChange(id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inbox.cardBorder,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "rgba(168, 85, 247, 0.22)",
    borderColor: inbox.purpleMuted,
    shadowColor: inbox.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: "#FFFFFF",
  },
});
