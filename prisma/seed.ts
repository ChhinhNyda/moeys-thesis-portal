// Seed script — populates HEIs and synthetic test theses.
// Run with: npx tsx prisma/seed.ts
//
// All thesis content is SYNTHETIC. Abstracts are marked [TEST DATA].
// Wipe and reseed anytime — the script is idempotent (clears existing rows first).

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Clearing existing rows…");
  await prisma.thesis.deleteMany();
  await prisma.hei.deleteMany();

  console.log("Creating HEIs…");
  const rupp = await prisma.hei.create({
    data: {
      name: "Royal University of Phnom Penh",
      nameKhmer: "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ",
      shortCode: "RUPP",
      type: "PUBLIC",
      city: "Phnom Penh",
      contactEmail: "thesis-pilot@rupp.edu.kh",
    },
  });

  const itc = await prisma.hei.create({
    data: {
      name: "Institute of Technology of Cambodia",
      nameKhmer: "វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា",
      shortCode: "ITC",
      type: "PUBLIC",
      city: "Phnom Penh",
      contactEmail: "thesis-pilot@itc.edu.kh",
    },
  });

  const rua = await prisma.hei.create({
    data: {
      name: "Royal University of Agriculture",
      nameKhmer: "សាកលវិទ្យាល័យភូមិន្ទកសិកម្ម",
      shortCode: "RUA",
      type: "PUBLIC",
      city: "Phnom Penh",
      contactEmail: "thesis-pilot@rua.edu.kh",
    },
  });

  console.log(`  → ${rupp.shortCode}, ${itc.shortCode}, ${rua.shortCode}`);

  console.log("Creating synthetic theses…");
  await prisma.thesis.createMany({
    data: [
      {
        title:
          "Climate Change Impact on Rice Yield in the Tonle Sap Region",
        abstract:
          "[TEST DATA] This dissertation examines the relationship between rising temperatures, changing precipitation patterns, and rice yield variability in the Tonle Sap floodplain across 2010–2023. Using remote-sensing data and farmer surveys, we identify three key mechanisms by which climate change is reshaping smallholder rice production and propose adaptation strategies.",
        keywords: ["climate change", "rice", "Tonle Sap", "agriculture", "Cambodia"],
        language: "ENGLISH",
        pageCount: 142,
        authorFirstName: "Sokha",
        authorLastName: "Chea",
        authorEmail: "sokha.chea.test@example.com",
        degreeLevel: "PHD",
        fieldOfStudy: "Agricultural Science",
        defenseYear: 2024,
        supervisorName: "Prof. Sok Pisey (RUA)",
        coSupervisorNames: ["Dr. Marie Dubois (Université Lyon 2, France)"],
        heiId: rua.id,
        status: "APPROVED",
        submittedAt: new Date("2024-06-15"),
        approvedAt: new Date("2024-08-20"),
        releasePolicy: "IMMEDIATE",
        license: "CC_BY",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "PUBLIC",
        publicReleaseAt: new Date("2024-08-20"),
      },
      {
        title:
          "Solar Microgrid Deployment Strategies for Off-Grid Communities in Rural Cambodia",
        abstract:
          "[TEST DATA] This thesis analyzes the technical, economic, and social factors influencing successful deployment of solar microgrids in three rural Cambodian provinces. Drawing on field studies, cost modeling, and stakeholder interviews, the work proposes a hybrid public-private deployment framework targeting villages currently outside the national grid.",
        keywords: ["solar energy", "microgrid", "rural electrification", "Cambodia", "renewable"],
        language: "ENGLISH",
        pageCount: 98,
        authorFirstName: "Bopha",
        authorLastName: "Neang",
        authorEmail: "bopha.neang.test@example.com",
        degreeLevel: "MASTERS",
        fieldOfStudy: "Electrical Engineering",
        defenseYear: 2024,
        supervisorName: "Dr. Vannak Phon (ITC)",
        coSupervisorNames: [],
        heiId: itc.id,
        status: "APPROVED",
        submittedAt: new Date("2024-09-01"),
        approvedAt: new Date("2024-10-15"),
        releasePolicy: "DELAY_1Y",
        releaseReason: "PUBLICATION",
        publicReleaseAt: new Date("2025-10-15"),
        license: "ALL_RIGHTS_RESERVED",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "METADATA_ONLY",
      },
      {
        title:
          "Mekong River Sediment Transport: A Hydrodynamic Analysis Across Seasonal Cycles",
        abstract:
          "[TEST DATA] Using a coupled 2D hydrodynamic and sediment transport model calibrated against ten years of in-situ measurements, this dissertation quantifies sediment flux in the lower Mekong River system and assesses the implications of upstream dam construction on downstream agricultural productivity in the Tonle Sap basin.",
        keywords: ["Mekong", "sediment", "hydrology", "dams", "modeling"],
        language: "ENGLISH",
        pageCount: 217,
        authorFirstName: "Dara",
        authorLastName: "Kong",
        authorEmail: "dara.kong.test@example.com",
        degreeLevel: "PHD",
        fieldOfStudy: "Environmental Engineering",
        defenseYear: 2023,
        supervisorName: "Prof. Sopheap Tep (RUPP)",
        coSupervisorNames: [
          "Dr. James Carter (University of Sydney)",
          "Prof. Akira Tanaka (Kyoto University)",
        ],
        heiId: rupp.id,
        status: "APPROVED",
        submittedAt: new Date("2023-11-10"),
        approvedAt: new Date("2024-01-22"),
        releasePolicy: "IMMEDIATE",
        license: "ALL_RIGHTS_RESERVED",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "PUBLIC",
        publicReleaseAt: new Date("2024-01-22"),
      },
      {
        title:
          "Khmer Linguistic Patterns in Modern Social Media Discourse",
        abstract:
          "[TEST DATA] An analysis of register, code-switching, and emerging slang in Khmer-language Facebook discourse from 2018–2023. Drawing on a corpus of 50,000 publicly-posted comments across age and regional demographics, this thesis identifies seven novel linguistic features and their sociolinguistic implications.",
        keywords: ["Khmer language", "sociolinguistics", "social media", "code-switching"],
        language: "ENGLISH",
        pageCount: 124,
        authorFirstName: "Channary",
        authorLastName: "Pich",
        authorEmail: "channary.pich.test@example.com",
        degreeLevel: "MASTERS",
        fieldOfStudy: "Linguistics",
        defenseYear: 2024,
        supervisorName: "Dr. Sereyrath Lim (RUPP)",
        coSupervisorNames: [],
        heiId: rupp.id,
        status: "APPROVED",
        submittedAt: new Date("2024-04-12"),
        approvedAt: new Date("2024-06-30"),
        releasePolicy: "IMMEDIATE",
        license: "CC_BY_NC",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "PUBLIC",
        publicReleaseAt: new Date("2024-06-30"),
      },
      {
        title:
          "Machine Learning Approaches to Traffic Flow Optimization in Phnom Penh",
        abstract:
          "[TEST DATA] This thesis develops and evaluates three machine learning models for predicting and optimizing urban traffic flow at major intersections in Phnom Penh. Using two years of CCTV-derived vehicle count data, the work demonstrates a 14% reduction in average wait times under simulated deployment conditions.",
        keywords: ["machine learning", "traffic", "urban planning", "Phnom Penh", "computer vision"],
        language: "ENGLISH",
        pageCount: 165,
        authorFirstName: "Vichea",
        authorLastName: "Hak",
        authorEmail: "vichea.hak.test@example.com",
        degreeLevel: "PHD",
        fieldOfStudy: "Computer Science",
        defenseYear: 2025,
        supervisorName: "Prof. Sopheak Meas (ITC)",
        coSupervisorNames: ["Dr. Wei Zhang (Tsinghua University)"],
        heiId: itc.id,
        status: "UNDER_REVIEW",
        submittedAt: new Date("2025-02-20"),
        releasePolicy: "IMMEDIATE",
        license: "CC_BY",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "METADATA_ONLY",
      },
      {
        title:
          "Sustainable Aquaculture Practices for Resilient Tonle Sap Fishery Management",
        abstract:
          "[TEST DATA] An applied study of three pilot aquaculture interventions in Kampong Chhnang province, evaluating yield, sustainability indicators, and household income impacts over an 18-month deployment period. The work proposes a tiered policy framework for scaling sustainable aquaculture across the Tonle Sap basin.",
        keywords: ["aquaculture", "Tonle Sap", "fisheries", "sustainability", "rural livelihoods"],
        language: "ENGLISH",
        pageCount: 89,
        authorFirstName: "Pisey",
        authorLastName: "Sothea",
        authorEmail: "pisey.sothea.test@example.com",
        degreeLevel: "MASTERS",
        fieldOfStudy: "Fisheries Science",
        defenseYear: 2023,
        supervisorName: "Dr. Sarith Kim (RUA)",
        coSupervisorNames: [],
        heiId: rua.id,
        status: "APPROVED",
        submittedAt: new Date("2023-08-05"),
        approvedAt: new Date("2023-10-12"),
        releasePolicy: "DELAY_6M",
        releaseReason: "COMMERCIAL",
        publicReleaseAt: new Date("2024-04-12"),
        license: "ALL_RIGHTS_RESERVED",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "PUBLIC",
      },
      {
        title:
          "Cambodian Buddhist Manuscript Conservation: Materials, Methods, and Modern Challenges",
        abstract:
          "[TEST DATA] This thesis surveys the current state of palm-leaf manuscript conservation in Cambodian wat libraries, comparing traditional preservation techniques with modern conservation methodologies. Drawing on fieldwork at twelve wat libraries across five provinces, the work proposes a tiered conservation protocol.",
        keywords: ["Buddhism", "manuscripts", "conservation", "heritage", "palm-leaf"],
        language: "ENGLISH",
        pageCount: 110,
        authorFirstName: "Sokunthea",
        authorLastName: "Roeun",
        authorEmail: "sokunthea.roeun.test@example.com",
        degreeLevel: "MASTERS",
        fieldOfStudy: "Cultural Heritage Studies",
        defenseYear: 2025,
        supervisorName: "Prof. Sothy Khorn (RUPP)",
        coSupervisorNames: [],
        heiId: rupp.id,
        status: "DRAFT",
        submittedAt: new Date("2025-04-01"),
        releasePolicy: "IMMEDIATE",
        license: "CC_BY",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "METADATA_ONLY",
      },
      {
        title:
          "Seismic Resistance of Reinforced Concrete Frames in Tropical Climate Conditions",
        abstract:
          "[TEST DATA] An experimental and computational study of how prolonged exposure to high humidity and temperature cycling affects the seismic performance of reinforced concrete frame structures. Includes shake-table testing of full-scale specimens and finite element modeling validated against measured response data.",
        keywords: ["earthquake engineering", "reinforced concrete", "tropical climate", "structural"],
        language: "ENGLISH",
        pageCount: 156,
        authorFirstName: "Rithy",
        authorLastName: "Yim",
        authorEmail: "rithy.yim.test@example.com",
        degreeLevel: "MASTERS",
        fieldOfStudy: "Civil Engineering",
        defenseYear: 2024,
        supervisorName: "Dr. Vibol Ung (ITC)",
        coSupervisorNames: ["Prof. Hans Müller (TU Munich, Germany)"],
        heiId: itc.id,
        status: "APPROVED",
        submittedAt: new Date("2024-10-25"),
        approvedAt: new Date("2024-12-18"),
        releasePolicy: "IMMEDIATE",
        license: "CC_BY_NC_ND",
        licenseAcknowledged: true,
        authorshipConfirmed: true,
        visibility: "PUBLIC",
        publicReleaseAt: new Date("2024-12-18"),
      },
    ],
  });

  const count = await prisma.thesis.count();
  console.log(`  → ${count} theses created.`);
  console.log("");
  console.log("✓ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
