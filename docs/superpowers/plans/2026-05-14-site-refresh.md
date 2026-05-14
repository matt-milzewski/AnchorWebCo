# Anchor Web Co — Site Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Companion design spec:** `docs/superpowers/specs/2026-05-14-site-refresh-design.md` — read it before starting any task.

**Goal:** Whole-site visual + copy refresh of anchorwebco.com.au per the locked design spec — calm/minimal Linear-style tone, ink/surface/accent palette, 5-section homepage, slimmer nav, restrained typography.

**Architecture:** Five phases on a `site-refresh` integration branch — `main` only receives the work at the end of Phase 4, so the live site doesn't pass through ugly intermediate visual states. Phases 1 and 2 run sequentially on `site-refresh` (shared state — CSS tokens, Tailwind config, nav, footer). Phases 3a–3d operate on **disjoint file sets** and run in parallel in separate git worktrees branched from `site-refresh`. Phase 4 fast-forwards `main` to `site-refresh` after the whole thing is verified.

**Tech Stack:** Eleventy 3 (11ty), Tailwind via CDN with inline config per-page, vanilla CSS in `src/css/styles.css`, Nunjucks for blog templates. Build: `npm run build` (clears `_site` then runs eleventy). Smoke test: `npm run test:crawl`.

**Working directory:** `/Users/mattmilzewski/AnchorWebCo/AnchorWebCo` (inner repo, branch `main`).

---

## Phase 1 — Foundation (sequential, single agent)

### Task 1.1: Add new design tokens to styles.css

**Files:**
- Modify: `src/css/styles.css:1-6` (`:root` block) and rewrites scattered through `:53-215` (button classes), `nav-link`, `area-support-*`, `google-review-*` token references.

- [ ] **Step 1: Replace `:root` block with new token set + alias old names**

Replace lines 1-6 of `src/css/styles.css` with:

```css
:root {
    /* New design tokens (canonical) */
    --ink: #0A0A0A;
    --surface: #FAFAF7;
    --surface-alt: #FFFFFF;
    --accent: #38bdf8;
    --muted: #6B7280;
    --line: #E7E5E0;

    /* Legacy aliases — existing class references resolve to new tokens */
    --anchor-navy: var(--ink);
    --coast-sky: var(--accent);
    --sand-beige: var(--surface);
    --dark-text: var(--ink);
}
```

- [ ] **Step 2: Rewrite button classes**

In `src/css/styles.css`, replace the `.btn-primary` block (lines 53-72) with:

```css
.btn-primary {
    background-color: var(--ink);
    color: #fff;
    font-weight: 600;
    padding: 14px 24px;
    border-radius: 10px;
    transition: background-color 0.2s ease;
    display: inline-block;
    text-align: center;
    line-height: 1.3;
}

.btn-primary:hover,
.btn-primary:focus {
    background-color: var(--accent);
    color: var(--ink);
    outline: none;
}
```

Replace `.btn-secondary` block (lines 172-192) with:

```css
.btn-secondary {
    background-color: transparent;
    color: var(--ink);
    font-weight: 600;
    padding: 14px 24px;
    border-radius: 10px;
    border: 1px solid var(--ink);
    transition: all 0.2s ease;
    display: inline-block;
    text-align: center;
    line-height: 1.3;
}

.btn-secondary:hover,
.btn-secondary:focus {
    background-color: var(--ink);
    color: #fff;
    outline: none;
}
```

Replace `.nav-button` block (lines 127-147) with:

```css
.nav-button {
    background-color: var(--ink);
    color: #fff;
    font-weight: 600;
    padding: 10px 18px;
    border-radius: 10px;
    transition: background-color 0.2s ease;
    display: inline-block;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: center;
}

.nav-button:hover,
.nav-button:focus {
    background-color: var(--accent);
    color: var(--ink);
    outline: none;
}
```

Replace `.contact-submit-btn` block (lines 149-170) with:

```css
.contact-submit-btn {
    background-color: var(--ink) !important;
    color: #fff !important;
    font-size: 1.125rem;
    font-weight: 600;
    padding: 16px 32px;
    border: 0;
    border-radius: 10px;
    transition: background-color 0.2s ease;
    width: 100%;
    text-align: center;
}

.contact-submit-btn:hover,
.contact-submit-btn:focus {
    background-color: var(--accent) !important;
    color: var(--ink) !important;
    outline: none;
}
```

- [ ] **Step 3: Append new utility classes**

Append to end of `src/css/styles.css` (before the `@media print` block):

