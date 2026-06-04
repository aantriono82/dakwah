import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET ?? "khutbahai";
const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const publicUrl = process.env.S3_PUBLIC_URL ?? `${endpoint}/${bucket}`;
const signedUrlExpires = Number(process.env.S3_SIGNED_URL_EXPIRES ?? 60 * 60 * 24 * 7);
const required = process.env.S3_REQUIRED === "true";

const client = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "khutbahai",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "khutbahai-secret"
  }
});

const publicEndpoint = new URL(publicUrl).origin;
const publicClient = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: publicEndpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "khutbahai",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "khutbahai-secret"
  }
});

let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  bucketReady = true;
}

export async function uploadFile(key: string, body: Uint8Array, contentType: string) {
  try {
    await ensureBucket();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );

    const url = await getSignedUrl(publicClient, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: signedUrlExpires
    });

    return {
      key,
      url
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage tidak dapat diakses.";
    if (required) {
      throw new Error(`Upload storage gagal: ${message}`);
    }

    return {
      key,
      url: "",
      error: message
    };
  }
}

export function isStorageRequired() {
  return required;
}

export async function checkStorageHealth() {
  try {
    await ensureBucket();
    return {
      ok: true,
      required,
      bucket,
      endpoint,
      publicUrl
    };
  } catch (error) {
    return {
      ok: false,
      required,
      bucket,
      endpoint,
      publicUrl,
      message: error instanceof Error ? error.message : "Storage tidak dapat diakses."
    };
  }
}
