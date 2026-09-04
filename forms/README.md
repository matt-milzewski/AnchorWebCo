# Anchor Forms

Low-cost, multi-site contact-form delivery and monitoring for Anchor Web Co and managed client websites.

## Request flow

1. A static website posts JSON to `POST /api/forms/{siteId}`.
2. The API validates the configured origin, field allowlist, required fields, payload size, rate limits, honeypots, and Cloudflare Turnstile when enabled.
3. A submission record is written conditionally before any email side effect. A stable `_idempotencyKey` lets safe retries resume the same record.
4. A conditional `stored -> sending -> ses_accepted` state machine ensures persisted or concurrent requests never masquerade as delivered. SES delivery, bounce, complaint, delay, reject, and rendering events then update the stored status monotonically.
5. The protected dashboard reads aggregate and submission data through API Gateway's Cognito JWT authorizer.

`GET /api/forms/{siteId}` is a non-submitting health check. A successful form response has all of `ok: true`, `accepted: true`, and a `submissionId`; rejected spam, pending sends, and failed challenges never count as website conversions.

## AWS resources

- API Gateway HTTP API
- Node.js Lambda functions for intake, dashboard queries, SES events, and aggregate monthly reporting
- DynamoDB submissions and rate-limit tables with automatic retention
- SES configuration set and SNS feedback topic
- Cognito user pool with required authenticator-app MFA for dashboard access
- SSM SecureString parameters for site routing and the Turnstile secret
- encrypted SNS alerts delivered through the verified Anchor SES identity, immediate pre- and post-acceptance delivery-failure alarms, a monthly spam report, and an AWS Budget notification

The service uses on-demand serverless resources. The customer-managed KMS key and monitoring are the main standing costs; the budget defaults to USD 5 per month and can be changed in Terraform variables.

The alert topic invokes a dedicated least-privilege notification Lambda, so operational emails do not depend on an SNS confirmation link. The monthly report runs once per month and contains aggregate counts only. It flags 25 blocked submissions, or a sustained spam rate of at least 50% with a meaningful sample, and includes no contact details or enquiry content. Post-acceptance alerts cover lead bounces, complaints, SES rejects, and rendering failures; spam and auto-reply events do not trigger them.

## Spam and abuse controls

- server-side Turnstile verification with expected hostname and action
- source and destination rate limiting using keyed, non-reversible fingerprints
- strict per-site field allowlists and length limits
- origin and browser-provenance checks
- honeypot, link-count, keyword, and minimum-submit-time signals
- conditional writes and delivery-state idempotency before email delivery
- acknowledgement suppression unless Turnstile is enabled and verified
- short retention for rejected traffic and longer retention for accepted leads

Turnstile is activated for a site only when both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are configured. Auto-replies fail closed while it is inactive, both in generated configuration and in the Lambda itself.

## Dashboard

The dashboard is published at `/forms-admin.html`. It has `noindex` metadata, stores access tokens only in session storage, uses Cognito Authorization Code + PKCE, and sends the token only in the `Authorization` header. API Gateway denies protected routes before they reach Lambda if the token issuer, audience, signature, or expiry is invalid.

The invitation for `forms_admin_email` is sent during the first Terraform apply. Cognito requires authenticator-app MFA at first sign-in. Aggregate views mask destinations, and dashboard responses never expose abuse fingerprints.

## Site configuration

The deployment builds the encrypted SSM configuration from `FORM_SITE_CONFIGS_JSON` and the separate Haven recipient secret. A site entry supports:

```json
{
  "siteId": "example-site",
  "name": "Example Site",
  "recipientEmail": "forms@example.com",
  "allowedOrigins": ["https://example.com"],
  "requiredFields": ["name", "email", "message"],
  "allowedFields": ["name", "email", "phone", "message"],
  "fieldMaxLengths": { "message": 5000 },
  "honeypotFields": ["company", "_gotcha"],
  "replyToField": "email",
  "subjectPrefix": "[Example Site]"
}
```

Recipient addresses and the Turnstile secret belong in GitHub Actions secrets, not source control.

## Deployment

- `bootstrap-aws-oidc.yml` creates branch-scoped GitHub OIDC roles and removes the copied Haven AWS keys after migration.
- `deploy-forms.yml` validates, tests, plans/applies Terraform, and backfills both the dashboard index and legacy raw network metadata.
- `deploy.yml` publishes Anchor and injects the forms API, dashboard configuration, and public Turnstile key.
- `bootstrap-haven-homes.yml` writes Haven's non-secret repository variables and site config without copying AWS credentials.

Production deployments require the repository-scoped `AWS_DEPLOY_ROLE_ARN`/`AWS_FORMS_DEPLOY_ROLE_ARN`; long-lived AWS repository keys are removed after bootstrap. Deployment also requires `FORM_SITE_CONFIGS_JSON`, encrypted `HAVEN_RECIPIENT_EMAIL`, and, to enable the challenge, `TURNSTILE_SITE_KEY` plus `TURNSTILE_SECRET_KEY`.

## Local verification

```powershell
cd forms/lambda
npm ci
npm run lint
npm test

cd ../terraform
terraform fmt -check -recursive
terraform validate
```

`verify-forms-production.yml` exercises the public Anchor form boundaries, confirms that the alert subscription and alarms are wired, and can send two labelled test notifications plus one labelled live Anchor lead. The live lead is immediately retried with the same idempotency key and checked in DynamoDB to prove that only one email was accepted by SES.
