// Configure CORS on the R2 bucket so browsers from our Vercel domain
// (and localhost during dev) can PUT/GET directly to the presigned URLs.
// Run once after bucket creation, or whenever the allowed origins change.
//
// Run with:  npx tsx scripts/configure-r2-cors.ts

import "dotenv/config";
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

const ALLOWED_ORIGINS = [
  "https://moeys-thesis-portal.vercel.app",
  "http://localhost:3000",
];

async function main() {
  const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const Bucket = process.env.R2_BUCKET_NAME!;

  await r2.send(
    new PutBucketCorsCommand({
      Bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ALLOWED_ORIGINS,
            AllowedMethods: ["GET", "PUT", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  console.log(`✓ CORS policy applied to bucket "${Bucket}"`);
  console.log(`  Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);

  const current = await r2.send(new GetBucketCorsCommand({ Bucket }));
  console.log("\nCurrent CORS rules:");
  console.log(JSON.stringify(current.CORSRules, null, 2));
}

main().catch((e) => {
  console.error("❌ Failed to set CORS:", e.message);
  process.exit(1);
});
