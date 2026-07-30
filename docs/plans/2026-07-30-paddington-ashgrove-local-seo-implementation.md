# Paddington and Ashgrove local SEO implementation

Date: 30 July 2026

Status: Approved for implementation in this repository

## Outcome

Publish two useful, indexable service pages for nearby businesses:

- `/web-design-paddington-brisbane.html`
- `/web-design-ashgrove-brisbane.html`

The pages sit beneath the existing Brisbane Inner West service hub. They are not
branch pages and must not imply that Anchor Web Co has an office in either
suburb. Anchor Web Co remains accurately described as Red Hill based.

The commercial journey is:

`suburb search -> useful local service page -> website planner or pricing -> saved build + care choice -> enquiry`

## Why both suburbs are worth testing now

Paddington and Ashgrove are immediately adjacent to Red Hill and are credible
places for a Red Hill-based supplier to serve.

Paddington has a recognisable independent-business corridor along Given and
Latrobe Terraces. Brisbane Economic Development Agency describes the precinct
as a collection of independent retailers and local businesses:

- <https://visit.brisbane.qld.au/inspiration/shopping-paddington>

Ashgrove has a substantial neighbourhood business corridor along Waterworks
Road. Brisbane City Council describes Ashgrove West as a neighbourhood shopping
precinct and has invested in its character and amenity:

- <https://yoursay.brisbane.qld.gov.au/WAVPP>

The 2021 Census records 9,063 residents in Paddington and 13,450 in Ashgrove,
with median weekly household incomes of $2,775 and $2,874 respectively. These
figures are market context, not claims to place on the public pages:

- <https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL32250>
- <https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL30092>

The current search results support different implementation angles:

- Paddington results include directories, broad Brisbane providers and older
  local providers. A focused, modern page can compete on clarity, transparent
  pricing and a nearby Red Hill base.
- Ashgrove has a strong exact-match local incumbent with reviews and a long
  history. Anchor Web Co should not imitate that positioning. Its opportunity is
  a more specific promise: conversion-focused builds, one connected build and
  care price, direct access to Matt and measurable enquiry paths.

This is a controlled two-page test, not permission to generate a suburb-page
network.

## Search and page-intent map

Each indexable page has one job:

| Page | Main intent | Supporting intent | Must not compete for |
| --- | --- | --- | --- |
| `/` | Brisbane web design for trades and service businesses | fixed-fee websites, managed hosting | individual suburb-first queries |
| `/web-design-brisbane-inner-west.html` | web design Brisbane Inner West | nearby service coverage | detailed Paddington or Ashgrove advice |
| `/web-design-red-hill.html` | web design Red Hill | genuinely local web developer | Paddington or Ashgrove |
| `/web-design-paddington-brisbane.html` | web design Paddington Brisbane | websites for Paddington shops, practices and local services | generic Brisbane web design |
| `/web-design-ashgrove-brisbane.html` | web design Ashgrove Brisbane | websites for Ashgrove practices, professional and home services | generic Brisbane web design |
| `/local-seo-brisbane-inner-west.html` | local SEO Brisbane Inner West | Google Business Profile and local visibility | website-build intent |
| `/web-design-brisbane-tradies.html` | web design Brisbane tradies | electrician and trade websites | general suburb intent |

Titles, H1s and opening copy should preserve these boundaries. The suburb pages
may link to the broader pages but should not copy their section order or
paragraphs.

## Differentiated page briefs

### Paddington

Audience:

- independent retail and hospitality operators;
- allied-health, wellness and professional practices;
- trades and home services that work around Paddington and the inner west.

Customer problem:

People often discover a Paddington business online before deciding whether to
visit, book, call or request a quote. The site has to preserve the character and
trust of the real business while making practical details effortless to find.

Unique content:

- Given and Latrobe Terraces and Rosalie context;
- three business-specific website blueprints;
- guidance on hours, booking, directions, practitioner detail and mobile quote
  paths;
- an explicit statement that Anchor Web Co is based next door in Red Hill;
- Paddington-specific FAQs;
- authentic Latrobe Terrace photography already licensed in the repository.

Primary action: instant website planner.

Secondary action: build + care pricing.

### Ashgrove

Audience:

- allied-health and established professional practices;
- trades, renovation and home-service businesses;
- neighbourhood retail and hospitality operators.

Customer problem:

An established local business may already earn referrals, but its website can
still look weaker than the reputation behind it. The site needs to turn that
existing trust into clear proof, current service detail and a simple next step.

Unique content:

- Waterworks Road and neighbourhood-centre context;
- a trust-led opening rather than Paddington's visit-or-book angle;
- blueprints for practices, professional services and home/trade services;
- guidance on credentials, service boundaries, project evidence and qualified
  enquiries;
- an explicit statement that Anchor Web Co is based nearby in Red Hill, not in
  Ashgrove;
- Ashgrove-specific FAQs;
- an authentic Waterworks Road image with its source and licence recorded.

Primary action: instant website planner.

Secondary action: build + care pricing.

## Helpful-content and doorway safeguards

Google defines doorway abuse to include substantially similar location pages
that sit between a search result and the useful part of a site:

- <https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse>

Google also recommends original, substantial, people-first content written for
an existing or intended audience:

- <https://developers.google.com/search/docs/fundamentals/creating-helpful-content>

Implementation safeguards:

