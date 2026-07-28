# Anchor Web Co Brisbane Inner-West Rebrand, SEO and Pricing Plan

Date: 28 July 2026  
Prepared for: Matt Milzewski / Anchor Web Co  
Repository reviewed: `matt-milzewski/AnchorWebCo` (`main`)

## Implementation status — 28 July 2026

The repository work in this plan has now been implemented:

- The site is repositioned around a Red Hill base and Brisbane's inner west.
- Shared templates now control the marketing metadata, navigation, footer and schema.
- The new Red Hill, inner-west web design, local SEO, pricing, care-plan and audit pages are in place.
- The public build prices are $1,970, $3,850 and from $5,950.
- Care plans are deliberately automation-led at $79, $129 and $229 per month.
- Current local imagery, source credits, local blog content, sitemaps and one-hop migration redirects are included in the repo.

The Google Business Profile, directory/citation updates, Search Console indexing requests, review collection and local partnerships described later in this document remain business-account actions outside the repository.

## Executive recommendation

Keep the **Anchor Web Co** name and `anchorwebco.com.au` domain. Reposition the business rather than renaming it:

> **Anchor Web Co — Red Hill web design for Brisbane's inner west.**

The public-facing promise should move from broad web design and SEO on the Fraser Coast to:

> **Fast, low-maintenance websites that help Brisbane inner-west businesses win more enquiries.**

The best initial market is not every suburb west of Brisbane. Start with a credible, tightly connected area around Matt's Red Hill base:

- Primary: Red Hill, Paddington, Bardon, Ashgrove, Kelvin Grove, Milton and Auchenflower.
- Secondary: Petrie Terrace, Toowong and Newmarket.
- Later expansion only after evidence: Taringa, Indooroopilly, The Gap, Alderley and broader Brisbane.

Use **“Brisbane inner west and nearby north-west suburbs”** where precision matters. Red Hill is commonly treated as inner north or inner north-west, while Paddington, Bardon, Milton and Auchenflower are clearly associated with the inner west. “Red Hill-based, serving Brisbane's inner west” is both accurate and commercially useful.

Do not launch ten near-duplicate suburb pages. Launch one strong inner-west service page and one genuinely local Red Hill page, then add suburb pages only where Search Console data, enquiries, local proof or client work supports them. Google explicitly treats substantially similar regional pages that funnel to the same destination as doorway abuse.

## Decisions this plan assumes

- Anchor Web Co remains a solo/boutique studio led by Matt.
- Customers do not visit Matt's home, so Red Hill should be presented as a base/service area, not a public storefront address.
- The preferred build is a fast static or low-maintenance site using the existing AWS, forms and analytics stack.
- The desired clients are established local service businesses rather than price-only startups or complex e-commerce businesses.
- Monthly plans should be profitable with little routine human effort.
- Prices below are recommended public prices in AUD. Confirm whether public prices should be labelled as including GST before publication and apply that treatment consistently.

## What the repo said before implementation and why it had to change

Before this rebrand, the live site and source were strongly attached to Maryborough, Hervey Bay and the Fraser Coast:

- “Maryborough” appeared across 33 reviewed source/document files and hundreds of source/data occurrences.
- “Hervey Bay” appeared across 33 reviewed files and hundreds of occurrences.
- “Fraser Coast” appeared across 32 reviewed files.
- The homepage title, description, hero, LocalBusiness schema, Organization schema, review copy, footer and FAQs all used the old region.
- Navigation linked to four Maryborough/Hervey Bay web design and SEO pages.
- The contact page displayed Maryborough QLD 4650 and embedded a Maryborough map.
- The global site data in `src/_data/site.json` declared Maryborough as the location.
- The care-plan page was written around WordPress plugins and recurring manual SEO even though Anchor's own sites are primarily static and low maintenance.
- The deploy workflow contained a hard-coded list of the old geographically named pages.
- Analytics funnels and the forms Lambda hard-coded `/free-website-audit-hervey-bay`.
- The crawl test, robots file, CloudFront redirects, Netlify redirects and saved/CMS blog content preserved old URLs and regional terms.

The implementation also has a maintenance problem: most marketing pages contain their own duplicated header, footer, metadata and schema, while the Eleventy includes are mainly used by the blog. A global location change therefore requires edits across many files. The rebrand should include a template consolidation before or alongside the copy migration.

