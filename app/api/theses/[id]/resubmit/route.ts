// POST /api/theses/[id]/resubmit
// Body: same shape as POST /api/theses (no `intent` — resubmit always means
// "submit", not "draft").
//
// Updates an existing REVISION_REQUESTED thesis with the author's revised
// metadata, clears the previous reviewer feedback, and flips status back
// to UNDER_REVIEW so it re-enters the queue. PDF re-upload (if any) goes
// through the standard upload-url + confirm-upload flow afterwards; the
// key is the same (`theses/<id>.pdf`), so a new upload simply overwrites
// the previous PDF in R2.
//
// Refuses unless the thesis is currently in REVISION_REQUESTED state —
// admins shouldn't be able to silently rewrite an APPROVED row through
// this path.

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

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
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.thesis.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }
  if (existing.status !== "REVISION_REQUESTED") {
    return NextResponse.json(
      { error: "Only theses awaiting revision can be resubmitted" },
      { status: 400 }
    );
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
      status: "UNDER_REVIEW",
      releasePolicy,
      releaseReason,
      releaseJustification,
      publicReleaseAt,
      license,
      licenseAcknowledged: body.licenseAcknowledged === true,
      authorshipConfirmed: body.authorshipConfirmed === true,
      visibility,
      // Clear the previous reviewer feedback so the next reviewer sees a
      // clean slate — the feedback was actioned by the resubmission.
      rejectionReason: null,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
