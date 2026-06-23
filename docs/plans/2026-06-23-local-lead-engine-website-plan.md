# Local Lead Engine Website Change Plan

Date: 2026-06-23

## Goal

Move Anchor Web Co from selling separate website, SEO, care plan, forms, CMS, and analytics services into one clearer commercial offer: a local-business lead engine.

The website should still feel boutique and practical, but the main promise should become:

> We build and manage local websites that bring in measurable enquiries.

This matches the infrastructure already built in the repo:

- Static AWS-hosted websites.
- Reusable serverless contact form backend.
- Reusable custom CMS.
- Cookieless multi-tenant analytics and monthly reports.
- Website health check and audit funnel.
- Client portfolio proof from Maryborough Mowerman, Mower Man QLD, Royal Hotel Gympie, Coastwide Exterior Cleaning, and Bannister Communications.

## Current Website Gap

The current public site says "Local websites, built to work" and lists web design, SEO, care plans, audits, and blog content as separate services. That is clear, but it undersells the strongest advantage Anchor Web Co now has: an owned system that can build, host, track, report, and improve client websites without relying on third-party lead tooling.

The current site has:

- A good portfolio section.
- Clear local SEO pages.
- A care plan page.
- A free website audit page.
- A health-check page.
- Working contact forms.
- CMS and analytics infrastructure behind the scenes.

The current site does not yet explain:

- That every client site can include enquiry tracking.
- That phone, email, WhatsApp, and form leads can be measured.
- That monthly reporting can show where leads came from.
- That ongoing support is a growth system, not just hosting.
- That the audit is the first step into a practical improvement plan.

## Proposed Offer Structure

### 1. Local Lead Engine

Primary packaged offer for new clients.

Positioning:

> A fast local website, conversion-focused pages, lead tracking, and monthly improvement support in one package.

Included:

- Custom static website.
- Local SEO page structure.
- Contact form routing through Anchor Web Co's serverless form backend.
- Click-to-call, email, and form conversion tracking.
- Cookieless analytics.
- Monthly lead report.
- Optional blog/CMS for businesses that need ongoing articles.
- Optional care plan for monthly updates.

Best buyers:

- Tradies.
- Local services.
- Accommodation and tourism operators.
- Security, cleaning, mowing, property services, and similar lead-based businesses.

Expected return:

- Higher average project value because analytics, reporting, and care can be bundled.
- Higher recurring revenue because the system naturally leads into monthly reporting and improvement.
- Better close rate because the offer is outcome-based, not "just a website".

### 2. Website Audit To Lead Engine

Primary inbound acquisition funnel.

Positioning:

> Get a fast health check, then a practical audit, then a clear plan to turn the website into a lead engine.

Stages:

1. Visitor runs the instant health check.
2. Anchor Web Co receives the lead, URL, score, and top issues.
3. Visitor gets a clear report by email.
4. Good-fit leads are invited into a short audit call.
5. The call sells either a fix package, a rebuild, SEO support, or a Local Lead Engine build.

Expected return:

- More qualified conversations.
- Stronger trust before the sales call.
- Better discovery because the prospect's website issues are known before speaking.
- Reusable system that can also be offered to future clients as a lead magnet.

## Website Architecture Changes

### Navigation

Change the Services dropdown to make the system clearer:

- Local Lead Engine
- Web Design
- Local SEO
- Website Care Plans
- Free Website Audit
- Website Health Check

Keep local landing pages for SEO, but make the product hierarchy clearer.

### Homepage

Change the hero from general web design to a measurable lead-generation promise.

Recommended hero:

Headline:

> Local websites that bring in measurable enquiries.

Supporting copy:

> Anchor Web Co builds fast static websites, local SEO pages, contact forms, and reporting for Fraser Coast businesses that want more calls, quote requests, and booked jobs.

Primary CTA:

> Start a Lead Engine project

Secondary CTA:

> Run a free health check

Add three proof points below the hero:

- Built for local search.
- Tracks calls, forms, and email clicks.
- Monthly reports without cookies or bloated plugins.

### Homepage Sections

Add or revise these sections:

1. Lead Engine Overview
   - Explain the five parts: site, SEO, forms, tracking, monthly improvement.

2. What Gets Measured
   - Calls.
   - Contact forms.
   - Email clicks.
   - WhatsApp clicks where used.
   - Page paths that create enquiries.
   - Mobile vs desktop conversion.

3. Portfolio as Proof
   - Keep the current work carousel/cards.
   - Add "what the system was built to do" for each client.
   - Avoid claiming results unless actual data exists.

4. Packages
   - Starter Site.
   - Local Lead Engine.
   - Managed Growth.

5. Audit Entry Point
   - Promote the health check as the first step.
   - Link to `/health-check.html` and `/free-website-audit-hervey-bay.html`.

