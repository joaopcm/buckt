import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import "./src/env.ts";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
});
