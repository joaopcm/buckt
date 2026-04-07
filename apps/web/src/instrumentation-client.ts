import { captureRouterTransitionStart } from "@sentry/nextjs";
import "../sentry.client.config";

export const onRouterTransitionStart = captureRouterTransitionStart;
