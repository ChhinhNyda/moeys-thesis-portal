// Seed the research glossary with ~30 common English–Khmer term pairs.
// Run with: npx tsx scripts/seed-glossary.ts
//
// The Khmer translations below are best-effort drafts of widely used
// academic Khmer terms. They should be reviewed and corrected by domain
// experts via the /app admin glossary page — the goal of this seed is
// to give the portal a starting point, not a definitive lexicon.
//
// The script is idempotent on (termEnglish, termKhmer) pairs: existing
// rows are left untouched, new ones are inserted. Re-run safely.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type SeedTerm = {
  en: string;
  km: string;
  defEn?: string;
  defKm?: string;
  category: string;
};

const TERMS: SeedTerm[] = [
  // ── General research vocabulary ─────────────────────────────────
  { en: "Research",         km: "ការស្រាវជ្រាវ",         category: "General" },
  { en: "Thesis",           km: "និក្ខេបបទ",             category: "General" },
  { en: "Dissertation",     km: "សារណាបណ្ឌិត",          category: "General" },
  { en: "Abstract",         km: "សង្ខេប",                category: "Writing" },
  { en: "Introduction",     km: "សេចក្ដីផ្តើម",          category: "Writing" },
  { en: "Conclusion",       km: "សេចក្ដីសន្និដ្ឋាន",     category: "Writing" },
  { en: "Discussion",       km: "ការពិភាក្សា",          category: "Writing" },
  { en: "Findings",         km: "លទ្ធផលរកឃើញ",         category: "Writing" },
  { en: "Recommendation",   km: "អនុសាសន៍",             category: "Writing" },
  { en: "Limitations",      km: "ដែនកំណត់",             category: "Writing" },

  // ── Methodology ─────────────────────────────────────────────────
  { en: "Methodology",      km: "វិធីសាស្ត្រស្រាវជ្រាវ", category: "Methodology" },
  { en: "Hypothesis",       km: "សម្មតិកម្ម",            category: "Methodology" },
  { en: "Theory",           km: "ទ្រឹស្តី",               category: "Methodology" },
  { en: "Framework",        km: "ក្របខណ្ឌ",              category: "Methodology" },
  { en: "Qualitative",      km: "គុណវិន័យ",              category: "Methodology" },
  { en: "Quantitative",     km: "បរិមាណវិន័យ",          category: "Methodology" },
  { en: "Case study",       km: "ការសិក្សាករណី",       category: "Methodology" },
  { en: "Survey",           km: "ការស្ទង់មតិ",          category: "Methodology" },
  { en: "Interview",        km: "សម្ភាសន៍",              category: "Methodology" },
  { en: "Observation",      km: "ការសង្កេត",            category: "Methodology" },

  // ── Data and statistics ─────────────────────────────────────────
  { en: "Data",             km: "ទិន្នន័យ",               category: "Statistics" },
  { en: "Variable",         km: "អថេរ",                   category: "Statistics" },
  { en: "Sample",           km: "គំរូ",                    category: "Statistics" },
  { en: "Population",       km: "ប្រជាជន",               category: "Statistics" },
  { en: "Analysis",         km: "ការវិភាគ",              category: "Statistics" },
  { en: "Correlation",      km: "ទំនាក់ទំនង",            category: "Statistics" },
  { en: "Mean (average)",   km: "មធ្យមភាគ",              category: "Statistics" },
  { en: "Validity",         km: "សុពលភាព",               category: "Statistics" },
  { en: "Reliability",      km: "ភាពជឿទុកចិត្តបាន",     category: "Statistics" },
  { en: "Bias",             km: "លំអៀង",                  category: "Statistics" },

  // ── Scholarly conduct ──────────────────────────────────────────
  { en: "Citation",         km: "ការដកស្រង់",           category: "Ethics" },
  { en: "Reference",        km: "ឯកសារយោង",            category: "Ethics" },
  { en: "Bibliography",     km: "បញ្ជីឯកសារយោង",       category: "Ethics" },
  { en: "Literature review",km: "ការត្រួតពិនិត្យអក្សរសិល្ប៍", category: "Writing" },
  { en: "Plagiarism",       km: "ការលួចគំនិត",          category: "Ethics" },
  { en: "Ethics",           km: "ក្រមសីលធម៌",           category: "Ethics" },
];

async function main() {
  console.log(`Seeding ${TERMS.length} glossary terms…`);
  let inserted = 0;
  let skipped = 0;
  for (const t of TERMS) {
    const existing = await prisma.glossaryTerm.findFirst({
      where: { termEnglish: t.en, termKhmer: t.km },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.glossaryTerm.create({
      data: {
        termEnglish: t.en,
        termKhmer: t.km,
        definitionEnglish: t.defEn ?? null,
        definitionKhmer: t.defKm ?? null,
        category: t.category,
      },
    });
    inserted++;
  }
  console.log(`Done. Inserted ${inserted}, skipped ${skipped} already present.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