```css
/* === Refresh 2026-05-14 — new utility classes === */

.eyebrow {
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    margin-bottom: 16px;
}

.display {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: clamp(48px, 6vw, 80px);
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--ink);
}

.h2 {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: clamp(28px, 3vw, 40px);
    line-height: 1.15;
    color: var(--ink);
}

.section-pad {
    padding-top: clamp(80px, 10vw, 140px);
    padding-bottom: clamp(80px, 10vw, 140px);
}

.prose-narrow {
    max-width: 1100px;
    margin-left: auto;
    margin-right: auto;
}

.body-lg {
    font-size: 17px;
    line-height: 1.65;
    color: var(--ink);
}

.body-muted {
    font-size: 17px;
    line-height: 1.65;
    color: var(--muted);
}

.divider {
    border: 0;
    border-top: 1px solid var(--line);
    margin: 0;
}

.hero-gradient {
    background:
        radial-gradient(ellipse 80% 60% at 80% 0%, rgba(56, 189, 248, 0.18), transparent 60%),
        var(--surface);
}

/* Work cards (homepage Recent Work) */
.work-card {
    background: var(--surface-alt);
    border: 1px solid var(--line);
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.work-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 32px rgba(10, 10, 10, 0.06);
}

.work-card__image {
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    background: var(--line);
}

.work-card__body {
    padding: 24px;
}

.work-card__client {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 20px;
    color: var(--ink);
    margin-bottom: 8px;
}

.work-card__outcome {
    color: var(--muted);
    font-size: 15px;
    line-height: 1.55;
    margin-bottom: 16px;
}

/* Step cards (How it works) */
.step-card {
    padding: 32px 0;
    border-top: 1px solid var(--line);
}

.step-card__num {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 14px;
    color: var(--muted);
    letter-spacing: 0.08em;
    margin-bottom: 12px;
}

.step-card__title {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 24px;
    color: var(--ink);
    margin-bottom: 8px;
}

.step-card__body {
    color: var(--muted);
    font-size: 17px;
    line-height: 1.65;
    max-width: 60ch;
}

/* Quiet meta line under hero CTAs */
.hero-meta {
    color: var(--muted);
    font-size: 14px;
    letter-spacing: 0.04em;
    margin-top: 20px;
}

/* Dropdown menu (nav Services) */
.has-dropdown {
    position: relative;
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: var(--surface-alt);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 8px;
    min-width: 240px;
    box-shadow: 0 12px 28px rgba(10, 10, 10, 0.08);
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
    z-index: 60;
}

.has-dropdown:hover .dropdown-menu,
.has-dropdown:focus-within .dropdown-menu {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}

.dropdown-menu a {
    display: block;
    padding: 10px 14px;
    border-radius: 8px;
    color: var(--ink);
    font-size: 15px;
    text-decoration: none;
}

.dropdown-menu a:hover,
.dropdown-menu a:focus {
    background: var(--surface);
    color: var(--accent);
}
```

- [ ] **Step 4: Update body and mobile menu base styles**

Update `body` block (lines 12-16) to:

```css
body {
    font-family: 'Roboto', sans-serif;
    color: var(--ink);
    background-color: var(--surface);
    font-size: 17px;
    line-height: 1.65;
}
```

Update `#mobile-menu` block (lines 159-172, in HTML — but the CSS at `:306-330`):

```css
#mobile-menu nav a {
    color: var(--ink);
    transition: color 0.2s ease;
    font-size: 1.25rem;
    padding: 0.65rem 1rem;
    border-radius: 0.5rem;
    width: 100%;
    text-align: center;
}
```

(Other rules in this block stay the same.)

- [ ] **Step 5: Update btn-outline for dark sections**

Replace `.btn-outline` block (lines 194-215) — kept simple, no shadow:

```css
.btn-outline {
    background-color: transparent;
    color: #fff;
    font-weight: 600;
    padding: 14px 24px;
    border-radius: 10px;
    border: 1px solid #fff;
    transition: all 0.2s ease;
    display: inline-block;
    text-align: center;
    line-height: 1.3;
}

.btn-outline:hover,
.btn-outline:focus {
    background-color: #fff;
    color: var(--ink);
    outline: none;
}
```

- [ ] **Step 6: Build + visual smoke**

```bash
npm run build
```

