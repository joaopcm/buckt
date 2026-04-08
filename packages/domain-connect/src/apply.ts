import { decryptToken, encryptToken } from "./crypto";
import { refreshAccessToken } from "./oauth";

interface ApplyParams {
  accessToken: string;
  domain: string;
  host: string;
  providerHost: string;
  providerId: string;
  serviceId: string;
  variables: Record<string, string>;
}

async function applyTemplate(params: ApplyParams): Promise<void> {
  const url = new URL(
    `https://${params.providerHost}/v2/domainTemplates/providers/${params.providerId}/services/${params.serviceId}/apply`
  );
  url.searchParams.set("domain", params.domain);
  url.searchParams.set("host", params.host);

  const body = new URLSearchParams(params.variables);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApplyError(
      `Domain Connect apply failed: ${res.status} ${text}`,
      res.status
    );
  }
}

class ApplyError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApplyError";
    this.statusCode = statusCode;
  }
}

interface BucketTokenInfo {
  customDomain: string;
  domainConnectAccessToken: string;
  domainConnectProvider: string;
  domainConnectRefreshToken: string;
  domainConnectTokenExpiresAt: Date | null;
}

interface ApplyConfig {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
  providerId: string;
}

interface ApplyResult {
  applied: boolean;
  newAccessToken?: string;
  newExpiresAt?: Date;
  newRefreshToken?: string;
}

async function applyWithRefresh(
  bucket: BucketTokenInfo,
  config: ApplyConfig,
  serviceId: string,
  variables: Record<string, string>
): Promise<ApplyResult> {
  const accessToken = decryptToken(
    bucket.domainConnectAccessToken,
    config.encryptionKey
  );

  const rootDomain = bucket.customDomain.split(".").slice(-2).join(".");
  const host =
    bucket.customDomain === rootDomain
      ? ""
      : bucket.customDomain.replace(`.${rootDomain}`, "");

  const params: ApplyParams = {
    providerHost: bucket.domainConnectProvider,
    providerId: config.providerId,
    serviceId,
    domain: rootDomain,
    host,
    accessToken,
    variables,
  };

  try {
    await applyTemplate(params);
    return { applied: true };
  } catch (err) {
    if (!(err instanceof ApplyError) || err.statusCode !== 401) {
      throw err;
    }
  }

  const refreshToken = decryptToken(
    bucket.domainConnectRefreshToken,
    config.encryptionKey
  );

  const tokens = await refreshAccessToken({
    providerHost: bucket.domainConnectProvider,
    refreshToken,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  await applyTemplate({ ...params, accessToken: tokens.accessToken });

  return {
    applied: true,
    newAccessToken: encryptToken(tokens.accessToken, config.encryptionKey),
    newRefreshToken: encryptToken(tokens.refreshToken, config.encryptionKey),
    newExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
  };
}

interface ValidationRecord {
  name: string;
  type: string;
  value: string;
}

export function applyAcmValidationRecords(
  bucket: BucketTokenInfo,
  config: ApplyConfig,
  validationRecords: ValidationRecord[]
): Promise<ApplyResult> {
  const certRecord = validationRecords.find((r) => r.type === "CNAME");
  if (!certRecord) {
    return Promise.resolve({ applied: false });
  }

  const ACM_SUFFIX = ".acm-validations.aws.";
  const value = certRecord.value.endsWith(ACM_SUFFIX)
    ? certRecord.value.slice(0, -ACM_SUFFIX.length)
    : certRecord.value;

  return applyWithRefresh(bucket, config, "acm-validation", {
    certValidationName: certRecord.name,
    certValidationValue: value,
  });
}

export function applyCloudfrontCname(
  bucket: BucketTokenInfo,
  config: ApplyConfig,
  distributionDomain: string
): Promise<ApplyResult> {
  return applyWithRefresh(bucket, config, "cdn-cname", {
    pointsTo: distributionDomain,
  });
}
