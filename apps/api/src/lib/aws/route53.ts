import {
  ChangeResourceRecordSetsCommand,
  Route53Client,
} from "@aws-sdk/client-route-53";
import { env } from "../../env";

const CLOUDFRONT_HOSTED_ZONE_ID = "Z2FDTNDATAQYW2";

const route53 = new Route53Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function upsertManagedAlias({
  hostedZoneId,
  recordName,
  distributionDomain,
}: {
  hostedZoneId: string;
  recordName: string;
  distributionDomain: string;
}) {
  await route53.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: recordName,
              Type: "A",
              AliasTarget: {
                HostedZoneId: CLOUDFRONT_HOSTED_ZONE_ID,
                DNSName: distributionDomain,
                EvaluateTargetHealth: false,
              },
            },
          },
        ],
      },
    })
  );
}

export async function deleteManagedAlias({
  hostedZoneId,
  recordName,
  distributionDomain,
}: {
  hostedZoneId: string;
  recordName: string;
  distributionDomain: string;
}) {
  try {
    await route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: "DELETE",
              ResourceRecordSet: {
                Name: recordName,
                Type: "A",
                AliasTarget: {
                  HostedZoneId: CLOUDFRONT_HOSTED_ZONE_ID,
                  DNSName: distributionDomain,
                  EvaluateTargetHealth: false,
                },
              },
            },
          ],
        },
      })
    );
  } catch (err) {
    if (err instanceof Error && err.name === "InvalidChangeBatch") {
      return;
    }
    throw err;
  }
}
