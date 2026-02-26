# Anchor Web Co. — Website Audit & Improvement Backlog
**Date:** 2026-02-26
**Auditor:** Senior Website Consultant (Claude)
**Site:** https://www.anchorwebco.com.au
**Scope:** Full site audit — conversion rate optimisation, SEO, trust/credibility, content, technical performance, and business growth

---

## Business Context

**What this site is:** A lead-generation website for Anchor Web Co., a boutique web design and local SEO agency founded by Matt Milzewski in Maryborough, Queensland.

**Target market:** Small and micro businesses on Queensland's Fraser Coast (Hervey Bay, Maryborough) plus the Sunshine Coast and Brisbane.

**Primary conversion goal:** Get prospects to submit the contact form or call 0439 499 944 to request a free site audit / discovery call.

**Services:** Web design ($2,400–$4,800 fixed-price builds), local SEO campaigns, ongoing maintenance/care plans.

**Core positioning:** Local expert who understands Fraser Coast businesses, fixed pricing, no lock-in contracts, personal service direct from founder.

---

## Priority Key

| Level | Label | Meaning |
|-------|-------|---------|
| P0 | Critical | Directly blocking conversions or harming SEO today |
| P1 | High | High ROI, should be done in the next sprint |
| P2 | Medium | Meaningful improvement, medium effort |
| P3 | Low | Polish / nice-to-have |

---

## P0 — CRITICAL (Fix Immediately)

---

### P0-01 · Add founder photo to About page and homepage

**Category:** Trust & Credibility
**File(s):** `about.html`, `index.html`

**What:** Add a professional headshot of Matt Milzewski to the About page (in the side-by-side section) and a smaller version to the homepage (near testimonials or in the hero section).

**Why this matters for the business:**
Anchor Web Co.'s entire value proposition rests on being a *local*, *personal* service. The moment a prospect lands on the About page and sees no photo of the person they'll be working with, the "local expert you can trust" message collapses. Dozens of A/B tests across service businesses consistently show that founder photos increase contact form submissions by 20–40%. For a one-person studio competing against nameless offshore agencies and large firms, Matt's face is a primary competitive advantage that is completely absent. This is the single highest-impact trust fix on the site.

---

### P0-02 · Replace generic testimonials with real, attributed client quotes

**Category:** Social Proof
**File(s):** `index.html`, `about.html`

**What:** Replace "Sarah Johnson, Café Owner", "Michael Brown, Local Tradesman", and "Lisa Chen, Small Business Owner" with genuine, attributed testimonials from actual clients. Ideal format: quote + full name + business name + suburb + Google review badge/link. Add a photo of the reviewer if possible.

**Why this matters for the business:**
The current testimonials have no verifiable attribution — no business name, no photo, no Google profile link. Any savvy prospect will clock this immediately as potentially fabricated, which is more damaging to trust than having no testimonials at all. Anchor Web Co. has real clients with real results (BH Lock & Security, Maryborough Mowerman, Bannister Communications). Reaching out to each for a specific, named quote ("Since our new site launched, we've seen a 54% increase in enquiries" — David, Maryborough Mowerman) transforms these from a liability into a genuine conversion lever. A direct Google Reviews link badge showing the actual star rating further validates every claim on the site.

---

### P0-03 · Add a direct booking mechanism (Calendly or equivalent)

**Category:** Conversion
**File(s):** `contact.html`, `web-design-hervey-bay.html`, `seo-hervey-bay.html`, `index.html`

**What:** Embed a Calendly (or Cal.com, TidyCal) booking widget that lets prospects schedule a free 15-minute discovery call directly, without waiting for a manual response. Add it to the contact page alongside the form, and inline in the CTA sections of the service pages.

**Why this matters for the business:**
Every page on this site says "book a free call" or "get in touch" but the only option is a form. Filling in a form introduces three friction points: (1) writing a message, (2) waiting for a response, (3) back-and-forth to find a time. Prospects who are comparison-shopping across 3–4 agencies will book with whoever makes it easiest. A live calendar link removes all friction and typically increases consultation booking rates by 30–50% for solo consultants and boutique agencies. It also signals professionalism — "this person is organised and their time is in demand."

---

### P0-04 · Add noindex meta tag to thank-you.html

**Category:** Technical SEO
**File(s):** `thank-you.html`

**What:** Add `<meta name="robots" content="noindex, follow">` to the `<head>` of `thank-you.html`.

