import { createHmac, timingSafeEqual } from "node:crypto";

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
