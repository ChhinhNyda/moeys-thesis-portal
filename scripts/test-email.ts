// Sends one of each email template to a chosen recipient — useful for
// previewing copy and checking that DKIM/SPF/Resend are wired correctly.
//
// Run:
//   npx tsx scripts/test-email.ts <your-email@example.com> [template]
//
// `template` is optional. Omit to send all four. Otherwise one of:
//   submission | revision | approved | rejected

import "dotenv/config";
import { sendEmail } from "../lib/email";

const recipient = process.argv[2];
const which = process.argv[3];

if (!recipient) {
  console.error("Usage: npx tsx scripts/test-email.ts <recipient> [submission|revision|approved|rejected]");
  process.exit(1);
}

const SAMPLE_AUTHOR = "Sok Dara";
const SAMPLE_TITLE = "Urban Heat Island Effects in Phnom Penh: A Five-Year Spatial Analysis";
const SAMPLE_FEEDBACK = `1. Section 3.2 needs additional citation for the temperature data sources.
2. The methodology in Chapter 4 should clarify whether ERA5 or in-situ readings were used.
3. Please add a paragraph addressing the limitations of the urban heat island model under monsoon conditions.`;

async function main() {
  if (!which || which === "submission") {
    console.log(`→ Sending submissionConfirmation to ${recipient}…`);
    await sendEmail({
      template: "submissionConfirmation",
      to: recipient,
      data: { authorName: SAMPLE_AUTHOR, thesisTitle: SAMPLE_TITLE },
    });
  }
  if (!which || which === "revision") {
    console.log(`→ Sending revisionRequested to ${recipient}…`);
    await sendEmail({
      template: "revisionRequested",
      to: recipient,
      data: { authorName: SAMPLE_AUTHOR, thesisTitle: SAMPLE_TITLE, feedback: SAMPLE_FEEDBACK },
    });
  }
  if (!which || which === "approved") {
    console.log(`→ Sending decisionApproved to ${recipient}…`);
    await sendEmail({
      template: "decisionApproved",
      to: recipient,
      data: { authorName: SAMPLE_AUTHOR, thesisTitle: SAMPLE_TITLE },
    });
  }
  if (!which || which === "rejected") {
    console.log(`→ Sending decisionRejected to ${recipient}…`);
    await sendEmail({
      template: "decisionRejected",
      to: recipient,
      data: { authorName: SAMPLE_AUTHOR, thesisTitle: SAMPLE_TITLE, feedback: SAMPLE_FEEDBACK },
    });
  }
  console.log("\n✓ Done. Check the recipient inbox.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
