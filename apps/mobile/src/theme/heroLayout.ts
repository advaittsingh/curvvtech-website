import { Dimensions } from "react-native";

const { width: w, height: h } = Dimensions.get("window");

/** Same reserve as onboarding footer (dots + nav) so hero height matches between screens. */
export const ONBOARDING_FOOTER_VERTICAL = 8 + 8 + 12 + 60 + 16;

export function getOnboardingHeroHeight(safeTop: number, safeBottom: number): number {
  return Math.min(
    Math.round(h * 0.42),
    Math.max(200, h - safeTop - safeBottom - ONBOARDING_FOOTER_VERTICAL - 200)
  );
}

export const heroImageWidth = w * 0.9;