### Trust and policy issues to fix during the move

Do not carry unverified claims into the new Brisbane pages. Current source includes claims such as:

- “#1” and top-three rankings.
- “54%” organic enquiry growth.
- Generic case-study percentages in old blog content.
- Time-to-ranking and lead-growth expectations.
- An FAQ recommending separate Google Business Profiles for suburbs.

Keep a result only when there is dated Search Console, GBP, analytics or client evidence and permission to publish it. Otherwise replace it with a factual description of what was built.

The separate-GBP advice must be removed. A service-area business should use one profile for its real base, not create a profile for each suburb. Google permits separate profiles only for legitimate separate staffed locations.

## Local market research

### Why this area is a good fit

Brisbane City Council's Paddington Ward contains Auchenflower, Bardon, Herston, Kelvin Grove, Milton, Paddington, Petrie Terrace and Red Hill, plus parts of Bowen Hills and Toowong. This is a useful official boundary for the core service territory. Ashgrove is immediately adjacent and has a visible local small-business market, so it should be included as a primary commercial suburb even though it is outside that ward.

The Brisbane Inner West Chamber of Commerce explicitly describes its territory as including Milton, Bardon, Paddington, Rosalie, Auchenflower, Red Hill, Petrie Terrace, Toowong, Indooroopilly, Ashgrove and The Gap. This supports using “inner west” as the umbrella while leading with the more exact Red Hill base.

ABS 2021 Census data indicates a relatively strong ability to pay:

- Red Hill: 5,834 people, median age 33 and median weekly household income of $2,367, compared with $1,675 for Queensland.
- Paddington: 9,063 people, median age 34 and median weekly household income of $2,775.
- Paddington's top reported employment industries include hospitals, legal services, cafes/restaurants, computer-system design and higher education.
- Red Hill's top reported industries include hospitals, cafes/restaurants, legal services and higher education.

These are resident employment data, not a count of businesses, so they should be treated as a demand/affluence signal rather than proof of the local business mix.

### Recommended ideal client profile

Prioritise businesses with two to twenty staff, an established offer and an average customer value high enough to justify a $3,000–$7,000 website:

1. Allied health and appointment-based practices.
2. Trades, builders, home services and property services that cover the inner west.
3. Professional services such as consultants, accountants, legal-adjacent services and boutique B2B firms.
4. Fitness, beauty, wellness and specialist studios.
5. Select hospitality or retail businesses only where integrations and frequent menu/product changes are tightly scoped.

Avoid making low-budget startups, high-change hospitality sites, e-commerce catalogues or “unlimited updates” the core offer. They create more support work and are a poor match for the desired automated recurring model.

### Competitor and pricing snapshot

The current Brisbane market is split between commodity template sites and more strategic custom work:

- Cheap Websites Brisbane lists 1–5 pages at $499, 7–8 pages at $899 and 8–10 pages at $1,999.
- A Brisbane Website Design Red Hill landing page lists a basic range from $590–$2,990, a standard package from $2,990 and premium from $9,990.
- OceanSky Digital, a direct Milton/inner-west competitor, lists a five-page starter at $2,000, growth at $2,500+, maintenance at $79/month, GBP management at $199/month and local SEO at $799/month.
- EliteDev lists Brisbane WordPress care at $60, $90 and $125 per month depending on site size and included support.
- A 2026 Brisbane maintenance guide places professional maintenance around $100–$500/month, with support hours as the main cost driver.

Anchor should not compete with $399–$899 template sites. Its defensible middle position is:

- More local, direct and technically capable than the commodity end.
- Lower-overhead and clearer than a $10,000+ agency.
- Differentiated by lightweight builds, owned forms, cookieless analytics, enquiry tracking and fixed scope.

## Brand strategy

### Positioning

Recommended descriptor:

> **Red Hill web design for Brisbane's inner west**

Recommended one-sentence pitch:

> Anchor Web Co builds fast, low-maintenance websites for local businesses in Red Hill, Paddington, Bardon, Ashgrove and nearby Brisbane suburbs.

Recommended value proposition:

