import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../env";

const credentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
};

const clients = new Map<string, S3Client>();

export function getS3Client(region: string): S3Client {
  const existing = clients.get(region);
  if (existing) {
    return existing;
  }
  const client = new S3Client({ region, credentials });
  clients.set(region, client);
  return client;
}

export const s3 = getS3Client(env.AWS_REGION);
