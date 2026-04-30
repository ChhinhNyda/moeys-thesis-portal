// DELETE /api/theses/[id][?mode=admin|orphan]
//
// mode=orphan (default): cleanup endpoint for rows created during a failed
//   submission flow. Refuses unless `pdfFileKey` is still null — never
//   removes a row that has a real PDF attached. Used by submitThesis's
//   self-heal path.
// mode=admin: hard delete. Removes the Thesis row AND its PDF object in
//   R2 (if any). Used by the admin records view in the prototype.
//
// Until Phase 3 auth, mode=admin is honor-system — anyone with the URL
// could send it. The role switcher restricts the UI to "admin" view at
// the front-end layer; that's the same trust level as the rest of the
// pilot. Phase 3 replaces this with a real session role check.

import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../../../lib/prisma";
import { r2, R2_BUCKET } from "../../../../lib/r2";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mode = new URL(req.url).searchParams.get("mode") === "admin" ? "admin" : "orphan";

  const thesis = await prisma.thesis.findUnique({
    where: { id },
    select: { id: true, pdfFileKey: true, title: true },
  });
  if (!thesis) {
    return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  }

  if (mode === "orphan" && thesis.pdfFileKey) {
    return NextResponse.json(
      { error: "Cannot delete: thesis has an uploaded PDF (use mode=admin to force)" },
      { status: 409 }
    );
  }

  // Admin mode: also remove the PDF object from R2 so we don't leak
  // storage. Best-effort — if R2 is briefly unreachable we still remove
  // the DB row so the admin's intent isn't blocked. Manual R2 cleanup is
  // possible later via the Cloudflare dashboard.
  if (mode === "admin" && thesis.pdfFileKey) {
    try {
      await r2.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: thesis.pdfFileKey })
      );
    } catch (e) {
      console.error(`R2 delete failed for ${thesis.pdfFileKey}:`, e);
    }
  }

  await prisma.thesis.delete({ where: { id } });
  return NextResponse.json({ ok: true, deletedTitle: thesis.title });
}