> Direct with the developer. Fixed-fee build. Local SEO foundations and enquiry tracking included. No bloated plugin stack or compulsory marketing retainer.

### Recommended homepage hero

Eyebrow:

> Red Hill · Brisbane inner west

Headline:

> **Local websites that bring in business.**

Supporting copy:

> Fast, search-friendly websites for Brisbane inner-west businesses. Fixed-fee builds, clear scope and low-maintenance support from a local developer.

Primary CTA:

> Get a fixed-price website plan

Secondary CTA:

> Run a free website check

Proof line:

> Based in Red Hill · Direct with Matt · Most sites live in 3–5 weeks

Only keep the 3–5 week promise if the new package scope and client content deadlines make it realistic.

### Tone and visual direction

- Keep the name, phone, domain and existing black/white/blue recognition.
- Remove coastal imagery and names such as `hero-coast.webp`, `cta-coast.webp`, `coast-sky` where they imply the old geography.
- Use original Red Hill/Paddington/inner-west photography: hilly streets, Queenslanders, Latrobe/Given Terrace details, local shopfront texture and a real founder photo.
- Avoid generic Brisbane skyline imagery as the main visual. It weakens the hyper-local claim.
- Use a real photo and first-person founder copy. “You work directly with Matt in Red Hill” is more persuasive than repeatedly saying “our team”.
- Retain existing regional work as portfolio proof, labelled honestly by client location. It shows capability even if the clients are outside Brisbane.

### Differentiation to feature

1. Local and direct: no account manager or outsourced hand-off.
2. Low-maintenance architecture: fast static sites where suitable, fewer moving parts and less plugin risk.
3. Leads are measurable: form, phone-click and email-click tracking using Anchor's existing analytics.
4. Transparent fixed scope and public starting prices.
5. Ongoing plans that monitor rather than invent unnecessary monthly busywork.

## Recommended pricing

### One-off website builds

| Package | Public price | Best for | Included scope |
|---|---:|---|---|
| One-Page Launch | **$1,970** | New or very small service businesses with one clear offer | One conversion-focused page, up to 7 sections, mobile design, supplied-copy edit, contact form, click tracking, metadata, basic schema, analytics, domain launch and one revision round |
| Local Business Website | **$3,850** | Established local businesses needing a credible main site | Up to 5 core pages, custom design, content workshop, conversion copy editing, contact/quote form, local keyword map, on-page SEO, LocalBusiness/Organization schema as appropriate, GBP/website alignment, Search Console, analytics and two revision rounds |
| Local Lead Website | **from $5,950** | Businesses competing across services and suburbs | Up to 10 pages, deeper discovery, service-page architecture, up to two evidence-based local landing pages, conversion copy, lead-source tracking, advanced form, technical SEO, redirects/migration, Search Console/GBP launch checklist, 30-day post-launch review and two revision rounds |

Recommended public presentation:

- Show the exact first two prices and “from $5,950” for the third.
- State that e-commerce, custom applications, member portals and large booking systems are quoted separately.
- Do not describe routine on-page SEO foundations as an ongoing SEO campaign.
- Require a signed scope and 50% deposit to start; use 40% at design approval and 10% at launch for the larger package, or 50/50 for the first two.
- Make client content deadlines part of the timeline.
- Limit included revisions by round and scope, not by an undefined number of tiny requests.

### Add-ons and scope controls

| Add-on | Recommended price |
|---|---:|
| Additional standard page during build | $350 |
| Additional researched service/location page | $550 |
| Google Business Profile setup or relocation assistance | $350 |
| Copywriting from interview, per page | $250 |
| Additional form or simple integration | from $300 |
| Blog/CMS setup | from $750 |
| Existing-site content/URL migration | from $500 |
| Rush delivery, when available | +25% |
| Ad-hoc work outside a plan | $165/hour, 30-minute minimum |

Do not include business email hosting. Refer clients to Google Workspace or Microsoft 365 and charge separately for setup if offered. Email support tends to create unrelated ongoing helpdesk work.

## Low-touch website management plans

Public plans should be limited to sites built and hosted by Anchor Web Co. Third-party WordPress sites should require a paid audit and separate quote, or be declined. This is the main protection against unpredictable monthly work.

### Plan 1: Site Care

**$79/month or $790/year**

