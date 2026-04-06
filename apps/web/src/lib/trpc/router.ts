import { router } from "./init";
import { bucketsRouter } from "./routers/buckets";
import { filesRouter } from "./routers/files";
import { keysRouter } from "./routers/keys";
import { orgRouter } from "./routers/org";

export const appRouter = router({
  buckets: bucketsRouter,
  files: filesRouter,
  keys: keysRouter,
  org: orgRouter,
});

export type AppRouter = typeof appRouter;
