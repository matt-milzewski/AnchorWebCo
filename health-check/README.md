# Website Health Check MVP

This adds a new static page at `/health-check` and a serverless backend that runs a scored report from Google PageSpeed Insights plus extra technical checks.

## 1) Short Implementation Plan

1. Add `/health-check.html` and `js/health-check.js` with URL/email form, consent toggle, loading state, and email-only confirmation UX.
2. Build a Lambda (`health-check/lambda/index.js`) that runs mobile + desktop PageSpeed checks, computes Anchor Web Score, builds Top 5 fixes, runs extra checks, and optionally sends SES email.
3. Provision AWS resources via Terraform (`health-check/terraform`): Lambda, HTTP API route `POST /api/health-check`, IAM, SSM parameter, DynamoDB tables, throttling, and CORS.
4. Update site navigation to include Health Check and allow `/api/*` through CloudFront rewrite logic.
5. Document deployment, testing, IAM policy requirements, and expected JSON response schema.

## 2) Architecture

- Frontend: Static HTML/JS page at `/health-check.html` (no on-page report rendering)
- API: API Gateway HTTP API + Lambda (`POST /api/health-check`)
- External service: Google PageSpeed Insights API (mobile + desktop)
- Storage: DynamoDB `health_check_runs` (report summary only), `health_check_rate_limits` (per-IP counters)
- Email: SES (required for user report email and internal lead notification)
- Secret management: SSM Parameter Store SecureString for PageSpeed API key

## 3) Files Added

- `health-check.html`
- `js/health-check.js`
- `health-check/lambda/index.js`
- `health-check/lambda/package.json`
- `health-check/terraform/versions.tf`
- `health-check/terraform/variables.tf`
- `health-check/terraform/main.tf`
- `health-check/terraform/outputs.tf`
- `health-check/terraform/terraform.tfvars.example`
- `health-check/terraform/deploy-policy.json`
- `health-check/response.schema.json`

## 4) Prerequisites

- Terraform >= 1.5
- AWS CLI v2 configured with AWS SSO or an assumed deployment role
- Node.js 20+ (for Lambda dependency install)

## 5) Deploy Steps

### 5.1 Install Lambda dependencies

From repo root:

```bash
cd health-check/lambda
npm install --omit=dev
cd ../terraform
```

### 5.2 Configure Terraform variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
- `allowed_origins`
- `aws_region`
- `ses_from_email`

### 5.3 Provision infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 5.4 Set Google PageSpeed API key in SSM

Terraform creates a SecureString parameter with a placeholder value. Overwrite it:

```bash
aws ssm put-parameter \
  --name "/anchor-web-co/health-check/pagespeed-api-key" \
  --type "SecureString" \
  --value "YOUR_REAL_PAGESPEED_API_KEY" \
  --overwrite
```

### 5.5 Wire frontend to API endpoint

Use the Terraform output `health_check_endpoint`.

Recommended production setup:
- CloudFront behavior `/api/*` -> API Gateway domain
- Keep frontend calling relative path `/api/health-check`

If you call API Gateway directly from browser, set:

```html
<script>
  window.ANCHOR_HEALTH_CHECK_API_BASE = "https://{api_id}.execute-api.{region}.amazonaws.com";
</script>
```

### 5.6 Deploy from GitHub Actions

If you prefer CI deployment, run:

1. Open GitHub Actions
2. Select `Deploy Health Check Infrastructure`
3. Click `Run workflow`
4. Choose:
   - `plan` to preview changes
   - `apply` to deploy changes

Required GitHub repository secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `PAGESPEED_API_KEY`
- `SES_FROM_EMAIL`

The workflow will:
- install Lambda dependencies
- create or reuse Terraform backend state resources
- run Terraform init/plan/apply
- write `PAGESPEED_API_KEY` to SSM SecureString at `/anchor-web-co/health-check/pagespeed-api-key`
- print the deployed API endpoint output

### 5.7 Configure CloudFront API Route

After infrastructure deploy, run the `Configure CloudFront API Route` workflow once to wire `/api/*` to API Gateway and allow `POST`.

Required GitHub repository secret:
- `CLOUDFRONT_DISTRIBUTION_ID`

If this step is skipped, browser requests to `/api/health-check` can fail with:
- `403 Forbidden` from CloudFront
- `"This distribution is not configured to allow the HTTP request method..."`

## 6) SES Setup Notes

To send real customer emails, SES must be fully configured in the same region as Lambda.

1. Verify your domain identity in SES (recommended): `anchorwebco.com.au`
2. Verify sender address used in Terraform/workflow (for example `info@anchorwebco.com.au`)
3. Move SES out of sandbox (Production Access enabled)
4. Ensure DNS verification records exist (DKIM and identity records)

Current production failure symptom when SES is not configured:
- `MessageRejected: Email address is not verified...`

Email behavior in this MVP:
- customer receives full report email
- internal lead notification is sent to `lead_notification_email` (defaults to `info@anchorwebco.com.au`)
- customer email subject: `Your Website Health Check Report`

## 7) API Contract

- Endpoint: `POST /api/health-check`
- Request body:

```json
{
  "website_url": "https://example.com",
  "email": "owner@example.com",
  "email_consent": true
}
```

Notes:
- `email` is required
- `email_consent` must be `true`
- frontend does not render scores on screen, it shows email confirmation only

- Response schema: `health-check/response.schema.json`

## 8) Local and Curl Testing

After deploy:

```bash
curl -X POST "https://{api_id}.execute-api.{region}.amazonaws.com/api/health-check" \
  -H "content-type: application/json" \
  -d '{"website_url":"https://www.anchorwebco.com.au"}'
```

Expected status: `200` with score payload.

If you get `502` with `Google PageSpeed request failed...`, verify the SSM key value:

```bash
aws ssm put-parameter \
  --name "/anchor-web-co/health-check/pagespeed-api-key" \
  --type "SecureString" \
  --value "YOUR_REAL_PAGESPEED_API_KEY" \
  --overwrite
```

## 9) Security and Abuse Controls

Implemented:
- API Gateway throttling at stage level
- Best-effort per-IP rate limits in DynamoDB (`health_check_rate_limits`)
- Server-side URL validation and normalization
- Timeouts on upstream requests
- CORS allowlist via `allowed_origins`
- API key stored in SSM SecureString

Optional hardening (not enabled by default):
- Add Cloudflare Turnstile or hCaptcha token field and verify token in Lambda
- Add AWS WAF on CloudFront/API for managed bot control rules

## 10) IAM Permissions for Deployment

Use AWS SSO or a deployment role. Do not use static admin keys.

A least-privilege starter policy template is provided at:
- `health-check/terraform/deploy-policy.json`

Replace `${AWS_REGION}` and `${ACCOUNT_ID}` placeholders before attaching.

## 11) Cost Notes (MVP)

At low traffic, this should stay very low cost:
- Lambda: free tier usually covers MVP usage
- API Gateway HTTP API: low per-request pricing
- DynamoDB on-demand: low cost for small volume
- SSM parameter: negligible
- SES: low per-email cost after free allowances (depends on sending channel)
- Main variable cost is Google PageSpeed API quota and request volume

## 12) Assumptions

- Production domain is `https://www.anchorwebco.com.au`
- Region defaults to `ap-southeast-2`
- `/api/*` traffic is routed to API Gateway at CloudFront
- Node modules are installed in `health-check/lambda` before Terraform apply
