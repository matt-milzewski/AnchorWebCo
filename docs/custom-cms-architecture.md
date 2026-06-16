# Anchor Blog Manager Architecture

## Goal

Build a small AWS-native blog manager that can be reused as a paid add-on for Anchor Web Co clients. The public websites stay static and fast. The admin experience is intentionally simple: one client site, one username/password, blog posts only.

## Current Website Shape

- Eleventy static site.
- Source lives under `src/`.
- Build output goes to `_site/`.
- GitHub Actions runs `npm run build`, syncs `_site/` to S3, then invalidates CloudFront.
- Existing blog content was stored as Markdown files under `src/blog/posts/`.
- Existing `/admin/` used Decap CMS with Netlify Identity/Git Gateway.

## Target Runtime Shape

### Public Site

The public site should not call the CMS API in the browser. Instead:

1. Blog content is stored in the CMS backend.
2. A build/export step produces structured blog data for Eleventy.
3. Eleventy generates `/blog/` and `/blog/<slug>/` as static HTML.
4. GitHub Actions deploys the static pages to S3/CloudFront.

This keeps SEO, social previews, sitemap generation, speed, and uptime simple.

### Admin Site

The admin UI can be hosted at either:

- `https://cms.anchorwebco.com.au/<site-id>/`
- `https://admin.<client-domain>/`

For the MVP, the admin should support:

- one username/password per client site
- list posts
- create/edit/delete posts
- draft/published status
- title, slug, excerpt, body, featured image, SEO title, SEO description
- publish button
- image uploads

### AWS Services

MVP AWS services:

- S3 for uploaded images
- DynamoDB for post metadata/body
- Lambda for the CMS API
- API Gateway or Lambda Function URL for API access
- SSM Parameter Store or Secrets Manager for password hash and signing secret
- GitHub Actions workflow dispatch for rebuild/deploy

Later, if this becomes a real multi-client product, add Cognito or another managed auth layer. Do not start there for the first experiment.

## Local Experiment

This repo now uses a CMS-shaped local data file:

- `src/_data/cmsBlogPosts.json`

The generated site reads from that file instead of raw Markdown files. This mirrors the eventual build step where GitHub Actions would fetch from the CMS API and write the same data file before running Eleventy.

Existing Markdown posts are preserved under:

- `docs/saved-blog-posts/`

## Build-Time Data Contract

Each post object should look like:

```json
{
  "title": "Post title",
  "slug": "post-title",
  "date": "2026-06-16",
  "status": "published",
  "description": "Short excerpt for cards and meta tags.",
  "seoTitle": "Optional SEO title",
  "seoDescription": "Optional SEO description",
  "featuredImage": "/images/blog/example.png",
  "body": "<p>HTML body generated from Markdown or rich text.</p>"
}
```

Only posts with `"status": "published"` should appear on the public site.

## Reusable Client Integration

Each client site needs only:

1. a CMS data fetch/export step before build
2. blog listing template
3. blog post template
4. sitemap/feed integration
5. optional admin link hidden from public navigation

The CMS backend itself should stay separate from client repositories.
