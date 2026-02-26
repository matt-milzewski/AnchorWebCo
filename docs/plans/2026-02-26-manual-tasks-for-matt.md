# Manual Tasks for Matt — Backlog Items Requiring Your Input

These items from the website audit backlog could **not** be implemented in code because they
require real content, external platform accounts, or business decisions only you can make.

---

## P0 — Critical (Do These First)

### P0-01 · Add a Real Founder Photo
**Where:** `about.html` hero section, and optionally `index.html` testimonial/trust section
**What to do:**
1. Get a professional or high-quality casual headshot (you working, outdoors, or just a clear face shot)
2. Export as WebP at 600×600px, quality 80 — run: `cwebp -q 80 -resize 600 600 your-photo.jpg -o img/matt-milzewski.webp`
3. Replace the placeholder in `about.html` (search for `<!-- FOUNDER PHOTO PLACEHOLDER -->`)
4. **Why it matters:** Faces build trust. People buy from people they can see.

---

### P0-02 · Replace Placeholder Testimonials With Real Ones
**Where:** `index.html` testimonials carousel
**Current state:** Testimonials use fake names (Sarah Johnson, Michael Brown, Lisa Chen) — these look
  fabricated and will undermine trust with any visitor who notices.
**What to do:**
1. Contact 3–5 past clients and ask for a short written testimonial (50–100 words)
2. Ask for: their name, suburb/business name, one specific result they got ("went from 5 to 20 calls/month")
3. Replace the placeholder testimonials in `index.html` (the `.testimonial` cards)
4. Optionally screenshot their Google Review and use the image instead
5. **Why it matters:** Fake testimonials are an immediate credibility killer. Real ones with specifics convert.

---

