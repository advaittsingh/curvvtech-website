export type FollowUpTip = {
  icon: "chatbubbles-outline" | "create-outline" | "flag-outline";
  title: string;
  body: string;
};

/** Actionable follow-up message tips (detail screen list). */
export const STRENGTHEN_FOLLOW_UP_TIPS: FollowUpTip[] = [
  {
    icon: "chatbubbles-outline",
    title: "Personalize your follow-ups",
    body: "Use the lead's name and reference previous conversations or specific needs so every message feels one-to-one.",
  },
  {
    icon: "create-outline",
    title: "Be clear & concise",
    body: "Get straight to the point with a clear call-to-action so leads know exactly what to do next.",
  },
  {
    icon: "flag-outline",
    title: "Add value in every follow-up",
    body: "Include useful information, insights, or tips that address the lead's interests—not just a check-in.",
  },
];

export type ExtraInsight = { title: string; body: string };

/** Additional curated insights shown on the detail screen. */
export const EXTRA_BUSINESS_INSIGHTS: ExtraInsight[] = [
  {
    title: "Batch your outreach",
    body: "Set aside two short blocks per day for follow-ups instead of reacting randomly—consistency trains both you and your leads.",
  },
  {
    title: "Lead with empathy",
    body: "Acknowledge their timeline and constraints before pitching again; trust builds repeat replies.",
  },
  {
    title: "Use templates, then customize",
    body: "Save your best opening lines in Ask AI, then tailor the second sentence to each person.",
  },
  {
    title: "Review closed leads monthly",
    body: "Patterns in why deals stall show up over time—use that to adjust your first response and follow-up cadence.",
  },
];

/** Illustrative metric until real response-time analytics ship. */
export const ILLUSTRATIVE_AVG_RESPONSE_HOURS = "5.4";
