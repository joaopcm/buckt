import type { DrainContext } from "evlog";
import { createAxiomDrain } from "evlog/axiom";
import { createEvlog } from "evlog/next";
import { createInstrumentation } from "evlog/next/instrumentation";
import { createDrainPipeline } from "evlog/pipeline";
import { createSentryDrain } from "evlog/sentry";

type Drain = (ctx: DrainContext | DrainContext[]) => void | Promise<void>;

function buildDrain() {
  const drains: Drain[] = [];

  if (process.env.AXIOM_TOKEN) {
    drains.push(createAxiomDrain());
  }

  if (process.env.SENTRY_DSN) {
    drains.push(createSentryDrain());
  }

  if (drains.length === 0) {
    return undefined;
  }

  const pipeline = createDrainPipeline<DrainContext>({
    batch: { size: 50, intervalMs: 5000 },
    retry: { maxAttempts: 3 },
  });

  return pipeline(async (batch) => {
    await Promise.allSettled(drains.map((d) => d(batch)));
  });
}

const drain = buildDrain();

export const { withEvlog, useLogger, log, createError } = createEvlog({
  service: "buckt-web",
  ...(drain && { drain }),
});

export const { register, onRequestError } = createInstrumentation({
  service: "buckt-web",
  ...(drain && { drain }),
  captureOutput: true,
});
