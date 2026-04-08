# @buckt/emails

React Email templates for transactional emails.

## Templates

| Component | Props | Description |
|---|---|---|
| `VerifyEmailEmail` | `verificationUrl` | Sent on signup, 24h expiry |
| `ResetPasswordEmail` | `resetUrl` | Sent on password reset request |
| `InviteEmail` | `orgName`, `inviterName`, `role`, `acceptUrl` | Sent on org invitation |

## Shared Components

- `EmailLayout` — wraps all emails with HTML structure and preview text
- `EmailButton` — styled CTA button
- `EmailFooter` — divider and footer text
- `Logo` — Buckt logo

## Integration

Used by `@buckt/auth`. Templates are rendered to HTML via `@react-email/components` and sent through Resend from `hi@transactional.buckt.dev`.
