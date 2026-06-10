/**
 * Legacy onboarding art (local PNGs + Figma counter graphics).
 * The live onboarding UI uses remote hero images in `OnboardingScreen.tsx`.
 *
 * Counter PNGs (list order 1, 3, 2 on slides 1–3 — matches Figma 01 / 02 / 03):
 * - Slide 1: Group 427322324.png
 * - Slide 2: Group 427322324 (1).png
 * - Slide 3: Group 427322324 (2).png
 */
export const ONBOARDING_SLIDES = [
  {
    key: "1",
    counter: require("../../assets/onboarding slide/Group 427322324.png"),
    image: require("../../assets/onboarding slide/rafiki.png"),
    title: "Turn chats into leads",
    body: "Share or paste a WhatsApp thread or notes from anywhere. Follow Up captures the conversation so nothing slips through the cracks.",
  },
  {
    key: "2",
    counter: require("../../assets/onboarding slide/Group 427322324 (1).png"),
    image: require("../../assets/onboarding slide/Group 176311.png"),
    title: "See who matters now",
    body: "We pull out names, a clear summary, and intent so you can spot hot opportunities fast—right on your home list.",
  },
  {
    key: "3",
    counter: require("../../assets/onboarding slide/Group 427322324 (2).png"),
    image: require("../../assets/onboarding slide/rafiki.png"),
    title: "Follow up on time",
    body: "Set status, pick a reminder, and get nudges when it’s time to reach out. Stay on top of every lead in one place.",
  },
] as const;