### P0-03 · Add a Booking Widget (Calendly or TidyCal)
**Where:** `contact.html` and potentially `index.html` hero CTA
**What to do:**
1. Create a free account at [Calendly](https://calendly.com) or [TidyCal](https://tidycal.com) (TidyCal = $19 lifetime, recommended)
2. Set up a "30-minute discovery call" event with your availability
3. Copy the embed code and add it to `contact.html` above the contact form, or replace the form entirely
4. You can also add an inline embed in the `index.html` hero section as a secondary CTA
5. **Why it matters:** Removing friction from booking is one of the highest-ROI changes you can make.
   People abandon contact forms; a calendar lets them pick a time immediately.

---

## P1 — High Priority

### P1-01 · Confirm Pricing on Web Design Page
**Where:** `web-design-hervey-bay.html`
**What to do:**
1. Decide on your public pricing tiers (or choose to not show pricing and show "from $X")
2. Add a pricing section or update the existing one with real numbers
3. Consider 3 tiers: Starter (~$1,500), Business (~$3,000), Premium ($5,000+)
4. **Why it matters:** "Get a quote" with no price anchor makes visitors bounce. Even a "from $1,500" helps qualify leads.

---

### P1-05 · Write a Real Founder Story on the About Page
**Where:** `about.html`
**Current state:** The about page has generic copy that could belong to any agency.
**What to do:**
1. Write 2–3 paragraphs covering:
   - How you got into web design and SEO
   - Why you chose to focus on Hervey Bay / Fraser Coast trades businesses
   - One specific client win story (business type, problem, result)
2. Replace the placeholder bio copy in `about.html`
3. **Why it matters:** A real story creates connection and differentiates you from offshore agencies.

---

### P1-06 · Set Up Email Capture / Lead Magnet
**Where:** New section on `index.html` or `blog.html`
**What to do:**
1. Create a free account on [MailerLite](https://mailerlite.com) (free up to 1,000 subscribers)
2. Write a short lead magnet: "5 Things Hervey Bay Tradies Should Check on Their Website This Week" (1-page PDF)
3. Create an opt-in form in MailerLite and copy the embed code into your site
4. Place it in the blog sidebar or at the bottom of high-traffic blog posts
5. **Why it matters:** Builds an email list of warm leads. Email marketing delivers ~$42 ROI per $1 spent.

---

### P1-09 · Confirm Website Care Plan Pricing
**Where:** `website-care-plans.html` (already created)
**Current state:** Placeholder pricing used: Starter $99/mo, Business $199/mo, Premium $349/mo
**What to do:**
1. Review and adjust the pricing in `website-care-plans.html` to match what you actually charge
2. Search for `$99`, `$199`, `$349` in the file and update as needed
3. Also update the "most popular" badge — currently on Business — if you want it on a different tier
4. **Why it matters:** Incorrect pricing causes client expectation mismatches and lost trust.

---

### P1-10 · Add a Google Review Badge
**Where:** `index.html` trust bar or footer
**What to do:**
1. Go to your Google Business Profile and find your Place ID (use Google's Place ID Finder)
2. Use a service like [Elfsight](https://elfsight.com/google-reviews-widget/) (free tier available)
   or copy your Google review widget embed code
3. Add it to the homepage near the testimonials section
4. **Why it matters:** Google stars are the highest-trust social proof signal. Even 5 reviews at 5 stars helps.

---

## P2 — Medium Priority

### P2-01 · Write Real Case Study Pages
**Where:** New pages, link from `web-design-hervey-bay.html` and `seo-hervey-bay.html`
**What to do:**
1. Pick 2–3 clients who got measurable results (% traffic increase, calls/month, GMB ranking)
2. Get written permission to use their name and logo
3. Write a case study for each: Problem → What we built → Results (with real numbers)
4. Create HTML pages following the pattern of existing service pages
5. **Why it matters:** Case studies are the highest-converting content type for agency websites.
   Visitors convert at 3–5x the rate when they see proof from businesses like theirs.

---

### P2-04 · Add Featured Images to Blog Post Cards
**Where:** `blog.html` listing page
**Current state:** Blog cards have no images — just text
**What to do:**
1. Create a consistent 800×450px branded image for each blog post
   - Use Canva with your brand colours (navy #1f2937, sky blue #38bdf8)
   - Include the blog title as text on the image
2. Save as WebP: `cwebp -q 80 img/blog-[slug]-featured.webp`
3. Add the image to each card in `blog.html` with `<img src="img/blog-[slug]-featured.webp" alt="...">`
4. **Why it matters:** Visual thumbnails improve click-through by 30%+ on listing pages.

---

### P2-11 · Set Up a Referral Program
**Where:** Business decision — would appear on a new page + footer link
**What to do:**
1. Decide if you want a referral program (e.g., "Refer a tradie, get $200 credit")
2. If yes: Create a simple `/referral.html` page describing the offer and linking to the contact form
3. No platform needed — just a form submission with a "referred by" field
4. **Why it matters:** Word-of-mouth from happy tradie clients is your highest-quality lead source.

---

## P3 — Nice to Have

### P3-08 · Switch from Tailwind CDN to Compiled Build
**Where:** All HTML pages (`<script src="https://cdn.tailwindcss.com">` tag)
**Current state:** Using the Tailwind CDN — adds ~120KB of JS runtime overhead on every page
**What to do (requires a small technical setup, once):**
1. Install Node.js if not already: `node --version` to check
2. In your project root: `npm init -y && npm install -D tailwindcss`
3. Create `tailwind.config.js` with your custom colour config
4. Create `src/input.css` with `@tailwind base; @tailwind components; @tailwind utilities;`
5. Run: `npx tailwindcss -i ./src/input.css -o ./AnchorWebCo/css/tailwind.css --minify`
6. Replace the CDN script tag in every page with: `<link rel="stylesheet" href="css/tailwind.css">`
7. Add the build command to your GitHub Actions workflow before the S3 sync step
8. **Why it matters:** Eliminates ~120KB of runtime JS, improves Core Web Vitals (LCP/CLS),
   better for Google PageSpeed score. Worth 5–10 point improvement on PageSpeed Insights.

---

## AWS / Deployment — No Action Needed

The existing GitHub Actions workflow automatically syncs everything to S3 + CloudFront on push to `main`.
The 3 new pages (`website-care-plans.html`, `web-design-maryborough.html`, `free-website-audit-hervey-bay.html`)
and all updated files will deploy automatically when you push.

**One optional improvement:** Add a CloudFront cache invalidation step to the workflow so changes
appear immediately (currently may take up to 24 hours to clear from CDN cache):

```yaml
# Add after the aws s3 sync step in .github/workflows/deploy.yml:
- name: Invalidate CloudFront cache
  run: aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_DEFAULT_REGION: ap-southeast-2
```

Replace `YOUR_DISTRIBUTION_ID` with your actual CloudFront distribution ID (find it in the AWS Console → CloudFront → Distributions).

---

## Summary Table

| ID | Task | Effort | Impact |
|----|------|--------|--------|
| P0-01 | Add founder photo | Low (photo shoot) | High |
| P0-02 | Real testimonials | Low (contact clients) | Critical |
| P0-03 | Booking widget | 30 min setup | High |
| P1-01 | Confirm pricing | Decision | Medium |
| P1-05 | Real founder bio | 1 hour writing | High |
| P1-06 | Email capture | 2 hours setup | High |
| P1-09 | Confirm care plan pricing | 10 min | Medium |
| P1-10 | Google review badge | 30 min | High |
| P2-01 | Case study pages | 3–5 hours/case | Very High |
| P2-04 | Blog featured images | 2 hours in Canva | Medium |
| P2-11 | Referral program | Business decision | Medium |
| P3-08 | Compiled Tailwind | 2 hours setup | Low |

**Recommended order:** P0-02 → P0-03 → P0-01 → P1-10 → P1-06 → P2-01
