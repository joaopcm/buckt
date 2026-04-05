import { router } from "./init";
import { bucketsRouter } from "./routers/buckets";
import { filesRouter } from "./routers/files";
import { orgRouter } from "./routers/org";

export const appRouter = router({
  buckets: bucketsRouter,
  files: filesRouter,
  org: orgRouter,
});

export type AppRouter = typeof appRouter;
