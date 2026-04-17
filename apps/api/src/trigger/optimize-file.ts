import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { buckets, createDb } from "@buckt/db";
import type { OptimizationMode } from "@buckt/shared";
import { logger, task } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { resolveCredentials } from "../lib/aws/client-factory";
import { getS3Client } from "../lib/s3";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

interface OptimizeFilePayload {
  awsAccountId?: string | null;
  bucketId: string;
  cacheControl: string | null;
  contentType: string;
  fileKey: string;
  mode: Exclude<OptimizationMode, "none">;
  originalSize: number;
  region: string;
  s3BucketName: string;
}

const QUALITY_MAP = {
  light: {
    jpeg: 90,
    webp: 90,
    avif: 75,
    gif: { colours: 256 },
    png: { compressionLevel: 3, palette: false },
  },
  balanced: {
    jpeg: 70,
    webp: 70,
    avif: 50,
    gif: { colours: 128 },
    png: { compressionLevel: 6, palette: true },
  },
  maximum: {
    jpeg: 40,
    webp: 40,
    avif: 25,
    gif: { colours: 64 },
    png: { compressionLevel: 9, palette: true, colours: 64 },
  },
} as const;

function compressImage(
  buffer: Buffer,
  contentType: string,
  mode: keyof typeof QUALITY_MAP
): Promise<Buffer> {
  const settings = QUALITY_MAP[mode];
  const pipeline = sharp(buffer, { animated: contentType === "image/gif" });

  switch (contentType) {
    case "image/jpeg":
      return pipeline.jpeg({ quality: settings.jpeg }).toBuffer();
    case "image/png":
      return pipeline
        .png({
          compressionLevel: settings.png.compressionLevel,
          palette: settings.png.palette,
          ...("colours" in settings.png && { colours: settings.png.colours }),
        })
        .toBuffer();
    case "image/webp":
      return pipeline.webp({ quality: settings.webp }).toBuffer();
    case "image/avif":
      return pipeline.avif({ quality: settings.avif }).toBuffer();
    case "image/gif":
      return pipeline.gif({ colours: settings.gif.colours }).toBuffer();
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

export const optimizeFile = task({
  id: "optimize-file",
  run: async (payload: OptimizeFilePayload) => {
    const {
      awsAccountId,
      bucketId,
      s3BucketName,
      region,
      fileKey,
      contentType,
      originalSize,
      mode,
      cacheControl,
    } = payload;

    const credentials = await resolveCredentials(awsAccountId, db);

    logger.info("Downloading file from S3", {
      s3BucketName,
      fileKey,
      originalSize,
    });

    const response = await getS3Client(region, credentials).send(
      new GetObjectCommand({ Bucket: s3BucketName, Key: fileKey })
    );

    const bodyBytes = await response.Body?.transformToByteArray();
    if (!bodyBytes) {
      throw new Error("Empty response body from S3");
    }

    const originalBuffer = Buffer.from(bodyBytes);

    logger.info("Compressing image", { contentType, mode });
    const optimizedBuffer = await compressImage(
      originalBuffer,
      contentType,
      mode
    );
    const optimizedSize = optimizedBuffer.byteLength;

    if (optimizedSize >= originalSize) {
      logger.info("Optimized file is not smaller, skipping re-upload", {
        originalSize,
        optimizedSize,
      });
      return { skipped: true, originalSize, optimizedSize };
    }

    logger.info("Uploading optimized file", { optimizedSize });
    await getS3Client(region, credentials).send(
      new PutObjectCommand({
        Bucket: s3BucketName,
        Key: fileKey,
        Body: optimizedBuffer,
        ContentType: contentType,
        ...(cacheControl !== null && { CacheControl: cacheControl }),
      })
    );

    const delta = optimizedSize - originalSize;
    await db
      .update(buckets)
      .set({
        storageUsedBytes: sql`GREATEST(${buckets.storageUsedBytes} + ${delta}, 0)`,
      })
      .where(eq(buckets.id, bucketId));

    const savingsPercent = (
      ((originalSize - optimizedSize) / originalSize) *
      100
    ).toFixed(1);
    logger.info("Optimization complete", {
      originalSize,
      optimizedSize,
      savingsPercent: `${savingsPercent}%`,
    });

    return { skipped: false, originalSize, optimizedSize, savingsPercent };
  },
});
