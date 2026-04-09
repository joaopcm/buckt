import type { Context } from "hono";

export function isBucketInScope(c: Context, bucketId: string): boolean {
  const bucketIds = c.get("bucketIds") as string[] | null;
  if (bucketIds === null) {
    return true;
  }
  return bucketIds.includes(bucketId);
}

export function getScopedBucketIds(c: Context): string[] | null {
  return c.get("bucketIds") as string[] | null;
}
