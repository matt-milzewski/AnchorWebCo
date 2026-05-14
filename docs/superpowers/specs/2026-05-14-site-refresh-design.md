# Anchor Web Co — Site Refresh Design

**Date:** 2026-05-14
**Scope:** Whole-site visual + copy refresh
**Goal:** Replace the SEO-stuffed, wall-of-words feel with a calm, minimal, Linear/Stripe-style presentation that signals craft and confidence.

---

## Problem statement

The current homepage hero contains ~80 words plus a paragraph of four stacked SEO link anchors above the fold. The overall site is built around keyword density rather than visitor experience. The owner reports it feels amateurish — "writing everything he can to try to get traffic." The refresh must:

- Cut the homepage from 9 sections to 5
- Replace wall-of-words copy with restrained, confident lines
- Apply a consistent minimal visual system across every page
- Preserve SEO performance by keeping keyword-heavy content on dedicated service pages, not the homepage
- Move shared chrome (nav, footer) to a slimmer structure

## Direction (decisions locked during brainstorm)

| Decision | Value |
|---|---|
| Tone | Calm & minimal — Linear/Stripe-style restraint |
| Hero visual | Type + soft gradient (CSS-only, no image) |
| Primary CTA | Request a quote / start a project |
| Architecture | A — Minimalist marquee (5 homepage sections) |
| Headline | "Local websites, built to work." |
| Sub-headline | "Web design and SEO for Fraser Coast businesses. Fixed price. Live in weeks." |
| WhatsApp button | Moves to contact page only |

---

## Visual system

### Palette