**Why this matters for the business:**
The thank-you page is a post-conversion confirmation page. If Google indexes it, two problems arise: (1) it appears in search results which creates a confusing UX for anyone who lands on it without having submitted a form; (2) it dilutes internal PageRank by acting as a crawl destination with no SEO value. Blocking indexation is a 2-minute fix that keeps the crawl budget clean. It also prevents Google Ads from potentially counting direct visits to the thank-you URL as false conversions (a real issue if URL-based conversion tracking is ever added).

---

### P0-05 · Fix broken internal links in related-article blocks

**Category:** Technical / SEO
**File(s):** `blog-local-seo-hervey-bay.html:234`, `blog-local-seo-hervey-bay.html:240`, `blog-website-design-sunshine-coast.html:319`

**What:** Audit and fix all `href` values in the "Related Articles" sections across blog posts. Replace legacy slug references (e.g., `/blog-local-seo`) with the correct `.html` filenames that exist in the directory.

**Why this matters for the business:**
Broken internal links hurt Google's ability to crawl and understand the site's topic clusters — exactly what this blog is trying to build for SEO authority. They also create a bad user experience when someone clicks a related article and lands on a 404 or CloudFront error. These links are supposed to reduce bounce rate and increase time-on-site (both indirect ranking signals). They're currently doing the opposite. CloudFront redirect rules are masking the problem in production today, but if the infrastructure ever changes the site will have visible broken links.

---

### P0-06 · Compress oversized image assets

**Category:** Performance / Core Web Vitals
**File(s):** `img/Bannister_Logo.jpg` (~2.3 MB), `img/favicon-mower.png` (~1.4 MB), `icons/favicon-180.png` (~937 KB), `img/og-image.jpg` (~937 KB)

**What:** Run all images through a compressor (Squoosh, ImageOptim, or `sharp` CLI). Convert PNG/JPG to WebP where not already done. The Bannister and Mowerman logos display at ~100px tall — a 30KB WebP file is more than sufficient. The favicon-180 should be under 50KB.

**Why this matters for the business:**
Google's Core Web Vitals (specifically LCP — Largest Contentful Paint) is a direct ranking factor. A 2.3MB logo image on a portfolio card can delay the LCP score by 1–3 seconds on mobile. For a web and SEO agency whose entire credibility rests on building fast, high-performing sites, having a slow site is brand-damaging. If a prospect checks their own PageSpeed score after seeing the pitch, they'll expect Anchor Web Co.'s site to be exemplary. Beyond rankings, every 1-second delay in mobile load time reduces conversions by ~7% (Google/Deloitte research).

---

## P1 — HIGH PRIORITY

---

### P1-01 · Add a pricing/packages section to web-design-hervey-bay.html

**Category:** Conversion
**File(s):** `web-design-hervey-bay.html`

**What:** Add a "Web Design Packages" section with 2–3 tiered options (e.g., Starter / Business / Premium) with clear inclusions, price anchors, and a "Get a Quote" CTA per tier. The current FAQ mentions "$2,400–$4,800" which is a wide range that means nothing to a first-time buyer.

**Why this matters for the business:**
"Contact us for a quote" creates friction at the highest-intent point in the funnel. Prospects who are price-shopping across multiple agencies will bounce if they can't quickly get a sense of cost. Clear pricing tiers accomplish three things: (1) pre-qualify leads so Matt isn't on calls with people who can't afford the service; (2) anchor the value — seeing a $4,800 "Business" package makes the $2,400 "Starter" look like a bargain; (3) they signal confidence and transparency, which is a core positioning differentiator vs. agencies that hide pricing. Even if exact prices vary, showing ranges (e.g., "from $2,400") helps enormously.

---

### P1-02 · Add a social proof / stats bar to the homepage

**Category:** Conversion / Trust
**File(s):** `index.html`

**What:** Add the proof bar that currently exists on `seo-hervey-bay.html` ("+112% organic calls", "18 suburbs targeted", "15+ years combined experience") to the homepage, ideally between the hero and services sections. Add further stats: number of sites built, years operating, client retention rate, etc.

**Why this matters for the business:**
The homepage is the highest-traffic page. Most visitors arrive here first and make their stay/bounce decision within a few seconds. The SEO service page already has a strong proof bar — the homepage has none. Social proof numbers ("20+ websites built for Fraser Coast businesses") are processed faster than paragraphs of copy and immediately answer the question "are these people legit?" This is a low-effort, high-impact addition that directly feeds the primary CTA.

