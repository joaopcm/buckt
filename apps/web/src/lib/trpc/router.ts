import { router } from "./init";
import { bucketsRouter } from "./routers/buckets";
import { orgRouter } from "./routers/org";

export const appRouter = router({
  buckets: bucketsRouter,
  org: orgRouter,
});

export type AppRouter = typeof appRouter;
