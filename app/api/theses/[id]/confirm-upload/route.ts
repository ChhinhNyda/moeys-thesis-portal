// POST /api/theses/[id]/confirm-upload
// Body: { pdfFileKey: string }
//
// Called after the browser successfully PUTs a PDF to the R2 presigned URL.
// We re-derive the expected key from the thesis id to prevent a caller
// pointing the row at someone else's PDF — the only valid key is
// `theses/<thesisId>.pdf`.

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { pdfFileKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const expectedKey = `theses/${id}.pdf`;
  if (body.pdfFileKey !== expectedKey) {
    return NextResponse.json(
      { error: "pdfFileKey does not match thesis id" },
      { status: 400 }
    );
  }

  const thesis = await prisma.thesis.findUnique({ where: { id }, select: { id: true } });
  if (!thesis) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }

  await prisma.thesis.update({
    where: { id },
    data: { pdfFileKey: expectedKey },
  });

  return NextResponse.json({ ok: true });
}
