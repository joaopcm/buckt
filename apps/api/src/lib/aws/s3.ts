import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutBucketWebsiteCommand,
} from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@smithy/types";
import { getS3Client } from "../s3";
import { setBucketPrivate, setBucketPublic } from "./bucket-settings";

export async function createBucketResources(
  bucketName: string,
  region: string,
  visibility: "public" | "private" = "public",
  credentials?: AwsCredentialIdentity
) {
  const client = getS3Client(region, credentials);

  await client.send(
    new CreateBucketCommand({
      Bucket: bucketName,
      ...(region !== "us-east-1" && {
        CreateBucketConfiguration: { LocationConstraint: region },
      }),
    })
  );

  await client.send(
    new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: { IndexDocument: { Suffix: "index.html" } },
    })
  );

  if (visibility === "public") {
    await setBucketPublic(bucketName, region, credentials);
  } else {
    await setBucketPrivate(bucketName, region, credentials);
  }

  return {
    websiteEndpoint: `${bucketName}.s3-website-${region}.amazonaws.com`,
  };
}

export async function emptyBucket(
  bucketName: string,
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getS3Client(region, credentials);
  let continuationToken: string | undefined;
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );
    if (list.Contents?.length) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: list.Contents.map((o) => ({ Key: o.Key ?? "" })),
          },
        })
      );
    }
    continuationToken = list.IsTruncated
      ? list.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

export async function deleteBucketResources(
  bucketName: string,
  region: string,
  credentials?: AwsCredentialIdentity
) {
  await emptyBucket(bucketName, region, credentials);
  const client = getS3Client(region, credentials);
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}
