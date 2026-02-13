# Anchor Web Co. Website Audit Notes
Date: 2026-02-13
Auditor: Codex

## Scope and method
- Reviewed all 17 HTML pages in `AnchorWebCo/`.
- Reviewed global assets: `css/styles.css`, `js/main.js`, sitemap files, robots file, and crawl script.
- Ran live URL smoke test with `npm run test:crawl` (27/27 URLs responded with valid 200/301/302).
- Ran static checks for broken relative links, metadata mismatches, placeholder links, and missing file references.

## Website section inventory (all pages)

### `index.html`
- Hero: headline, location strip, primary CTA.
- Services section: 3 cards (Web Development, SEO, Maintenance).
- Portfolio section: 3 featured client projects with outbound links.
- Testimonials section: rotating testimonial cards.
- Footer: quick links, contact details, social icon.

### `about.html`
- Hero section.
- About section (company intro and positioning).
- Process section (4-step process).
- Services section.
- Testimonials section.
- Footer and scroll-to-top button.

### `web-design-hervey-bay.html`
- Hero section.
- Problem/positioning section: "Your Hervey Bay Website Should Be Working Harder".
- Offer section: "Websites Built For Fraser Coast Growth".
- Process section: "Our 4-Step Launch Plan".
- Recent projects section.
- FAQ section.
- Final CTA section.
- Footer + LocalBusiness and FAQ schema.

### `seo-hervey-bay.html`
- Hero section.
- 90-day roadmap section.
- Campaign inclusions section.
- "What We Will Not Do" section.
- Resource links section.
- Case-wins section.
- FAQ section.
- Final CTA section.
- Footer + LocalBusiness, Service, FAQ schema.

### `contact.html`
- Hero section.
- Contact section with lead form and map embed.
- Footer.

### `thank-you.html`
- Thank-you hero section.
- "What Happens Next" section.
- "Need to Reach Us Sooner" contact section.
- Footer.

### `blog.html`
- Hero section.
- Blog grid section (9 linked posts).
- "Featured Article" section.
- CTA section.
- Footer.

### `blog-tradies-websites-more-jobs.html`
- Article hero.
- Long-form article body (10 major H2 sections).
- Conclusion.
- Footer.

### `blog-seo-hervey-bay-fraser-coast.html`
- Article hero.
- Long-form article body (8 major H2 sections).
- Related SEO articles section.
- Footer.

### `blog-hervey-bay-seo-company.html`
- Article hero.
- Long-form article body (8 major H2 sections).
- Related articles section.
- Footer.

### `blog-local-seo-hervey-bay.html`
- Article hero.
- Long-form article body (10 major H2 sections).
- Related articles section.
- Footer.

### `blog-website-design-sunshine-coast.html`
- Article hero.
- Long-form article body (14 major H2 sections).
- Related articles section.
- Footer.

### `blog-brisbane-business-seo.html`
- Article hero.
- Long-form article body (14 major H2 sections).
- Related articles section.
- Footer.

### `blog-mobile-first-design.html`
- Article hero.
- Long-form article body (14 major H2 sections).
- Related articles section.
- Footer.

### `blog-google-my-business-optimization.html`
- Article hero.
- Long-form article body (15 major H2 sections).
- Related articles section.
- Footer.

### `blog-website-speed-optimization.html`
- Article hero.
- Long-form article body (15 major H2 sections).
- Related articles section.
- Footer.

### `blog-website-design-guide.html`
- Article hero.
- Core design guide body (6 major H2 sections).
- Related articles section.
- Footer.

## Findings: issues and oddities (prioritized)

### Critical
1. Tailwind directives are shipped uncompiled in production CSS.
- Evidence: `css/styles.css:10`, `css/styles.css:33`, `css/styles.css:35`, `css/styles.css:164`, `css/styles.css:175`.
- Why this matters: `@tailwind`, `@layer`, and `@apply` are build-time directives and are ignored by browsers when sent raw. Many custom classes defined with `@apply` likely do not render as intended.

