import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import type { AwsCredentialIdentity } from "@smithy/types";
import { env } from "../../env";

const defaultCloudwatch = new CloudWatchClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

function getCloudwatchClient(
  region?: string,
  credentials?: AwsCredentialIdentity
): CloudWatchClient {
  if (credentials) {
    return new CloudWatchClient({
      region: region ?? env.AWS_REGION,
      credentials,
    });
  }
  return defaultCloudwatch;
}

export async function getBucketSizeBytes(
  bucketName: string,
  region?: string,
  credentials?: AwsCredentialIdentity
): Promise<number> {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const client = getCloudwatchClient(region, credentials);

  const result = await client.send(
    new GetMetricDataCommand({
      StartTime: twoDaysAgo,
      EndTime: now,
      MetricDataQueries: [
        {
          Id: "bucketSize",
          MetricStat: {
            Metric: {
              Namespace: "AWS/S3",
              MetricName: "BucketSizeBytes",
              Dimensions: [
                { Name: "BucketName", Value: bucketName },
                { Name: "StorageType", Value: "StandardStorage" },
              ],
            },
            Period: 86_400,
            Stat: "Average",
          },
        },
      ],
    })
  );

  const values = result.MetricDataResults?.[0]?.Values ?? [];
  return values[0] ?? 0;
}

export async function getDistributionBandwidthBytes(
  distributionId: string,
  date: Date,
  credentials?: AwsCredentialIdentity
): Promise<number> {
  const client = getCloudwatchClient("us-east-1", credentials);
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const result = await client.send(
    new GetMetricDataCommand({
      StartTime: startOfDay,
      EndTime: endOfDay,
      MetricDataQueries: [
        {
          Id: "bytesDownloaded",
          MetricStat: {
            Metric: {
              Namespace: "AWS/CloudFront",
              MetricName: "BytesDownloaded",
              Dimensions: [
                { Name: "DistributionId", Value: distributionId },
                { Name: "Region", Value: "Global" },
              ],
            },
            Period: 86_400,
            Stat: "Sum",
          },
        },
        {
          Id: "bytesUploaded",
          MetricStat: {
            Metric: {
              Namespace: "AWS/CloudFront",
              MetricName: "BytesUploaded",
              Dimensions: [
                { Name: "DistributionId", Value: distributionId },
                { Name: "Region", Value: "Global" },
              ],
            },
            Period: 86_400,
            Stat: "Sum",
          },
        },
      ],
    })
  );

  const downloaded = result.MetricDataResults?.[0]?.Values?.[0] ?? 0;
  const uploaded = result.MetricDataResults?.[1]?.Values?.[0] ?? 0;
  return downloaded + uploaded;
}
