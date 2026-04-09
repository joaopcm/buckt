import { createSign } from "node:crypto";

interface BuildSyncUrlParams {
  domain: string;
  host: string;
  providerId: string;
  redirectUri: string;
  serviceId: string;
  signingPrivateKey: string;
  state?: string;
  urlSyncUX: string;
  variables: Record<string, string>;
}

export function buildSignedSyncUrl(params: BuildSyncUrlParams): string {
  const base = `${params.urlSyncUX}/v2/domainTemplates/providers/${params.providerId}/services/${params.serviceId}/apply`;
  const url = new URL(base);

  url.searchParams.set("domain", params.domain);
  if (params.host) {
    url.searchParams.set("host", params.host);
  }
  url.searchParams.set("redirect_uri", params.redirectUri);

  if (params.state) {
    url.searchParams.set("state", params.state);
  }

  for (const [key, value] of Object.entries(params.variables)) {
    url.searchParams.set(key, value);
  }

  const queryToSign = url.search.slice(1);

  const signer = createSign("SHA256");
  signer.update(queryToSign);
  const signature = signer.sign(params.signingPrivateKey, "base64");

  url.searchParams.set("key", "_dcpubkeyv1.buckt.dev");
  url.searchParams.set("sig", signature);

  return url.toString();
}

export function extractDomainParts(customDomain: string): {
  rootDomain: string;
  host: string;
} {
  const rootDomain = customDomain.split(".").slice(-2).join(".");
  const host =
    customDomain === rootDomain
      ? ""
      : customDomain.replace(`.${rootDomain}`, "");
  return { rootDomain, host };
}