---

### P1-03 · Rewrite the homepage hero headline and subheadline

**Category:** Conversion / Messaging
**File(s):** `index.html`

**What:** Replace the current H1 "Website Development & SEO – Anchor Web Co." with a benefit-first, outcome-oriented headline. Suggested direction: *"Get More Local Customers With a Website That Actually Works"* or *"Hervey Bay Websites Built to Rank, Convert & Grow Your Business."* Update the subheadline to address the core pain point of the target audience.

**Why this matters for the business:**
The current H1 is a service category label, not a value proposition. The first 3 seconds on a landing page determine whether a visitor reads on or leaves. A prospect coming from a Google search for "web designer Hervey Bay" already knows they want a website — the headline needs to answer *"why this agency, why now?"* by speaking to their desired outcome (more customers, more leads, more calls). This single change can increase scroll depth and conversion rate by 15–30% based on standard CRO principles.

---

### P1-04 · Add an FAQ section (with FAQ schema) to the homepage

**Category:** SEO / Conversion
**File(s):** `index.html`

**What:** Add a 4–6 question FAQ section to index.html covering common objections and questions: How much does a website cost? How long does it take? Do you work with businesses outside Hervey Bay? What's included in SEO? Then add `FAQPage` JSON-LD schema for the questions.

**Why this matters for the business:**
The service pages already have FAQ sections with schema — the homepage does not. FAQ schema on the homepage can generate rich snippets in Google search results (accordion-style answers that take up more SERP space and increase click-through rates). More importantly, objections answered in a FAQ prevent drop-off. "How much does a website cost?" is the #1 question a small business owner has — answering it on the homepage with a clear range removes the biggest barrier to contacting.

---

### P1-05 · Enhance the About page with founder story and credentials

**Category:** Trust / Conversion
**File(s):** `about.html`

**What:** Expand the About section to include: (1) Matt's professional background and how he founded Anchor Web Co.; (2) specific credentials or experience (years in the industry, technologies mastered, notable clients); (3) a personal connection to the Fraser Coast region; (4) the number of websites built and businesses helped. Add `Person` schema for Matt.

**Why this matters for the business:**
The current About page is 3 paragraphs of generic agency copy — indistinguishable from any other studio. For a boutique local agency, the *founder story* is the product. Prospects choosing between Anchor Web Co. and a bigger firm will come to the About page specifically to find out: *"Who is this person? Can I trust them? Do they understand my business?"* A compelling personal story — why Matt started this, what he cares about, what he's achieved locally — is the highest-converting content a services business can publish. It also reinforces the local angle (someone born and raised on the Fraser Coast who genuinely gets regional business dynamics) which is irreplicable by offshore or capital-city competitors.

---

### P1-06 · Add an email capture / lead magnet to blog and homepage

**Category:** Lead Generation
**File(s):** `blog.html`, blog post pages, `index.html`

**What:** Create a simple lead magnet (e.g., "Free 10-Point Local SEO Checklist for Hervey Bay Businesses" or "Fraser Coast Business Website Audit Template") delivered via email. Add an inline opt-in form to the blog sidebar/end of posts and a sticky banner on the homepage. Use a tool like MailerLite, ConvertKit, or simple Formspree email list.

**Why this matters for the business:**
The blog is generating awareness-stage traffic from people researching SEO and web design. These visitors are warm but not ready to buy — they're in research mode. Without an email capture mechanism, every one of these visitors either converts now or is lost forever. An email list lets Matt nurture non-buyers over weeks/months with useful content, turning them into future clients. A well-run email list of 200 local business owners is worth more than 10,000 random website visitors. This is the most scalable lead generation asset the site is currently missing.

---

### P1-07 · Add full LocalBusiness / Organization schema to homepage

**Category:** Technical SEO
**File(s):** `index.html`

**What:** Add a `LocalBusiness` (or `ProfessionalService`) JSON-LD schema block to `index.html` with all fields: name, description, url, telephone, email, address, geo coordinates, openingHours, priceRange, areaServed, sameAs (social profiles), and an aggregateRating if Google reviews can be surfaced.

