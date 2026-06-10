import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";

/** Horizontal padding aligned with onboarding / AuthChoice */
export const AUTH_PAD_H = 30;

/** Top padding for scroll content (below safe area) */
export const AUTH_CONTENT_TOP = 36;

/** Inset for headings/body relative to horizontal padding */
export const AUTH_TEXT_INSET = 10;

/** Primary CTA height (matches onboarding pills) */
export const AUTH_CTA_HEIGHT = 60;

/** Hero art shared by AuthChoice and Auth (matches onboarding slide 1) */
export const AUTH_HERO_IMAGE =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2084&q=80";

export function useMontserratUiFonts() {
  const [loaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  return {
    loaded,
    brand: loaded ? "Montserrat_600SemiBold" : undefined,
    title: loaded ? "Montserrat_700Bold" : undefined,
    body: loaded ? "Montserrat_400Regular" : undefined,
    cta: loaded ? "Montserrat_600SemiBold" : undefined,
  };
}
