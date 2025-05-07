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
   aws s3 mb s3://anchorweb.co
   ```

2. Configure the bucket for static website hosting:
   ```bash
   aws s3 website s3://anchorweb.co --index-document index.html --error-document index.html
   ```

3. Set bucket policy for public access:
   ```bash
   aws s3api put-bucket-policy --bucket anchorweb.co --policy file://bucket-policy.json
   ```

4. Sync local files to S3:
   ```bash
   aws s3 sync . s3://anchorweb.co --exclude "*.git/*" --exclude "README.md" --exclude "bucket-policy.json"
   ```

5. Configure CloudFront (optional, for better performance):
   ```bash
   aws cloudfront create-distribution --origin-domain-name anchorweb.co.s3-website-ap-southeast-2.amazonaws.com
   ```

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

Google Analytics 4 is ready to be configured. Uncomment the GA script in `index.html` and replace `G-XXXXXXXXXX` with your tracking ID.

## License

Copyright © 2025 Anchor Web Co. All rights reserved. 