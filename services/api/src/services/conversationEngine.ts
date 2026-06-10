import { chatComplete, type ChatMsg } from "./llm/openaiChat.js";

export type ConversationScript = "curvvtech_services" | "followup_saas";

export type ConversationState =
  | "INTRO"
  | "QUALIFY"
  | "PROBLEM_AGITATION"
  | "SOFT_PITCH"
  | "CTA_PUSH"
  | "HANDLE_OBJECTION"
  | "CLOSE"
  | "END";
export type ConversationOutcome = "interested" | "not_interested" | "callback" | "no_answer" | "unknown";

export type ConversationTurn = { role: "user" | "assistant"; text: string };

export type ConversationContext = {
  script: ConversationScript;
  leadName?: string | null;
  leadPhone?: string | null;
  company?: string | null;
};

export type EngineResult = {
  replyText: string;
  nextState: ConversationState;
  outcome: ConversationOutcome;
};

function systemPrompt(script: ConversationScript) {
  const shared = [
    "You are a CurvvTech sales caller.",
    "Sound completely human. Slightly informal. India-friendly.",
    "Never say you're AI unless asked.",
    "Keep every sentence under 12 words.",
    "Never speak more than 2 sentences.",
    "Ask ONE question at a time.",
    "Curiosity > information. Do not over-explain.",
    "",
    "Primary CTA:",
    "“I’ll have our team send you the details on WhatsApp and set up a quick call.”",
    "Only offer a booking link if they ask.",
  ].join("\n");

  const scriptA = [
    "SCRIPT: CurvvTech Services.",
    "Target: businesses with weak/no online client system.",
    "Open: confirm identity, ask if they get consistent clients online.",
    "Qualify: referrals vs system, current lead source, website presence.",
    "Soft pitch: build/optimize website + automate follow-ups.",
    "Close: ask permission to WhatsApp details + quick call with team.",
  ].join("\n");

  const scriptB = [
    "SCRIPT: FollowUp SaaS.",
    "Target: businesses getting leads but losing conversions.",
    "Open: manual leads vs system.",
    "Qualify: where leads come from, missed follow-ups, response time.",
    "Soft pitch: FollowUp tracks, reminds, and follows up automatically.",
    "Insight: many lose leads due to missed follow-ups.",
    "Close: WhatsApp a quick demo + short walkthrough call.",
  ].join("\n");

  return `${shared}\n\n${script === "curvvtech_services" ? scriptA : scriptB}`;
}

type DetectedIntent = "interested" | "busy" | "not_interested" | "confused" | "neutral";

function detectIntent(utterance: string): DetectedIntent {
  const s = utterance.toLowerCase();
  if (/(not interested|dont call|do not call|stop calling|no thanks|remove|delete my number|wrong number)/i.test(s))
    return "not_interested";
  if (/(call back|later|busy|not a good time|in a meeting|driving|at work|after|tomorrow|evening)/i.test(s))
    return "busy";
  if (/(yes|sure|okay|sounds good|interested|send details|whatsapp|share|demo|quick call|call me|book)/i.test(s))
    return "interested";
  if (/(who are you|what is this|why calling|what do you do|explain|confused|scam)/i.test(s)) return "confused";
  return "neutral";
}

function clampHistory(turns: ConversationTurn[], maxTurns = 10): ConversationTurn[] {
  if (turns.length <= maxTurns) return turns;
  return turns.slice(turns.length - maxTurns);
}

function normalizeReply(text: string): string {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  const clipped = sentences.map((s) => {
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length <= 12) return s;
    return words.slice(0, 12).join(" ").replace(/[,:;]$/, "") + ".";
  });
  return clipped.join(" ").trim();
}

function quickWhatsAppCta(script: ConversationScript) {
  return script === "curvvtech_services"
    ? "I’ll have my team WhatsApp details. Works?"
    : "I’ll WhatsApp a quick demo. Works?";
}

