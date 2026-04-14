"use server";

import {
  CloudFrontClient,
  ListDistributionsCommand,
} from "@aws-sdk/client-cloudfront";
import type { AwsCredentialIdentity } from "@smithy/types";

export async function findDistributionForBucket(
  s3BucketName: string,
  region: string,
  credentials: AwsCredentialIdentity
): Promise<{
  distributionId: string;
  distributionDomain: string;
  certArn: string | null;
  customDomain: string | null;
} | null> {
  const client = new CloudFrontClient({
    region: "us-east-1",
    credentials,
  });
  const s3Origin = `${s3BucketName}.s3-website-${region}.amazonaws.com`;
  const s3OriginAlt = `${s3BucketName}.s3.${region}.amazonaws.com`;

  let marker: string | undefined;
  do {
    const result = await client.send(
      new ListDistributionsCommand({ Marker: marker, MaxItems: 100 })
    );

    for (const dist of result.DistributionList?.Items ?? []) {
      const origins = dist.Origins?.Items ?? [];
      const matchesOrigin = origins.some(
        (o) => o.DomainName === s3Origin || o.DomainName === s3OriginAlt
      );
      if (matchesOrigin && dist.Id) {
        const aliases = dist.Aliases?.Items ?? [];
        return {
          distributionId: dist.Id,
          distributionDomain: dist.DomainName ?? "",
          certArn: dist.ViewerCertificate?.ACMCertificateArn ?? null,
          customDomain: aliases[0] ?? null,
        };
      }
    }

    marker = result.DistributionList?.IsTruncated
      ? result.DistributionList.NextMarker
      : undefined;
  } while (marker);

  return null;
}
