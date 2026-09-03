const assert = require("node:assert/strict");

const origin = (process.env.PRODUCTION_ORIGIN || "https://www.anchorwebco.com.au").replace(/\/$/, "");
const formsApiBase = String(process.env.ANCHOR_FORMS_API_BASE || "").replace(/\/$/, "");
const retiredContent = /Maryborough|Hervey Bay|Fraser Coast|BH Lock|bhlocks|bh-lock/i;
const requiredPages = [
  "/",
  "/web-design-brisbane-inner-west.html",
  "/web-design-red-hill.html",
  "/web-design-paddington-brisbane.html",
  "/web-design-ashgrove-brisbane.html",
  "/local-seo-brisbane-inner-west.html",
  "/pricing.html",
  "/website-care-plans.html",
  "/website-planner.html",
  "/web-design-brisbane-tradies.html",
  "/web-design-cleaners-brisbane.html",
  "/web-design-electricians-brisbane.html",
  "/web-design-security-companies-brisbane.html",
  "/web-design-plumbers-brisbane.html",
  "/work/coastwide-exterior-cleaning-website.html",
  "/work/bannister-communications-website.html",
  "/blog/what-should-cleaning-business-website-include/",
  "/blog/showcase-before-after-cleaning-work/",
  "/blog/what-should-electrician-website-include/",
  "/blog/electrician-better-quote-enquiries/",
  "/blog/what-should-plumbing-website-include/",
  "/blog/what-should-security-company-website-include/",
  "/work.html",
  "/contact.html",
  "/privacy.html",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(url, {
      redirect: options.redirect || "follow",
      cache: "no-store",
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyHtml(pathname) {
  const response = await request(`${origin}${pathname}`, {
    headers: { "cache-control": "no-cache", "user-agent": "AnchorWebCo-Production-Verify/1.0" },
  });
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`);
  const html = await response.text();
  assert.match(html, /<title>[^<]+<\/title>/, `${pathname}: missing title`);
  assert.match(html, /<meta name="description" content="[^"]+">/, `${pathname}: missing description`);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.anchorwebco\.com\.au\/[^"]*">/, `${pathname}: missing canonical`);
  assert.doesNotMatch(html, retiredContent, `${pathname}: retired content is present`);
  assert.doesNotMatch(html, /__ANCHOR_[A-Z_]+__/, `${pathname}: unresolved runtime placeholder`);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${pathname}: invalid JSON-LD`);
  }
  return html;
}

async function verifyPublicFile(pathname, expectedContentType) {
  const response = await request(`${origin}${pathname}`, {
    headers: { "cache-control": "no-cache", "user-agent": "AnchorWebCo-Production-Verify/1.0" },
  });
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`);
  assert.match(response.headers.get("content-type") || "", expectedContentType, `${pathname}: unexpected content type`);
  return response.text();
}

async function verifyRedirect(fromPath, expectedPath) {
  const response = await request(`${origin}${fromPath}`, { redirect: "manual" });
  assert.equal(response.status, 301, `${fromPath}: expected 301`);
  const location = new URL(response.headers.get("location"), origin);
  assert.equal(location.pathname, expectedPath, `${fromPath}: unexpected redirect ${location.href}`);
}

async function verifyFormsApi() {
  assert.ok(formsApiBase, "ANCHOR_FORMS_API_BASE is required for production verification");
  const response = await request(`${formsApiBase}/api/forms/anchor-web-co`, {
    headers: {
      origin,
      accept: "application/json",
    },
  });
  assert.equal(response.status, 200, `Forms API health check returned ${response.status}`);
  assert.equal(response.headers.get("access-control-allow-origin"), origin, "Forms API CORS origin mismatch");
  const payload = await response.json();
  assert.equal(payload.ok, true, "Forms API did not report a healthy configuration");
  assert.equal(payload.siteId, "anchor-web-co", "Forms API returned the wrong site configuration");
  assert.equal(
    payload.autoReplyEnabled,
    payload.challengeRequired,
    "Forms API auto-reply must stay disabled until the server challenge is active",
  );
}

async function verifyAnalytics(homeHtml) {
  const match = homeHtml.match(
    /<script src="([^"]+)" data-client-id="anchorwebco" data-endpoint="([^"]+)" defer><\/script>/,
  );
  assert.ok(match, "Home page is missing the configured first-party analytics script");

  const scriptUrl = new URL(match[1], origin);
  const ingestUrl = new URL(match[2], origin);
  assert.equal(scriptUrl.protocol, "https:", "Analytics script URL must use HTTPS");
  assert.equal(ingestUrl.protocol, "https:", "Analytics ingest URL must use HTTPS");

  const scriptResponse = await request(scriptUrl, {
    headers: { "cache-control": "no-cache", "user-agent": "AnchorWebCo-Production-Verify/1.0" },
  });
  assert.equal(scriptResponse.status, 200, `Analytics script returned ${scriptResponse.status}`);
  assert.match(
    scriptResponse.headers.get("content-type") || "",
    /(?:application|text)\/javascript/i,
    "Analytics script has an unexpected content type",
  );
  const scriptBody = await scriptResponse.text();
  assert.match(scriptBody, /website-plan-complete/, "Analytics script is missing the expected planner event");
  assert.match(scriptBody, /sendBeacon\(endpoint, payload\)/, "Analytics script is missing the CORS-safe Beacon transport");
  assert.doesNotMatch(scriptBody, /new Blob\(\[payload\].*application\/json/, "Analytics script still uses the broken JSON Blob Beacon transport");

  const ingestResponse = await request(ingestUrl, {
    method: "OPTIONS",
    headers: {
      origin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
      "user-agent": "AnchorWebCo-Production-Verify/1.0",
    },
  });
  assert.ok([200, 204].includes(ingestResponse.status), `Analytics ingest preflight returned ${ingestResponse.status}`);
  assert.ok(
    [origin, "*"].includes(ingestResponse.headers.get("access-control-allow-origin")),
    "Analytics ingest CORS origin mismatch",
  );

  assert.match(homeHtml, /<script src="\/js\/posthog-init\.js" defer><\/script>/, "Home page is missing PostHog");
  assert.doesNotMatch(homeHtml, /id="analytics-consent"/, "Home page still contains the analytics banner");
  assert.match(homeHtml, /id="analytics-settings"[^>]*>Limit analytics<\/button>/, "Home page is missing the analytics limit control");
  assert.match(homeHtml, /gtag\('consent', 'default'/, "Google Consent Mode is missing");
  assert.match(homeHtml, /anchor_analytics_choice=reject/, "Google Consent Mode does not respect the analytics limit preference");
  assert.match(homeHtml, /analyticsLimited \? 'denied' : 'granted'/, "Google Consent Mode is not enabled by default with an opt-out");
  const posthogScript = await verifyPublicFile("/js/posthog-init.js", /(?:application|text)\/javascript/i);
  assert.doesNotMatch(posthogScript, /__ANCHOR_POSTHOG_/, "PostHog runtime configuration was not resolved");
  assert.match(posthogScript, /cookieless_mode:\s*"on_reject"/, "PostHog is not configured for consent-aware cookieless collection");
  assert.match(posthogScript, /readConsentChoice\(\) \|\| "accept"/, "PostHog is not enabled by default");
  assert.match(posthogScript, /person_profiles:\s*"never"/, "PostHog person profiles must remain disabled");
  assert.match(posthogScript, /blockSelector:\s*"form, \[data-ph-block\]"/, "PostHog session replay is not blocking forms");
  assert.match(posthogScript, /get_explicit_consent_status/, "PostHog does not check for an explicit analytics choice");
  assert.match(posthogScript, /opt_in_capturing/, "PostHog cannot enable replay after consent");
  assert.match(posthogScript, /opt_out_capturing/, "PostHog cannot keep rejected visitors cookieless");
}

async function main() {
  const pageHtml = new Map();
  for (const pathname of requiredPages) {
    pageHtml.set(pathname, await verifyHtml(pathname));
    console.log(`PASS ${pathname}`);
  }

  const locationChecks = [
    {
      pathname: "/web-design-paddington-brisbane.html",
      title: "Web Design Paddington Brisbane | Anchor Web Co.",
      suburb: "Paddington, Queensland 4064",
      image: "/img/brisbane-inner-west/paddington-latrobe-terrace.webp",
    },
    {
      pathname: "/web-design-ashgrove-brisbane.html",
      title: "Web Design Ashgrove Brisbane | Anchor Web Co.",
      suburb: "Ashgrove, Queensland 4060",
      image: "/img/brisbane-inner-west/ashgrove-monoplane-shops.webp",
    },
  ];

  for (const check of locationChecks) {
    const html = pageHtml.get(check.pathname);
    assert.match(html, new RegExp(`<title>${escapeRegExp(check.title)}</title>`), `${check.pathname}: exact title`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRegExp(origin)}${check.pathname}">`), `${check.pathname}: exact canonical`);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    const service = schemas.find((schema) => schema["@type"] === "Service");
    assert.ok(service, `${check.pathname}: missing Service schema`);
    assert.equal(service.provider["@id"], "https://www.anchorwebco.com.au/#business", `${check.pathname}: provider`);
    assert.equal(service.areaServed.name, check.suburb, `${check.pathname}: areaServed`);
    assert.equal(service.serviceType, "Website design and development", `${check.pathname}: Service type`);
    assert.equal(String(service.offers.lowPrice), "1970", `${check.pathname}: entry build price`);
    assert.ok(schemas.some((schema) => schema["@type"] === "FAQPage"), `${check.pathname}: missing FAQ schema`);
    await verifyPublicFile(check.image, /^image\/webp\b/i);
    console.log(`PASS ${check.pathname} location metadata, schema and hero image`);
  }

  const sitemap = await verifyPublicFile("/sitemap.xml", /(?:application|text)\/xml/i);
  const imageSitemap = await verifyPublicFile("/sitemap-images.xml", /(?:application|text)\/xml/i);
  const robots = await verifyPublicFile("/robots.txt", /^text\/plain\b/i);
  for (const check of locationChecks) {
    assert.match(sitemap, new RegExp(`<loc>${escapeRegExp(origin)}${check.pathname}</loc>`), `${check.pathname}: standard sitemap entry`);
    assert.match(imageSitemap, new RegExp(`<loc>${escapeRegExp(origin)}${check.pathname}</loc>`), `${check.pathname}: image sitemap page entry`);
  }
  for (const pathname of requiredPages.filter((item) => (
    item.startsWith("/web-design-")
    || item.startsWith("/work/")
    || item.startsWith("/blog/")
  ))) {
    assert.match(sitemap, new RegExp(`<loc>${escapeRegExp(origin)}${escapeRegExp(pathname)}</loc>`), `${pathname}: standard sitemap entry`);
  }
  assert.match(robots, /Sitemap:\s*https:\/\/www\.anchorwebco\.com\.au\/sitemap\.xml/i, "robots.txt: standard sitemap");
  assert.match(robots, /Sitemap:\s*https:\/\/www\.anchorwebco\.com\.au\/sitemap-images\.xml/i, "robots.txt: image sitemap");
  console.log("PASS sitemaps and robots discovery");

  await verifyRedirect("/web-design-paddington-brisbane", "/web-design-paddington-brisbane.html");
  await verifyRedirect("/web-design-ashgrove-brisbane", "/web-design-ashgrove-brisbane.html");
  console.log("PASS suburb extensionless canonical redirects");
  await verifyRedirect("/free-website-audit-brisbane.html", "/health-check.html");
  console.log("PASS retired audit redirect");
  await verifyAnalytics(pageHtml.get("/"));
  console.log("PASS analytics script and ingest endpoint");
  await verifyFormsApi();
  console.log("PASS forms API Lambda and site configuration");
  console.log(`Verified ${requiredPages.length} production pages, redirects, metadata, schema, analytics and forms endpoints.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
