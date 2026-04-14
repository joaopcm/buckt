import { S3Client } from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@smithy/types";
import { env } from "../env";

const defaultCredentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
};

const defaultClients = new Map<string, S3Client>();

export function getS3Client(
  region: string,
  credentials?: AwsCredentialIdentity
): S3Client {
  if (credentials) {
    return new S3Client({ region, credentials });
  }
  const existing = defaultClients.get(region);
  if (existing) {
    return existing;
  }
  const client = new S3Client({ region, credentials: defaultCredentials });
  defaultClients.set(region, client);
  return client;
}

export const s3 = getS3Client(env.AWS_REGION);
