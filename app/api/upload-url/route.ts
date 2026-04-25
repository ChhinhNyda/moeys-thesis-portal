// POST /api/upload-url
// Body: { thesisId: string; contentType: string }
// Returns: { url: string; key: string }
//
// The browser uploads the PDF directly to R2 with a PUT to the returned URL.
// URL expires after 15 minutes. After upload, the caller should PATCH the
// thesis with `pdfFileKey: key` (separate endpoint or write-path; not built
// in Phase 2.5a).

import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "../../../lib/r2";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

const URL_TTL_SECONDS = 15 * 60;
const ALLOWED_CONTENT_TYPES = ["application/pdf"];

export async function POST(req: Request) {
  let body: { thesisId?: string; contentType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { thesisId, contentType } = body;

  if (!thesisId || typeof thesisId !== "string") {
    return NextResponse.json({ error: "thesisId is required" }, { status: 400 });
  }
  if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "contentType must be application/pdf" },
      { status: 400 }
    );
  }

  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
    select: { id: true },
  });
  if (!thesis) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }

  const key = `theses/${thesisId}.pdf`;

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: URL_TTL_SECONDS }
  );

  return NextResponse.json({ url, key });
}