2. Testimonial carousel starts with no visible testimonial.
- Evidence: `.testimonial` is set to hidden style in `css/styles.css:192`; JS only rotates after 5 seconds in `js/main.js:59` and never calls `showTestimonial(0)` initially.
- Why this matters: testimonial section can appear blank on load, harming trust/conversion.

### High
3. Broken internal links in related-article blocks.
- Evidence: `blog-local-seo-hervey-bay.html:234`, `blog-local-seo-hervey-bay.html:240`, `blog-website-design-sunshine-coast.html:319`.
- Why this matters: users and crawlers hit non-existent local files in source; production only works because CloudFront legacy redirects mask the problem.

4. Multiple placeholder links (`href="#"`) remain in live templates.
- Evidence examples: `blog.html:254`, `blog.html:259`, `index.html:221`, `contact.html:174`.
- Why this matters: dead links hurt UX/accessibility and can dilute internal linking quality.

### Medium
5. Metadata URL mismatch on one article.
- Evidence: canonical includes `.html` but OG/Twitter URLs do not in `blog-website-design-guide.html:7`, `blog-website-design-guide.html:12`, `blog-website-design-guide.html:19`.
- Why this matters: inconsistent social URL attribution and avoidable URL normalization noise.

6. Sitemap canonical strategy is inconsistent (mixed `www` and non-`www`, mixed extension/no-extension forms).
- Evidence: `sitemap.xml:4`, `sitemap.xml:20`, `sitemap-blog.xml:4`.
- Why this matters: crawlers hit extra redirects and canonical signals become less clean.

7. Very large image assets likely impact performance.
- Evidence: `img/Bannister_Logo.jpg` (~2.3 MB), `img/favicon-mower.png` (~1.4 MB), `icons/favicon-180.png` (~937 KB), `img/og-image.jpg` (~937 KB).
- Why this matters: slower load, higher mobile data cost, weaker Core Web Vitals.

8. Analytics configuration drift between docs and implementation.
- Evidence: README says GA4 `G-WZ5NKEMPNH` in `README.md:101`; pages currently load Ads/gtag ID `AW-16766129889` (example: `index.html:249`, `index.html:255`).
- Why this matters: possible incomplete analytics coverage or documentation mismatch.

9. Blog featured-article block is not linked to a real page.
- Evidence: `blog.html:254`, `blog.html:259`.
- Why this matters: lost engagement path; existing article `blog-website-design-guide.html` is not used here.

10. Copyright year is hard-coded to 2025 across all pages.
- Evidence example: `index.html:233` (same pattern in all templates).
- Why this matters: visible freshness/trust signal can look outdated as of 2026.

### Low
11. Smooth-scroll polyfill inclusion is inconsistent and never initialized.
- Evidence: present on many pages but absent on `blog-seo-hervey-bay-fraser-coast.html` and `blog-website-design-guide.html`; no `smoothscroll.polyfill()` call in `js/main.js`.
- Why this matters: minor cross-browser inconsistency.

12. Embedded map iframe lacks an accessible `title` attribute.
- Evidence: `contact.html:138`.
- Why this matters: screen-reader experience issue.

## Update opportunities by section
- Global header/footer: replace placeholder Facebook links with real destination or remove icon until ready.
- Home/About testimonials: initialize first testimonial immediately and avoid absolute-hidden fallback if JS fails.
- Blog index: connect featured article block to `blog-website-design-guide.html` or remove section.
- Blog related-article components: normalize slugs to current filenames and remove legacy slug references from templates.
- SEO metadata: standardize canonical/OG/Twitter URL format (`https://www.anchorwebco.com.au/<slug>.html` or another single convention).
- Sitemaps: use one host and one URL pattern to match canonical tags exactly.
- Performance: compress oversized PNG/JPG assets and prefer WebP/AVIF where possible.
- Analytics: decide whether GA4 should be active; align README and page snippets.
- Accessibility: add iframe `title`, consider skip links and consistent focus states.

## Validation results already run
- Command: `npm run test:crawl`
- Result: pass (27 successful, 0 failed)
- Date run: 2026-02-13

