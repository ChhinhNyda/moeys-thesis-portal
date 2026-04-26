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

  const accessLevel = body.accessLevel === "embargoed" ? "embargoed" : "open";
  const visibility = accessLevel === "embargoed" ? "METADATA_ONLY" : "PUBLIC";
  const releasePolicy = accessLevel === "embargoed" ? "DELAY_1Y" : "IMMEDIATE";
  const embargoUntil = body.embargoUntil ? new Date(String(body.embargoUntil)) : null;
  const publicReleaseAt = accessLevel === "open" ? new Date() : embargoUntil;

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
      authorEmail: body.authorEmail ? String(body.authorEmail) : null,
      degreeLevel: mapDegree(body.degree as string | undefined),
      fieldOfStudy: String(body.faculty || "").trim(),
      defenseYear,
      supervisorName: String(body.supervisor || "").trim(),
      coSupervisorNames: [],
      heiId: hei.id,
      status,
      releasePolicy,
      publicReleaseAt,
      license: "CC_BY",
      visibility,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ id: created.id, status: created.status });
}
