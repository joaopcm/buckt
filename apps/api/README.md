# @buckt/api

Hono REST API + Trigger.dev background tasks for bucket provisioning, file management, and usage aggregation.

## AWS Setup

### CloudFront Access Logging

Required for bandwidth tracking. One-time setup:

1. Go to **S3 Console** (us-east-1) → Create bucket
   - Name: `buckt-cloudfront-logs`
   - Region: us-east-1
   - Object Ownership: **ACLs enabled** → **Bucket owner preferred**

2. Open the bucket → **Permissions** → **Access control list (ACL)** → Edit
   - S3 log delivery group → **Objects: Write**, **Bucket ACL: Read**

3. Add env vars (Infisical):
   - `CLOUDFRONT_LOG_BUCKET` = `buckt-cloudfront-logs`
   - `CLOUDFRONT_LOG_PREFIX` = `cf-logs/`

4. Redeploy Trigger.dev tasks

New CloudFront distributions will have logging enabled automatically. For existing distributions, enable logging manually in the CloudFront console (Edit → Standard logging → On → select bucket + set prefix to `cf-logs/{domain}/`).

### CAA Records

Users must add a CAA record to their domain's DNS to allow Amazon to issue SSL certificates:

```
Type:  CAA
Name:  <root-domain>
Value: 0 issue "amazon.com"
```

This is shown in the dashboard provisioning steps.
