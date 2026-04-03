import { router } from "./init";
import { bucketsRouter } from "./routers/buckets";

export const appRouter = router({
  buckets: bucketsRouter,
});

export type AppRouter = typeof appRouter;
