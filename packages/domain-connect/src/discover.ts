import { resolveTxt } from "node:dns/promises";

interface DomainConnectSettings {
  height?: number;
  providerName: string;
  urlAPI: string;
  urlAsyncUX?: string;
  urlSyncUX: string;
  width?: number;
}

export type DomainConnectMode = "sync" | "async";

export interface DiscoveryResult {
  mode?: DomainConnectMode;
  providerHost?: string;
  providerName?: string;
  settings?: DomainConnectSettings;
  supported: boolean;
  urlSyncUX?: string;
}

function extractRootDomain(domain: string): string {
  const parts = domain.split(".");
  return parts.slice(-2).join(".");
}

export async function discoverDomainConnect(
  domain: string
): Promise<DiscoveryResult> {
  const rootDomain = extractRootDomain(domain);
  const lookupHost = `_domainconnect.${rootDomain}`;

  let providerHost: string;
  try {
    const records = await resolveTxt(lookupHost);
    const flat = records.map((r) => r.join("")).filter(Boolean);
    if (flat.length === 0) {
      return { supported: false };
    }
    providerHost = flat[0];
  } catch {
    return { supported: false };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://${providerHost}/v2/${rootDomain}/settings`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return { supported: false };
    }

    const settings: DomainConnectSettings = await res.json();

    if (!(settings.urlSyncUX || settings.urlAsyncUX)) {
      return { supported: false };
    }

    const mode: DomainConnectMode = settings.urlAsyncUX ? "async" : "sync";

    return {
      supported: true,
      providerHost,
      providerName: settings.providerName,
      settings,
      mode,
      urlSyncUX: settings.urlSyncUX,
    };
  } catch {
    return { supported: false };
  }
}
