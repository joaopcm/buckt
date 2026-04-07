import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutBucketWebsiteCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "../s3";
import { setBucketPrivate, setBucketPublic } from "./bucket-settings";

export async function createBucketResources(
  bucketName: string,
  region: string,
  visibility: "public" | "private" = "public"
) {
  await s3.send(new CreateBucketCommand({ Bucket: bucketName }));

  await s3.send(
    new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: { IndexDocument: { Suffix: "index.html" } },
    })
  );

  if (visibility === "public") {
    await setBucketPublic(bucketName);
  } else {
    await setBucketPrivate(bucketName);
  }

  return {
    websiteEndpoint: `${bucketName}.s3-website-${region}.amazonaws.com`,
  };
}

export async function emptyBucket(bucketName: string) {
  let continuationToken: string | undefined;
  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );
    if (list.Contents?.length) {
      await s3.send(
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

export async function deleteBucketResources(bucketName: string) {
  await emptyBucket(bucketName);
  await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
}