export async function engineNext(params: {
  state: ConversationState;
  turns: ConversationTurn[];
  latestUserText: string;
  ctx: ConversationContext;
}): Promise<EngineResult> {
  const intent = detectIntent(params.latestUserText);

  if (intent === "not_interested") {
    return {
      replyText: normalizeReply(
        "Got it. Just curious—are you already sorted for getting clients?"
      ),
      nextState: "END",
      outcome: "not_interested",
    };
  }
  if (intent === "busy") {
    return {
      replyText: normalizeReply("No worries. When should I call you back?"),
      nextState: "END",
      outcome: "callback",
    };
  }

  if (intent === "interested") {
    return {
      replyText: normalizeReply(`${quickWhatsAppCta(params.ctx.script)} What time suits you today?`),
      nextState: "CTA_PUSH",
      outcome: "interested",
    };
  }

  const stateHint =
    params.state === "INTRO"
      ? "Ask a single opener question and check it's a good time."
      : params.state === "QUALIFY"
        ? "Ask one quick qualifier question. Keep it light."
        : params.state === "PROBLEM_AGITATION"
          ? "Reflect a pain point in 1 sentence, then ask a question."
          : params.state === "SOFT_PITCH"
            ? "Give a very light pitch in 1 sentence, then ask permission to WhatsApp details."
            : params.state === "CTA_PUSH"
              ? "Push WhatsApp CTA. Ask for confirmation."
              : params.state === "HANDLE_OBJECTION"
                ? "Handle objection briefly. Then ask a question."
                : params.state === "CLOSE"
                  ? "Confirm WhatsApp details and end politely."
                  : "Wrap up politely.";

  const history = clampHistory(params.turns);
  const leadLine = params.ctx.leadName?.trim()
    ? `Lead name: ${params.ctx.leadName.trim()}`
    : "Lead name: unknown";

  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt(params.ctx.script) },
    {
      role: "system",
      content:
        `${leadLine}\nConversation state: ${params.state}. ${stateHint}\n` +
        `If user shows ANY interest, jump to WhatsApp CTA immediately.`,
    },
    ...history.map((t) => ({ role: t.role, content: t.text } as ChatMsg)),
    { role: "user", content: params.latestUserText },
  ];

  const reply = await chatComplete({ messages, temperature: 0.5, maxTokens: 220 });

  const normalized = normalizeReply(reply);

  const nextState: ConversationState =
    params.state === "INTRO"
      ? "QUALIFY"
      : params.state === "QUALIFY"
        ? "PROBLEM_AGITATION"
        : params.state === "PROBLEM_AGITATION"
          ? "SOFT_PITCH"
          : params.state === "SOFT_PITCH"
            ? "CTA_PUSH"
            : params.state === "CTA_PUSH"
              ? "CLOSE"
              : params.state === "HANDLE_OBJECTION"
                ? "CTA_PUSH"
                : params.state === "CLOSE"
                  ? "END"
                  : "END";

  const out = detectIntent(normalized) === "interested" ? "interested" : "unknown";

  return {
    replyText:
      normalized ||
      normalizeReply(
        params.ctx.script === "curvvtech_services"
          ? "Quick question—are you getting consistent clients online?"
          : "Quick one—are you managing leads manually?"
      ),
    nextState,
    outcome: out,
  };
}

export function engineIntroGreeting(ctx: ConversationContext): EngineResult {
  const name = ctx.leadName?.trim();
  const isNameKnown = Boolean(name);
  const hello = isNameKnown ? `Hi, is this ${name}?` : "Hi, is this the owner?";

  const opener =
    ctx.script === "curvvtech_services"
      ? "I’m calling from CurvvTech. Quick question—are you getting consistent clients online?"
      : "Quick one—are you managing leads manually or using a system?";

  return {
    replyText: normalizeReply(`${hello} ${opener}`),
    nextState: "INTRO",
    outcome: "unknown",
  };
}

