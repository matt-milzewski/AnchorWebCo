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

Status: deployed for Anchor Web Co on 2026-06-17.

Live admin:

- `https://www.anchorwebco.com.au/admin/`

Live API:

- `https://u0x9ignb0h.execute-api.ap-southeast-2.amazonaws.com`

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

Current AWS services:

- API Gateway HTTP API for `/api/cms/sites/{siteId}/...`
- Lambda for auth, post CRUD, upload signing, and deploy triggering
- DynamoDB on-demand table `anchor_blog_manager_posts`, partitioned by `siteId`
- S3 bucket for uploaded blog images
- SSM SecureString parameters for site config, session secret, and GitHub deploy token
- GitHub Actions for Terraform deploy, post seeding, and static-site deploy

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

The backend is reusable. Add each client as a new object in `CMS_SITE_CONFIGS_JSON`:

```json
{
  "siteId": "client-site-id",
  "username": "client",
  "passwordHash": "generated-with-cms-password-hash",
  "githubOwner": "matt-milzewski",
  "githubRepo": "clientRepo",
  "githubWorkflow": "deploy.yml",
  "githubRef": "main"
}
```

Each client static site needs:

1. a CMS data fetch/export step before build
2. blog listing template
3. blog post template
4. sitemap/feed integration
5. optional admin link hidden from public navigation

The CMS backend itself should stay separate from client repositories. Client repos should only know:

- `ANCHOR_CMS_API_BASE`
- their own `ANCHOR_CMS_SITE_ID`
- how to render the returned post JSON

## Bannister Communications Reuse Plan

1. Keep the existing shared CMS stack.
2. Add or keep `bannister-communications` in `CMS_SITE_CONFIGS_JSON`.
3. Add the same `scripts/fetch-cms-posts.js` pattern to the Bannister repo.
4. Add Eleventy or framework-equivalent blog listing and blog post templates.
5. Add repo variable `ANCHOR_CMS_API_BASE` with the shared API URL.
6. Set `ANCHOR_CMS_SITE_ID=bannister-communications` in the Bannister build workflow.
7. Deploy the Bannister site.
8. Give Bannister their simple username/password and `/admin/` URL.

## SEO Defaults

The admin hides SEO by default but still fills it:

- slug is generated from the title
- search title defaults to the post title and is trimmed to search-result length
- search description defaults to the summary, or article body if the summary is blank
- the public templates use `seoTitle`, `seoDescription`, canonical URL, Open Graph, Twitter card, and the featured image

The cheap default is deterministic extraction from the article. A later paid upgrade could add AI suggestions, but the baseline does not need an AI API or monthly SaaS cost.

## Cost Shape

The current architecture should stay cheap at small-client scale:

- DynamoDB is on-demand and only stores blog records.
- Lambda/API Gateway bill per request.
- SSM parameters are low-cost.
- S3 stores uploaded media.
- Static sites remain on S3/CloudFront.

Avoid per-client CMS services until a client needs more than blog CRUD.