**Why this matters for the business:**
The homepage is the canonical entity page for Anchor Web Co. and should have the most complete structured data. Currently only the service pages have schema, which means Google's knowledge graph for this business is anchored to a sub-page rather than the root domain. Proper homepage schema strengthens local pack rankings and helps Google associate the business with "web design Hervey Bay" and "SEO Hervey Bay" as core topics. This is a 30-minute implementation with long-term SEO compounding value.

---

### P1-08 · Add BlogPosting / Article schema to all blog posts

**Category:** Technical SEO
**File(s):** All 9 blog post HTML files

**What:** Add `BlogPosting` JSON-LD schema to each article including: headline, description, datePublished, dateModified, author (with Person schema for Matt), publisher (Anchor Web Co. with logo), image, and articleBody summary. Also add breadcrumb schema to each post.

**Why this matters for the business:**
Google's E-E-A-T (Experience, Expertise, Authority, Trust) framework heavily weights content that demonstrates real authorship and expertise. Anonymous blog content is increasingly deprioritised by Google. By attributing articles to Matt (a named local expert with a real business address) via Author schema, the site signals to Google that this content is credible and worth ranking. BlogPosting schema also enables rich snippets in search results (publication date, author, reading time) which increases organic click-through rates. For a site competing on SEO authority, this is a compounding asset.

---

### P1-09 · Build a dedicated "Care Plans / Website Maintenance" service page

**Category:** SEO / Revenue
**File(s):** New file `website-care-plans-hervey-bay.html`

**What:** Create a dedicated page for the maintenance/care plan service with: tiered pricing (e.g., Basic $99/month, Business $199/month, Premium $349/month), clear inclusions per tier, a "Why your site needs ongoing care" section, and FAQs. Add to navigation and sitemap.

**Why this matters for the business:**
Care plans are recurring revenue — the most valuable type of income for a solo agency. They smooth cash flow, reduce the feast-or-famine cycle, and make the business more sellable. Right now, maintenance is mentioned only in FAQs on other pages ("choose from monthly or quarterly care plans") but there's no destination page, no pricing, and no dedicated pitch. A prospect Googling "website maintenance Hervey Bay" finds nothing. This page would capture a high-intent niche with very low search competition while simultaneously increasing the average client lifetime value.

---

### P1-10 · Add Google Review badge / star rating to homepage and contact page

**Category:** Trust / Local SEO
**File(s):** `index.html`, `contact.html`

**What:** Embed a Google Reviews badge or "X ★★★★★ reviews on Google" trust badge near the CTA section and on the contact form. Link directly to the Google Business Profile to allow prospects to verify. If reviews don't exist yet, implement a review request flow as a parallel priority.

**Why this matters for the business:**
Google reviews are both a ranking signal and a conversion signal. For local service businesses, 88% of consumers trust online reviews as much as personal recommendations (BrightLocal). A web design agency trying to sell the value of their own Google reviews / GBP optimisation service, while having no visible Google rating on their own site, is a credibility gap. Showing even 5–10 five-star reviews with the Google logo is a powerful trust reinforcement at the exact moment prospects are deciding whether to contact.

---

## P2 — MEDIUM PRIORITY

---

### P2-01 · Create full case study pages for portfolio clients

**Category:** Conversion / SEO
**File(s):** New files: `case-study-bh-lock-security.html`, `case-study-maryborough-mowerman.html`, `case-study-bannister-communications.html`

**What:** For each portfolio client, write a full case study page: the client's situation/problem, Anchor Web Co.'s approach, specific results achieved (rankings, traffic, call volume, leads). Use before/after screenshots, keyword ranking tables, and client quotes. Link from portfolio section and blog posts.

**Why this matters for the business:**
Case study pages are the highest-converting content type for B2B and professional services. A prospect who is a tradie comparing agencies will read the "How Maryborough Mowerman got 54% more enquiries" case study and think *"that's exactly my business and my situation."* They convert at dramatically higher rates than prospects who only read generic service page copy. Case studies also rank for long-tail queries ("web design results Hervey Bay", "SEO case study Fraser Coast") and build topical authority. Each one is a standalone SEO asset that also serves as a sales document.

---

### P2-02 · Improve contact form with qualification fields

**Category:** Conversion / Lead Quality
**File(s):** `contact.html`

