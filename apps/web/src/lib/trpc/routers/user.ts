import { updateProfileImageSchema } from "@buckt/shared";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { buckt } from "@/lib/buckt";
import { formatBytes } from "@/utils/format";
import { protectedProcedure, router } from "../init";

export const userRouter = router({
  updateImage: protectedProcedure
    .input(updateProfileImageSchema)
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.image, "base64");
      const MAX_SIZE = 2 * 1024 * 1024;
      if (buffer.length > MAX_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Image must be under ${formatBytes(MAX_SIZE)}`,
        });
      }

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
      };
      const ext = extMap[input.contentType] ?? "png";
      const bucketId = env.BUCKT_CDN_BUCKET_ID;
      const userId = ctx.session.user.id;

      const cdnBucket = await buckt.buckets.get(bucketId);

      if (ctx.session.user.image) {
        try {
          const url = new URL(ctx.session.user.image);
          if (url.hostname === cdnBucket.customDomain) {
            const oldPath = url.pathname.slice(1);
            await buckt.files.delete(bucketId, oldPath);
          }
        } catch {
          // old file cleanup is best-effort
        }
      }

      const path = `users/${userId}/avatars/${crypto.randomUUID()}.${ext}`;
      await buckt.files.upload(bucketId, path, buffer, input.contentType);

      const imageUrl = `https://${cdnBucket.customDomain}/${path}`;
      await auth.api.updateUser({
        headers: ctx.headers,
        body: { image: imageUrl },
      });
      return { image: imageUrl };
    }),

  removeImage: protectedProcedure.mutation(async ({ ctx }) => {
    const bucketId = env.BUCKT_CDN_BUCKET_ID;

    const cdnBucket = await buckt.buckets.get(bucketId);

    if (ctx.session.user.image) {
      try {
        const url = new URL(ctx.session.user.image);
        if (url.hostname === cdnBucket.customDomain) {
          const filePath = url.pathname.slice(1);
          await buckt.files.delete(bucketId, filePath);
        }
      } catch {
        // file cleanup is best-effort
      }
    }

    await auth.api.updateUser({
      headers: ctx.headers,
      body: { image: "" },
    });
    return { image: null };
  }),
});