### New Page: `local-lead-engine.html`

Purpose:

Main product page for the offer.

Sections:

1. Hero
   - "A complete lead-generation website system for local service businesses."

2. What Is Included
   - Static website.
   - Local SEO structure.
   - Lead forms.
   - Phone/email conversion tracking.
   - Monthly reporting.
   - Optional CMS/blog.
   - Ongoing support.

3. Why It Is Different
   - No WordPress plugin stack.
   - AWS-hosted where suitable.
   - Fast, low-maintenance static sites.
   - Owned forms instead of Formspree.
   - Owned analytics instead of relying only on GA.

4. Who It Fits
   - Tradies.
   - Local services.
   - Accommodation.
   - Professional services.

5. Example Setup
   - A mock "mowing business" or "cleaning business" path:
     - Home page.
     - Services pages.
     - Location pages.
     - Gallery.
     - Contact form.
     - Monthly report.

6. Pricing Direction
   - Do not overcomplicate public pricing yet.
   - Show "from" pricing or "fixed quote after audit".
   - Use clear package names.

7. CTA
   - "Run a health check first."
   - "Start a project."

### Website Care Plans Page

Reframe from maintenance to growth support.

Current issue:

The page currently sells hosting and managed support. That is useful, but the higher-value service is monthly improvement and reporting.

Recommended restructure:

- Rename or add section: "Ongoing Website Growth Plans".
- Keep a basic hosting-only option.
- Add a lead-focused plan:
  - Monthly health check.
  - Analytics review.
  - Enquiry tracking report.
  - Minor content updates.
  - SEO page improvements.
  - Form and CTA review.
- Add a premium plan later:
  - Blog/CMS support.
  - Monthly landing page or article.
  - Local SEO task list.

### Free Audit Page

Current issue:

The page promises a manual 48-hour audit. That is still valuable, but the instant health-check tool now exists and should feed this page.

Recommended changes:

- Add an instant health-check CTA near the top.
- Explain the two-step audit:
  1. Instant automated health check.
  2. Manual review for businesses that need deeper help.
- Add a field or hidden source to identify leads that came from the health-check page.
- Add examples of report outputs:
  - Slow mobile performance.
  - Missing local SEO signals.
  - Weak conversion path.
  - No lead tracking.

### Contact Page

Add fields that help qualify Local Lead Engine opportunities:

- Package interest:
  - Website rebuild.
  - Local SEO.
  - Lead Engine.
  - Care plan.
  - Not sure.
- Current website URL.
- Main service area.
- Monthly lead target or "what would make the website worthwhile?"

Keep the form simple. Do not ask too much before a first conversation.

### Blog

Use blog content to support the offer:

- "What is a local lead engine website?"
- "Why your local website gets traffic but no enquiries"
- "How to track phone calls and quote requests without cookies"
- "Why static websites are a good fit for small business SEO"
- "Website care plans vs website growth plans"

## SEO Changes

Target new commercial keywords:

- lead generation website Fraser Coast
- local business website lead generation
- trade business website design
- website audit Hervey Bay
- website health check Maryborough
- local SEO and website design package

Add internal links:

- Homepage to Local Lead Engine page.
- Health Check to Audit page.
- Audit page to Contact page.
- Local SEO pages to Local Lead Engine.
- Care Plans page to Local Lead Engine.

Add schema:

- `Service` schema for Local Lead Engine.
- `FAQPage` schema on Local Lead Engine, Care Plans, and Health Check.
- `BreadcrumbList` schema for service pages.

## Tracking Changes

Add analytics events for the audit funnel:

- `health-check-start`
- `health-check-submit`
- `health-check-success`
- `health-check-error`
- `audit-call-click`
- `lead-engine-cta`

These should use the existing open event model, but the backend allowed event list must be updated if it currently rejects unknown events.

## Implementation Sequence

1. Create `local-lead-engine.html`.
2. Update navigation across site templates/pages.
3. Update homepage hero and add Lead Engine overview section.
4. Update care plan page to position monthly reporting and improvement.
5. Update audit page to connect health check to manual audit.
6. Update contact page fields and hidden tracking.
7. Add analytics events for the health-check and lead-engine CTAs.
8. Add blog content supporting the new offer.
9. Run local static checks and browser checks.
10. Deploy after review.

## Acceptance Criteria

- A visitor can understand the Local Lead Engine offer within 10 seconds of landing on the homepage.
- The health check is visible as a natural first step.
- The audit funnel explains what happens after the automated report.
- Contact form captures enough context to qualify the lead.
- The care plan page supports recurring revenue instead of sounding like simple hosting.
- All new CTAs are tracked.
- All new pages are linked in the navigation and footer.
- No claims are made that depend on client results unless backed by actual data.