| Token | Value | Use |
|---|---|---|
| `ink` | `#0A0A0A` | All body + headline text. Replaces `anchor-navy` (#1f2937) entirely. |
| `surface` | `#FAFAF7` | Page background, slightly warmer than current `sand-beige`. |
| `surface-alt` | `#FFFFFF` | Alternating section background. |
| `accent` | `#38bdf8` | Existing `coast-sky`, used sparingly — links, primary button hover state, hero gradient. |
| `muted` | `#6B7280` | Secondary text, captions, eyebrows. |
| `line` | `#E7E5E0` | Hairline dividers. |

The token `anchor-navy` is retired site-wide.

### Typography

- Display headline: `clamp(48px, 6vw, 80px)` — Poppins 700. Hero only.
- H2: `clamp(28px, 3vw, 40px)` — Poppins 700.
- H3: `20px` — Poppins 700.
- Body: `17px` — Roboto 400, `line-height: 1.65`.
- Caption / eyebrow: `14px` — Roboto 500, uppercase `letter-spacing: 0.08em`, colour `muted`.

### Spacing

- Section vertical padding: `clamp(80px, 10vw, 140px)`.
- Max content width: `1100px` for prose, `1280px` for grids.
- Generous gutters; never edge-to-edge text on desktop.

### Buttons

- Primary: `ink` background, `#FFF` text, `border-radius: 10px`, no shadow, `padding: 14px 24px`. Hover: `accent` background.
- Secondary: transparent, `1px solid ink`, `ink` text. Hover: fills with `ink`, text inverts.
- Tertiary link: text + `→` arrow, underline on hover, colour `accent`.

---

## Homepage architecture (5 sections)

### 1. Hero
- Eyebrow: `Maryborough · Fraser Coast`
- Headline: **Local websites, built to work.** (two lines on desktop, break after comma)
- Sub: **Web design and SEO for Fraser Coast businesses. Fixed price. Live in weeks.**
- CTAs: primary `Start a project` → `contact.html`; secondary `See our work` → `#work`
- Quiet line under CTAs: `Fixed-fee · No lock-ins · Live in 2–4 weeks`
- Background: CSS radial gradient — `accent` at top-right, fading to `surface`, 30% opacity. No image.
- Height: ~78vh on desktop, content centred but slightly left-biased on wide screens.

**Removed from hero:** the SEO link paragraph linking the four service pages.

### 2. Recent work (`#work`)
- Heading: `Work` (single word, large, left-aligned)
- 3 cards (down from 4):
  - BH Lock & Security
  - Maryborough Mowerman
  - Coastwide Exterior Cleaning
- Bannister Communications retired from homepage.
- Each card: site screenshot in browser-chrome mockup, client name, one-line outcome, link to live site.
- Action item: capture clean screenshots of those three sites; placeholders used until real images land.

### 3. How it works
- Heading: `How it works`
- Three numbered cards, large numerals (`01` `02` `03`), no icons:
  - `01 Scope` — "We have a 30-minute call. You get a fixed-fee proposal within 48 hours."
  - `02 Build` — "Mobile-first build with on-page SEO baked in. You review at two milestones."
  - `03 Launch` — "Live in 2–4 weeks. Light support after — no lock-in."

### 4. Proof
- One large pull quote, display weight: Link Stevens' 5-star review (or whichever is strongest).
- Quiet line below: `Rated 5-star by Fraser Coast businesses on Google.`
- **Removes** the current rotating Google reviews carousel. The JS files (`google-reviews.js`, `google-reviews-data.js`) are dropped from the homepage; can be retained for a future reviews page if desired, otherwise deletable.

### 5. Final CTA
- Heading: `Ready to start?`
- One button: `Get a project quote` → `contact.html`
- Quiet line: `Maryborough, QLD · 0439 499 944 · info@anchorwebco.com.au`
- Background: `surface-alt` to close the page distinctly.

### Sections removed from homepage
Content survives on dedicated pages where relevant:
- 4-pill trust strip ("Maryborough-based" etc.) — folded into hero quiet line.
- Services 4-grid — content already lives on each service page.
- Areas 3-grid — content already lives on service pages.
- Tradies pitch — already at `/blog/tradies-websites-more-jobs/`.
- Why-choose-us 3-grid — implied by "How it works."
- FAQ — moves to `contact.html`; JSON-LD FAQ schema stays on homepage `<head>` for SEO.

---

## Navigation and chrome

### Top nav (desktop)
```
[Anchor Web Co.]    Work    Services ▾    About    Blog              [ Get a quote ]
```

- `Work` → homepage `#work` anchor (or future `/work/` page).
- `Services ▾` → dropdown:
  - Web Design — Hervey Bay
  - Web Design — Maryborough
  - SEO — Hervey Bay
  - SEO — Maryborough
  - Website Care Plans
  - Free Website Audit
- `About` → `about.html`
- `Blog` → `/blog/`
- `Get a quote` → `contact.html` (only button styling)

### Mobile nav
- Full-screen overlay (existing pattern retained, restyled).
- Services becomes an expandable accordion inside the overlay.
- Single primary CTA pinned to bottom: `Get a quote`.

### Removed from top nav
- `Home` — logo is the home link.
- `Health Check` — moves to footer + remains as a standalone landing page.

### Footer
Three columns, slimmer than current:
- **Col 1:** Brand line + 1-line tagline: "Local web design and SEO. Maryborough, QLD."
- **Col 2:** Services (5 links: 4 service pages + care plans).
- **Col 3:** Contact (phone, email, location) + Free Website Audit + Health Check links.

The current "Quick Links" 11-item list is removed; duplication with nav eliminated.

### Floating buttons
- WhatsApp: removed from site-wide chrome; surfaced only on `contact.html` as one of the contact options.
- Scroll-to-top: kept, restyled to `ink` palette.

---

## Cross-page application

The new visual system applies to every page. The shared `<nav>` and `<footer>` are currently copy-pasted into each HTML file; one pass updates them all consistently.

### Pages affected
- `index.html`
- `about.html`
- `web-design-hervey-bay.html`
- `web-design-maryborough.html`
- `seo-hervey-bay.html`
- `seo-maryborough.html`
- `website-care-plans.html`
- `free-website-audit-hervey-bay.html`
- `health-check.html`
- `thank-you.html`
- `contact.html`
- Blog templates (`src/_includes/layouts/*.njk`, `src/blog/index.njk`)

### Per-page treatment

| Page | Treatment |
|---|---|
| `index.html` | Full rewrite per homepage architecture above. |
| Service pages (4) | Tighter hero; drop SEO link-stuffing paragraphs; restructure body into proper sections with whitespace. SEO content preserved — these pages are the keyword workhorses. |
| `about.html` | Tone refresh; apply tokens; simplify section count. |
| `contact.html` | Tone refresh; surface WhatsApp here; absorb FAQ block from homepage. |
| `website-care-plans.html`, `free-website-audit-hervey-bay.html`, `health-check.html`, `thank-you.html` | Mechanical token application + copy tightening. |
| Blog templates | Token application; layout polish. Already reasonably clean. |

---

## Implementation phasing

| Phase | Work | Depends on |
|---|---|---|
| **1. Foundation** | New `tokens.css` (palette, type scale, spacing, button styles). Update Tailwind config block in templates. Do **not** touch HTML bodies yet. | — |
| **2. Shared chrome** | Update `<nav>` and `<footer>` HTML across every page in one pass. Simplifies nav to 4 items + dropdown; new footer structure. WhatsApp removed from chrome. | Phase 1 |
| **3a. Homepage** | Rewrite `index.html` body to 5-section structure. Remove unused JS includes (Google reviews carousel). | Phases 1, 2 |
| **3b. Service pages** | Apply new system to 4 location pages (`web-design-*`, `seo-*`). Preserve SEO content. | Phases 1, 2 |
| **3c. Supporting pages** | Apply new system to `about.html`, `contact.html` (add WhatsApp + FAQ), `website-care-plans.html`, `free-website-audit-hervey-bay.html`, `health-check.html`, `thank-you.html`. | Phases 1, 2 |
| **3d. Blog templates** | Apply tokens to blog list + post layouts. | Phases 1, 2 |

Phases 3a, 3b, 3c, 3d operate on disjoint file sets and can run in parallel after Phases 1–2 complete.

---

## Out of scope

- Extracting nav/footer into Eleventy `_includes` partials (future cleanup).
- New photography, custom illustrations, or icon system beyond the screenshots needed for the homepage `Work` section.
- Performance / JS bundling work.
- CMS/admin layer changes.
- Any backend/CloudFront/deploy pipeline changes.

---

## Success criteria

- Homepage above-the-fold word count drops from ~80 to under 25.
- Homepage section count drops from 9 to 5.
- Top nav fits comfortably on a 13" laptop without wrapping.
- Palette reduced from 4 named brand tokens to a single shared token set used across every page.
- Lighthouse Performance and SEO scores remain at or above current values.
- Visual consistency: every page uses the same buttons, spacing, type scale, and chrome.