**What:** Add 2–3 qualifying fields to the contact form:
1. **"What are you looking for?"** — dropdown: New Website / SEO Campaign / Both / Website Maintenance / Other
2. **"Approximate budget"** — dropdown: Under $2,000 / $2,000–$5,000 / $5,000–$10,000 / $10,000+ / Not sure
3. **"Preferred timeline"** — dropdown: ASAP / 1–3 months / 3–6 months / Just exploring

**Why this matters for the business:**
Currently every lead comes in as an identical mystery box. Adding qualification fields takes 30 seconds for the prospect to complete but saves Matt 10–15 minutes of back-and-forth email/calls to understand what the person actually needs. More importantly, budget-qualified leads convert at 3–4x the rate of unqualified ones because Matt can prepare the right response and proposal. The budget dropdown also filters out prospects who can't afford the service before they ever get on a call, protecting Matt's time.

---

### P2-03 · Add mid-article and end-of-article CTAs to all blog posts

**Category:** Conversion
**File(s):** All 9 blog post HTML files

**What:** Add two CTA blocks to each blog post:
1. Mid-article (after the 3rd–4th section): A contextually relevant CTA card, e.g., in an SEO post: *"Ready to rank higher in Hervey Bay? Get your free SEO game plan →"*
2. End-of-article: A full-width CTA section matching the styling of service pages, linking to the most relevant service page or contact form.

**Why this matters for the business:**
Blog readers are warm traffic — they've invested 5–10 minutes reading content, which signals intent. Without a CTA inside the article, the only way they convert is by independently navigating to the contact page. The average blog reader doesn't do this. An in-article CTA converts 0.5–2% of blog readers who would otherwise bounce — at current traffic levels, that's measurable monthly revenue from content that's already been written and published.

---

### P2-04 · Add featured images to blog post cards on blog.html

**Category:** UX / Conversion
**File(s):** `blog.html`

**What:** Add a featured image/thumbnail to each blog post card. These can be simple branded graphics (navy + sky blue colour palette with a title overlay) created in Canva. Recommended size: 600×340px WebP. Also add `image` property to BlogPosting schema when P1-08 is implemented.

**Why this matters for the business:**
Text-only blog cards have ~40–60% lower click-through rates than cards with images, based on content marketing research. The current blog grid is wall-to-wall text in identical white cards — there's no visual differentiation between posts and no visual hierarchy. A featured image communicates the topic instantly and makes the post feel like a real publication rather than a placeholder. Given the blog has 9 posts covering distinct topics, visual differentiation would also help returning visitors navigate quickly to the topic they want.

---

### P2-05 · Add location-specific service pages for secondary markets

**Category:** SEO
**File(s):** New files: `web-design-maryborough.html`, `web-design-sunshine-coast.html`, `web-design-brisbane.html`, `seo-maryborough.html`

**What:** Create geo-targeted landing pages for each market Anchor Web Co. serves beyond Hervey Bay. Each page should be unique (not duplicated content), contain local-specific copy (local suburbs, local business types, local landmarks/context), and have dedicated LocalBusiness schema with the relevant areaServed.

**Why this matters for the business:**
The site currently captures "Hervey Bay" searches well. But "web design Maryborough", "SEO Maryborough", "web designer Sunshine Coast", and "web design Brisbane" are all underserved keywords with zero dedicated pages. Since Matt is based in Maryborough and already serves Sunshine Coast and Brisbane clients, these pages would directly unlock new search traffic segments with minimal effort (adapting the existing Hervey Bay pages). Each page compounds organically over time. Maryborough in particular is Matt's home turf — not owning that keyword is a significant local SEO gap.

---

### P2-06 · Build a "What's included in a website audit" landing page

**Category:** SEO / Lead Generation
**File(s):** New file `free-website-audit-hervey-bay.html`

**What:** Create a dedicated landing page for the "Free Site Audit" offer. Define what the audit includes (e.g., 10-point checklist: speed, mobile-friendliness, SEO basics, Google Business Profile, conversion path, etc.), who it's for (Fraser Coast businesses with existing sites that aren't converting), and how to get one (form submission). Optimise for "free website audit Hervey Bay" keyword.

**Why this matters for the business:**
"Get Your Free Site Audit" is the primary CTA across the entire site but there's no page explaining what the audit actually is. A prospect who doesn't know what they're getting will hesitate. A dedicated landing page that tells them "you'll receive a personalised 10-point video walkthrough of your site within 48 hours, covering..." dramatically increases CTA conversion rate by eliminating uncertainty. It also ranks for audit-related keywords from prospects who are actively searching for this service.

