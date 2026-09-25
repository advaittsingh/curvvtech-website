import { describe, expect, it } from "vitest";
import {
  buildInviteEmail,
  escapeInviteHtml,
  formatInviteContractValue,
  formatPortalRole,
  renderInviteEmail,
} from "../src/templates/email/inviteEmailTemplate.js";

describe("inviteEmailTemplate", () => {
  const sample = {
    clientName: "Hamdan Pathan",
    companyName: "Young Boy Toyz",
    industry: "Events",
    projectCount: 2,
    contractValue: "45,000",
    portalRole: "Owner",
    inviteUrl: "https://client.curvvtech.com/invite/test-token",
  };

  it("replaces all template variables", () => {
    const html = renderInviteEmail(sample);
    expect(html).toContain("Hamdan Pathan");
    expect(html).toContain("Young Boy Toyz");
    expect(html).toContain("Events");
    expect(html).toContain(">2<");
    expect(html).toContain("&#8377;45,000");
    expect(html).toContain("Owner");
    expect(html).toContain(sample.inviteUrl);
    expect(html).not.toContain("{{clientName}}");
    expect(html).not.toContain("{{inviteUrl}}");
  });

  it("buildInviteEmail uses CID logos and attachments", () => {
    const { html, attachments } = buildInviteEmail(sample);
    expect(html).toContain('src="cid:ct-logo-white"');
    expect(attachments).toHaveLength(2);
    expect(attachments[0]?.contentId).toBe("ct-logo-white");
    expect(html.length).toBeLessThan(100 * 1024);
  });

  it("escapes HTML in user-supplied values", () => {
    const html = renderInviteEmail({
      ...sample,
      clientName: '<script>alert("x")</script>',
      companyName: "Acme & Co",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Acme &amp; Co");
  });

  it("formats contract value from cents", () => {
    expect(formatInviteContractValue(4500000)).toBe("45,000");
    expect(formatInviteContractValue(0)).toBe("0");
  });

  it("formats portal roles", () => {
    expect(formatPortalRole("owner")).toBe("Owner");
    expect(formatPortalRole("finance")).toBe("Finance");
  });

  it("escapes invite html helper", () => {
    expect(escapeInviteHtml(`Tom "O'Brien"`)).toBe("Tom &quot;O&#39;Brien&quot;");
  });
});
