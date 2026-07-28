# Anchor Web Co Conversion and Automation Implementation

Date: 28 July 2026
Status: Implemented in the repository; production deployment and verification are recorded in the final handover for this change.

## Objective

Make the website persuasive enough for a new Brisbane trade or service business to understand the offer, see a realistic total price and enquire without needing a sales call first.

The operating model assumes Matt does not have time for routine prospecting. The website therefore needs to do the repetitive work:

1. attract relevant Brisbane searches;
2. explain the offer and establish trust;
3. recommend a build and care combination;
4. capture a short project brief;
5. acknowledge the enquiry automatically;
6. measure confirmed enquiries;
7. monitor managed websites and raise incidents automatically.

Automation is used for repeatable administration. It does not pretend to replace the parts where a client needs accountable human judgement: qualifying a real enquiry, confirming scope, writing a proposal and delivering the project.

## What changed

### Positioning and conversion path

- The homepage now leads with Brisbane trades and service businesses, a clear enquiry outcome and a self-serve website planner.
- The language is customer-facing. Internal territory labels, expansion stages and other business-planning language are not used as sales copy.
- A dedicated `/web-design-brisbane-tradies.html` page answers the practical questions a new electrician, plumber, cleaner or similar business will ask.
- A specific new-electrician example explains a credible launch structure without promising rankings or leads.
- A persistent mobile action bar keeps `Call Matt` and `Plan my website` available on small screens.
- The primary path is now:

  `Brisbane landing page -> website planner -> saved build + care choice -> short enquiry form -> automatic receipt -> personal response`

- Existing-site visitors can use the separate automated health check.
- The old manual free-audit page now permanently redirects to the automated health check.

### Proof and trust

- The homepage and work page show real client work rather than a list of unsupported marketing claims.
- Bannister Communications replaces the retired BH Lock and Security reference.
- Coastwide Exterior Cleaning and The Royal Hotel Gympie have visual website previews.
- Verified excerpts from the existing Google review record appear on the homepage and contact page.
- Matt is named as the person who plans, builds and leads each project.
- Confirmed qualifications and experience are shown:
  - Bachelor of Information Technology, QUT;
  - Diploma of Software Development;
  - more than five years of systems experience at Telstra.
- The About page explains that specialist help may be used while Matt remains accountable. This leaves room to add contractors without presenting a fictional team.

### Connected build and care pricing

Every new website is presented as two directly connected choices:

1. a one-off build;
2. the managed hosting and care plan that starts at launch.

Current public build pricing:

| Build | One-off price |
| --- | ---: |
| One-Page Launch | $1,970 |
| Local Business Site | $3,850 |
| Growth Website | From $5,950 |

Current public care pricing:

| Care plan | Monthly | Annual |
| --- | ---: | ---: |
| Site Care | $69 | $690 |
| Care + Insights | $129 | $1,290 |
| Lead Monitor | $229 | $2,290 |

Annual care is priced as ten monthly payments. The calculator combines any build with any care plan and passes both selections into the enquiry form.

The default combinations shown publicly are:

| Combination | First year |
| --- | ---: |
| One-Page Launch + annual Site Care | $2,660 |
| Local Business Site + annual Site Care | $4,540 |
| Growth Website + annual Site Care | From $6,640 |

Prices are in Australian dollars. The site states that GST is added only if it legally applies and will be shown before proposal acceptance.

### Automated website planner

`/website-planner.html` asks four questions and instantly returns:

- the recommended build;
- the recommended care plan;
- the build price;
- the monthly and annual care price;
- the first-year total;
- a suggested page structure;
- a link that carries the recommendation into the enquiry form.

No name or email is required to see the result. The recommendation remains in the visitor's browser unless they choose to send it.

### Lower-friction enquiry form

The initial form now asks only for:

- business or contact name;
- email;
- optional phone;
- current project stage;
- optional suburb;
- project goal or brief;
- optional current website.

Budget, timing, referral-source and detailed package fields were removed from the visible form. Build and care selections from the planner or pricing calculator are retained as hidden context and displayed back to the visitor before submission.