Mostly automated:

- Managed static hosting/CDN.
- SSL certificate and deployment infrastructure.
- Automated uptime checks.
- Automated form endpoint check.
- Git and deployment backup history.
- Monthly broken-link and basic technical crawl.
- Automated monthly status email.
- Business-hours incident response when monitoring detects an Anchor-controlled hosting fault.

Not included:

- Content changes.
- SEO work or ranking promises.
- Domain renewal, business email or third-party licence fees.
- Problems caused by third-party services.

Expected routine manual time: zero; exception-only response.

### Plan 2: Care + Insights

**$129/month or $1,290/year**

Everything in Site Care, plus:

- Cookieless traffic and enquiry report.
- Automated Search Console performance summary after integration.
- Monthly Core Web Vitals/Lighthouse trend.
- Automated title, description, canonical, schema and image-size checks.
- Quarterly 15-minute content change, which expires each quarter and cannot roll over.
- Standard response target of two business days.

Expected routine manual time: near zero, plus at most 15 minutes per quarter.

### Plan 3: Local Visibility Monitor

**$229/month or $2,290/year**

Everything in Care + Insights, plus:

- Automated tracking for an agreed set of up to 20 local search terms.
- GBP performance summary where API access permits.
- Review alerting and a ready-to-send review-request link.
- Quarterly 30-minute performance review with a prioritised recommendation list.
- One small quarterly change, capped at 30 minutes.
- Quotes for new pages, content, citations or campaign work are separate.

Expected routine manual time: at most 30 minutes per quarter unless a separately approved project is sold.

### Management-plan rules to publish

- No “unlimited edits”.
- Unused change allowances expire; they are not banked.
- A change is text/image replacement within an existing layout, not redesign or new functionality.
- Work beyond the allowance requires written approval at $165/hour or a fixed quote.
- Monitoring detects issues; it does not include unlimited remediation.
- No promised 24/7 human support. Monitoring can run 24/7, while response is during business hours.
- No monthly blogging, manual GBP posts, backlink outreach, social posting or routine calls inside care plans.
- Domain and paid third-party fees are billed separately.
- Cancellation requires 30 days' notice. Provide a clear handover/export policy.

This structure prices above commodity hosting but below high-touch WordPress retainers because the underlying static stack requires less manual maintenance.

## Local SEO strategy

### Target geography

#### Tier 1: establish authority first

- Red Hill
- Paddington
- Bardon
- Ashgrove
- Milton
- Kelvin Grove
- Auchenflower

#### Tier 2: mention and measure

- Petrie Terrace
- Toowong
- Newmarket

#### Tier 3: expand only after proof

- Taringa
- Indooroopilly
- The Gap
- Alderley
- broader Brisbane

Rosalie can be used naturally in copy as a Paddington locality, but it should not be treated as a separate Google Business Profile or thin landing page.

### Initial keyword themes

These are priority themes, not claimed search-volume figures:

- web design Brisbane inner west
- inner west Brisbane web designer
- web design Red Hill Brisbane
- Red Hill web designer
- web design Paddington Brisbane
- web design Ashgrove
- web design Bardon
- web design Milton Brisbane
- small business website Brisbane
- local SEO Brisbane inner west
- website maintenance Brisbane
- website care plans Brisbane

Before producing more than the first two location-focused pages, validate demand using:

- Existing Google Search Console query data.
- Google Ads Keyword Planner with Brisbane targeting.
- GBP query/performance data.
- Actual enquiries and sales calls.
- Manual SERP checks from a Brisbane location.

### Launch page architecture

Recommended navigation:

- Work
- Web Design
- Local SEO
- Pricing
- Website Care
- About
- Blog
- Get a website plan

Recommended launch URLs:

| URL | Primary purpose |
|---|---|
| `/` | Brand + “web design Brisbane inner west” umbrella |
| `/web-design-brisbane-inner-west.html` | Main service and commercial-intent page |
| `/web-design-red-hill.html` | Genuine home-base/local page |
| `/local-seo-brisbane-inner-west.html` | SEO service explanation and fixed-scope SEO projects |
| `/pricing.html` | Builds, add-ons and qualification |
| `/website-care-plans.html` | Low-touch management plans |
| `/work.html` | Portfolio and measurable, verified proof |
| `/free-website-audit-brisbane.html` | Lead magnet/manual audit |
| `/health-check.html` | Automated entry funnel |
| `/about.html` | Matt, Red Hill and credentials |
| `/contact.html` | Qualified enquiry form |

