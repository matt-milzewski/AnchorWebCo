const assert = require("node:assert/strict");

const origin = (process.env.PRODUCTION_ORIGIN || "https://www.anchorwebco.com.au").replace(/\/$/, "");
const formsApiBase = String(process.env.ANCHOR_FORMS_API_BASE || "").replace(/\/$/, "");
const retiredContent = /Maryborough|Hervey Bay|Fraser Coast|BH Lock|bhlocks|bh-lock/i;
const requiredPages = [
  "/",
  "/pricing.html",
  "/website-care-plans.html",
  "/website-planner.html",
  "/web-design-brisbane-tradies.html",
  "/work.html",
  "/contact.html",
  "/privacy.html",
];

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
  assert.equal(payload.autoReplyEnabled, true, "Forms API auto-reply is not enabled");
}

async function main() {
  for (const pathname of requiredPages) {
    await verifyHtml(pathname);
    console.log(`PASS ${pathname}`);
  }
  await verifyRedirect("/free-website-audit-brisbane.html", "/health-check.html");
  console.log("PASS retired audit redirect");
  await verifyFormsApi();
  console.log("PASS forms API Lambda and site configuration");
  console.log(`Verified ${requiredPages.length} production pages, redirects, metadata, schema and the first-party forms endpoint.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
