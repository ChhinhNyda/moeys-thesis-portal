import { prisma } from "../../lib/prisma";
import AppClient from "./AppClient";

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
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  visibility: "PUBLIC" | "METADATA_ONLY" | "HIDDEN";
  submittedAt: Date;
  approvedAt: Date | null;
  publicReleaseAt: Date | null;
  rejectionReason: string | null;
  pdfFileKey: string | null;
  hei: { shortCode: string };
}) {
  let protoStatus: string;
  if (t.status === "APPROVED" && t.visibility === "PUBLIC") protoStatus = "published";
  else if (t.status === "APPROVED" && t.visibility === "METADATA_ONLY") protoStatus = "embargoed";
  else if (t.status === "UNDER_REVIEW") protoStatus = "submitted";
  else if (t.status === "REJECTED") protoStatus = "revision_requested";
  else if (t.status === "DRAFT") protoStatus = "submitted";
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
    history: [],
  };
}

function dbHeiToPrototype(h: {
  shortCode: string;
  name: string;
  nameKhmer: string | null;
  type: "PUBLIC" | "PRIVATE" | "INTERNATIONAL";
}) {
  return {
    code: h.shortCode,
    name: h.name,
    nameKh: h.nameKhmer ?? "",
    ministry: "MoEYS",
    type: h.type === "PUBLIC" ? "Public" : h.type === "PRIVATE" ? "Private" : "International",
  };
}

export default async function AppPage() {
  const [dbTheses, dbHeis] = await Promise.all([
    prisma.thesis.findMany({
      include: { hei: { select: { shortCode: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.hei.findMany({
      where: { isActive: true },
      orderBy: { shortCode: "asc" },
    }),
  ]);

  const initialTheses = dbTheses.map(dbThesisToPrototype);
  const initialHeis = dbHeis.map(dbHeiToPrototype);

  return <AppClient initialTheses={initialTheses} initialHeis={initialHeis} />;
}
