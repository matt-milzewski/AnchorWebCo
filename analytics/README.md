# Anchor Analytics

Cookieless, multi-tenant analytics for Anchor Web Co static sites.

## Design

- AWS CDK TypeScript infrastructure.
- DynamoDB single-table storage with tenant in the partition key.
- Lambda Function URL for ingest to avoid API Gateway request charges.
- S3 and CloudFront for the standard tracking script.
- EventBridge monthly report Lambda.
- SES report sending.
- Static-dashboard-ready read Lambda with tenant-scoped signed tokens.
- Raw events expire after about 13 months with DynamoDB TTL.
- Aggregates are retained long term.

## Tenant Isolation

Every tenant item uses:

```text
PK = TENANT#<client_id>
```

Application reads use DynamoDB `Query` with that exact partition key and a sort-key prefix. Report and dashboard code do not scan across tenants.

## Tenant Onboarding

Add one tenant config record and add this script tag to the site:

```html
<script
  src="https://analytics.anchorwebco.com.au/anchor-analytics.js"
  data-client-id="bannister"
  data-endpoint="https://INGEST_FUNCTION_URL"
  defer
></script>
```

Then tag important buttons:

```html
<a href="/contact.html" data-track="cta-quote" data-track-prop-button-location="hero">Start a project</a>
```

No Lambda or infrastructure change is required for a new tenant.

## Testing

```powershell
cd analytics
npm install
npm test
npm run build
```
