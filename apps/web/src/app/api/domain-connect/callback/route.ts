import { buckets } from "@buckt/db";
import {
  encryptToken,
  exchangeCodeForTokens,
  verifySignedState,
} from "@buckt/domain-connect";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return redirectWithError(stateParam, "Authorization was denied or failed");
  }

  const state = verifySignedState(stateParam, env.BETTER_AUTH_SECRET);
  if (!state) {
    return redirectWithError(null, "Invalid or expired authorization state");
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return redirectWithError(
      stateParam,
      "You must be logged in to complete authorization"
    );
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(eq(buckets.id, state.bucketId))
    .limit(1);

  if (!bucket || bucket.orgId !== state.orgId) {
    return redirectWithError(stateParam, "Bucket not found");
  }

  if (
    !(
      bucket.domainConnectProvider &&
      env.DOMAIN_CONNECT_CLIENT_ID &&
      env.DOMAIN_CONNECT_CLIENT_SECRET &&
      env.DOMAIN_CONNECT_TOKEN_ENCRYPTION_KEY
    )
  ) {
    return redirectWithError(stateParam, "Domain Connect is not configured");
  }

  const redirectUri = `${env.BETTER_AUTH_URL}/api/domain-connect/callback`;

  try {
    const tokens = await exchangeCodeForTokens({
      providerHost: bucket.domainConnectProvider,
      code,
      clientId: env.DOMAIN_CONNECT_CLIENT_ID,
      clientSecret: env.DOMAIN_CONNECT_CLIENT_SECRET,
      redirectUri,
    });

    const encryptionKey = env.DOMAIN_CONNECT_TOKEN_ENCRYPTION_KEY;

    await db
      .update(buckets)
      .set({
        domainConnectAccessToken: encryptToken(
          tokens.accessToken,
          encryptionKey
        ),
        domainConnectRefreshToken: encryptToken(
          tokens.refreshToken,
          encryptionKey
        ),
        domainConnectTokenExpiresAt: new Date(
          Date.now() + tokens.expiresIn * 1000
        ),
      })
      .where(eq(buckets.id, state.bucketId));

    return NextResponse.redirect(
      new URL(
        `/org/${state.orgId}/buckets/${state.bucketId}?dc=success`,
        request.url
      )
    );
  } catch {
    return redirectWithError(
      stateParam,
      "Failed to exchange authorization code"
    );
  }
}

function redirectWithError(
  stateParam: string | null,
  _message: string
): NextResponse {
  const state = stateParam
    ? verifySignedState(stateParam, env.BETTER_AUTH_SECRET)
    : null;

  if (state) {
    return NextResponse.redirect(
      new URL(
        `/org/${state.orgId}/buckets/${state.bucketId}?dc=error`,
        env.BETTER_AUTH_URL
      )
    );
  }

  return NextResponse.redirect(new URL("/", env.BETTER_AUTH_URL));
}
