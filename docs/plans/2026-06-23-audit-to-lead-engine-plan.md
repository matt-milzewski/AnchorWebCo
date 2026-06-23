# Audit To Lead Engine Plan

Date: 2026-06-23

## Goal

Turn the website health check and free audit into a repeatable lead acquisition system for Anchor Web Co.

The audit should not be a loose freebie. It should be a structured path that:

1. Diagnoses the prospect's website.
2. Captures contact details and consent.
3. Sends a useful report.
4. Alerts Anchor Web Co with the commercial context.
5. Helps decide which offer to sell next.
6. Feeds qualified businesses into the Local Lead Engine, SEO, rebuild, or care-plan offers.

## Funnel Overview

### Stage 1: Traffic

Traffic sources:

- Organic search for website audit and health-check terms.
- Local SEO blog posts.
- LinkedIn and Facebook posts.
- Direct outreach to local businesses.
- Existing client referrals.
- Footer links from client websites.

Primary landing pages:

- `/health-check.html`
- `/free-website-audit-hervey-bay.html`
- Future `/local-lead-engine.html`

### Stage 2: Instant Health Check

The visitor enters:

- Website URL.
- Email.
- Consent to receive the report.

The tool should:

- Validate and normalise the URL.
- Run PageSpeed Insights mobile and desktop.
- Run extra technical checks.
- Score performance, SEO, best practices, and accessibility.
- Generate top fixes.
- Save the run.
- Email the report.
- Send Anchor Web Co an internal lead notification.

### Stage 3: Lead Scoring

Each health-check run should produce a simple internal lead score.

Suggested score components:

- Website score below 70: +2.
- Mobile performance below 50: +2.
- SEO score below 80: +1.
- Missing title or meta description: +1.
- No HTTPS redirect or certificate issue: +2.
- No clear conversion path detected: +2 once this check is added.
- Business email domain matches website domain: +1.
- Free email address used: -1.

Lead buckets:

- Hot: 6 or higher.
- Warm: 3 to 5.
- Low: 0 to 2.

### Stage 4: Follow-Up

Hot lead:

- Same-day manual review.
- Send a short personalised email.
- Invite to a 15-minute call.

Warm lead:

- Send report.
- Send one follow-up with the top 2 fixes.
- Offer a call if they want help.

Low lead:

- Keep in nurture list.
- Send useful blog or checklist content later.

### Stage 5: Offer Mapping

Map the audit result to the offer:

- Bad performance, weak layout, old site:
  - Website rebuild or Local Lead Engine.
- Good site, weak local visibility:
  - Local SEO.
- Good site, no tracking or weak forms:
  - Lead tracking setup or care plan.
- Site is fine but owner wants updates:
  - Website care plan.
- Business wants content control:
  - CMS add-on.

## Health Tool Expected Behaviour

The health-check tool should do these things reliably.

### Frontend

- Show a simple form with URL and email.
- Normalise URLs without requiring the user to type `https://`.
- Require email consent.
- Prevent duplicate submissions.
- Show clear progress while checks run.
- Show useful errors for validation, rate limits, timeout, and server failure.
- Show a success message when the report is sent.
- Track key funnel events.
- Work from mobile.

### Backend

- Accept only POST requests.
- Validate request origin.
- Validate URL and email.
- Require email consent.
- Reject private, local, or invalid URLs if SSRF protection is added.
- Rate limit by IP and time window.
- Retrieve the PageSpeed API key from SSM.
- Run mobile and desktop PageSpeed checks.
- Run extra HTML/technical checks.
- Compute a weighted overall score.
- Save the full run in DynamoDB.
- Send report email to the user.
- Send internal lead notification to `info@anchorwebco.com.au`.
- Return a useful JSON response.

### Report

The report should include:

- Overall score.
- Mobile and desktop scores.
- Core Web Vitals.
- SEO basics.
- Accessibility basics.
- Best-practice basics.
- Top priority fixes.
- Extra technical checks.
- Clear next step CTA.

### Internal Lead Email

The internal email should include:

- Website URL.
- Prospect email.
- Overall score.
- Category scores.
- Top issues.
- Suggested lead bucket.
- Link to the tested website.
- Recommended next action.

## Missing Improvements

The current implementation is a good MVP, but it should be strengthened before being treated as the core lead engine.

Recommended improvements:

- Add explicit health-check analytics events.
- Add SSRF-style URL protection to block localhost, private IP ranges, and metadata endpoints.
- Add a lead score to stored runs and internal emails.
- Add more actionable report language.
- Add on-page summary after submit if the backend returns scores.
- Add a manual audit CTA after success.
- Add a public fallback if SES is still in sandbox.
- Add an operational runbook for deployment and troubleshooting.

## Build Plan

### Phase 1: Stabilise The Existing Tool

1. Run the Lambda unit/integration tests.
2. Test live `/health-check.html` from the browser.
3. Test live `/api/health-check` with an approved email.
4. Check whether CloudFront correctly routes `/api/*`.
5. Check recent GitHub Actions deployment logs.
6. Fix any frontend/API route/runtime issue found.

### Phase 2: Improve Data Capture

1. Add health-check analytics events to the frontend.
2. Update analytics backend allowed events if required.
3. Add hidden `source_page` and `cta` context where relevant.
4. Store lead score and lead bucket on health-check runs.

### Phase 3: Improve Report Quality

1. Rewrite report copy to be plain and sales-useful.
2. Prioritise fixes by expected business impact.
3. Add "what this means" explanations.
4. Add a clear next action:
   - Fix a few issues.
   - Book a manual audit.
   - Discuss a rebuild.

### Phase 4: Sales Workflow

1. Add a standard follow-up email template.
2. Add hot/warm/low lead handling.
3. Add a manual audit checklist.
4. Add CRM-style notes later if required.

### Phase 5: Reuse For Clients

Once proven on Anchor Web Co:

1. Make the health-check sender configurable by site ID.
2. Store runs by tenant.
3. Allow client-branded report emails.
4. Route internal leads to each client.
5. Offer it as a paid lead magnet add-on.

## Acceptance Criteria

- The public health-check form works from mobile and desktop.
- Submissions result in a saved run.
- A report email is sent to the prospect.
- An internal lead email is sent to Anchor Web Co.
- Failures are understandable to normal users.
- Anchor Web Co can tell whether a lead is worth following up.
- The tool clearly feeds the Local Lead Engine offer.
- The implementation remains cheap and AWS-native.

