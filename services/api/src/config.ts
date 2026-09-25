function envBool(name: string, defaultValue = false): boolean {
  const v = process.env[name];
  if (v == null || v === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function envInt(name: string, defaultValue: number): number {
  const v = process.env[name];
  if (v == null || v === "") return defaultValue;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

export const config = {
  port: envInt("PORT", 3000),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",

  databaseUrl: process.env.DATABASE_URL || "",

  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || "",

  /**
   * Development only: bypass Cognito. Never enabled when NODE_ENV=production.
   */
  skipAuth: envBool("SKIP_AUTH", false) && (process.env.NODE_ENV || "development") !== "production",

  devAuthSub: process.env.DEV_AUTH_SUB || "dev-local-auth-sub",
  devAuthEmail: process.env.DEV_AUTH_EMAIL || "dev@local.followup",

  /** ioredis connection string for distributed rate limits (optional). */
  redisUrl: process.env.REDIS_URL?.trim() || "",

  /** AI Calling MVP. Off on Vercel — no long-lived worker process. */
  aiCallWorkerEnabled: envBool("AI_CALL_WORKER_ENABLED", !Boolean(process.env.VERCEL)),
  aiCallSimulationMode: envBool("AI_CALL_SIMULATION_MODE", true),
  aiCallMaxAttempts: envInt("AI_CALL_MAX_ATTEMPTS", 3),
  aiCallConcurrency: envInt("AI_CALL_CONCURRENCY", 2),
  /** Per-minute dial limit (soft limiter; also keep Twilio limits in mind). */
  aiCallRatePerMin: envInt("AI_CALL_RATE_PER_MIN", 6),
  /** Optional: enforce timezone-aware calling windows later; for MVP store as config. */
  aiCallDefaultTz: process.env.AI_CALL_DEFAULT_TZ?.trim() || "Asia/Kolkata",

  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN?.trim() || "",
  twilioCallFromE164: process.env.TWILIO_CALL_FROM_E164?.trim() || "",
  /** Public base URL for Twilio webhooks and media stream WS (e.g. https://api.curvvtech.in). */
  twilioVoiceWebhookBaseUrl: process.env.TWILIO_VOICE_WEBHOOK_BASE_URL?.trim() || "",

  deepgramApiKey: process.env.DEEPGRAM_API_KEY?.trim() || "",
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY?.trim() || "",
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || "",

  /** WhatsApp Cloud API token for outbound sends (per-tenant vault recommended later). */
  whatsappGraphAccessToken: process.env.WHATSAPP_GRAPH_ACCESS_TOKEN?.trim() || "",

  /** Meta app secret required for webhook POST signature verification in production. */
  requireWhatsappSignatureInProduction: envBool("REQUIRE_WHATSAPP_SIGNATURE", true),

  /** HS256 access tokens (required when SKIP_AUTH is false in production). */
  jwtAccessSecret: process.env.JWT_SECRET?.trim() || "",
  jwtAccessExpiresSec: envInt("JWT_ACCESS_EXPIRES_SEC", 15 * 60),
  jwtRefreshExpiresSec: envInt("JWT_REFRESH_EXPIRES_SEC", 30 * 24 * 60 * 60),

  /** Client Portal — completely separate auth stack from admin/staff. */
  clientJwtSecret: process.env.CLIENT_JWT_SECRET?.trim() || "",
  clientJwtAccessExpiresSec: envInt("CLIENT_JWT_ACCESS_EXPIRES_SEC", 15 * 60),
  clientJwtRefreshExpiresSec: envInt("CLIENT_JWT_REFRESH_EXPIRES_SEC", 30 * 24 * 60 * 60),
  clientPortalUrl: process.env.CLIENT_PORTAL_URL?.trim() || "https://client.curvvtech.com",
  clientInviteFromEmail: process.env.CLIENT_INVITE_FROM_EMAIL?.trim() || "noreply@curvvtech.com",
  staffInviteBaseUrl:
    process.env.STAFF_INVITE_BASE_URL?.trim() ||
    process.env.ADMIN_PANEL_URL?.trim() ||
    "https://admin.curvvtech.com",
  adminPanelUrl: process.env.ADMIN_PANEL_URL?.trim() || "https://admin.curvvtech.com",
  apiPublicUrl: process.env.API_PUBLIC_URL?.trim() || "https://api.curvvtech.in",

  /** Google OAuth — Calendar Meet links + Gmail (admin Settings → Integrations). */
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
  clientRazorpayWebhookSecret: process.env.CLIENT_RAZORPAY_WEBHOOK_SECRET?.trim() || "",

  /** Legacy / optional — no longer used for mobile auth. */
  cognitoRegion: process.env.COGNITO_REGION || "",
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID || "",

  accessCap: envInt("ACCESS_CAP", 1000),

  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  s3Bucket: process.env.S3_BUCKET || "",
  s3Region: process.env.AWS_REGION || process.env.S3_REGION || "us-east-1",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",

  landingApiKey: process.env.LANDING_API_KEY || "",

  rateLimitParseLeadPerMin: envInt("RATE_LIMIT_PARSE_LEAD_PER_MIN", 30),
  rateLimitAiPerMin: envInt("RATE_LIMIT_AI_PER_MIN", 20),
  rateLimitPublicPerMin: envInt("RATE_LIMIT_PUBLIC_PER_MIN", 60),

  /** Meta WhatsApp Cloud API — webhook verification (GET) & optional HMAC (POST) */
  whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "",
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET?.trim() || "",

  /** Resend — primary transactional email provider for all outbound mail. */
  resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
  /** Default From address for all system emails (must be on a Resend-verified domain). */
  emailFrom: process.env.EMAIL_FROM?.trim() || "Curvvtech <noreply@curvvtech.in>",
  /** Optional Reply-To applied to all system emails. */
  emailReplyTo: process.env.EMAIL_REPLY_TO?.trim() || "",

  /** SMTP for demo confirmation + calendar (.ics) invites (e.g. Google Workspace app password). */
  demoSmtpHost: process.env.DEMO_SMTP_HOST?.trim() || "",
  demoSmtpPort: envInt("DEMO_SMTP_PORT", 587),
  demoSmtpSecure: envBool("DEMO_SMTP_SECURE", false),
  demoSmtpUser: process.env.DEMO_SMTP_USER?.trim() || "",
  demoSmtpPass: process.env.DEMO_SMTP_PASS?.trim() || "",
  /** From address for invites (default: advaitsingh@curvvtech.in). */
  demoCalendarFromEmail: process.env.DEMO_CALENDAR_FROM_EMAIL?.trim() || "advaitsingh@curvvtech.in",
  demoCalendarOrganizerName: process.env.DEMO_CALENDAR_ORGANIZER_NAME?.trim() || "Curvvtech",
  demoMeetingTitle: process.env.DEMO_MEETING_TITLE?.trim() || "Curvvtech · FollowUp product demo",
  demoMeetingLocation: process.env.DEMO_MEETING_LOCATION?.trim() || "Online — meeting link will be shared separately",

  /** Razorpay (FollowUp billing) — create plans in Razorpay Dashboard and paste plan_id values. */
  razorpayKeyId: process.env.RAZORPAY_KEY_ID?.trim() || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "",
  razorpayPlanProMonthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY?.trim() || "",
  razorpayPlanProAnnual: process.env.RAZORPAY_PLAN_PRO_ANNUAL?.trim() || "",
  razorpayPlanProPlusMonthly: process.env.RAZORPAY_PLAN_PRO_PLUS_MONTHLY?.trim() || "",
  razorpayPlanProPlusAnnual: process.env.RAZORPAY_PLAN_PRO_PLUS_ANNUAL?.trim() || "",
};

export function cognitoIssuer(): string | null {
  if (!config.cognitoRegion || !config.cognitoUserPoolId) return null;
  return `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}`;
}

export function cognitoJwksUrl(): string | null {
  const iss = cognitoIssuer();
  return iss ? `${iss}/.well-known/jwks.json` : null;
}
