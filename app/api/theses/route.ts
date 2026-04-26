// POST /api/theses
// Creates a new Thesis row from the prototype's submission form payload.
// Body shape mirrors the form's `form` object (see SubmissionForm in AppClient.tsx).
// `intent: "draft" | "submit"` controls the resulting status.
//
// The PDF upload happens separately: caller posts here, gets back { id },
// then hits /api/upload-url and finally /api/theses/<id>/confirm-upload.

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

type Intent = "draft" | "submit";

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

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const intent: Intent = body.intent === "submit" ? "submit" : "draft";

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

  // The full PDF goes public when releasePolicy elapses; metadata stays public from approval.
  const monthsByPolicy: Record<string, number> = {
    IMMEDIATE: 0, DELAY_6M: 6, DELAY_1Y: 12, DELAY_2Y: 24, DELAY_3Y: 36, DELAY_5Y: 60,
  };
  const publicReleaseAt = new Date();
  publicReleaseAt.setMonth(publicReleaseAt.getMonth() + monthsByPolicy[releasePolicy]);

  // Visibility starts as METADATA_ONLY for any delayed release; the daily job
  // (Phase 2.5c) flips it to PUBLIC once publicReleaseAt passes.
  const visibility = releasePolicy === "IMMEDIATE" ? "PUBLIC" : "METADATA_ONLY";

  const status = intent === "submit" ? "UNDER_REVIEW" : "DRAFT";

  const yearNum = Number(body.year);
  const defenseYear = Number.isFinite(yearNum) && yearNum > 0 ? yearNum : new Date().getFullYear();

  const keywords = Array.isArray(body.keywords) ? body.keywords.map(String) : [];

  const created = await prisma.thesis.create({
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
      coSupervisorNames: [],
      heiId: hei.id,
      status,
      releasePolicy,
      releaseReason,
      releaseJustification,
      publicReleaseAt,
      license,
      visibility,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ id: created.id, status: created.status });
}