Do not add separate pages for Paddington, Bardon, Ashgrove, Milton and Auchenflower at launch unless each can contain unique local proof and useful content. Add one page at a time after the umbrella and Red Hill pages have been indexed and measured.

### Standard for any future suburb page

A page must include at least three forms of unique value:

- A local client/case study or photographed project.
- Commentary on actual business types or customer behaviour in that suburb.
- Original local photography.
- Specific service examples and page architecture for businesses in that area.
- A distinct FAQ based on a real enquiry.
- Links to relevant local organisations or resources.
- Unique internal links and a clear relationship to the inner-west hub.

Do not create pages by swapping the suburb name in the title, H1 and paragraphs.

### On-page requirements

- One clear intent per page and one H1.
- Unique title and meta description written for click-through, not a list of suburbs.
- Canonical URL matching the final public URL exactly.
- Descriptive internal links from the home, service, work and relevant blog pages.
- `Organization`, `WebSite`, `Service`, `BreadcrumbList` and `FAQPage` schema only where the visible page supports it.
- Use a truthful local business/service-area representation. Do not publish Matt's street address if customers do not visit.
- Add `sameAs` links to the real GBP/social profiles.
- Add clear phone, form and email actions and track them.
- Use review markup only within Google's rules; do not mark up self-serving LocalBusiness reviews for stars.
- Test new schema with Google's Rich Results Test.

### Google Business Profile move

1. Do not create a new profile just for Brisbane.
2. Keep the existing profile, name and reviews.
3. Update the underlying address for verification, but hide it publicly if customers do not visit Matt's home.
4. Set the profile as a service-area business and use specific suburbs, not a radius.
5. Set service areas to the real Tier 1 and Tier 2 list only.
6. Keep the name exactly “Anchor Web Co”; do not add “Red Hill Web Design” to the GBP name unless it becomes the real-world business name everywhere.
7. Update the website, description, category, services, hours, appointment URL and images.
8. Add fresh Red Hill/inner-west founder and working photos.
9. Preserve existing reviews; Google says reviews normally move automatically when a business relocates and keeps the same name.
10. Begin asking Brisbane-area clients for reviews naturally after delivery. Do not gate reviews or offer incentives.

### Citation and local authority work

Update the same name, phone, website and service-area description across:

- Google Business Profile.
- Apple Business Connect.
- Bing Places.
- Yellow Pages and any existing Australian business directories.
- Social profiles.
- Existing local listings and old Maryborough citations.

Recommended local authority actions:

- Join the Brisbane Inner West Chamber of Commerce; its listed membership starts at $132/year and includes a member listing and events.
- Attend one chamber/local-business event per month for the first three months.
- Offer a practical “website health check for local businesses” talk or clinic rather than a generic sales pitch.
- Secure branded links from real client case studies, suppliers, business partners and the chamber profile.
- Use branded footer credits such as “Website by Anchor Web Co” where clients agree; avoid repeated keyword-rich anchors.
- Build two real Brisbane case studies before trying to scale suburb pages.

### Content plan

First six useful articles/pages:

1. What a Brisbane small-business website should cost in 2026.
2. Web design for Red Hill and Paddington service businesses: what local customers need.
3. Static website vs WordPress for a low-maintenance local business.
4. A practical Google Business Profile checklist for Brisbane service businesses.
5. Website maintenance costs in Brisbane: hosting, monitoring and updates explained.
6. Case study: a local service website from structure to measurable enquiries.

Existing Fraser Coast articles should not be bulk find-and-replaced. Use Search Console and backlink data to decide:

- Rewrite and redirect if an article has links/impressions and a genuine Brisbane equivalent.
- Keep it as a historical/general resource if it remains accurate and useful.
- Remove unsupported case-study statistics and self-proclaimed “leading” language.
- Do not redirect unrelated retired articles to the homepage.

## Lead generation plan

### Primary funnel

