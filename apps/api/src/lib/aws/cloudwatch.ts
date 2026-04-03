import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch"
import { env } from "../../env"

const cloudwatch = new CloudWatchClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function getBucketSizeBytes(
  bucketName: string
): Promise<number> {
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  const result = await cloudwatch.send(
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
            Period: 86400,
            Stat: "Average",
          },
        },
      ],
    })
  )

  const values = result.MetricDataResults?.[0]?.Values ?? []
  return values[0] ?? 0
}
