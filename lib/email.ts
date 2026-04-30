// Email helper for the MoEYS National Thesis Archive.
// Wraps the Resend SDK with four pre-defined templates and a single send()
// function the API routes call after a relevant DB write succeeds.
//
// Email is best-effort: if Resend is down or the API key is missing, we
// log the failure and return — never block the API response or roll back
// the DB write. The audit trail of "what we tried to send" lives in the
// Vercel logs.

import { Resend } from "resend";

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "noreply@thesis-pilot.wesoben.com";
const FROM_NAME = "MoEYS National Thesis Archive";
const SITE_URL = "https://thesis-pilot.wesoben.com";

const globalForResend = globalThis as unknown as { resend: Resend | undefined };

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!globalForResend.resend) {
    globalForResend.resend = new Resend(key);
  }
  return globalForResend.resend;
}

// ─── Template data shapes ──────────────────────────────────────────────

type SubmissionData = { authorName: string; thesisTitle: string };
type RevisionData = { authorName: string; thesisTitle: string; feedback: string };
type ApprovalData = { authorName: string; thesisTitle: string };
type RejectionData = { authorName: string; thesisTitle: string; feedback: string };

// ─── Templates ─────────────────────────────────────────────────────────
//
// Each returns { subject, html, text }. Plain HTML — no React Email needed
// at pilot scale. The visual design uses the same Cambodian palette as
// the live site (cream + navy + gold). Inline CSS only — most email
// clients ignore <style> blocks.

