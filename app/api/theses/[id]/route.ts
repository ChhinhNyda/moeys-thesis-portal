// DELETE /api/theses/[id]
// Cleanup endpoint for orphan rows created during a failed submission flow.
// The submission flow creates a Thesis row before uploading the PDF; if the
// upload (or confirm step) fails, the client calls this to remove the row.
//
// Safety: refuses unless `pdfFileKey` is still null. This means we never
// delete a row that has a real PDF attached — once a submission has actually
// landed, removal must go through admin tooling, not the client.

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const thesis = await prisma.thesis.findUnique({
    where: { id },
    select: { id: true, pdfFileKey: true },
  });
  if (!thesis) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }
  if (thesis.pdfFileKey) {
    return NextResponse.json(
      { error: "Cannot delete: thesis has an uploaded PDF" },
      { status: 409 }
    );
  }

  await prisma.thesis.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
