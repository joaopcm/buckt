import {
  CloudFrontClient,
  CreateDistributionCommand,
  DeleteDistributionCommand,
  GetDistributionCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import type { AwsCredentialIdentity } from "@smithy/types";
import { env } from "../../env";

const defaultCloudfront = new CloudFrontClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

function getCloudfrontClient(
  credentials?: AwsCredentialIdentity
): CloudFrontClient {
  if (credentials) {
    return new CloudFrontClient({ region: "us-east-1", credentials });
  }
  return defaultCloudfront;
}

export async function createDistribution(opts: {
  domain: string;
  s3WebsiteEndpoint: string;
  certArn: string;
  logBucket?: string;
  logPrefix?: string;
  credentials?: AwsCredentialIdentity;
}) {
  const logging = opts.logBucket
    ? {
        Enabled: true,
        Bucket: `${opts.logBucket}.s3.amazonaws.com`,
        Prefix: `${opts.logPrefix ?? "cf-logs/"}${opts.domain}/`,
        IncludeCookies: false,
      }
    : { Enabled: false, Bucket: "", Prefix: "", IncludeCookies: false };

  const client = getCloudfrontClient(opts.credentials);
  const result = await client.send(
    new CreateDistributionCommand({
      DistributionConfig: {
        CallerReference: `buckt-${Date.now()}`,
        Enabled: true,
        Aliases: { Quantity: 1, Items: [opts.domain] },
        DefaultRootObject: "index.html",
        Origins: {
          Quantity: 1,
          Items: [
            {
              Id: "S3Origin",
              DomainName: opts.s3WebsiteEndpoint,
              CustomOriginConfig: {
                HTTPPort: 80,
                HTTPSPort: 443,
                OriginProtocolPolicy: "http-only",
                OriginSslProtocols: { Quantity: 1, Items: ["TLSv1.2"] },
              },
            },
          ],
        },
        DefaultCacheBehavior: {
          TargetOriginId: "S3Origin",
          ViewerProtocolPolicy: "redirect-to-https",
          AllowedMethods: {
            Quantity: 2,
            Items: ["GET", "HEAD"],
            CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] },
          },
          ForwardedValues: {
            QueryString: false,
            Cookies: { Forward: "none" },
          },
          MinTTL: 0,
        },
        ViewerCertificate: {
          ACMCertificateArn: opts.certArn,
          SSLSupportMethod: "sni-only",
          MinimumProtocolVersion: "TLSv1.2_2021",
        },
        Restrictions: {
          GeoRestriction: { RestrictionType: "none", Quantity: 0 },
        },
        Logging: logging,
        Comment: `Buckt CDN for ${opts.domain}`,
      },
    })
  );

  return {
    distributionId: result.Distribution?.Id ?? "",
    distributionDomain: result.Distribution?.DomainName ?? "",
  };
}

export async function disableDistribution(
  distributionId: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getCloudfrontClient(credentials);
  const dist = await client.send(
    new GetDistributionCommand({ Id: distributionId })
  );
  const config = dist.Distribution?.DistributionConfig;
  if (!config?.Enabled) {
    return;
  }

  await client.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      IfMatch: dist.ETag ?? "",
      DistributionConfig: { ...config, Enabled: false },
    })
  );
}

export async function deleteDistribution(
  distributionId: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getCloudfrontClient(credentials);
  const dist = await client.send(
    new GetDistributionCommand({ Id: distributionId })
  );
  await client.send(
    new DeleteDistributionCommand({
      Id: distributionId,
      IfMatch: dist.ETag ?? "",
    })
  );
}

export async function findDistributionForBucket(
  s3BucketName: string,
  region: string,
  credentials?: AwsCredentialIdentity
): Promise<{
  distributionId: string;
  distributionDomain: string;
  certArn: string | null;
  customDomain: string | null;
} | null> {
  const client = getCloudfrontClient(credentials);
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