function emailFrame(bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F1E1;font-family:Georgia, serif;color:#2A2018;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E1;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FBF7EC;border:1px solid #E3D9C2;border-radius:8px;max-width:600px;">
        <tr><td style="padding:32px 40px 16px 40px;border-bottom:1px solid #E3D9C2;">
          <div style="font-size:11px;letter-spacing:3px;color:#8A7860;text-transform:uppercase;margin-bottom:6px;">Kingdom of Cambodia</div>
          <div style="font-size:18px;font-weight:600;color:#0A2A6B;">MoEYS National Thesis Archive</div>
          <div style="font-size:12px;color:#5A4A38;margin-top:2px;">Department of Research &amp; Innovation</div>
        </td></tr>
        <tr><td style="padding:28px 40px;font-size:15px;line-height:1.6;color:#2A2018;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #E3D9C2;font-size:11px;color:#8A7860;line-height:1.5;">
          This is an automated message from the MoEYS National Thesis Archive. If you received it in error, please ignore — no action will be taken. Visit <a href="${SITE_URL}" style="color:#0A2A6B;text-decoration:none;">${SITE_URL}</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function submissionConfirmation(d: SubmissionData) {
  const subject = `Thesis submitted to MoEYS for review: "${d.thesisTitle}"`;
  const html = emailFrame(`
    <p>Dear ${escapeHtml(d.authorName)},</p>
    <p>Please be informed that your thesis <em>"${escapeHtml(d.thesisTitle)}"</em> has been submitted to the <strong>Department of Research and Innovation</strong> for the reviewing process.</p>
    <p>If you have <strong>not allowed</strong> your thesis to be submitted, please contact your program coordinator immediately.</p>
    <p>You will receive another email once the reviewing committee has reached a decision.</p>
    <p style="margin-top:28px;">Kind Regards,<br/><strong>DRI Evaluation Committee</strong></p>
  `);
  const text = `Dear ${d.authorName},

Please be informed that your thesis "${d.thesisTitle}" has been submitted to the Department of Research and Innovation for the reviewing process.

If you have not allowed your thesis to be submitted, please contact your program coordinator immediately.

You will receive another email once the reviewing committee has reached a decision.

Kind Regards,
DRI Evaluation Committee`;
  return { subject, html, text };
}

function revisionRequested(d: RevisionData) {
  const subject = `Revisions requested on your thesis: "${d.thesisTitle}"`;
  const html = emailFrame(`
    <p>Dear ${escapeHtml(d.authorName)},</p>
    <p>The MoEYS reviewing committee has reviewed your thesis <em>"${escapeHtml(d.thesisTitle)}"</em> and requested revisions before it can be admitted to the National Thesis Archive.</p>
    <p style="margin:18px 0;padding:14px 18px;background:#F7F1E1;border-left:3px solid #B8771A;border-radius:4px;">
      <strong style="color:#5A4A38;font-size:11px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:6px;">Reviewer feedback</strong>
      ${escapeHtml(d.feedback).replace(/\n/g, "<br/>")}
    </p>
    <p>Please coordinate with your program coordinator to address the points above and resubmit through the platform. The thesis will re-enter the review queue automatically once resubmitted.</p>
    <p style="margin-top:28px;">Kind Regards,<br/><strong>DRI Evaluation Committee</strong></p>
  `);
  const text = `Dear ${d.authorName},

The MoEYS reviewing committee has reviewed your thesis "${d.thesisTitle}" and requested revisions before it can be admitted to the National Thesis Archive.

Reviewer feedback:
${d.feedback}

Please coordinate with your program coordinator to address the points above and resubmit through the platform. The thesis will re-enter the review queue automatically once resubmitted.

Kind Regards,
DRI Evaluation Committee`;
  return { subject, html, text };
}

function decisionApproved(d: ApprovalData) {
  const subject = `Your thesis has been approved: "${d.thesisTitle}"`;
  const html = emailFrame(`
    <p>Dear ${escapeHtml(d.authorName)},</p>
    <p>Congratulations. The MoEYS reviewing committee has <strong style="color:#2E6B3E;">approved</strong> your thesis <em>"${escapeHtml(d.thesisTitle)}"</em>. It is now part of the National Thesis Archive and accessible according to the release timing you selected at submission.</p>
    <p>You can view your thesis on the public archive at any time:</p>
    <p style="margin:20px 0;"><a href="${SITE_URL}" style="display:inline-block;padding:10px 22px;background:#0A2A6B;color:#FBF7EC;text-decoration:none;border-radius:4px;font-weight:600;">View the National Archive</a></p>
    <p>Thank you for contributing to Cambodia's national research record.</p>
    <p style="margin-top:28px;">Kind Regards,<br/><strong>DRI Evaluation Committee</strong></p>
  `);
  const text = `Dear ${d.authorName},

Congratulations. The MoEYS reviewing committee has APPROVED your thesis "${d.thesisTitle}". It is now part of the National Thesis Archive and accessible according to the release timing you selected at submission.

View the public archive: ${SITE_URL}

Thank you for contributing to Cambodia's national research record.

Kind Regards,
DRI Evaluation Committee`;
  return { subject, html, text };
}

function decisionRejected(d: RejectionData) {
  const subject = `Decision on your thesis: "${d.thesisTitle}"`;
  const html = emailFrame(`
    <p>Dear ${escapeHtml(d.authorName)},</p>
    <p>Following review, the MoEYS reviewing committee has decided <strong style="color:#A41E2C;">not to admit</strong> your thesis <em>"${escapeHtml(d.thesisTitle)}"</em> to the National Thesis Archive at this time.</p>
    <p style="margin:18px 0;padding:14px 18px;background:#F7F1E1;border-left:3px solid #A41E2C;border-radius:4px;">
      <strong style="color:#5A4A38;font-size:11px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:6px;">Committee notes</strong>
      ${escapeHtml(d.feedback).replace(/\n/g, "<br/>")}
    </p>
    <p>If you have questions about this decision or wish to appeal, please contact your program coordinator.</p>
    <p style="margin-top:28px;">Kind Regards,<br/><strong>DRI Evaluation Committee</strong></p>
  `);
  const text = `Dear ${d.authorName},

Following review, the MoEYS reviewing committee has decided NOT TO ADMIT your thesis "${d.thesisTitle}" to the National Thesis Archive at this time.

Committee notes:
${d.feedback}

If you have questions about this decision or wish to appeal, please contact your program coordinator.

Kind Regards,
DRI Evaluation Committee`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Public send API ───────────────────────────────────────────────────

type SendArgs =
  | { template: "submissionConfirmation"; to: string; data: SubmissionData }
  | { template: "revisionRequested"; to: string; data: RevisionData }
  | { template: "decisionApproved"; to: string; data: ApprovalData }
  | { template: "decisionRejected"; to: string; data: RejectionData };

export async function sendEmail(args: SendArgs): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[email] Skipping ${args.template} to ${args.to}: RESEND_API_KEY missing`);
    return;
  }

  let rendered;
  switch (args.template) {
    case "submissionConfirmation":
      rendered = submissionConfirmation(args.data);
      break;
    case "revisionRequested":
      rendered = revisionRequested(args.data);
      break;
    case "decisionApproved":
      rendered = decisionApproved(args.data);
      break;
    case "decisionRejected":
      rendered = decisionRejected(args.data);
      break;
  }

  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: args.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    console.log(`[email] Sent ${args.template} to ${args.to}`);
  } catch (e) {
    // Best-effort: log and swallow. The DB write that triggered this email
    // has already succeeded; we don't want a Resend outage to break that.
    console.error(`[email] Failed to send ${args.template} to ${args.to}:`, e);
  }
}
