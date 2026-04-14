import { createSign } from "node:crypto";

interface BuildSyncUrlParams {
  domain: string;
  host: string;
  providerId: string;
  redirectUri: string;
  serviceId: string;
  signingPrivateKey: string;
  urlSyncUX: string;
  variables: Record<string, string>;
}

export function buildSignedSyncUrl(params: BuildSyncUrlParams): string {
  const base = `${params.urlSyncUX}/v2/domainTemplates/providers/${params.providerId}/services/${params.serviceId}/apply`;

  const queryParams: [string, string][] = [
    ["domain", params.domain],
    ["redirect_uri", params.redirectUri],
  ];

  if (params.host) {
    queryParams.push(["host", params.host]);
  }

  for (const [key, value] of Object.entries(params.variables)) {
    queryParams.push([key, value]);
  }

  const sortedCanonical = queryParams
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const signer = createSign("SHA256");
  signer.update(sortedCanonical);
  const signature = signer.sign(params.signingPrivateKey, "base64");

  return `${base}?${sortedCanonical}&key=${encodeURIComponent("_dcpubkeyv1")}&sig=${encodeURIComponent(signature)}`;
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