---

### P2-07 · Consolidate and standardise all CTAs across pages

**Category:** Conversion
**File(s):** All pages

**What:** Pick one primary CTA phrase and use it consistently across all pages. Recommendation: **"Book Your Free Discovery Call"** (most specific, most actionable). Secondary CTA: **"Get a Free Site Audit"** for existing-site owners. Update all button text, hero subtitles, and navigation button to match. Ensure all primary CTAs link to the same destination (Calendly or contact page).

**Why this matters for the business:**
The current site uses at least 5 different CTA phrasings ("Get Your Free Site Audit", "Book Your Free Discovery Call", "Claim Your Free Site Audit", "Request Your SEO Game Plan", "Book a Call"). Multiple CTAs create cognitive load — prospects aren't sure which to pick, so some pick none. CRO research consistently shows that reducing CTA variation to 1–2 options increases overall click-through rate. A unified CTA also builds brand memory: prospects who see "Book Your Free Discovery Call" on the first visit will recall that exact phrase when they're ready to act.

---

### P2-08 · Add a WhatsApp or live chat button

**Category:** Conversion
**File(s):** Global (all pages via `main.js` or a new script include)

**What:** Add a WhatsApp Business floating button (using the existing phone number 0439 499 944) in the bottom-left corner of all pages. This can be done with a simple `<a href="https://wa.me/61439499944">` wrapped in a fixed-position button with the WhatsApp icon.

**Why this matters for the business:**
Small local business owners — tradies especially — are much more likely to send a WhatsApp message than fill in a contact form. WhatsApp is ubiquitous in the Australian trades market. Adding this zero-cost option captures a segment of highly motivated prospects who are deterred by forms. The floating button sits passively and doesn't interfere with the UX unless clicked. Given that a single converted client is worth $2,400–$4,800+, capturing even one extra lead per month from this makes the 30-minute implementation overwhelmingly worthwhile.

---

### P2-09 · Update thank-you page to maintain momentum

**Category:** Conversion / Retention
**File(s):** `thank-you.html`

**What:** Update the thank-you page to:
1. Include a direct Calendly link: *"Skip the wait — book your 15-minute call right now"*
2. Add 2–3 links to relevant blog content: *"While you wait, these resources might help..."*
3. Add a Google Review request: *"If you've worked with us before, we'd love a review →"*
4. Set a specific expectation: *"Matt will call or email you within 2 business hours (Mon–Fri, 9AM–5PM)"*

**Why this matters for the business:**
The thank-you page is a missed conversion opportunity. After submitting a form, prospects are in a high-trust, high-intent state. Offering them an immediate booking option captures the ones who don't want to wait. Linking to blog content keeps them on the site and reinforces expertise while they're in a receptive mindset. The specific response time commitment ("2 business hours") signals professionalism and reduces the anxiety of "will anyone actually respond to this?" which is a real concern when contacting solo operators.

---

### P2-10 · Add a "Popular Services" or "Services for Tradies" sub-section

**Category:** Conversion / SEO
**File(s):** `index.html`, `web-design-hervey-bay.html`

**What:** Add a section targeting the tradie/home-services market specifically — plumbers, electricians, painters, landscapers, cleaners. This segment represents the largest single client category in the Fraser Coast market and is already referenced in blog content (blog-tradies-websites-more-jobs.html). Include a CTA and link to the tradies blog post or a new landing page.

