import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3 } from "../s3";

export async function getBucketSizeBytes(bucketName: string): Promise<number> {
  let totalBytes = 0;
  let continuationToken: string | undefined;

  do {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of result.Contents ?? []) {
      totalBytes += obj.Size ?? 0;
    }

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return totalBytes;
}
