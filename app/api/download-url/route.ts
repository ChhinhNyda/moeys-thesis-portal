// POST /api/download-url
// Body: { thesisId: string }
// Returns: { url: string }  OR  4xx error
//
// Generates a 5-minute presigned GET URL for the thesis's PDF.
// Refuses if the thesis is not publicly visible (status != APPROVED OR
// visibility != PUBLIC). HEI / reviewer / admin downloads will use a
// different route in Phase 3 (when auth is wired).

import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "../../../lib/r2";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

const URL_TTL_SECONDS = 5 * 60;

export async function POST(req: Request) {
  let body: { thesisId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { thesisId } = body;
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
  if (thesis.status !== "APPROVED" || thesis.visibility !== "PUBLIC") {
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
