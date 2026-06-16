# Anchor Blog Manager CMS

This folder contains the reusable AWS backend shape for the custom blog CMS.

The current website experiment uses `src/_data/cmsBlogPosts.json` for local builds. In production, the GitHub Actions build can fetch the same JSON shape from this CMS API before running Eleventy.

## API Shape

- `POST /auth/login`
- `GET /posts`
- `PUT /posts/{slug}`
- `DELETE /posts/{slug}`
- `POST /uploads/sign`
- `POST /deploy`

## Environment Variables

- `CMS_SITE_ID`
- `CMS_POSTS_TABLE`
- `CMS_MEDIA_BUCKET`
- `CMS_USERNAME`
- `CMS_PASSWORD_HASH`
- `CMS_SESSION_SECRET`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_WORKFLOW`
- `GITHUB_TOKEN_PARAMETER`

## Storage Model

Posts are stored in DynamoDB with:

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

1. calls `GET /posts`
2. writes the response to `src/_data/cmsBlogPosts.json`
3. runs `npm run build`
4. deploys `_site/` to S3 and invalidates CloudFront
