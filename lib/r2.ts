// Singleton S3 client pointed at Cloudflare R2.
// Same singleton pattern as lib/prisma.ts to survive Next.js dev hot-reload.

import { S3Client } from "@aws-sdk/client-s3";

const globalForR2 = globalThis as unknown as {
  r2: S3Client | undefined;
};

export const r2 =
  globalForR2.r2 ??
  new S3Client({
    region: "auto", // R2 ignores region but the SDK requires the field
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForR2.r2 = r2;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
