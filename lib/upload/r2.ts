import { S3Client } from "@aws-sdk/client-s3";

const globalForR2 = globalThis as unknown as { r2?: S3Client };

function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export const r2 = globalForR2.r2 ?? createR2Client();

if (process.env.NODE_ENV !== "production") {
  globalForR2.r2 = r2;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "hrmic-assets";

/** Public URL for a stored object (if the bucket has public access enabled). */
export function publicR2Url(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return key;
  return `${base}/${key}`;
}