1. Local page, chamber listing, referral or personalised outreach.
2. Automated health check.
3. Short report with three prioritised issues.
4. CTA to request a fixed-price website plan.
5. Qualification form captures suburb, current URL, service, budget and timeline.
6. Matt sends a fixed-scope recommendation.

### Contact form changes

Replace the current broad service list with:

- One-Page Launch — $1,970.
- Local Business Website — $3,850.
- Local Lead Website — from $5,950.
- Website Care.
- Fixed-scope SEO/local visibility project.
- Something else.

Add:

- Business suburb.
- Current website URL.
- Budget bands aligned to the public packages.
- How the lead found Anchor Web Co.
- Consent language appropriate to the follow-up being sent.

Do not add a booking calendar unless Matt can protect specific sales-call windows. A form-first workflow is lower interruption and can filter poor-fit leads.

### Simple 90-day local acquisition cadence

Per week:

- Five personalised audits for good-fit local businesses with outdated or unclear sites.
- One useful LinkedIn/GBP post derived from a real audit pattern.
- Two review/referral requests to completed clients where appropriate.
- One local relationship touchpoint: chamber member, photographer, copywriter, IT provider, signage provider or accountant.

Per month:

- One high-quality article or case study.
- One chamber/networking event.
- One review of GSC, GBP, forms, calls/clicks, proposals and wins.

Do not promise a high-volume content calendar. One useful local asset per month is sufficient for a solo studio when paired with outreach and relationships.

## Repository implementation instructions

### Phase 0: baseline before changing URLs

1. Export the last 16 months of Google Search Console pages, queries, countries, devices and links.
2. Export GBP performance and current profile fields.
3. Record current indexed URLs with a `site:anchorwebco.com.au` review.
4. Crawl the live site and save status, canonical, title, description, H1 and internal-link data.
5. Record current enquiries and conversion events by landing page.
6. Create the final old-to-new redirect spreadsheet before deleting or renaming anything.
7. Verify every public ranking/result claim and remove any without evidence.

### Phase 1: consolidate templates and location data

The site currently passes top-level HTML files straight through Eleventy and sets `htmlTemplateEngine: false`. This leaves headers, footers, schema and location copy duplicated.

1. Create a common Eleventy base layout for marketing pages.
2. Move navigation, footer, analytics include, common head tags and default schema into shared includes/layouts.
3. Extend `src/_data/site.json` with:
   - `locationDisplay`: `Red Hill, Brisbane QLD`
   - `baseSuburb`: `Red Hill`
   - `region`: `Brisbane inner west`
   - a Tier 1/Tier 2 service-area array
   - social/GBP URLs
   - default title/description data
4. Convert standalone marketing HTML into Nunjucks/Eleventy templates or enable the correct HTML template engine.
5. Generate header/footer links from data instead of duplicating them.
6. Make the deployment analytics injection discover templates dynamically or inject through the shared footer only. Remove the hard-coded old page list in `.github/workflows/deploy.yml`.
7. Build and compare all generated URLs before changing public routing.

### Phase 2: replace global geography and brand copy

Update:

- `src/_data/site.json`
- `src/index.html` or its replacement template
- `src/about.html`
- `src/contact.html`
- `src/thank-you.html`
- `src/health-check.html`
- `src/website-care-plans.html`
- `src/_includes/header.njk`
- `src/_includes/footer.njk`
- titles, descriptions, OG/Twitter fields and visible footer/contact text
- all LocalBusiness, Organization, Service and FAQ schema

Specific changes:

- Replace the Maryborough map with either no map or a general Red Hill/inner-west service-area map. Do not expose a residential street address.
- Replace the coast hero/CTA images with local originals.
- Rewrite the founder story to explain the move: Fraser Coast roots, now based in Red Hill, applying the same local-business focus in Brisbane.
- Keep regional portfolio work and location labels; do not imply that old clients are Brisbane clients.
- Replace the Maryborough Google review headline in the hero area with a review that demonstrates service quality without making the old town the current positioning. Attribute it accurately.

### Phase 3: create the new commercial pages

Create:

- `web-design-brisbane-inner-west`
- `web-design-red-hill`
- `local-seo-brisbane-inner-west`
- `pricing`
- `work`
- `free-website-audit-brisbane`