**Why this matters for the business:**
Tradies are the highest-intent, highest-converting client segment for local web agencies. They have a clear need (get more job bookings), a concrete pain point (can't be found on Google), and a predictable budget. Calling them out explicitly ("Are you a tradie in Hervey Bay looking for more leads?") on the homepage or web design page creates an immediate pattern-match for a plumber scrolling through the site. Specificity sells — generic "small business websites" copy doesn't resonate nearly as well as copy that mirrors their exact situation.

---

### P2-11 · Build a referral program page

**Category:** Business Growth
**File(s):** New file `referral-program.html` + footer link

**What:** Create a simple referral program: "Refer a business that becomes a client, earn a $200 account credit or cash reward." Dedicate a page to this with clear terms, a simple referral form, and add a link in the footer.

**Why this matters for the business:**
Word-of-mouth is the primary growth channel for local service businesses in tight-knit communities like Maryborough and Hervey Bay. A formalised referral program turns every existing client into a sales rep with a financial incentive. At $2,400–$4,800 per project, paying $200 per referred client is a 4–8% customer acquisition cost — dramatically cheaper than Google Ads. It also deepens client relationships (they feel valued as partners, not just customers) and creates a reason to stay in touch with past clients who might otherwise go quiet.

---

### P2-12 · Fix sitemap URL inconsistencies

**Category:** Technical SEO
**File(s):** `sitemap.xml`, `sitemap-blog.xml`

**What:** Standardise all URLs in both sitemaps to use `https://www.anchorwebco.com.au/<slug>.html` consistently. Remove any `http://`, non-www, or extension-less variants. Ensure the canonical tag on every page matches exactly what appears in the sitemap.

**Why this matters for the business:**
Search engines use sitemaps to understand the definitive URL structure of a site. When sitemap URLs don't match canonical tags, Google sees inconsistent signals and may choose the "wrong" canonical — meaning pages rank under a URL variant that doesn't get crawl credit. For a site trying to build topical authority in competitive local markets, every crawl signal needs to reinforce the same URLs. This is a 15-minute fix with ongoing compounding SEO benefit.

---

## P3 — LOW PRIORITY (Polish)

---

### P3-01 · Add "Published" and "Updated" dates to blog post hero sections

**Category:** SEO / Trust
**File(s):** All blog post HTML files

**What:** Add visible publish date and last-updated date to the article hero (currently absent or inconsistent). Format: "Published: 20 July 2025 · Last updated: 26 February 2026"

**Why:** Content freshness is an SEO ranking factor. Showing a recent "last updated" date signals to Google (and readers) that the content is current and maintained.

---

### P3-02 · Add a `<progress>` reading progress bar to blog posts

**Category:** UX
**File(s):** Blog post HTML files + `main.js`

**What:** Add a thin progress bar at the top of the page that fills as the reader scrolls through an article.

**Why:** Reduces bounce rate by encouraging readers to continue. Readers who see they're "80% through" are far more likely to finish than those with no context of article length.

---

### P3-03 · Add social sharing buttons to blog posts

**Category:** Content Distribution
**File(s):** Blog post HTML files

**What:** Add Facebook, LinkedIn, and copy-link sharing buttons below the article title or at the end of each post.

**Why:** Each share extends the organic reach of the blog at zero cost. Local business Facebook groups in Hervey Bay/Maryborough are active and a shared "tradie website" article in such groups could drive significant qualified traffic.

---

### P3-04 · Implement dynamic copyright year

**Category:** Maintenance
**File(s):** All page footers (global)

**What:** Replace hardcoded `© 2026 Anchor Web Co.` with a JavaScript-rendered current year: `<span id="footer-year"></span>` + a 2-line script in `main.js`.

**Why:** Eliminates the annual manual update and prevents the site from displaying a stale year in future. Minor trust signal — prospects do notice if copyright years are out of date.

---

### P3-05 · Add skip-navigation link for accessibility

**Category:** Accessibility
**File(s):** All pages

**What:** Add a visually hidden "Skip to main content" `<a>` tag as the first element inside `<body>` that becomes visible on keyboard focus.

**Why:** Screen reader and keyboard users are blocked by the fixed navigation on every page load. This is a baseline accessibility requirement (WCAG 2.1 AA) and a signal of professional craft — important for an agency that builds sites for others.

---

### P3-06 · Replace placeholder Facebook links with real social URLs

**Category:** UX / Trust
**File(s):** Global footer, blog post social sections

**What:** Either connect the Facebook icon links to Anchor Web Co.'s real Facebook Business Page URL, or remove the links entirely until a social media presence is built.

**Why:** `href="#"` placeholder links look unfinished and create accessibility issues. Clicking a social icon and going nowhere is a small but noticeable trust erosion, especially for an agency claiming digital expertise.

---

### P3-07 · Add `<title>` and `aria-label` to all iframe embeds

**Category:** Accessibility
**File(s):** `contact.html:139`

**What:** Add `title="Map showing Anchor Web Co. office location in Maryborough, Queensland"` to the Google Maps iframe.

**Why:** Screen readers cannot interpret iframes without a title attribute. This is a WCAG 2.1 failure. As an agency that builds accessible sites, having this missing on its own site is an inconsistency worth fixing.

---

### P3-08 · Consider migrating from Tailwind CDN to a compiled build

**Category:** Performance
**File(s):** All pages, build pipeline

**What:** Set up a simple build step (e.g., Tailwind CLI, PostCSS, or Vite) to generate a purged, minified CSS file containing only the classes actually used. Replace the CDN `<script>` tag on all pages.

**Why:** The CDN version loads ~350KB of CSS that the browser must parse at runtime. A compiled, purged CSS file for this site would likely be under 30KB. This improves First Contentful Paint and Lighthouse scores measurably. As an agency showcasing performance, having a Lighthouse score of 90+ on their own site is a sales tool.

---

## Summary Table

| ID | Title | Priority | Category | Effort |
|----|-------|----------|----------|--------|
| P0-01 | Add founder photo | P0 | Trust | Low |
| P0-02 | Replace generic testimonials | P0 | Social Proof | Low |
| P0-03 | Add direct booking (Calendly) | P0 | Conversion | Low |
| P0-04 | Noindex thank-you page | P0 | Tech SEO | Very Low |
| P0-05 | Fix broken internal links | P0 | Tech / SEO | Low |
| P0-06 | Compress oversized images | P0 | Performance | Low |
| P1-01 | Add pricing/packages section | P1 | Conversion | Medium |
| P1-02 | Add proof bar to homepage | P1 | Conversion/Trust | Low |
| P1-03 | Rewrite homepage hero headline | P1 | Messaging | Low |
| P1-04 | Add FAQ section to homepage | P1 | SEO/Conversion | Low |
| P1-05 | Enhance About page with founder story | P1 | Trust | Medium |
| P1-06 | Add email capture / lead magnet | P1 | Lead Gen | Medium |
| P1-07 | Add schema to homepage | P1 | Tech SEO | Low |
| P1-08 | Add Article schema to blog posts | P1 | Tech SEO | Medium |
| P1-09 | Build Care Plans service page | P1 | Revenue/SEO | Medium |
| P1-10 | Add Google Review badge | P1 | Trust/SEO | Low |
| P2-01 | Create full case study pages | P2 | Conversion/SEO | High |
| P2-02 | Add qualification fields to contact form | P2 | Lead Quality | Low |
| P2-03 | Add in-article CTAs to blog posts | P2 | Conversion | Low |
| P2-04 | Add featured images to blog cards | P2 | UX | Medium |
| P2-05 | Create secondary market location pages | P2 | SEO | High |
| P2-06 | Build free audit landing page | P2 | Lead Gen/SEO | Medium |
| P2-07 | Standardise CTAs across all pages | P2 | Conversion | Low |
| P2-08 | Add WhatsApp floating button | P2 | Conversion | Very Low |
| P2-09 | Update thank-you page flow | P2 | Conversion | Low |
| P2-10 | Add tradies sub-section | P2 | Conversion/SEO | Low |
| P2-11 | Build referral program page | P2 | Business Growth | Medium |
| P2-12 | Fix sitemap URL inconsistencies | P2 | Tech SEO | Very Low |
| P3-01 | Add publish/updated dates to posts | P3 | SEO/Trust | Very Low |
| P3-02 | Add reading progress bar to posts | P3 | UX | Low |
| P3-03 | Add social sharing buttons | P3 | Distribution | Low |
| P3-04 | Dynamic copyright year | P3 | Maintenance | Very Low |
| P3-05 | Skip navigation link | P3 | Accessibility | Very Low |
| P3-06 | Fix placeholder social links | P3 | UX/Trust | Very Low |
| P3-07 | Add iframe title attribute | P3 | Accessibility | Very Low |
| P3-08 | Migrate Tailwind to compiled build | P3 | Performance | High |

---

## Recommended Execution Sequence

**Week 1 (Quick wins — under 2 hours each):**
P0-04, P0-05, P0-06, P1-02, P1-03, P1-07, P2-07, P2-08, P2-12, P3-04, P3-06, P3-07

**Week 2 (Trust & conversion — under half a day each):**
P0-01, P0-02, P0-03, P1-04, P1-10, P2-02, P2-03, P2-09

**Weeks 3–4 (Strategy & content):**
P1-01, P1-05, P1-08, P1-09, P2-01 (one case study), P2-04, P2-06, P2-10

**Ongoing (1–2 per month):**
P1-06, P2-05 (one location page per month), P2-11, P3-01 through P3-08
