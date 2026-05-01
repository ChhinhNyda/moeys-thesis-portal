import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import AppClient from "./AppClient";

// Re-fetch theses on every request so newly submitted ones show up
// immediately in the HEI dashboard / Review Queue (instead of waiting
// for the next build). Cheap at pilot scale; revisit when traffic grows.
export const dynamic = "force-dynamic";

// Map DB Thesis (+ relation hei) into the shape the prototype's UI expects.
// The prototype was built before the schema; this adapter bridges them.
// When Phase 3 replaces the prototype, this file goes away.
function dbThesisToPrototype(t: {
  id: string;
  title: string;
  titleKhmer: string | null;
  abstract: string;
  keywords: string[];
  language: "ENGLISH" | "KHMER" | "OTHER";
  authorFirstName: string;
  authorLastName: string;
  authorEmail: string | null;
  degreeLevel: "MASTERS" | "PHD";
  fieldOfStudy: string;
  defenseYear: number;
  supervisorName: string;
  status: "DRAFT" | "UNDER_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  visibility: "PUBLIC" | "METADATA_ONLY" | "HIDDEN";
  submittedAt: Date;
  approvedAt: Date | null;
  publicReleaseAt: Date | null;
  rejectionReason: string | null;
  pdfFileKey: string | null;
  externalInstitutionName: string | null;
  externalCountry: string | null;
  license: "ALL_RIGHTS_RESERVED" | "CC_BY" | "CC_BY_NC" | "CC_BY_NC_ND";
  releasePolicy: "IMMEDIATE" | "DELAY_6M" | "DELAY_1Y" | "DELAY_2Y" | "DELAY_3Y" | "DELAY_5Y";
  releaseReason: "PATENT" | "PUBLICATION" | "COMMERCIAL" | "SENSITIVE" | "OTHER" | null;
  releaseJustification: string | null;
  hei: { shortCode: string };
}) {
  let protoStatus: string;
  if (t.status === "APPROVED" && t.visibility === "PUBLIC") protoStatus = "published";
  else if (t.status === "APPROVED" && t.visibility === "METADATA_ONLY") protoStatus = "embargoed";
  else if (t.status === "UNDER_REVIEW") protoStatus = "submitted";
  else if (t.status === "REVISION_REQUESTED") protoStatus = "revision_requested";
  else if (t.status === "REJECTED") protoStatus = "rejected";
  else if (t.status === "DRAFT") protoStatus = "draft";
  else protoStatus = "submitted";

  const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

  return {
    id: t.id,
    status: protoStatus,
    titleEn: t.title,
    titleKh: t.titleKhmer ?? "",
    author: `${t.authorFirstName} ${t.authorLastName}`,
    authorKh: "",
    hei: t.hei.shortCode,
    faculty: t.fieldOfStudy,
    degree: t.degreeLevel === "MASTERS" ? "Master" : "PhD",
    year: t.defenseYear,
    supervisor: t.supervisorName,
    abstract: t.abstract,
    keywords: t.keywords,
    language:
      t.language === "ENGLISH" ? "English" : t.language === "KHMER" ? "Khmer" : "Other",
    callNumber: `${t.hei.shortCode}-${t.degreeLevel === "MASTERS" ? "MSC" : "PHD"}-${t.defenseYear}-${t.id.slice(-4).toUpperCase()}`,
    similarityScore: 0,
    accessLevel: t.visibility === "METADATA_ONLY" ? "embargoed" : "open",
    submittedBy: t.authorEmail ?? "",
    reviewedBy: t.approvedAt ? "admin@moeys.gov.kh" : null,
    submittedAt: ymd(t.submittedAt),
    approvedAt: ymd(t.approvedAt),
    publishedAt: t.visibility === "PUBLIC" ? ymd(t.approvedAt ?? t.publicReleaseAt) : undefined,
    embargoUntil:
      t.visibility === "METADATA_ONLY" && t.publicReleaseAt ? ymd(t.publicReleaseAt) : undefined,
    reviewFeedback: t.rejectionReason ?? undefined,
    pdfFileKey: t.pdfFileKey,
    externalInstitutionName: t.externalInstitutionName ?? "",
    externalCountry: t.externalCountry ?? "",
    // Pre-fill the author-rights fields when the form opens for a
    // revision — otherwise the author would have to re-pick license and
    // release timing every time they resubmit.
    authorEmail: t.authorEmail ?? "",
    license: t.license,
    releasePolicy: t.releasePolicy,
    releaseReason: t.releaseReason ?? "",
    releaseJustification: t.releaseJustification ?? "",
    history: [],
  };
}

function dbHeiToPrototype(h: {
  shortCode: string;
  name: string;
  nameKhmer: string | null;
  type: "PUBLIC" | "PRIVATE" | "INTERNATIONAL";
  ministry: string;
}) {
  return {
    code: h.shortCode,
    name: h.name,
    nameKh: h.nameKhmer ?? "",
    ministry: h.ministry,
    type: h.type === "PUBLIC" ? "Public" : h.type === "PRIVATE" ? "Private" : "International",
  };
}

// Map DB role enum → the prototype's lowercase role string. Authors
// don't appear here because they don't log in. Minister role isn't
// implemented (skipped per the project plan); admin covers that view.
function dbRoleToPrototype(role: "ADMIN" | "REVIEWER" | "HEI_COORDINATOR"): string {
  if (role === "ADMIN") return "admin";
  if (role === "REVIEWER") return "reviewer";
  return "hei";
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: initialQuery = "" } = await searchParams;
  // /app is dual-purpose:
  // - Anonymous visitors get the public catalogue (BrowseView, approved
  //   theses only) — no login needed; they're treated as role="public".
  // - Authenticated users get role-specific views (HEI dashboard, Review
  //   Queue, Admin records, etc.) based on their session.
  // Privileged actions are still gated by API-side role checks (Slice 3c),
  // so anonymous visitors can read but not write.
  const session = await auth();

  const [dbTheses, dbHeis, currentUser] = await Promise.all([
    prisma.thesis.findMany({
      include: { hei: { select: { shortCode: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.hei.findMany({
      where: { isActive: true },
      orderBy: { shortCode: "asc" },
    }),
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          include: { hei: { select: { shortCode: true } } },
        })
      : Promise.resolve(null),
  ]);

  // Signed-in but deactivated → bounce them to sign-in with an error.
  if (session?.user && (!currentUser || !currentUser.isActive)) {
    redirect("/sign-in?error=AccessDenied");
  }

  const initialTheses = dbTheses.map(dbThesisToPrototype);
  const initialHeis = dbHeis.map(dbHeiToPrototype);

  return (
    <AppClient
      initialTheses={initialTheses}
      initialHeis={initialHeis}
      initialQuery={initialQuery}
      currentUser={
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name ?? currentUser.email,
              email: currentUser.email,
              role: dbRoleToPrototype(currentUser.role),
              heiCode: currentUser.hei?.shortCode ?? null,
            }
          : null
      }
    />
  );
}
