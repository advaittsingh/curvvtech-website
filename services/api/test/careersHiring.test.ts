import { describe, expect, it } from "vitest";
import {
  buildInterviewInviteEmail,
  buildRejectionEmail,
  escapeHtml,
  firstNameOf,
} from "../src/modules/curvvtech/careers/careers.mail.js";
import {
  buildInterviewIcs,
  clampInterviewDuration,
  parseInterviewStart,
} from "../src/modules/curvvtech/careers/careers.schedule.js";
import {
  signGoogleOauthState,
  verifyGoogleOauthState,
} from "../src/modules/curvvtech/integrations/googleCalendar.js";

describe("career interview emails", () => {
  it("builds an interview invite with Meet URL and escaped name", () => {
    const mail = buildInterviewInviteEmail({
      candidateName: 'Ada <script>alert("x")</script>',
      roleTitle: "Frontend Developer Intern",
      whenLabel: "Friday, 5 September 2026, 11:00 am – 11:45 am IST",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      note: "Bring your Figma file.",
    });
    expect(mail.subject).toContain("Frontend Developer Intern");
    expect(mail.text).toContain("Ada");
    expect(mail.text).toContain("https://meet.google.com/abc-defg-hij");
    expect(mail.text).toContain("Bring your Figma file.");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("meet.google.com/abc-defg-hij");
  });

  it("builds a not-shortlisted rejection template", () => {
    const mail = buildRejectionEmail({
      candidateName: "Ada Lovelace",
      roleTitle: "Backend Developer Intern",
      note: null,
    });
    expect(mail.subject).toMatch(/Backend Developer Intern/);
    expect(mail.text).toMatch(/will not be moving forward/i);
    expect(mail.html).toContain("Ada");
  });

  it("firstNameOf and escapeHtml helpers", () => {
    expect(firstNameOf("Suraj Mudenur")).toBe("Suraj");
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });
});

describe("career interview schedule", () => {
  it("treats naive datetime as IST", () => {
    const start = parseInterviewStart("2026-09-05T11:00");
    expect(start.toISOString()).toBe("2026-09-05T05:30:00.000Z");
  });

  it("keeps explicit ISO offsets", () => {
    const start = parseInterviewStart("2026-09-05T11:00:00+05:30");
    expect(start.toISOString()).toBe("2026-09-05T05:30:00.000Z");
  });

  it("clamps duration and builds ICS with Meet location", () => {
    expect(clampInterviewDuration(5)).toBe(15);
    expect(clampInterviewDuration(45)).toBe(45);
    const ics = buildInterviewIcs({
      uid: "test@careers.curvvtech.in",
      title: "Interview — Frontend · Ada",
      description: "Interview",
      start: parseInterviewStart("2026-09-05T11:00"),
      durationMin: 45,
      attendeeName: "Ada Lovelace",
      attendeeEmail: "ada@example.com",
      organizerEmail: "advaitsingh@curvvtech.in",
      organizerName: "Curvvtech",
      meetUrl: "https://meet.google.com/abc-defg-hij",
    });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("LOCATION:https://meet.google.com/abc-defg-hij");
    expect(ics).toContain("ada@example.com");
  });
});

describe("google oauth state", () => {
  it("round-trips a signed state payload", () => {
    const token = signGoogleOauthState({ sub: "user-1", provider: "google_calendar" });
    const parsed = verifyGoogleOauthState(token);
    expect(parsed.sub).toBe("user-1");
    expect(parsed.provider).toBe("google_calendar");
  });

  it("rejects a tampered state", () => {
    const token = signGoogleOauthState({ sub: "user-1", provider: "gmail" });
    expect(() => verifyGoogleOauthState(`${token}x`)).toThrow();
  });
});
