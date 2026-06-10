import type { NavigationProp } from "@react-navigation/native";
import type { Lead } from "../services/api";
import type { MainStackParamList } from "../navigation/types";

/** Open unified lead detail (manual or WhatsApp). */
export function navigateToLeadDetail(
  navigation: NavigationProp<MainStackParamList>,
  lead: Lead
): void {
  navigation.navigate("LeadDetail", { lead });
}
