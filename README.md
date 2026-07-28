# Anchor Web Co. Website

A modern, mobile-friendly marketing website for Anchor Web Co., an independent web-design studio based in Red Hill and serving Brisbane's inner west.

## Features

- Mobile-first responsive design
- Modern UI with Tailwind CSS
- Smooth scrolling and animations
- Contact form with validation
- Testimonial carousel
- Lazy-loaded images
- SEO optimized
- Accessible design
- Performance optimized

## Tech Stack

- HTML5
- CSS3 (with Tailwind CSS)
- JavaScript (ES6+)
- Anchor Forms serverless backend for form handling
- AWS S3 for hosting

## Project Structure

```
/
├── index.html          # Main HTML file
├── health-check.html   # Website Health Check page
├── css/
│   └── styles.css      # Custom styles and Tailwind configuration
├── js/
│   ├── main.js         # Site-wide JavaScript functionality
│   └── health-check.js # Health Check form and report rendering
├── health-check/
│   ├── lambda/         # Lambda source for /api/health-check
│   ├── terraform/      # Terraform for API Gateway, Lambda, IAM, DynamoDB, SSM
│   └── README.md       # Deployment and setup guide
├── img/                # Image assets
└── icons/              # SVG icons
```

## Website Health Check

This repo now includes a complete Health Check MVP:
- Frontend page: `/health-check.html`
- Backend endpoint: `POST /api/health-check`
- Infrastructure: Terraform under `health-check/terraform`

Deployment and setup instructions are in:
- `health-check/README.md`

## Anchor Forms

This repo includes a reusable Formspree-style contact form backend:
- Frontend form: `/contact.html`
- Submission endpoint: `POST /api/forms/{siteId}`
- Non-submitting health endpoint: `GET /api/forms/{siteId}`
- Infrastructure: Terraform under `forms/terraform`
- Runtime: API Gateway, Lambda, DynamoDB, SSM, SES

Deployment and setup instructions are in:
- `forms/README.md`

## Deployment to AWS S3

Production deployment happens through `.github/workflows/deploy.yml` on a push to `main` or a manual workflow dispatch. The workflow:

1. Injects the configured forms, CMS and analytics endpoints.
2. Builds and verifies the generated Eleventy site.
3. Syncs `_site/` to the private `s3://anchorweb.co` origin bucket.
4. Publishes the CloudFront routing function and waits for cache invalidation.
5. Verifies production metadata, redirects and the forms preflight.

Do not sync the repository root. It contains source code and infrastructure that must never be published as website files.

CloudFront is configured with:
   - Custom domain: `www.anchorwebco.com.au`
   - SSL certificate for HTTPS
   - Viewer request function for redirects

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/anchorweb.co.git
   cd anchorweb.co
   ```

2. Open `index.html` in your browser or use a local server:
   ```bash
   python -m http.server 8000
   ```

3. Make changes and test locally before deploying.

## Performance Optimization

- Images are lazy-loaded
- CSS is minified via Tailwind
- JavaScript is deferred
- Smooth scroll polyfill for Safari
- Optimized for Lighthouse scores

## SEO Features

- Semantic HTML5
- Meta tags for social sharing
- Open Graph and Twitter Card support
- Mobile-friendly design
- Fast loading times

## Analytics

Google Ads conversion tracking is configured with tag ID `AW-16766129889`.

## Deployment › SEO Checks

### URL Accessibility Testing

Run the automated smoke test to verify all URLs return proper status codes:

```bash
npm run test:crawl
```

This script tests:
- All main pages (home, about, contact, blog, etc.)
- HTTP→HTTPS redirects  
- Non-www→www redirects
- Proper 200/301 status codes

### Google Search Console Validation

After deployment, request re-indexing in Google Search Console:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property: `https://www.anchorwebco.com.au`
3. Use the URL Inspection tool for each affected URL
4. Click "REQUEST INDEXING" for pages that need validation

### CloudFront Configuration

For HTTP→HTTPS and non-www→www redirects, deploy the CloudFront function:

1. Copy the code from `cloudfront-function.js`
2. Create a new CloudFront Function in AWS Console
3. Associate it with the viewer-request event on your distribution
4. Test and publish the function

### Affected URLs

These URLs were previously returning 403 errors and are now fixed:
- `/blog-hervey-bay-seo-company`
- `/about`
- `/contact` 
- `/thank-you`
- All blog posts

## License

Copyright © 2025 Anchor Web Co. All rights reserved. 
