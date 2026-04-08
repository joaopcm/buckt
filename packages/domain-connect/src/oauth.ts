import { createHmac, timingSafeEqual } from "node:crypto";

interface BuildAuthUrlParams {
  clientId: string;
  domain: string;
  providerHost: string;
  providerId: string;
  redirectUri: string;
  serviceId: string;
  state: string;
}

export function buildAuthorizationUrl(params: BuildAuthUrlParams): string {
  const base = `https://${params.providerHost}/v2/domain/connect/authorize`;
  const url = new URL(base);
  url.searchParams.set("domain", params.domain);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("scope", `${params.providerId}/${params.serviceId}`);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

interface SignedState {
  bucketId: string;
  orgId: string;
  timestamp: number;
}

export function createSignedState(
  payload: Omit<SignedState, "timestamp">,
  secret: string
): string {
  const state: SignedState = { ...payload, timestamp: Date.now() };
  const data = JSON.stringify(state);
  const signature = createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(`${data}.${signature}`).toString("base64url");
}

const MAX_STATE_AGE_MS = 30 * 60 * 1000;

export function verifySignedState(
  encoded: string,
  secret: string
): SignedState | null {
  try {
    const decoded = Buffer.from(encoded, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) {
      return null;
    }

    const data = decoded.slice(0, lastDot);
    const signature = decoded.slice(lastDot + 1);

    const expected = createHmac("sha256", secret).update(data).digest("hex");
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const state: SignedState = JSON.parse(data);

    if (Date.now() - state.timestamp > MAX_STATE_AGE_MS) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

interface ExchangeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  providerHost: string;
  redirectUri: string;
}

export async function exchangeCodeForTokens(
  params: ExchangeParams
): Promise<TokenResponse> {
  const res = await fetch(`https://${params.providerHost}/v2/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

interface RefreshParams {
  clientId: string;
  clientSecret: string;
  providerHost: string;
  refreshToken: string;
}

export async function refreshAccessToken(
  params: RefreshParams
): Promise<TokenResponse> {
  const res = await fetch(`https://${params.providerHost}/v2/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