Expected: build succeeds, all pages emit. Open `_site/index.html` locally (`open _site/index.html`) — the page will look broken/half-styled (chrome and body haven't been refreshed yet). That's expected. What you're verifying: **no CSS syntax errors, no missing classes referenced**. Buttons should be black/dark with rounded corners instead of orange.

- [ ] **Step 7: Commit**

```bash
git add src/css/styles.css
git commit -m "Refresh design tokens and base classes

New ink/surface/accent palette as CSS variables; legacy token names
aliased to the new values so existing references keep working. New
utility classes (eyebrow, display, section-pad, work-card, step-card,
hero-gradient, dropdown-menu) prepare styles.css for the homepage
rewrite and shared chrome update."
git push origin site-refresh
```

---

## Phase 2 — Shared chrome (sequential, single agent)

### Task 2.1: Update Tailwind config + nav + footer across every HTML page

This task touches every public HTML page in `src/`. The change is mechanical and identical per page — only the nav and footer blocks change.

**Files to modify:**
- `src/index.html`
- `src/about.html`
- `src/contact.html`
- `src/web-design-hervey-bay.html`
- `src/web-design-maryborough.html`
- `src/seo-hervey-bay.html`
- `src/seo-maryborough.html`
- `src/website-care-plans.html`
- `src/free-website-audit-hervey-bay.html`
- `src/health-check.html`
- `src/thank-you.html`

The Eleventy blog layout (`src/_includes/layouts/*.njk`) is handled in Phase 3d, not here.

- [ ] **Step 1: Update inline Tailwind config in every page**

In every HTML file listed above, find this block:

```html
<script>
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    'anchor-navy': '#1f2937',
                    'coast-sky': '#38bdf8',
                    'sand-beige': '#f2f2f0',
                    'dark-text': '#111827'
                }
            }
        }
    }
</script>
```

Replace with:

```html
<script>
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    'ink': '#0A0A0A',
                    'surface': '#FAFAF7',
                    'surface-alt': '#FFFFFF',
                    'accent': '#38bdf8',
                    'muted': '#6B7280',
                    'line': '#E7E5E0',
                    /* legacy names mapped to new palette */
                    'anchor-navy': '#0A0A0A',
                    'coast-sky': '#38bdf8',
                    'sand-beige': '#FAFAF7',
                    'dark-text': '#0A0A0A'
                }
            }
        }
    }
</script>
```

- [ ] **Step 2: Replace the top nav `<nav>` block in every page**

In every page, find the current `<nav class="fixed w-full bg-white shadow-md z-50">…</nav>` block (typically lines ~136-157) AND the `<div id="mobile-menu" …>…</div>` block right after (typically ~159-172). Replace **both** with the unified new chrome:

```html
<nav class="fixed w-full bg-white z-50" style="border-bottom: 1px solid var(--line);">
    <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <a href="/" class="text-xl font-poppins font-bold" style="color: var(--ink);">Anchor Web Co.</a>
        <button id="mobile-menu-button" class="xl:hidden" aria-label="Toggle menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        </button>
        <div class="hidden xl:flex items-center gap-8 text-sm">
            <a href="/#work" class="nav-link">Work</a>
            <div class="has-dropdown">
                <a href="#" class="nav-link" aria-haspopup="true" aria-expanded="false">Services</a>
                <div class="dropdown-menu" role="menu">
                    <a href="/web-design-hervey-bay.html">Web Design — Hervey Bay</a>
                    <a href="/web-design-maryborough.html">Web Design — Maryborough</a>
                    <a href="/seo-hervey-bay.html">SEO — Hervey Bay</a>
                    <a href="/seo-maryborough.html">SEO — Maryborough</a>
                    <hr class="divider" style="margin: 6px 8px;">
                    <a href="/website-care-plans.html">Website Care Plans</a>
                    <a href="/free-website-audit-hervey-bay.html">Free Website Audit</a>
                </div>
            </div>
            <a href="/about.html" class="nav-link">About</a>
            <a href="/blog/" class="nav-link">Blog</a>
            <a href="/contact.html" class="nav-button">Get a quote</a>
        </div>
    </div>
</nav>
<div id="mobile-menu" class="fixed inset-0 z-50 bg-white flex-col items-center justify-center space-y-6 text-xl font-poppins font-bold hidden transition-all duration-300">
    <button id="mobile-menu-close" class="absolute top-6 right-6 text-4xl" style="color: var(--ink);" aria-label="Close menu">&times;</button>
    <nav class="flex flex-col items-center space-y-4 mt-12 w-full px-6">
        <a href="/#work" class="nav-link">Work</a>
        <details class="w-full text-center">
            <summary class="nav-link cursor-pointer list-none">Services</summary>
            <div class="flex flex-col items-center gap-3 mt-3 text-base font-normal">
                <a href="/web-design-hervey-bay.html" class="nav-link">Web Design — Hervey Bay</a>
                <a href="/web-design-maryborough.html" class="nav-link">Web Design — Maryborough</a>
                <a href="/seo-hervey-bay.html" class="nav-link">SEO — Hervey Bay</a>
                <a href="/seo-maryborough.html" class="nav-link">SEO — Maryborough</a>
                <a href="/website-care-plans.html" class="nav-link">Website Care Plans</a>
                <a href="/free-website-audit-hervey-bay.html" class="nav-link">Free Website Audit</a>
            </div>
        </details>
        <a href="/about.html" class="nav-link">About</a>
        <a href="/blog/" class="nav-link">Blog</a>
        <a href="/contact.html" class="nav-button mt-4">Get a quote</a>
    </nav>
</div>
```

Then in the new `<nav>` block, mark the **current page** as active by adding `style="color: var(--accent);"` to the matching nav link. (For `about.html` add it to `About`; for service pages add it to the matching Services dropdown item; for the homepage no link is "active" since `/` is the logo home.)

- [ ] **Step 3: Replace footer in every page**

Find the existing `<footer class="bg-anchor-navy text-white py-8">…</footer>` block. Replace with:

```html
<footer class="py-16" style="background: var(--ink); color: #fff;">
    <div class="container mx-auto px-4">
        <div class="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div>
                <h3 class="text-xl font-poppins font-bold mb-4">Anchor Web Co.</h3>
                <p style="color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.6;">Local web design and SEO. Maryborough, QLD.</p>
            </div>
            <div>
                <h3 class="text-sm font-poppins font-bold mb-4" style="text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.6);">Services</h3>
                <ul class="space-y-2" style="font-size: 15px;">
                    <li><a href="/web-design-hervey-bay.html" class="text-white hover:text-coast-sky">Web Design Hervey Bay</a></li>
                    <li><a href="/web-design-maryborough.html" class="text-white hover:text-coast-sky">Web Design Maryborough</a></li>
                    <li><a href="/seo-hervey-bay.html" class="text-white hover:text-coast-sky">SEO Hervey Bay</a></li>
                    <li><a href="/seo-maryborough.html" class="text-white hover:text-coast-sky">SEO Maryborough</a></li>
                    <li><a href="/website-care-plans.html" class="text-white hover:text-coast-sky">Website Care Plans</a></li>
                </ul>
            </div>
            <div>
                <h3 class="text-sm font-poppins font-bold mb-4" style="text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.6);">Get in touch</h3>
                <ul class="space-y-2" style="font-size: 15px;">
                    <li><a href="tel:+61439499944" class="text-white hover:text-coast-sky">0439 499 944</a></li>
                    <li><a href="mailto:info@anchorwebco.com.au" class="text-white hover:text-coast-sky">info@anchorwebco.com.au</a></li>
                    <li style="color: rgba(255,255,255,0.7);">Maryborough, QLD 4650</li>
                    <li><a href="/free-website-audit-hervey-bay.html" class="text-white hover:text-coast-sky">Free Website Audit</a></li>
                    <li><a href="/health-check.html" class="text-white hover:text-coast-sky">Website Health Check</a></li>
                    <li><a href="/about.html" class="text-white hover:text-coast-sky">About</a></li>
                    <li><a href="/blog/" class="text-white hover:text-coast-sky">Blog</a></li>
                </ul>
            </div>
        </div>
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 48px 0 24px;">
        <p class="text-sm text-center" style="color: rgba(255,255,255,0.5);">&copy; <span class="copyright-year">2026</span> Anchor Web Co.</p>
    </div>
</footer>
```

- [ ] **Step 4: Remove the floating WhatsApp button from every page EXCEPT contact.html**

Find and delete the `<a href="https://wa.me/61439499944" …>` block (typically immediately before `<!-- JavaScript -->`) on every page **except `contact.html`**. The WhatsApp button stays on `contact.html` exactly as it is for now — Task 3c will move it inline.

- [ ] **Step 5: Restyle scroll-top button**

In `src/css/styles.css:362-373`, replace `#scroll-top` block with:

```css
#scroll-top {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    background: var(--ink);
    color: #fff;
    padding: 0.75rem;
    border-radius: 9999px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    border: 0;
}
```

- [ ] **Step 6: Build + crawl test**

```bash
npm run build
npm run test:crawl
```

Expected: both succeed. Pages will look ugly mid-refresh (new chrome on old bodies) but nothing should break. Click around `_site/index.html`, `_site/about.html`, `_site/contact.html` in a browser to confirm nav + footer render and links work.

- [ ] **Step 7: Commit and push**

```bash
git add src/css/styles.css src/*.html
git commit -m "Update shared nav, footer, and Tailwind config across all pages

Slims top nav from 10 items to 4 + dropdown, drops the navy header in
favour of a hairline bottom border, and unifies the footer into a
three-column ink-on-white layout. WhatsApp removed from chrome on
every page except contact.html (Phase 3c surfaces it inline there)."
git push origin site-refresh
```

---

## Phase 3 — Page body rewrites (parallel)

**Coordinator note:** After Phase 2 pushes `site-refresh`, dispatch Tasks 3a, 3b, 3c, 3d in parallel. Each runs in its own git worktree forked from `site-refresh`. Each touches disjoint files, so no merge conflicts are expected. Each agent reads `docs/superpowers/specs/2026-05-14-site-refresh-design.md` for context.

---

### Task 3a: Homepage rewrite

**Worktree:** `../site-refresh-homepage` (created from `site-refresh`)

**Files:**
- Modify: `src/index.html` (full body rewrite, head stays)

- [ ] **Step 1: Read design spec sections "Homepage architecture" and "Visual system"**

Read `docs/superpowers/specs/2026-05-14-site-refresh-design.md` — sections "Homepage architecture (5 sections)" and "Visual system."

- [ ] **Step 2: Rewrite the homepage body**

Keep the existing `<head>` and the nav/footer/floating-buttons that Phase 2 installed. Replace everything between the closing `</div>` of `#mobile-menu` and the opening of `<footer>` (i.e., the page's main content) with the five sections below.

The full replacement body (between mobile-menu close and footer open) is:

```html
<!-- === SECTION 1: HERO === -->
<section id="main-content" class="section-pad hero-gradient" style="padding-top: 140px;">
    <div class="container mx-auto px-4">
        <div class="prose-narrow" style="max-width: 880px;">
            <p class="eyebrow">Maryborough · Fraser Coast</p>
            <h1 class="display" style="margin-bottom: 24px;">Local websites,<br>built to work.</h1>
            <p class="body-muted" style="font-size: 20px; max-width: 56ch; margin-bottom: 36px;">Web design and SEO for Fraser Coast businesses. Fixed price. Live in weeks.</p>
            <div class="flex flex-col sm:flex-row gap-4" style="margin-bottom: 24px;">
                <a href="/contact.html" class="btn-primary">Start a project</a>
                <a href="#work" class="btn-secondary">See our work</a>
            </div>
            <p class="hero-meta">Fixed-fee · No lock-ins · Live in 2–4 weeks</p>
        </div>
    </div>
</section>

<!-- === SECTION 2: WORK === -->
<section id="work" class="section-pad" style="background: var(--surface-alt);">
    <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
            <h2 class="h2" style="margin-bottom: 48px;">Work</h2>
            <div class="grid md:grid-cols-3 gap-8">
                <a href="https://www.bhlockandsecurity.com/" target="_blank" rel="noopener noreferrer" class="work-card">
                    <div class="work-card__image" style="background: var(--surface); display: flex; align-items: center; justify-content: center;">
                        <img src="/img/bh-lock.webp" alt="BH Lock and Security" style="max-height: 60%; max-width: 60%; object-fit: contain;">
                    </div>
                    <div class="work-card__body">
                        <p class="work-card__client">BH Lock and Security</p>
                        <p class="work-card__outcome">Locksmith website rebuilt for stronger local search and clearer service paths.</p>
                        <span class="text-sm font-medium" style="color: var(--accent);">Visit site →</span>
                    </div>
                </a>
                <a href="https://maryboroughmowerman.com.au/" target="_blank" rel="noopener noreferrer" class="work-card">
                    <div class="work-card__image" style="background: var(--surface); display: flex; align-items: center; justify-content: center;">
                        <img src="/img/favicon-mower.webp" alt="Maryborough Mowerman" style="max-height: 60%; max-width: 60%; object-fit: contain;">
                    </div>
                    <div class="work-card__body">
                        <p class="work-card__client">Maryborough Mowerman</p>
                        <p class="work-card__outcome">Mobile-first service site that turns local searches into booked jobs.</p>
                        <span class="text-sm font-medium" style="color: var(--accent);">Visit site →</span>
                    </div>
                </a>
                <a href="https://coastwideexteriors.com.au/" target="_blank" rel="noopener noreferrer" class="work-card">
                    <div class="work-card__image" style="background: var(--surface); display: flex; align-items: center; justify-content: center;">
                        <img src="/img/coastwide-exterior-cleaning.webp" alt="Coastwide Exterior Cleaning" style="max-height: 60%; max-width: 60%; object-fit: contain;">
                    </div>
                    <div class="work-card__body">
                        <p class="work-card__client">Coastwide Exterior Cleaning</p>
                        <p class="work-card__outcome">Service-led rebuild with before/after proof and direct quote pathways.</p>
                        <span class="text-sm font-medium" style="color: var(--accent);">Visit site →</span>
                    </div>
                </a>
            </div>
        </div>
    </div>
</section>

<!-- === SECTION 3: HOW IT WORKS === -->
<section class="section-pad">
    <div class="container mx-auto px-4">
        <div class="prose-narrow" style="max-width: 920px;">
            <h2 class="h2" style="margin-bottom: 48px;">How it works</h2>
            <div class="step-card">
                <p class="step-card__num">01 — SCOPE</p>
                <h3 class="step-card__title">Scope</h3>
                <p class="step-card__body">We have a 30-minute call. You get a fixed-fee proposal within 48 hours — clear scope, clear price, no follow-up surprises.</p>
            </div>
            <div class="step-card">
                <p class="step-card__num">02 — BUILD</p>
                <h3 class="step-card__title">Build</h3>
                <p class="step-card__body">Mobile-first build with on-page SEO baked in from day one. You review at two milestones so there are no end-of-project surprises.</p>
            </div>
            <div class="step-card" style="border-bottom: 1px solid var(--line);">
                <p class="step-card__num">03 — LAUNCH</p>
                <h3 class="step-card__title">Launch</h3>
                <p class="step-card__body">Live in 2–4 weeks. Optional light support after — no lock-in contract, no retainer required.</p>
            </div>
        </div>
    </div>
</section>

<!-- === SECTION 4: PROOF === -->
<section class="section-pad" style="background: var(--surface-alt);">
    <div class="container mx-auto px-4">
        <div class="prose-narrow" style="max-width: 880px; text-align: center;">
            <blockquote style="font-family: 'Poppins', sans-serif; font-weight: 700; font-size: clamp(28px, 3vw, 40px); line-height: 1.25; color: var(--ink); margin: 0 0 32px;">
                "Best web design company in Maryborough. Our new website looks amazing, loads quickly, and we're getting more leads from Google."
            </blockquote>
            <p class="body-muted" style="font-size: 15px;">Link Stevens · Google review</p>
            <p class="body-muted" style="font-size: 15px; margin-top: 24px;">Rated 5-star by Fraser Coast businesses on Google.</p>
        </div>
    </div>
</section>

<!-- === SECTION 5: FINAL CTA === -->
<section class="section-pad" style="background: var(--surface);">
    <div class="container mx-auto px-4">
        <div class="prose-narrow" style="max-width: 720px; text-align: center;">
            <h2 class="h2" style="margin-bottom: 32px;">Ready to start?</h2>
            <a href="/contact.html" class="btn-primary" style="font-size: 17px;">Get a project quote</a>
            <p class="hero-meta" style="margin-top: 32px;">Maryborough, QLD · <a href="tel:+61439499944" style="color: var(--ink); text-decoration: underline;">0439 499 944</a> · <a href="mailto:info@anchorwebco.com.au" style="color: var(--ink); text-decoration: underline;">info@anchorwebco.com.au</a></p>
        </div>
    </div>
</section>
```

- [ ] **Step 3: Remove unused JS from homepage**

In `src/index.html`, find and delete these `<script>` tags from the body bottom:

```html
<script src="js/google-reviews-data.js" defer></script>
<script src="js/google-reviews.js" defer></script>
```

Keep: `js/main.js`, the gtag scripts.

- [ ] **Step 4: Update homepage meta description**

Update the `<meta name="description">` to a shorter, calmer line. Replace existing description with:

```
Local web design and SEO for Fraser Coast businesses. Fixed-fee builds, live in 2–4 weeks. Based in Maryborough.
```

Apply the same string to the og:description and twitter:description meta tags.

- [ ] **Step 5: Build and visually verify**

```bash
npm run build
open _site/index.html
```

Expected: homepage shows the new five sections, soft gradient hero, three work cards, three numbered process steps, single pull quote, final CTA. Buttons are dark, not orange. Top nav shows: Work · Services ▾ · About · Blog · Get a quote button.

- [ ] **Step 6: Commit**

```bash
git add src/index.html
git commit -m "Rewrite homepage to five-section minimal layout

Hero compressed from ~80 words to ~25, gradient background, single
primary CTA. Three featured work cards replace the four-logo grid;
three numbered process steps replace the services/areas/why-us trio;
one pull quote replaces the rotating review carousel. Removes the
Google reviews JS bundle from this page."
```

---

### Task 3b: Service pages refresh

**Worktree:** `../site-refresh-services` (created from `site-refresh`)

**Files:**
- Modify: `src/web-design-hervey-bay.html`
- Modify: `src/web-design-maryborough.html`
- Modify: `src/seo-hervey-bay.html`
- Modify: `src/seo-maryborough.html`

**Scope:** Apply the new visual system to each service page. Cut filler. Keep all SEO content — these pages are the keyword workhorses — but restructure into proper sections with whitespace rather than walls.

- [ ] **Step 1: Read the spec**

Read `docs/superpowers/specs/2026-05-14-site-refresh-design.md` (especially "Visual system" and "Per-page treatment").

- [ ] **Step 2: For each of the four service pages, apply this treatment:**

For each page (do one at a time, commit between each):

1. **Hero block** — find the existing top `<section>` containing the H1 and replace it with a hero in the new pattern:
   ```html
   <section class="section-pad hero-gradient" style="padding-top: 140px;">
       <div class="container mx-auto px-4">
           <div class="prose-narrow" style="max-width: 880px;">
               <p class="eyebrow">[Service Type] · [Location]</p>
               <h1 class="display" style="margin-bottom: 24px;">[Existing H1 verbatim — preserves keyword]</h1>
               <p class="body-muted" style="font-size: 20px; max-width: 56ch; margin-bottom: 36px;">[ONE sentence summarising the value prop, ≤25 words, taken from the page's existing intro and tightened]</p>
               <div class="flex flex-col sm:flex-row gap-4">
                   <a href="/contact.html" class="btn-primary">Start a project</a>
                   <a href="#services" class="btn-secondary">See what's included</a>
               </div>
           </div>
       </div>
   </section>
   ```
   Preserve the exact H1 text (it carries the page's primary keyword). Tighten the intro paragraph drastically.

2. **Body sections** — every below-hero `<section>` keeps its content but:
   - Wrap each in `<section class="section-pad">` (replacing `py-16`/`py-12`/etc.)
   - Alternate backgrounds: first body section gets `style="background: var(--surface-alt);"`, next stays default, etc.
   - Add `<div class="prose-narrow">` wrapper inside the container for narrative sections (prose with H2 + paragraphs)
   - Replace H2 elements that use `text-3xl font-poppins font-bold` with `class="h2"`
   - Remove any inline `<p>` that's purely an SEO link-stuffer paragraph (multiple links to sister service pages in one sentence — those links live in the nav now)

3. **Trim link-stuffer paragraphs** — search each page for paragraphs containing 3+ internal links to other service pages in one sentence and either:
   - Convert to a clean "Related services" card section near the bottom, or
   - Delete them entirely if redundant with nav

4. **Remove decorative inline gradients** — any `style="background: linear-gradient(...)"` on body sections gets removed; let the alternating `--surface` / `--surface-alt` carry the rhythm.

5. **Final CTA section** — ensure each page ends (before the footer) with a CTA section matching the homepage's Section 5 pattern, but with copy customised to the service:
   ```html
   <section class="section-pad" style="background: var(--surface);">
       <div class="container mx-auto px-4">
           <div class="prose-narrow" style="max-width: 720px; text-align: center;">
               <h2 class="h2" style="margin-bottom: 32px;">Ready to [start your Hervey Bay site / improve your local SEO / etc.]?</h2>
               <a href="/contact.html" class="btn-primary">Get a project quote</a>
               <p class="hero-meta" style="margin-top: 32px;">Maryborough, QLD · 0439 499 944</p>
           </div>
       </div>
   </section>
   ```

- [ ] **Step 3: After each page, build and view**

```bash
npm run build
open _site/web-design-hervey-bay.html   # (or whichever page)
```

Verify: hero is tight, sections breathe, fonts/colours match homepage, nav and footer match.

- [ ] **Step 4: Commit per page**

Four commits, one per page. Example:

```bash
git add src/web-design-hervey-bay.html
git commit -m "Refresh web design Hervey Bay page to new visual system

Hero compressed to title + one-line value prop. Body sections wrapped
in section-pad with alternating surface backgrounds. Link-stuffer
paragraphs removed; SEO content preserved in proper sections. Final
CTA added in the new pattern."
```

Repeat for the other three pages.

- [ ] **Step 5: Final build + crawl**

```bash
npm run build && npm run test:crawl
```

Expected: build clean, crawl passes.

---

### Task 3c: Supporting pages refresh

**Worktree:** `../site-refresh-support` (created from `site-refresh`)

**Files:**
- Modify: `src/about.html`
- Modify: `src/contact.html`
- Modify: `src/website-care-plans.html`
- Modify: `src/free-website-audit-hervey-bay.html`
- Modify: `src/health-check.html`
- Modify: `src/thank-you.html`

**Scope:** Apply the new visual system. These pages are mostly mechanical token application — no narrative rewrite required, but cut anything that doesn't earn its place. `contact.html` gets two extra changes: absorb the homepage FAQ block, and surface the WhatsApp link inline.

- [ ] **Step 1: For each page apply the standard treatment**

Same pattern as Task 3b's step 2 — wrap sections in `section-pad`, alternate `--surface` / `--surface-alt` backgrounds, replace orange CTAs with the new `btn-primary` (already restyled in Phase 1), replace large H2 elements with `class="h2"`, tighten hero copy to title + ≤25-word sub.

- [ ] **Step 2: contact.html — absorb FAQ and surface WhatsApp**

After the contact form section in `src/contact.html`, add a new section with the four FAQ items from the homepage (copy the entire `<div class="space-y-6 max-w-3xl mx-auto">…</div>` block from the current `src/index.html` lines 453-471 — note these will already be removed in Task 3a's worktree, so source them from `main` before that lands or from the design spec).

The four FAQs to include verbatim:
- "How much does a website cost?"
- "How long does it take to build a website?"
- "Do you help with SEO as well?"
- "Do you work outside Maryborough and Hervey Bay?"

Wrap the FAQ section in:

```html
<section class="section-pad" style="background: var(--surface-alt);">
    <div class="container mx-auto px-4">
        <div class="prose-narrow" style="max-width: 720px;">
            <h2 class="h2" style="margin-bottom: 32px;">Common questions</h2>
            <!-- four FAQ items here, restyled minimal -->
        </div>
    </div>
</section>
```

Each FAQ item:

```html
<details class="step-card" style="border-bottom: 1px solid var(--line);">
    <summary class="step-card__title cursor-pointer" style="list-style: none;">[Question]</summary>
    <p class="step-card__body" style="margin-top: 12px;">[Answer]</p>
</details>
```

Also keep the JSON-LD FAQPage script from the homepage and add it to `src/contact.html` `<head>`.

For WhatsApp, in the existing contact options (phone, email), add a third option:

```html
<a href="https://wa.me/61439499944" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="display: inline-flex; align-items: center; gap: 8px;">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
    Chat on WhatsApp
</a>
```

The floating WhatsApp button stays on `contact.html` (Phase 2 only removed it from other pages); you can optionally also remove it from `contact.html` if the inline button is enough.

- [ ] **Step 3: Build + visually verify each page**

```bash
npm run build
open _site/about.html _site/contact.html _site/website-care-plans.html
open _site/free-website-audit-hervey-bay.html _site/health-check.html _site/thank-you.html
```

- [ ] **Step 4: Commit per page**

Six small commits, one per page. Example:

```bash
git add src/about.html
git commit -m "Refresh about page to new visual system"
```

For contact: `"Refresh contact page; absorb FAQ block from homepage; surface WhatsApp inline"`.

---

### Task 3d: Blog template polish

**Worktree:** `../site-refresh-blog` (created from `site-refresh`)

**Files:**
- Modify: `src/_includes/layouts/blog-listing.njk` (if it exists — otherwise the layout is defined inline in `src/blog/index.njk`)
- Modify: `src/_includes/layouts/blog-post.njk` (if it exists — locate from the markdown post frontmatter `layout:` field)
- Modify: `src/blog/index.njk`
- Modify: `src/css/blog.css`

**Scope:** Coat of paint — apply tokens, tighten spacing, match the new visual system. Already reasonably clean; this is polish, not a rewrite.

- [ ] **Step 1: Locate the blog layouts**

```bash
find src/_includes -name "*.njk" -type f
grep -l "layout:" src/blog/posts/*.md | head -1 | xargs head -10
```

Identify the layout files used by the blog index and individual posts.

- [ ] **Step 2: Replace token references in blog.css**

In `src/css/blog.css`, find any usage of:
- `#1f2937` → `var(--ink)`
- `#111827` → `var(--ink)`
- `#f2f2f0` → `var(--surface)`
- `var(--anchor-navy)` → `var(--ink)`
- `var(--dark-text)` → `var(--ink)`
- `var(--sand-beige)` → `var(--surface)`

Leave `var(--coast-sky)` and `#38bdf8` alone (these correctly resolve to `--accent`).

- [ ] **Step 3: Update blog listing typography**

In the blog listing layout (`src/blog/index.njk` or its layout file), update the page H1 to use `class="display"` and the intro paragraph to use `class="body-muted"`. Wrap the listing section in `section-pad`. Replace any custom blog-card padding/border with the `var(--line)` border treatment used by `work-card`.

- [ ] **Step 4: Update blog post layout**

Update the article H1 to use `class="display"` and the article body wrapper to `body-lg` with `max-width: 720px` for readable measure. Replace bespoke meta-line colors with `var(--muted)`.

- [ ] **Step 5: Build + verify**

```bash
npm run build
open _site/blog/index.html
open _site/blog/local-seo-hervey-bay/index.html
```

Verify: blog list page and one sample post both look tighter, match the homepage tone.

- [ ] **Step 6: Commit**

```bash
git add src/_includes src/blog src/css/blog.css
git commit -m "Refresh blog templates and styles to new visual system

Listing + post layouts use the new display + body tokens. Card
treatment matches the homepage work-card pattern. blog.css tokens
collapsed onto the canonical ink/surface/accent set."
```

---

## Phase 4 — Integration and verification (sequential, single agent)

### Task 4.1: Merge parallel work, verify, deploy

- [ ] **Step 1: Pull the parallel agents' work back to `site-refresh`**

Each parallel agent worked in a worktree off `site-refresh` and pushed a branch:
- `site-refresh-homepage`
- `site-refresh-services`
- `site-refresh-support`
- `site-refresh-blog`

```bash
git fetch origin
git branch -r | grep site-refresh
```

Confirm all four exist.

- [ ] **Step 2: Merge each branch into `site-refresh` (not main yet)**

```bash
git checkout site-refresh
git pull origin site-refresh
git merge --no-ff origin/site-refresh-homepage -m "Merge homepage refresh"
git merge --no-ff origin/site-refresh-services -m "Merge service pages refresh"
git merge --no-ff origin/site-refresh-support  -m "Merge supporting pages refresh"
git merge --no-ff origin/site-refresh-blog     -m "Merge blog templates refresh"
```

If any merge has conflicts: stop, surface to user, do not resolve speculatively.

- [ ] **Step 3: Build + crawl**

```bash
npm run build
npm run test:crawl
```

Expected: build clean, crawl passes.

- [ ] **Step 4: Local visual smoke**

Open every page locally and check:
- Nav identical on all pages, current page highlighted
- Footer identical on all pages
- Hero gradient renders on homepage; service pages have hero blocks
- No orange buttons anywhere
- No `text-anchor-navy` rendering as the old navy grey
- WhatsApp floating button absent from every page except contact

```bash
for p in index about contact web-design-hervey-bay web-design-maryborough seo-hervey-bay seo-maryborough website-care-plans free-website-audit-hervey-bay health-check thank-you; do open _site/$p.html; done
open _site/blog/index.html
```

- [ ] **Step 5: Surface to user before promoting to main**

Pause here. Report status. Ask the user to review the integrated `site-refresh` branch locally before merging to main, since this is the final gate before the live site changes.

- [ ] **Step 6: On user approval, merge to main**

```bash
git checkout main
git pull origin main
git merge --ff-only origin/site-refresh
git push origin main
```

This triggers the existing `deploy.yml` workflow (S3 sync + CloudFront function publish + cache invalidation).

- [ ] **Step 7: Watch the deploy + live verification**

```bash
sleep 10
RUN_ID=$(gh run list --workflow=deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
curl -sI https://www.anchorwebco.com.au/ | head -4
curl -s https://www.anchorwebco.com.au/ | grep -oE 'Local websites|Web Design and SEO for Fraser Coast' | head -3
```

Expected: 200 OK, response body contains "Local websites" (new headline). Manually browse the live site: nav, footer, homepage hero, service page, blog. Flag visual regressions.

---

## Out of scope (deferred)

- Real screenshots of the three featured client sites (placeholders use existing logo art for now)
- Extracting nav/footer into an Eleventy `_includes` partial
- Performance / bundling work
- Replacing the existing FAQ JSON-LD schema if the homepage version is removed (homepage keeps its head-only schema even after the FAQ section moves to contact)
- Any blog post content edits
