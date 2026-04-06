import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface Context {
  db: typeof db;
  headers: Headers;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
}

const t = initTRPC.context<Context>().create();

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return await next({ ctx: { ...ctx, session: ctx.session } });
});

export const orgProcedure = protectedProcedure
  .input(z.object({ orgId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const members = await auth.api.listMembers({
      headers: ctx.headers,
      query: { organizationId: input.orgId },
    });

    const userId = ctx.session?.user?.id;
    const currentMember = members?.members?.find(
      (m: { userId: string }) => m.userId === userId
    );

    if (!currentMember) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not a member of this organization",
      });
    }

    return await next({
      ctx: { ...ctx, orgId: input.orgId, member: currentMember },
    });
  });

export const adminProcedure = orgProcedure.use(async ({ ctx, next }) => {
  const role = ctx.member?.role;
  if (role !== "owner" && role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Requires admin or owner role",
    });
  }
  return await next({ ctx });
});

export const ownerProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (ctx.member?.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Requires owner role",
    });
  }
  return await next({ ctx });
});

export async function createContext(): Promise<Context> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return { session, db, headers: h };
}
