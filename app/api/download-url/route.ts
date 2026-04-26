// POST /api/download-url
// Body: { thesisId: string; mode?: "public" | "review" }
// Returns: { url: string }  OR  4xx error
//
// Generates a 5-minute presigned GET URL for the thesis's PDF.
//
// mode="public" (default): only succeeds for APPROVED + PUBLIC theses.
//   Used by the public catalogue's Download PDF button.
// mode="review": skips the visibility check so HEI staff, reviewers,
//   admins, and the minister can read theses that aren't yet approved
//   or aren't openly accessible. This is honor-system until Phase 3
//   replaces the role switcher with real auth — anyone could spoof
//   mode=review today, which is acceptable risk because the role
//   switcher itself has no enforcement either.

import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "../../../lib/r2";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

const URL_TTL_SECONDS = 5 * 60;

export async function POST(req: Request) {
  let body: { thesisId?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { thesisId } = body;
  const mode = body.mode === "review" ? "review" : "public";
  if (!thesisId || typeof thesisId !== "string") {
    return NextResponse.json({ error: "thesisId is required" }, { status: 400 });
  }

  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
    select: {
      id: true,
      status: true,
      visibility: true,
      pdfFileKey: true,
    },
  });

  if (!thesis) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }
  if (mode === "public" && (thesis.status !== "APPROVED" || thesis.visibility !== "PUBLIC")) {
    return NextResponse.json(
      { error: "Thesis is not publicly available" },
      { status: 403 }
    );
  }
  if (!thesis.pdfFileKey) {
    return NextResponse.json(
      { error: "No PDF available for this thesis" },
      { status: 404 }
    );
  }

  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: thesis.pdfFileKey,
    }),
    { expiresIn: URL_TTL_SECONDS }
  );

  return NextResponse.json({ url });
}
