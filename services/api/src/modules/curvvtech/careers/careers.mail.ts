export function firstNameOf(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "there";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#111111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;padding:28px 32px;">
        <tr><td style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Curvvtech hiring</td></tr>
        <tr><td style="padding-top:16px;font-size:15px;line-height:1.55;color:#111111;">${bodyHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export type InterviewEmailInput = {
  candidateName: string;
  roleTitle: string;
  whenLabel: string;
  meetUrl: string | null;
  note: string | null;
};

export function buildInterviewInviteEmail(input: InterviewEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const first = firstNameOf(input.candidateName);
  const meetLine = input.meetUrl
    ? `Join Google Meet: ${input.meetUrl}`
    : "A calendar invite is attached. We will share the meeting link before the call if it is not in the invite.";
  const noteBlock = input.note?.trim() ? `\n${input.note.trim()}\n` : "";
  const subject = `Interview — ${input.roleTitle} at Curvvtech`;
  const text = [
    `Hi ${first},`,
    "",
    `Thank you for applying for ${input.roleTitle} at Curvvtech. We would like to invite you to a short interview.`,
    "",
    `When: ${input.whenLabel}`,
    meetLine,
    noteBlock,
    "Please reply to this email if you need a different slot.",
    "",
    "A calendar invite is attached so you can add it in one click.",
    "",
    "— Curvvtech hiring",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const meetHtml = input.meetUrl
    ? `<p>Join Google Meet: <a href="${escapeHtml(input.meetUrl)}">${escapeHtml(input.meetUrl)}</a></p>`
    : `<p>A calendar invite is attached. We will share the meeting link before the call if it is not in the invite.</p>`;
  const noteHtml = input.note?.trim()
    ? `<p>${escapeHtml(input.note.trim()).replace(/\n/g, "<br/>")}</p>`
    : "";

  const html = emailShell(
    `<p>Hi ${escapeHtml(first)},</p>
     <p>Thank you for applying for <strong>${escapeHtml(input.roleTitle)}</strong> at Curvvtech. We would like to invite you to a short interview.</p>
     <p><strong>When:</strong> ${escapeHtml(input.whenLabel)}</p>
     ${meetHtml}
     ${noteHtml}
     <p>Please reply to this email if you need a different slot. A calendar invite is attached.</p>
     <p style="color:#71717a;font-size:13px;">— Curvvtech hiring</p>`,
  );

  return { subject, text, html };
}

export type RejectionEmailInput = {
  candidateName: string;
  roleTitle: string;
  note: string | null;
};

export function buildRejectionEmail(input: RejectionEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const first = firstNameOf(input.candidateName);
  const noteBlock = input.note?.trim() ? `\n${input.note.trim()}\n` : "";
  const subject = `Update on your ${input.roleTitle} application — Curvvtech`;
  const text = [
    `Hi ${first},`,
    "",
    `Thank you for applying for ${input.roleTitle} at Curvvtech, and for the time you put into your application.`,
    "",
    "After review, we will not be moving forward with your application this round.",
    noteBlock,
    "We wish you the very best in your search.",
    "",
    "— Curvvtech hiring",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const noteHtml = input.note?.trim()
    ? `<p>${escapeHtml(input.note.trim()).replace(/\n/g, "<br/>")}</p>`
    : "";

  const html = emailShell(
    `<p>Hi ${escapeHtml(first)},</p>
     <p>Thank you for applying for <strong>${escapeHtml(input.roleTitle)}</strong> at Curvvtech, and for the time you put into your application.</p>
     <p>After review, we will not be moving forward with your application this round.</p>
     ${noteHtml}
     <p>We wish you the very best in your search.</p>
     <p style="color:#71717a;font-size:13px;">— Curvvtech hiring</p>`,
  );

  return { subject, text, html };
}