1. The pages use different customer problems, headings, section sequences,
   examples and FAQs.
2. No false office, local-client, ranking or travel-time claims are made.
3. Every page answers a visitor's build, process, price and post-launch
   questions without requiring a return to the hub.
4. Each page is linked contextually from the Inner West hub and homepage so the
   hierarchy is browseable.
5. A build test compares the visible `<main>` content of the two suburb pages
   and fails if three-word-shingle similarity is too high.
6. No additional suburb page is approved until this test has been reviewed
   after at least 8–12 weeks.

## Internal-link architecture

Add contextual links:

- homepage service-area section -> Paddington and Ashgrove pages;
- Inner West hub -> dedicated linked cards for Red Hill, Paddington and
  Ashgrove;
- local SEO page -> the two pages as examples of useful, genuine service-area
  content;
- local SEO blog article -> both pages;
- each suburb page -> Inner West hub, relevant service page, pricing, care,
  work, planner and contact.

Do not add both suburbs to the compact primary navigation. The Inner West hub is
the parent discovery route and avoids turning the main navigation into a list of
keywords. The footer also remains unchanged at launch: five contextual inbound
pages provide stronger discovery without adding a keyword-heavy area list to
every page.

## Metadata and structured data

Each page requires:

- one unique title under roughly 60 characters where practical;
- one useful meta description that describes the offer and Red Hill proximity;
- a self-referencing canonical;
- one H1;
- Open Graph and Twitter metadata from the shared layout;
- `Service` JSON-LD with:
  - a unique name and URL;
  - `provider` pointing to the global `#business`;
  - `areaServed` as a `Place` for only the relevant suburb;
  - `serviceType` limited to website design and development, so the offer is
    not mistaken for the combined build-and-care total;
  - an `AggregateOffer` with the genuine $1,970 entry build price;
- `FAQPage` JSON-LD containing only questions and answers visibly present on
  that page.

The global `ProfessionalService` remains based in Red Hill. No Ashgrove or
Paddington postal address is added.

## Imagery

Paddington:

- reuse `paddington-latrobe-terrace.webp`;
- preserve the existing Wikimedia author and CC BY-SA attribution.

Ashgrove:

- use a neighbourhood business photograph from Monoplane Street in the hero
  and a Waterworks Road photograph as supporting context;
- resize and convert it to WebP;
- record author, source, licence and modifications in `IMAGE-CREDITS.md`;
- use literal alt text and captioning, without calling the image recent.

Sources:

- <https://commons.wikimedia.org/wiki/File:Ashgrove_West_Monoplane_shops.jpg>
- <https://commons.wikimedia.org/wiki/File:Waterworks_Rd_W_at_Ashgrove.jpg>

## Measurement and automated monitoring

The existing first-party analytics automatically records:

- page views and entry page;
- CTA clicks and source page;
- calls;
- clicks to the planner and planner completions;
- confirmed enquiry submissions;
- scroll depth and basic web vitals;
- entry-page conversion rate in the monthly report.

The existing website monitor should check both new URLs. Production verification
should also treat them as critical pages.

Google Search Console is the source of truth for organic search visibility. Its
Performance report provides clicks, impressions, click-through rate and average
position:

- <https://support.google.com/webmasters/answer/7576553>

Review windows:

- launch: submit or inspect both URLs in Search Console and confirm sitemap
  discovery;
- week 4: check indexing and first impressions only; avoid rewriting early;
- week 8: compare page queries, impressions, CTR, entry visits, planner clicks,
  calls and enquiries;
- week 12: make one evidence-led iteration per page.

Iteration rules:

- high impressions and weak CTR -> revise title and description around the
  actual query language;
- positions roughly 8–25 with useful impressions -> strengthen the section that
  answers that query and add relevant proof/internal links;
- visits but weak planner/call activity -> improve the opening offer, proof or
  CTA;
- no impressions after indexing is confirmed -> reassess intent and internal
  links before adding more copy;
- queries split across the hub and suburb page -> clarify titles, H1s and
  internal anchors rather than creating another page;
- no qualified signal after 12 weeks -> keep the page if it remains useful and
  low-maintenance, but do not clone it to further suburbs.

## Repository changes

- add two Eleventy marketing pages;
- add the Ashgrove image and image credit;
- update the homepage, Inner West hub, local SEO page, local SEO blog article
  and footer;
- add both pages to `src/_data/legacyPages.js`;
- correct and expand `src/sitemap-images.xml`, keeping only Google’s supported
  `image:loc` field rather than deprecated image metadata fields;
- add both URLs to production verification and managed-site monitoring;
- extend `scripts/verify-build.js` with suburb-page assertions and a
  visible-content similarity guard;
- run the complete build and test suite;
- verify both pages on desktop and mobile;
- deploy through the existing `main` branch AWS workflow;
- verify live status, canonicals, metadata, schema, image delivery, internal
  links and retired-region exclusions.

## Definition of done

- both pages are live with 200 responses and self-referencing canonicals;
- sitemap and image sitemap include both URLs;
- content is useful without a suburb-name substitution;
- no false location claim is present;
- the entry build and required care relationship remain accurate;
- all internal links resolve;
- JSON-LD parses;
- the similarity safeguard passes;
- automated build, redirect and production checks pass;
- desktop and mobile visual review finds no blocking layout or interaction
  issue;
- monitoring can report entry visits and conversions without monthly manual
  maintenance.
