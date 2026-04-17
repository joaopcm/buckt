import { router } from "./init";
import { awsAccountsRouter } from "./routers/aws-accounts";
import { billingRouter } from "./routers/billing";
import { bucketsRouter } from "./routers/buckets";
import { domainConnectRouter } from "./routers/domain-connect";
import { filesRouter } from "./routers/files";
import { keysRouter } from "./routers/keys";
import { orgRouter } from "./routers/org";
import { userRouter } from "./routers/user";

export const appRouter = router({
  awsAccounts: awsAccountsRouter,
  billing: billingRouter,
  buckets: bucketsRouter,
  domainConnect: domainConnectRouter,
  files: filesRouter,
  keys: keysRouter,
  org: orgRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
