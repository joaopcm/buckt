import {
  CloudFrontClient,
  CreateDistributionCommand,
  DeleteDistributionCommand,
  GetDistributionCommand,
  UpdateDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import { env } from "../../env";

const cloudfront = new CloudFrontClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function createDistribution(opts: {
  domain: string;
  s3WebsiteEndpoint: string;
  certArn: string;
}) {
  const result = await cloudfront.send(
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
        Comment: `Buckt CDN for ${opts.domain}`,
      },
    })
  );

  return {
    distributionId: result.Distribution?.Id ?? "",
    distributionDomain: result.Distribution?.DomainName ?? "",
  };
}

export async function disableDistribution(distributionId: string) {
  const dist = await cloudfront.send(
    new GetDistributionCommand({ Id: distributionId })
  );
  const config = dist.Distribution?.DistributionConfig;
  if (!config?.Enabled) {
    return;
  }

  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      IfMatch: dist.ETag ?? "",
      DistributionConfig: { ...config, Enabled: false },
    })
  );
}

export async function deleteDistribution(distributionId: string) {
  const dist = await cloudfront.send(
    new GetDistributionCommand({ Id: distributionId })
  );
  await cloudfront.send(
    new DeleteDistributionCommand({
      Id: distributionId,
      IfMatch: dist.ETag ?? "",
    })
  );
}
