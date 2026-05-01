// POST /api/theses/[id]/resubmit
// Body: same shape as POST /api/theses, including `intent: "draft" | "submit"`.
//
// Updates an existing editable thesis (DRAFT or REVISION_REQUESTED) with
// the latest metadata. Status transition depends on the current state +
// intent:
//
//   DRAFT              + intent=draft   → stays DRAFT
//   DRAFT              + intent=submit  → UNDER_REVIEW (HEI ships the draft)
//   REVISION_REQUESTED + intent=submit  → UNDER_REVIEW (resubmit after fix)
//   REVISION_REQUESTED + intent=draft   → 400 (can't downgrade after MoEYS
//                                              has issued revision feedback)
//
// rejectionReason is cleared whenever the thesis exits REVISION_REQUESTED.
// PDF re-upload, if any, goes through the standard upload-url +
// confirm-upload flow afterwards; the key is `theses/<id>.pdf`, so a new
// upload overwrites the previous PDF in R2.
//
// Refuses unless the thesis is currently DRAFT or REVISION_REQUESTED —
// the API never lets a caller silently rewrite an APPROVED, REJECTED, or
// already-UNDER_REVIEW row through this path.

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { sendEmail } from "../../../../../lib/email";
import { requireRole } from "../../../../../lib/api-auth";

export const dynamic = "force-dynamic";

function splitName(full: string): { first: string; last: string } {
  const trimmed = (full || "").trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return { first: trimmed, last: "" };
  return { first: trimmed.slice(0, space), last: trimmed.slice(space + 1) };
}

function mapLanguage(s: string | undefined): "ENGLISH" | "KHMER" | "OTHER" {
  if (s === "Khmer") return "KHMER";
  if (s === "English") return "ENGLISH";
  return "OTHER";
}

function mapDegree(s: string | undefined): "MASTERS" | "PHD" {
  return s === "PhD" ? "PHD" : "MASTERS";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireRole(["HEI_COORDINATOR", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.thesis.findUnique({
    where: { id },
    select: { id: true, status: true, heiId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }

  // HEI Coordinators can only edit theses owned by their own HEI
  if (user.role === "HEI_COORDINATOR" && user.heiId !== existing.heiId) {
    return NextResponse.json(
      { error: "You can only edit theses for your own institution" },
      { status: 403 }
    );
  }
  if (existing.status !== "DRAFT" && existing.status !== "REVISION_REQUESTED") {
    return NextResponse.json(
      { error: "This thesis is not in an editable state" },
      { status: 400 }
    );
  }

  const intent = body.intent === "submit" ? "submit" : "draft";

  // Decide the new status based on current state + intent.
  let newStatus: "DRAFT" | "UNDER_REVIEW";
  if (intent === "submit") {
    newStatus = "UNDER_REVIEW";
  } else {
    if (existing.status === "REVISION_REQUESTED") {
      return NextResponse.json(
        { error: "A thesis sent back for revision must be resubmitted, not saved as a draft" },
        { status: 400 }
      );
    }
    newStatus = "DRAFT";
  }

  const titleEn = String(body.titleEn || "").trim();
  const heiCode = String(body.hei || "").trim();
  if (!titleEn) return NextResponse.json({ error: "Title (English) is required" }, { status: 400 });
  if (!heiCode) return NextResponse.json({ error: "HEI is required" }, { status: 400 });

  const hei = await prisma.hei.findUnique({ where: { shortCode: heiCode } });
  if (!hei) return NextResponse.json({ error: `HEI '${heiCode}' not found` }, { status: 404 });

  const { first, last } = splitName(String(body.author || ""));

  const VALID_LICENSES = ["ALL_RIGHTS_RESERVED", "CC_BY", "CC_BY_NC", "CC_BY_NC_ND"] as const;
  const VALID_POLICIES = ["IMMEDIATE", "DELAY_6M", "DELAY_1Y", "DELAY_2Y", "DELAY_3Y", "DELAY_5Y"] as const;
  const VALID_REASONS = ["PATENT", "PUBLICATION", "COMMERCIAL", "SENSITIVE", "OTHER"] as const;

  const license = VALID_LICENSES.includes(body.license as typeof VALID_LICENSES[number])
    ? (body.license as typeof VALID_LICENSES[number])
    : "CC_BY";
  const releasePolicy = VALID_POLICIES.includes(body.releasePolicy as typeof VALID_POLICIES[number])
    ? (body.releasePolicy as typeof VALID_POLICIES[number])
    : "IMMEDIATE";
  const releaseReason =
    releasePolicy !== "IMMEDIATE" &&
    VALID_REASONS.includes(body.releaseReason as typeof VALID_REASONS[number])
      ? (body.releaseReason as typeof VALID_REASONS[number])
      : null;
  const releaseJustification = body.releaseJustification ? String(body.releaseJustification).trim() : null;

  const monthsByPolicy: Record<string, number> = {
    IMMEDIATE: 0, DELAY_6M: 6, DELAY_1Y: 12, DELAY_2Y: 24, DELAY_3Y: 36, DELAY_5Y: 60,
  };
  const publicReleaseAt = new Date();
  publicReleaseAt.setMonth(publicReleaseAt.getMonth() + monthsByPolicy[releasePolicy]);
  const visibility = releasePolicy === "IMMEDIATE" ? "PUBLIC" : "METADATA_ONLY";

  const yearNum = Number(body.year);
  const defenseYear = Number.isFinite(yearNum) && yearNum > 0 ? yearNum : new Date().getFullYear();
  const keywords = Array.isArray(body.keywords) ? body.keywords.map(String) : [];

  const updated = await prisma.thesis.update({
    where: { id },
    data: {
      title: titleEn,
      titleKhmer: body.titleKh ? String(body.titleKh).trim() : null,
      abstract: String(body.abstract || "").trim(),
      keywords,
      language: mapLanguage(body.language as string | undefined),
      authorFirstName: first,
      authorLastName: last,
      authorEmail: body.authorEmail ? String(body.authorEmail).trim() : null,
      degreeLevel: mapDegree(body.degree as string | undefined),
      fieldOfStudy: String(body.faculty || "").trim(),
      defenseYear,
      supervisorName: String(body.supervisor || "").trim(),
      heiId: hei.id,
      status: newStatus,
      releasePolicy,
      releaseReason,
      releaseJustification,
      publicReleaseAt,
      license,
      licenseAcknowledged: body.licenseAcknowledged === true,
      authorshipConfirmed: body.authorshipConfirmed === true,
      externalInstitutionName:
        heiCode === "INDEP" && body.externalInstitutionName
          ? String(body.externalInstitutionName).trim()
          : null,
      externalCountry:
        heiCode === "INDEP" && body.externalCountry
          ? String(body.externalCountry).trim()
          : null,
      visibility,
      // Clear the previous reviewer feedback so the next reviewer sees a
      // clean slate — the feedback was actioned by the resubmission.
      rejectionReason: null,
    },
    select: { id: true, status: true },
  });

  // Resubmission re-enters the queue → author gets the same submission
  // notification so they're aware their revised version is now in review.
  // Drafts (status stays DRAFT) don't trigger notification.
  if (newStatus === "UNDER_REVIEW" && body.authorEmail && first) {
    void sendEmail({
      template: "submissionConfirmation",
      to: String(body.authorEmail).trim(),
      data: { authorName: `${first} ${last}`.trim(), thesisTitle: titleEn },
    });
  }

  return NextResponse.json({ id: updated.id, status: updated.status });
}
