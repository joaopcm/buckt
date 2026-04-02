import {
  ACMClient,
  RequestCertificateCommand,
  DescribeCertificateCommand,
  DeleteCertificateCommand,
} from "@aws-sdk/client-acm"
import { env } from "../../env"

const acm = new ACMClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function requestCertificate(domain: string) {
  const result = await acm.send(
    new RequestCertificateCommand({
      DomainName: domain,
      ValidationMethod: "DNS",
    })
  )

  const certArn = result.CertificateArn!

  const details = await acm.send(
    new DescribeCertificateCommand({ CertificateArn: certArn })
  )

  const validationRecords =
    details.Certificate?.DomainValidationOptions?.map((opt) => ({
      name: opt.ResourceRecord?.Name ?? "",
      type: opt.ResourceRecord?.Type ?? "CNAME",
      value: opt.ResourceRecord?.Value ?? "",
    })) ?? []

  return { certArn, validationRecords }
}

export async function getCertificateStatus(certArn: string) {
  const result = await acm.send(
    new DescribeCertificateCommand({ CertificateArn: certArn })
  )
  return result.Certificate?.Status ?? "PENDING_VALIDATION"
}

export async function deleteCertificate(certArn: string) {
  await acm.send(new DeleteCertificateCommand({ CertificateArn: certArn }))
}