Rewrite `website-care-plans` to use the three low-touch plans in this document. Remove:

- Plugin-update fear from the primary pitch for Anchor-built static sites.
- Included email addresses.
- “Monthly website work to improve SEO”.
- Generic “fully managed” wording that implies unlimited labour.
- The promise to take on any site regardless of platform.

Add clear inclusions, exclusions, response targets, plan eligibility and paid out-of-scope rates.

### Phase 4: redirects and crawl controls

Minimum redirects:

| Old URL | New URL |
|---|---|
| `/web-design-hervey-bay.html` | `/web-design-brisbane-inner-west.html` |
| `/web-design-maryborough.html` | `/web-design-brisbane-inner-west.html` |
| `/seo-hervey-bay.html` | `/local-seo-brisbane-inner-west.html` |
| `/seo-maryborough.html` | `/local-seo-brisbane-inner-west.html` |
| `/free-website-audit-hervey-bay.html` | `/free-website-audit-brisbane.html` |

Also cover current extensionless forms because `cloudfront-function.js` canonicalises them.

Implementation locations:

- `cloudfront-function.js`
- `cloudfront-redirect-function.js` if it is still deployed anywhere
- `netlify.toml` for staging/parity
- `test-crawl.js`

Rules:

- Use a single 301 hop.
- Preserve query strings.
- Do not create redirect chains through old `.html` and extensionless routes.
- Do not redirect unrelated blog pages to the homepage.
- Update canonical tags and internal links before launch.
- Verify old and new variants with HEAD and GET requests.

### Phase 5: sitemap, robots and content data

Update:

- `src/robots.txt` to list the new important routes and remove old service routes. `Allow` entries are not required for normally crawlable pages, so keep it simple.
- `src/sitemap.njk` output after the page migration.
- `src/sitemap-images.xml` for replacement imagery.
- `src/_data/legacyPages.js` behaviour if renamed/redirect-only files should not appear in the sitemap.
- Root `sitemap.xml` if it is a stale source artefact; the deployed sitemap should have one source of truth.
- `src/_data/cmsBlogPosts.json`
- `src/admin/seed-blog-posts.json`
- `docs/saved-blog-posts/*.md`
- CMS seed/migration scripts where old links are embedded.

Update or remove old regional links in every retained article. The CMS copy and saved Markdown copy can otherwise reintroduce Maryborough/Hervey Bay content during a future fetch or seed.

### Phase 6: forms and analytics

Update:

- `analytics/tenants/anchorwebco.json`
- `analytics/lambda/tenants/anchorwebco.json`
- `forms/lambda/index.js`
- related analytics/forms tests

Changes:

- Rename the Audit funnel path to `/free-website-audit-brisbane`.
- Add pricing-page and package-selection events.
- Record `business_suburb`, package interest and budget band as approved non-sensitive lead properties.
- Keep call-click, email-click and form-submit events.
- Update the region grouping in `analytics/lambda/shared/privacy.js`; retain Fraser Coast only if historical visitor reporting still needs it.
- Add an automated monthly report that powers Care + Insights.
- Add scheduled synthetic checks for the live form and health-check endpoints.

### Phase 7: technical quality

- Replace Tailwind CDN usage with a compiled production stylesheet.
- Remove old uncompiled Tailwind directives and unused coastal styles.
- Optimise remaining oversized logos/images and provide explicit dimensions.
- Keep AWS S3/CloudFront hosting, forms and analytics; they are useful differentiators.
- Add security headers and verify them at CloudFront.
- Verify form spam controls and health-check SSRF protections already noted in earlier repo plans.
- Run Eleventy build, unit tests for analytics/forms/health-check/CMS, static link checks and the live crawl test.
- Test desktop/mobile keyboard navigation and form errors.
- Test titles, descriptions, canonicals, schema, OG images, sitemap and robots.

### Phase 8: launch order

Day 0:

- Deploy templates, global copy, homepage, about, contact, pricing, care and new core service pages.
- Deploy redirects in the same release.
- Update GBP only after the website reflects Red Hill/Brisbane consistently.
- Submit the new sitemap and inspect priority URLs in Search Console.

Days 1–7:

- Verify redirects, indexing, forms, analytics, GBP link and conversion events.
- Fix 404s and unexpected old-location mentions.
- Update citations and social profiles.

