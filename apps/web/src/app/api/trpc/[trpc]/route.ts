import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { withEvlog } from "@/lib/evlog";
import { createContext } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/router";

const handler = withEvlog((req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  })
);

export { handler as GET, handler as POST };
