// PATCH /api/users/[id]
// DELETE /api/users/[id]
//
// PATCH updates editable fields on a user — typical use is toggling
// isActive (deactivating departing staff or activating someone who
// requested access after self-attempting sign-up). Role and HEI changes
// are also allowed.
//
// DELETE is a hard delete and refuses if the user is the only ADMIN, or
// if they own theses (Prisma's referential integrity will block it
// anyway, but we surface a clearer error). Soft delete via PATCH
// isActive=false is preferred.

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireRole } from "../../../../lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: caller } = await requireRole(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Don't let the only admin demote or deactivate themselves.
  if (target.id === caller.id) {
    if (body.role && body.role !== "ADMIN") {
      return NextResponse.json({ error: "You cannot demote your own account" }, { status: 400 });
    }
    if (body.isActive === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim() || null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.role && ["ADMIN", "REVIEWER", "HEI_COORDINATOR"].includes(body.role as string)) {
    data.role = body.role;
  }
  if (body.heiCode !== undefined) {
    if (body.heiCode === null || body.heiCode === "") {
      data.heiId = null;
    } else {
      const hei = await prisma.hei.findUnique({ where: { shortCode: String(body.heiCode) } });
      if (!hei) return NextResponse.json({ error: `HEI '${body.heiCode}' not found` }, { status: 404 });
      data.heiId = hei.id;
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, isActive: true },
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: caller } = await requireRole(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  if (id === caller.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Most common cause: the user owns Account/Session/etc. cascade rules
    // handle that, but we'd rather surface a friendlier error.
    return NextResponse.json(
      { error: "Could not delete this user. Try deactivating instead." },
      { status: 409 }
    );
  }
}