The legitimate website field is named `current_website`. This fixes a critical defect where the former `website` field could be mistaken for a spam honeypot and silently discard a genuine enquiry.

### Automatic enquiry handling

The first-party forms service now:

- accepts `current_website` as legitimate project information;
- reserves only `company` and `_gotcha` as default honeypot fields;
- sends the internal lead notification;
- stores the submission;
- sends the prospect a transactional receipt automatically;
- tells the prospect to expect a personal response within two business days;
- links to the planner and pricing page in the receipt;
- continues to accept the lead if the receipt email itself fails;
- does not add the prospect to a marketing list;
- automatically expires raw unconverted form submissions after approximately 12 months.

The former silent Formspree fallback has been removed. If the first-party forms configuration is unavailable, the visitor receives a visible error and can use the displayed phone or email details instead of unknowingly sending data to another provider.

### Conversion measurement

Conversion tracking now records success only after the first-party form service accepts the submission.

This fixes two previous problems:

- a browser submit attempt could be counted before the form succeeded;
- the same accepted lead could be counted once in the browser and again in the forms backend.

The analytics system now has first-class events and funnels for:

- contact forms;
- automated health checks;
- website-planner starts and completions;
- click-to-call and other site actions.

Google Ads conversion code is also triggered after confirmed form acceptance, not before the request.

### Automated managed-site monitoring

`.github/workflows/monitor-managed-sites.yml` runs at 17 and 47 minutes past every hour.

For each configured site it checks:

- homepage HTTP success;
- expected brand text;
- TLS certificate validity and at least 21 days remaining;
- configured core pages;
- configured form page and the presence of form markup.
- the forms Lambda and selected site configuration when a form endpoint is configured.

If a check fails, the workflow opens one deduplicated GitHub issue and adds subsequent failure reports as comments. When all checks recover, it comments on and closes the issue automatically.

Current monitored sites are:

- Anchor Web Co;
- Bannister Communications;
- Coastwide Exterior Cleaning;
- The Royal Hotel Gympie.

To add a care client, edit `automation/managed-sites.json`:

```json
{
  "name": "Client name",
  "url": "https://www.example.com/",
  "corePaths": ["/services.html", "/contact.html"],
  "formPath": "/contact.html",
  "formEndpoint": "https://forms-api.example/api/forms/client-id",
  "formSiteId": "client-id",
  "expectedText": "Client name"
}
```

Run `npm run monitor:sites` before committing. Do not list a form path unless the page contains a real HTML `<form>`.

The optional endpoint check confirms that the forms Lambda can load the selected site configuration. It deliberately does not submit production forms, because automatic submissions would create false leads and send emails.

## Care-plan delivery boundaries

The public plans now match automation that exists in this repository.

### Site Care — $69/month or $690/year

- managed static hosting and CDN;
- automated uptime checks;
- automated TLS-expiry checks;
- automated core-page checks;
- automated form-page and configured endpoint checks;
- incident issue creation and recovery closure;
- human triage only when the automation reports a real failure.

### Care + Insights — $129/month or $1,290/year

- everything in Site Care;
- first-party traffic and enquiry measurement;
- landing-page and call-to-action reporting;
- device mix and monthly web-performance snapshots;
- automated monthly email summary.

### Lead Monitor — $229/month or $2,290/year

- everything in Care + Insights;
- enquiry-funnel reporting;
- lead and demand-mix reporting from submitted data;
- automated monthly conversion priority flags.

The plans no longer promise recurring manual edits, quarterly meetings, Google Business Profile summaries, rank tracking or Search Console reporting that is not implemented.

## Privacy and retention

`/privacy.html` documents:

- enquiry and health-check data;
- IP address, browser and source-page diagnostics;
- first-party analytics and campaign parameters;
- Google Ads measurement;
- AWS processing and email delivery;
- no automatic marketing-list enrolment;
- approximately 13 months for raw analytics events;
- approximately 12 months for raw unconverted forms and health-check records;
- how to request access, correction or deletion.

