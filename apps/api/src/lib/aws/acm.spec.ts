import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock("@aws-sdk/client-acm", async () => {
  const actual =
    await vi.importActual<typeof import("@aws-sdk/client-acm")>(
      "@aws-sdk/client-acm"
    )
  return {
    ...actual,
    ACMClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  }
})

import {
  requestCertificate,
  getCertificateStatus,
  deleteCertificate,
} from "./acm"

beforeEach(() => {
  mockSend.mockReset()
})

describe("requestCertificate", () => {
  it("requests cert and returns ARN with validation records", async () => {
    mockSend
      .mockResolvedValueOnce({
        CertificateArn: "arn:aws:acm:us-east-1:123:certificate/abc",
      })
      .mockResolvedValueOnce({
        Certificate: {
          DomainValidationOptions: [
            {
              ResourceRecord: {
                Name: "_acme.example.com",
                Type: "CNAME",
                Value: "_validation.acm.aws",
              },
            },
          ],
        },
      })

    const result = await requestCertificate("example.com")
    expect(result.certArn).toBe(
      "arn:aws:acm:us-east-1:123:certificate/abc"
    )
    expect(result.validationRecords).toHaveLength(1)
    expect(result.validationRecords[0].name).toBe("_acme.example.com")
  })
})

describe("getCertificateStatus", () => {
  it("returns certificate status", async () => {
    mockSend.mockResolvedValueOnce({
      Certificate: { Status: "ISSUED" },
    })
    const status = await getCertificateStatus("arn:test")
    expect(status).toBe("ISSUED")
  })

  it("defaults to PENDING_VALIDATION", async () => {
    mockSend.mockResolvedValueOnce({ Certificate: {} })
    const status = await getCertificateStatus("arn:test")
    expect(status).toBe("PENDING_VALIDATION")
  })
})

describe("deleteCertificate", () => {
  it("deletes the certificate", async () => {
    mockSend.mockResolvedValueOnce({})
    await deleteCertificate("arn:test")
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
