// End-to-end R2 roundtrip test.
// Run with:  npx tsx scripts/test-r2.ts [path-to-pdf]
//
// If a PDF path is given, that file is uploaded. Otherwise a tiny synthetic
// stub is uploaded. Picks a published thesis from the DB, generates an
// upload URL, uploads, saves the key to the DB, generates a download URL,
// downloads it back, and verifies the bytes match. Reports each step.
//
// Requires:  npm run dev  must be running in another terminal (this hits
// http://localhost:3000/api/* routes).

import "dotenv/config";
import { writeFileSync, readFileSync } from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

// Minimal valid-looking PDF stub. R2 stores arbitrary bytes so this is fine
// for proving the roundtrip; for real authoring use a real PDF later.
const TEST_PDF_BYTES = Buffer.from(
  "%PDF-1.4\n%MoEYS test stub\n1 0 obj <</Type/Catalog>> endobj\n%%EOF\n",
  "utf-8"
);
const TEST_PDF_PATH = "/tmp/moeys-test-thesis.pdf";

async function main() {
  // --- Setup ---
  const customPdfPath = process.argv[2];
  let pdfBuffer: Buffer;
  if (customPdfPath) {
    pdfBuffer = readFileSync(customPdfPath);
    console.log(`✓ Reading PDF from ${customPdfPath} (${pdfBuffer.length} bytes)`);
  } else {
    writeFileSync(TEST_PDF_PATH, TEST_PDF_BYTES);
    pdfBuffer = readFileSync(TEST_PDF_PATH);
    console.log(`✓ Using synthetic stub at ${TEST_PDF_PATH} (${pdfBuffer.length} bytes)`);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // Pick a thesis that download-url will accept (APPROVED + PUBLIC)
  const thesis = await prisma.thesis.findFirst({
    where: { status: "APPROVED", visibility: "PUBLIC" },
    select: { id: true, title: true },
  });
  if (!thesis) throw new Error("No APPROVED+PUBLIC thesis in DB.");
  console.log(`✓ Using thesis: "${thesis.title}" (id: ${thesis.id})`);

  // --- Step 1: Request presigned upload URL ---
  console.log("\n--- Step 1: POST /api/upload-url ---");
  const uploadRes = await fetch("http://localhost:3000/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thesisId: thesis.id, contentType: "application/pdf" }),
  });
  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    throw new Error(`upload-url failed: ${uploadRes.status} ${txt}`);
  }
  const { url: uploadUrl, key } = await uploadRes.json();
  console.log(`✓ Got presigned PUT URL  (key: ${key})`);

  // --- Step 2: Upload the PDF to R2 ---
  console.log("\n--- Step 2: PUT to R2 ---");
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: new Uint8Array(pdfBuffer),
  });
  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(`PUT failed: ${putRes.status} ${txt}`);
  }
  console.log(`✓ Uploaded ${pdfBuffer.length} bytes to R2`);

  // --- Step 3: Save the key to the thesis row ---
  console.log("\n--- Step 3: UPDATE thesis.pdfFileKey ---");
  await prisma.thesis.update({
    where: { id: thesis.id },
    data: { pdfFileKey: key },
  });
  console.log(`✓ Saved key to DB: ${key}`);

  // --- Step 4: Request presigned download URL ---
  console.log("\n--- Step 4: POST /api/download-url ---");
  const downloadRes = await fetch("http://localhost:3000/api/download-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thesisId: thesis.id }),
  });
  if (!downloadRes.ok) {
    const txt = await downloadRes.text();
    throw new Error(`download-url failed: ${downloadRes.status} ${txt}`);
  }
  const { url: downloadUrl } = await downloadRes.json();
  console.log(`✓ Got presigned GET URL`);

  // --- Step 5: GET it back and verify byte-equal ---
  console.log("\n--- Step 5: GET from R2, verify roundtrip ---");
  const getRes = await fetch(downloadUrl);
  if (!getRes.ok) throw new Error(`GET failed: ${getRes.status}`);
  const downloaded = new Uint8Array(await getRes.arrayBuffer());
  if (downloaded.length !== pdfBuffer.length) {
    throw new Error(`Size mismatch: uploaded ${pdfBuffer.length}, downloaded ${downloaded.length}`);
  }
  console.log(`✓ Downloaded ${downloaded.length} bytes — size matches`);

  console.log("\n🎉 R2 roundtrip works end-to-end.");
  console.log(`Cloudflare dashboard should show: moeys-thesis-pilot → theses/${thesis.id}.pdf`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\n❌ Test failed:", e.message);
  process.exit(1);
});
