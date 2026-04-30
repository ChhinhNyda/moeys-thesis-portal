// POST /api/theses/[id]/review
// Body: { decision: "approve" | "revision" | "reject"; feedback?: string }
//
// Persists the MoEYS reviewer's decision to the DB. Until Phase 3 auth is
// wired this is honor-system — anyone with the URL can call it. The role
// switcher restricts it to the "reviewer" view at the UI level.
//
// Decision mapping:
//   approve  → status=APPROVED, approvedAt=now, rejectionReason=null
//   revision → status=REVISION_REQUESTED, rejectionReason=feedback
//              (HEI sees this as "Needs revision" with the feedback shown)
//   reject   → status=REJECTED, rejectionReason=feedback
//              (final — not invited to resubmit)
//
// "claim" is intentionally not handled here — it's UI-only (the schema
// has no claimed-by-reviewer concept).

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { sendEmail } from "../../../../../lib/email";

export const dynamic = "force-dynamic";

type Decision = "approve" | "revision" | "reject";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { decision?: string; feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision = body.decision as Decision;
  if (!["approve", "revision", "reject"].includes(decision)) {
    return NextResponse.json(
      { error: "decision must be approve, revision, or reject" },
      { status: 400 }
    );
  }

  const feedback = (body.feedback ?? "").trim();
  if ((decision === "revision" || decision === "reject") && !feedback) {
    return NextResponse.json(
      { error: "feedback is required for revision and reject" },
      { status: 400 }
    );
  }

  const thesis = await prisma.thesis.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      authorFirstName: true,
      authorLastName: true,
      authorEmail: true,
    },
  });
  if (!thesis) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }

  let updates: {
    status: "APPROVED" | "REVISION_REQUESTED" | "REJECTED";
    approvedAt?: Date | null;
    rejectionReason: string | null;
  };
  if (decision === "approve") {
    updates = {
      status: "APPROVED",
      approvedAt: new Date(),
      rejectionReason: null,
    };
  } else if (decision === "revision") {
    updates = {
      status: "REVISION_REQUESTED",
      rejectionReason: feedback,
    };
  } else {
    updates = {
      status: "REJECTED",
      rejectionReason: feedback,
    };
  }

  const updated = await prisma.thesis.update({
    where: { id },
    data: updates,
    select: { id: true, status: true },
  });

  // Notify the author of the decision. Fire-and-forget — Resend failures
  // shouldn't unwind the DB write that's already committed.
  if (thesis.authorEmail) {
    const authorName = `${thesis.authorFirstName} ${thesis.authorLastName}`.trim();
    if (decision === "approve") {
      void sendEmail({
        template: "decisionApproved",
        to: thesis.authorEmail,
        data: { authorName, thesisTitle: thesis.title },
      });
    } else if (decision === "revision") {
      void sendEmail({
        template: "revisionRequested",
        to: thesis.authorEmail,
        data: { authorName, thesisTitle: thesis.title, feedback },
      });
    } else {
      void sendEmail({
        template: "decisionRejected",
        to: thesis.authorEmail,
        data: { authorName, thesisTitle: thesis.title, feedback },
      });
    }
  }

  return NextResponse.json({ ok: true, decision, status: updated.status });
}
