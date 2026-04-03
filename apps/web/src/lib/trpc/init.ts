import { createDb } from "@buckt/db";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { env } from "@/env";
import { auth } from "@/lib/auth";

export interface Context {
  db: ReturnType<typeof createDb>;
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
  const db = createDb(env.DATABASE_URL);
  const session = await auth.api.getSession({ headers: await headers() });
  return { session, db };
}