The forms and health-check DynamoDB tables use `expiresAt` as their automatic TTL field. Infrastructure must be deployed for this retention rule to be active.

## Production safeguards

The main deployment workflow now:

1. checks that the forms and analytics repository variables exist;
2. builds the Eleventy site;
3. runs the full build and redirect verifier before uploading;
4. syncs only `_site/` to the production bucket;
5. publishes the viewer-request redirect function;
6. invalidates CloudFront;
7. waits for the invalidation to finish;
8. verifies production HTML, metadata, canonicals, JSON-LD, retired content, the audit redirect, the live forms Lambda, its Anchor site configuration and CORS.

Deployment concurrency prevents two production syncs from racing.

Use:

```bash
env -u ANCHOR_CMS_API_BASE ANCHOR_CMS_SITE_ID=anchor-web-co npm run build
npm test
(cd forms/lambda && npm run lint && npm test)
(cd analytics && npm test && npm run build)
(cd health-check/lambda && npm run lint && npm test)
npm run monitor:sites
```

After deployment, use:

```bash
ANCHOR_FORMS_API_BASE="$(gh variable get ANCHOR_FORMS_API_BASE)" npm run verify:production
```

Do not sync the repository root to S3. Only the generated `_site/` directory is a deployable website.

## Low-touch marketing operating model

There is no cold-prospecting task in the implemented operating model.

### Automated

- Brisbane search landing pages stay live and crawlable.
- The planner turns an uncertain visitor into a specific build-and-care recommendation.
- The health check handles existing-site visitors without a manual audit.
- Enquiries are acknowledged immediately.
- Attribution and confirmed conversions are recorded.
- Monthly website reporting is generated by the analytics service.
- Managed sites are checked twice per hour.
- Monitoring incidents are opened, updated and closed automatically.
- Raw enquiry and health-check records expire automatically.

### Human only when there is commercial value

- respond to a genuine inbound lead;
- confirm the scope and whether the prospect is a good fit;
- write and send the proposal;
- build the website;
- approve factual client proof or a case study;
- handle a monitoring incident that needs an actual fix.

Do not automate scraped-email campaigns, purchased lists, synthetic reviews, copied suburb doorway pages or AI messages that pretend to be personally researched. These create compliance, reputation and lead-quality problems while still requiring oversight.

## Remaining inputs that cannot be invented in the repository

These are optional improvements, not launch blockers:

1. Replace the initials portrait with a real professional photo of Matt.
2. Add the current Google Business Profile review URL, rating and review count after they are supplied and verified.
3. Add measured client outcomes and individual case-study pages when clients approve the facts.
4. Request re-indexing and monitor Brisbane queries in the real Google Search Console property.
5. Update the real Google Business Profile and important directory citations to Red Hill where the account owner has access.
6. Add a CRM only when inbound volume makes a pipeline necessary. Until then, the AWS form store and email notifications avoid another system to maintain.

These account-level changes require the real account, verified business details or client permission and should not be guessed from website source.

## Stock image record

The trade landing-page hero uses the Pexels image “Focused technician using a drill on an electrical panel, showcasing expert workmanship” by ranjeet:

- source: <https://www.pexels.com/photo/a-man-is-working-on-an-electrical-panel-27928759/>
- licence: <https://www.pexels.com/license/>
- local asset: `src/img/brisbane-tradie-electrician.webp`

The alt text describes the visible activity and does not claim that the photographed person is Matt, an Anchor client or a Brisbane electrician.

## Success measures

Use the analytics and enquiry records to judge the change on:

- planner completion rate;
- planner-to-enquiry rate;
- confirmed enquiry rate by landing page;
- click-to-call rate on mobile;
- enquiry form errors and abandonment;
- qualified Brisbane enquiries;
- proposal and win rate recorded outside website analytics;
- build value and attached annual care value;
- managed-site incidents detected before a client reports them.

Traffic by itself is not the goal. The useful signal is whether relevant Brisbane businesses move from a landing page to a planner result, call or accepted enquiry.
