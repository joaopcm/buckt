import {
  ACMClient,
  DeleteCertificateCommand,
  DescribeCertificateCommand,
  RequestCertificateCommand,
} from "@aws-sdk/client-acm";
import { env } from "../../env";

const acm = new ACMClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function requestCertificate(domain: string) {
  const result = await acm.send(
    new RequestCertificateCommand({
      DomainName: domain,
      ValidationMethod: "DNS",
    })
  );

  const certArn = result.CertificateArn;
  if (!certArn) {
    throw new Error("ACM did not return a certificate ARN");
  }

  const validationRecords = await pollValidationRecords(certArn);

  return { certArn, validationRecords };
}

async function pollValidationRecords(certArn: string, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const details = await acm.send(
      new DescribeCertificateCommand({ CertificateArn: certArn })
    );

    const options = details.Certificate?.DomainValidationOptions ?? [];
    const records = options
      .filter((opt) => opt.ResourceRecord?.Name)
      .map((opt) => ({
        name: opt.ResourceRecord?.Name ?? "",
        type: opt.ResourceRecord?.Type ?? "CNAME",
        value: opt.ResourceRecord?.Value ?? "",
      }));

    if (records.length > 0) {
      return records;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(
    `ACM validation records not available after ${maxAttempts} attempts`
  );
}

export async function getCertificateStatus(certArn: string) {
  const result = await acm.send(
    new DescribeCertificateCommand({ CertificateArn: certArn })
  );
  return result.Certificate?.Status ?? "PENDING_VALIDATION";
}

export async function deleteCertificate(certArn: string) {
  await acm.send(new DeleteCertificateCommand({ CertificateArn: certArn }));
}