Days 8–30:

- Publish one Red Hill/inner-west article.
- Join BIWCC and complete the member listing.
- Begin local outreach and review requests.
- Capture baseline rankings without making guarantees.

Days 31–90:

- Publish the first Brisbane case study.
- Decide whether Paddington or Ashgrove deserves the next unique location page.
- Review package enquiries and adjust qualification copy, not prices, unless lead quality is clearly wrong.

## Acceptance criteria

The rebrand is complete when:

- No public core page presents Anchor Web Co as Maryborough/Fraser Coast based.
- The site truthfully says Red Hill-based and serves the defined inner-west area.
- Old service URLs return one-hop 301s to the closest new service.
- All new pages have unique titles, descriptions, H1s, canonicals and useful content.
- GBP remains one compliant profile with the home address hidden if customers do not visit.
- Prices and scope limits are visible.
- Care plans contain no unlimited or routine high-touch work.
- A normal month on Site Care requires no manual task unless monitoring finds an exception.
- Forms, calls/clicks, package interest and source pages are tracked.
- Unsupported rankings, percentages and case-study claims are removed.
- Sitemap, robots, schema, analytics funnels, automated reports and crawl tests use the new URLs.
- Search Console has a clean sitemap and no growing 404/redirect error pattern.

## 30/60/90-day scorecard

Do not judge the move only by rankings. Track:

| Metric | Baseline | 30 days | 60 days | 90 days |
|---|---:|---:|---:|---:|
| Non-brand organic impressions from Brisbane | Record before launch | Trend | Trend | Trend |
| Impressions/clicks for inner-west and Red Hill themes | Record | Trend | Trend | Trend |
| GBP website clicks, calls and direction requests | Record | Trend | Trend | Trend |
| Health checks completed | Record | Target from actual baseline | Review | Review |
| Qualified enquiries | Record | Review | Review | Review |
| Proposals sent and won | Record | Review | Review | Review |
| Average build value | Record | Review | Review | Target $3,850+ |
| Care-plan attachment rate | Record | Review | Review | Target 50%+ of new builds |
| Manual care time per managed site | Record | Review | Review | Under 10 min/month average |

Rank tracking should report movement, not promise a position or fixed deadline.

## Research sources

Accessed 28 July 2026:

- Brisbane City Council, councillors and wards (including Paddington Ward): <https://www.brisbane.qld.gov.au/about-council/governance-and-strategy/councillors-and-wards>
- Brisbane Inner West Chamber of Commerce: <https://www.biwcc.com.au/>
- Brisbane City Council business services and networks: <https://www.brisbane.qld.gov.au/business/business-support/business-services>
- ABS 2021 Red Hill QuickStats: <https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL32400>
- ABS 2021 Paddington QuickStats: <https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL32250>
- ABS 2021 Milton QuickStats: <https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL31847>
- Google Business Profile service-area guidance: <https://support.google.com/business/answer/9157481?hl=en>
- Google Business Profile representation guidelines: <https://support.google.com/business/answer/3038177?hl=en>
- Google guidance on moving profiles/reviews: <https://support.google.com/business/answer/3098204?hl=en>
- Google Search spam policies/doorway abuse: <https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse>
- Google LocalBusiness structured data: <https://developers.google.com/search/docs/appearance/structured-data/local-business>
- OceanSky Digital public pricing and inner-west positioning: <https://oceanskydigital.com/>
- Brisbane Website Design Red Hill public pricing: <https://brisbanewebsitedesign.com.au/web-design-red-hill/>
- Cheap Websites Brisbane public pricing: <https://cheapwebsitesbrisbane.au/pricing/>
- EliteDev public care-plan pricing: <https://elitedev.com.au/pricing/>
- Chillybin 2026 Brisbane website-maintenance cost guide: <https://www.chillybin.co/website-maintenance-support-costs-brisbane/>

### Research limitation

This plan did not use a paid keyword-volume/rank database. Suburb and keyword priority is based on geographic credibility, official area definitions, Census signals, current search-result competition, visible competitor positioning and the existing Anchor Web Co stack. Validate exact search demand in Search Console and Keyword Planner before scaling location pages.
