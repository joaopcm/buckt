import { router } from "./init";
import { billingRouter } from "./routers/billing";
import { bucketsRouter } from "./routers/buckets";
import { domainConnectRouter } from "./routers/domain-connect";
import { filesRouter } from "./routers/files";
import { keysRouter } from "./routers/keys";
import { orgRouter } from "./routers/org";

export const appRouter = router({
  billing: billingRouter,
  buckets: bucketsRouter,
  domainConnect: domainConnectRouter,
  files: filesRouter,
  keys: keysRouter,
  org: orgRouter,
});

export type AppRouter = typeof appRouter;
