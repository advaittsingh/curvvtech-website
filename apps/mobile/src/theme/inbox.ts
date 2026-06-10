/**
 * Premium inbox / chat tokens — purple accent (#A855F7).
 * Chat well uses a visible gradient so the screen doesn’t read as flat black.
 */
export const inbox = {
  purple: "#A855F7",
  purpleDeep: "#7C3AED",
  purpleMuted: "rgba(168, 85, 247, 0.35)",
  /** Noticeably lighter at bottom so messages “sit” in a defined area */
  gradientTop: "#07070B",
  gradientBottom: "#151520",
  /** Composer dock — always reads as a separate surface */
  composerDockBg: "#121218",
  composerDockTopLine: "rgba(168, 85, 247, 0.45)",
  cardBg: "rgba(28, 28, 36, 0.92)",
  cardBorder: "rgba(255, 255, 255, 0.08)",
  /** WhatsApp-adjacent incoming bubble */
  bubbleReceived: "#1A1A22",
  /** Stronger sent gradient (was easy to miss on OLED) */
  bubbleSentStart: "#A855F7",
  bubbleSentEnd: "#7C3AED",
  tickRead: "#60A5FA",
  tickDelivered: "rgba(255,255,255,0.55)",
  glassTab: "rgba(22, 22, 30, 0.94)",
} as const;
