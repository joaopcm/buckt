import "server-only";
import { createCallerFactory, createContext } from "./init";
import { appRouter } from "./router";

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  const ctx = await createContext();
  return createCaller(ctx);
}
