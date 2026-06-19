# Anchor Forms

Reusable serverless contact form backend for Anchor Web Co websites.

## What It Replaces

This is the first-party version of the current Formspree setup:

- a static frontend posts form data to a public endpoint
- the backend validates and filters spam
- the backend routes the lead by `siteId`
- the matching client email receives the lead
- the submission is stored for later audit/export

## API

Submit a form:

```http
POST /api/forms/{siteId}
Content-Type: application/json
```

Example:

```json
{
  "name": "Jane Example",
  "email": "jane@example.com",
  "phone": "0400 000 000",
  "service": "new-website",
  "message": "I need a new website.",
  "company": ""
}
```

The field shape is intentionally flexible. Every field except honeypot/timing fields is included in the notification email and saved in DynamoDB.

## AWS Resources

- API Gateway HTTP API
- Lambda, Node.js 20
- SES for email delivery
- DynamoDB submissions table
- DynamoDB rate-limit table with TTL
- SSM SecureString for per-site routing config
- CloudWatch logs

## Spam Controls

The MVP uses layered low-friction controls:

- allowed origin checks per site
- honeypot fields such as `company`, `_gotcha`, `website`
- per-IP and per-site rate limiting
- required field validation
- email format validation
- max payload size
- link-count scoring
- suspicious keyword scoring
- minimum submit time using optional `_startedAt`

Later additions can include CloudFront WAF, Turnstile/hCaptcha, SES suppression handling, and a small inbox UI.

## Site Config

Stored in SSM as:

```json
{
  "sites": [
    {
      "siteId": "anchor-web-co",
      "name": "Anchor Web Co",
      "recipientEmail": "info@anchorwebco.com.au",
      "allowedOrigins": ["https://www.anchorwebco.com.au"],
      "requiredFields": ["name", "email", "message"],
      "honeypotFields": ["company", "_gotcha", "website"],
      "replyToField": "email",
      "subjectPrefix": "[Anchor Web Co]"
    }
  ]
}
```

To add a client, add another object with a unique `siteId`, its allowed domains, and the target email.

## Deployment

Use `.github/workflows/deploy-forms.yml`.

Required GitHub secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `FORM_SITE_CONFIGS_JSON`

Required GitHub variable after first deploy:

- `ANCHOR_FORMS_API_BASE`

The sender email, for example `info@anchorwebco.com.au`, must be verified in SES in the target AWS region.
