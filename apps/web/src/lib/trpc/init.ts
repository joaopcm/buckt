import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
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

export async function createContext(): Promise<Context> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return { session, db, headers: h };
}
