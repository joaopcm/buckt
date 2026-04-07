import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { buckets, createDb } from "@buckt/db";
import type { OptimizationMode } from "@buckt/shared";
import { logger, task } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

interface OptimizeFilePayload {
  bucketId: string;
  s3BucketName: string;
  fileKey: string;
  contentType: string;
  originalSize: number;
  mode: Exclude<OptimizationMode, "none">;
  cacheControl: string;
}

const QUALITY_MAP = {
  light: {
    jpeg: 85,
    webp: 85,
    avif: 70,
    gif: 85,
    png: { compressionLevel: 4, palette: false },
  },
  balanced: {
    jpeg: 75,
    webp: 75,
    avif: 55,
    gif: 70,
    png: { compressionLevel: 6, palette: false },
  },
  maximum: {
    jpeg: 60,
    webp: 60,
    avif: 40,
    gif: 50,
    png: { compressionLevel: 9, palette: true },
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
        })
        .toBuffer();
    case "image/webp":
      return pipeline.webp({ quality: settings.webp }).toBuffer();
    case "image/avif":
      return pipeline.avif({ quality: settings.avif }).toBuffer();
    case "image/gif":
      return pipeline.gif().toBuffer();
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

export const optimizeFile = task({
  id: "optimize-file",
  run: async (payload: OptimizeFilePayload) => {
    const {
      bucketId,
      s3BucketName,
      fileKey,
      contentType,
      originalSize,
      mode,
      cacheControl,
    } = payload;

    logger.info("Downloading file from S3", {
      s3BucketName,
      fileKey,
      originalSize,
    });

    const response = await s3.send(
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
    await s3.send(
      new PutObjectCommand({
        Bucket: s3BucketName,
        Key: fileKey,
        Body: optimizedBuffer,
        ContentType: contentType,
        CacheControl: cacheControl,
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
