# Anchor Web Co. Website

A modern, mobile-friendly marketing website for Anchor Web Co., a boutique web-design studio on Queensland's Fraser Coast.

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
- Formspree for form handling
- AWS S3 for hosting

## Project Structure

```
/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Custom styles and Tailwind configuration
├── js/
│   └── main.js         # JavaScript functionality
├── img/                # Image assets
└── icons/              # SVG icons
```

## Deployment to AWS S3

1. Create an S3 bucket:
   ```bash
   aws s3 mb s3://anchorwebco.com.au
   ```

2. Set bucket policy for public access:
   ```bash
   aws s3api put-bucket-policy --bucket anchorwebco.com.au --policy file://bucket-policy.json
   ```

3. Manual deployment (sync local files to S3):
   ```bash
   aws s3 sync . s3://anchorwebco.com.au \
     --exclude ".git/*" \
     --exclude ".github/*" \
     --exclude "README.md" \
     --exclude "bucket-policy.json" \
     --acl public-read \
     --delete
   ```

4. Automated deployment happens via GitHub Actions on push to main branch.

5. CloudFront distribution is already configured with:
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

Google Analytics 4 is configured with tracking ID `G-WZ5NKEMPNH`.

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