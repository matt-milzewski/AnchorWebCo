# Anchor Blog Manager CMS

This folder contains the reusable AWS backend for the custom blog CMS.

The current website experiment uses `src/_data/cmsBlogPosts.json` for local builds. In production, the GitHub Actions build can fetch the same JSON shape from this CMS API before running Eleventy.

## Reuse Model

One CMS stack can support multiple client sites. Each post is partitioned by `siteId` in DynamoDB, and the site configuration list controls credentials plus GitHub deploy targets.

Initial site IDs:

- `anchor-web-co`
- `bannister-communications`

## API Shape

- `POST /api/cms/sites/{siteId}/auth/login`
- `GET /api/cms/sites/{siteId}/posts`
- `GET /api/cms/sites/{siteId}/published-posts`
- `PUT /api/cms/sites/{siteId}/posts/{slug}`
- `DELETE /api/cms/sites/{siteId}/posts/{slug}`
- `POST /api/cms/sites/{siteId}/uploads/sign`
- `POST /api/cms/sites/{siteId}/deploy`

## Environment Variables

- `CMS_POSTS_TABLE`
- `CMS_MEDIA_BUCKET`
- `CMS_SESSION_SECRET`
- `CMS_SITES_CONFIG_PARAMETER`
- `CMS_ALLOWED_ORIGINS`
- `GITHUB_WORKFLOW`
- `GITHUB_TOKEN_PARAMETER`

## Storage Model

Posts are stored in one DynamoDB table with:

- `siteId`
- `slug`
- `title`
- `date`
- `status`
- `description`
- `seoTitle`
- `seoDescription`
- `featuredImage`
- `body`
- `updatedAt`

Images are uploaded to S3 using signed URLs. Public sites should reference the resulting CDN URL.

## Build Integration

The public site should run a prebuild step that:

1. calls `GET /api/cms/sites/{siteId}/published-posts`
2. writes the response to `src/_data/cmsBlogPosts.json`
3. runs `npm run build`
4. deploys `_site/` to S3 and invalidates CloudFront

## Deployment

1. Generate password hashes:

```bash
cd cms/lambda
node -e "console.log(require('./index').hashPasswordForSetup('YOUR_PASSWORD'))"
```

2. Create `cms/terraform/terraform.tfvars` from `terraform.tfvars.example`.
3. Fill in `site_configs`.
4. Run the GitHub Actions workflow `Deploy Blog CMS Infrastructure`.
5. After apply, overwrite the GitHub token parameter:

```bash
aws ssm put-parameter \
  --name "/anchor-blog-manager/github-token" \
  --type "SecureString" \
  --value "YOUR_GITHUB_TOKEN" \
  --overwrite
```

6. Add repository variable `ANCHOR_CMS_API_BASE` with the Terraform `api_base_url` output.

Client repos such as Bannister Communications only need the same build-time fetch pattern plus blog templates.
