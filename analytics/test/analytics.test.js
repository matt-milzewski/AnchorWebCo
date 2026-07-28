const assert = require("node:assert/strict");
const test = require("node:test");
const { aggregateKeysForEvent, totalEnquiriesFromAggregates } = require("../lambda/shared/aggregates");
const { tenantPk } = require("../lambda/shared/events");
const { visitorHash, deriveRegion } = require("../lambda/shared/privacy");
const { calculateFunnels, conversionPriorityFlags, worstAbandonmentField, renderMonthlyReport } = require("../lambda/shared/reporting");
const { previousMonthKey } = require("../lambda/report");
const { domainAllowed, validateEventPayload } = require("../lambda/shared/validation");

const anchorTenant = require("../lambda/tenants/anchorwebco.json");
const bannisterTenant = require("../lambda/tenants/bannister.json");

test("origin validation accepts configured domains and rejects spoofing", () => {
  assert.equal(domainAllowed("https://anchorwebco.com.au", anchorTenant), true);
  assert.equal(domainAllowed("https://www.anchorwebco.com.au/contact.html", anchorTenant), true);
  assert.equal(domainAllowed("https://evil.example", anchorTenant), false);
});

test("visitor hashing is stable within a day and rotates the next day", () => {
  const base = {
    saltSecret: "secret",
    clientId: "anchorwebco",
    ip: "203.0.113.10",
    userAgent: "Mozilla"
  };
  const one = visitorHash({ ...base, date: new Date("2026-06-22T01:00:00Z") });
  const two = visitorHash({ ...base, date: new Date("2026-06-22T22:00:00Z") });
  const three = visitorHash({ ...base, date: new Date("2026-06-23T01:00:00Z") });
  assert.equal(one, two);
  assert.notEqual(one, three);
});

test("region derivation distinguishes Brisbane inner-west and Fraser Coast", () => {
  assert.equal(deriveRegion({ "cloudfront-viewer-city": "Toowong", "cloudfront-viewer-country-region-name": "Queensland" }), "Brisbane inner-west");
  assert.equal(deriveRegion({ "cloudfront-viewer-city": "Red%20Hill", "cloudfront-viewer-country-region-name": "Queensland" }), "Brisbane inner-west");
  assert.equal(deriveRegion({ "cloudfront-viewer-city": "Hervey%20Bay", "cloudfront-viewer-country-region-name": "Queensland" }), "Fraser Coast");
});

test("payload validation requires source attribution but permits a short contact form", () => {
  const missing = validateEventPayload({ client_id: "anchorwebco", type: "form-submit-contact", properties: {} });
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join(" "), /source_page/);

  const valid = validateEventPayload({
    client_id: "anchorwebco",
    type: "form-submit-contact",
    properties: { source_page: "/contact" }
  });
  assert.equal(valid.ok, true);
});

test("health-check conversions are first-class analytics events", () => {
  const valid = validateEventPayload({
    client_id: "anchorwebco",
    type: "form-submit-health-check",
    properties: { source_page: "/health-check" }
  });
  assert.equal(valid.ok, true);

  const keys = aggregateKeysForEvent({
    type: "form-submit-health-check",
    path: "/health-check",
    received_at: "2026-07-28T03:00:00.000Z",
    properties: { source_page: "/health-check" },
    device: "mobile",
    region: "Brisbane inner-west"
  }, anchorTenant);
  assert.ok(keys.includes("AGG#2026-07#enquiries#channel#health-check"));
});

test("aggregate keys count non-form conversions as enquiries", () => {
  const event = {
    type: "click-call",
    path: "/",
    received_at: "2026-06-22T03:00:00.000Z",
    properties: {},
    device: "mobile",
    region: "Fraser Coast"
  };
  const keys = aggregateKeysForEvent(event, anchorTenant);
  assert.ok(keys.includes("AGG#2026-06#enquiries#channel#call"));
});

test("contact demand fields are available to automated reporting", () => {
  const event = {
    type: "form-submit-contact",
    path: "/contact",
    received_at: "2026-07-28T03:00:00.000Z",
    properties: {
      service_type: "local-business",
      timeline: "1-3 months",
      budget: "$3,000–$5,000",
      business_suburb: "Red Hill",
      lead_source: "google-search",
      cta: "cta-quote"
    },
    device: "desktop",
    region: "Brisbane inner-west"
  };
  const keys = aggregateKeysForEvent(event, anchorTenant);
  assert.ok(keys.includes("AGG#2026-07#budget#value#3-000-5-000"));
  assert.ok(keys.includes("AGG#2026-07#business_suburb#value#red-hill"));
  assert.ok(keys.includes("AGG#2026-07#lead_source#value#google-search"));
  assert.ok(keys.includes("AGG#2026-07#cta#action#cta-quote"));
});

test("total enquiries sums form, call, whatsapp and email channels", () => {
  const total = totalEnquiriesFromAggregates([
    { SK: "AGG#2026-06#enquiries#channel#form", count: 4 },
    { SK: "AGG#2026-06#enquiries#channel#call", count: 3 },
    { SK: "AGG#2026-06#enquiries#channel#whatsapp", count: 2 },
    { SK: "AGG#2026-06#enquiries#channel#email", count: 1 },
    { SK: "AGG#2026-06#event#type#pageview", count: 99 }
  ]);
  assert.equal(total, 10);
});

test("funnel calculation computes drop-off and worst abandoned field", () => {
  const events = [
    { type: "pageview", path: "/contact", visitor: "v1", properties: {} },
    { type: "pageview", path: "/contact", visitor: "v2", properties: {} },
    { type: "form-start-contact", path: "/contact", visitor: "v1", properties: {} },
    { type: "field-blur", path: "/contact", visitor: "v1", properties: { form: "contact", field: "service_type" } },
    { type: "field-blur", path: "/contact", visitor: "v2", properties: { form: "contact", field: "phone" } },
    { type: "field-blur", path: "/contact", visitor: "v3", properties: { form: "contact", field: "phone" } },
    { type: "form-submit-contact", path: "/contact", visitor: "v1", properties: {} }
  ];
  const quote = calculateFunnels(events, anchorTenant).find((funnel) => funnel.name === "Quote");
  assert.equal(quote.steps[0].count, 2);
  assert.equal(quote.steps[1].count, 1);
  assert.equal(quote.steps[1].drop_off_percent, 50);
  assert.equal(quote.worst_field, "phone");
  assert.equal(worstAbandonmentField(events, "Quote"), "phone");
});

test("automated conversion priorities flag material funnel drop-off", () => {
  const events = Array.from({ length: 12 }, (_, index) => ({
    type: "pageview",
    path: "/contact",
    visitor: `visitor-${index}`,
    properties: {}
  }));
  events.push(
    { type: "form-start-contact", path: "/contact", visitor: "visitor-1", properties: {} },
    { type: "form-error-contact", path: "/contact", visitor: "visitor-1", properties: {} },
    { type: "form-error-contact", path: "/contact", visitor: "visitor-2", properties: {} },
    { type: "form-error-contact", path: "/contact", visitor: "visitor-3", properties: {} }
  );

  const flags = conversionPriorityFlags(events, anchorTenant);
  assert.match(flags.join(" "), /Quote: only 8%/);
  assert.match(flags.join(" "), /Forms: 3 errors/);
});

test("scheduled monthly reports default to the completed previous month", () => {
  assert.equal(previousMonthKey(new Date("2026-07-01T22:15:00.000Z")), "2026-06");
  assert.equal(previousMonthKey(new Date("2026-01-01T22:15:00.000Z")), "2025-12");
});

test("isolation key design scopes all tenant reads to one partition", () => {
  assert.equal(tenantPk("anchorwebco"), "TENANT#anchorwebco");
  assert.equal(tenantPk("bannister"), "TENANT#bannister");
  assert.notEqual(tenantPk("anchorwebco"), tenantPk("bannister"));
});

test("reporting gate skips disabled tenant and renders enabled report layout", () => {
  assert.equal(anchorTenant.reporting_enabled, true);
  assert.equal(bannisterTenant.reporting_enabled, false);
  const html = renderMonthlyReport({
    tenant: anchorTenant,
    month: "2026-06",
    events: [{ type: "click-call", path: "/", visitor: "v1", properties: {} }],
    aggregates: [{ SK: "AGG#2026-06#enquiries#channel#call", count: 1 }]
  });
  assert.match(html, /Total enquiries/);
  assert.match(html, /Enquiries by channel/);
  assert.match(html, /Demand mix/);
  assert.match(html, /Calls to action/);
  assert.match(html, /Funnels/);
  assert.match(html, /Automated conversion priorities/);
  assert.match(html, /Top entry pages/);
  assert.match(html, /Traffic by source and region/);
  assert.match(html, /Mobile vs desktop conversion rate/);
  assert.match(html, /Care plans page/);
  assert.match(html, /Core Web Vitals/);
  assert.match(html, /Google Search Console/);
});

test("monthly report escapes aggregate-derived HTML", () => {
  const html = renderMonthlyReport({
    tenant: anchorTenant,
    month: "2026-06",
    events: [],
    aggregates: [{
      SK: "AGG#2026-06#business_suburb#value#<img src=x onerror=alert(1)>",
      count: 1
    }]
  });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("onboarding bannister is represented as config only", () => {
  assert.equal(bannisterTenant.client_id, "bannister");
  assert.ok(Array.isArray(bannisterTenant.funnels));
  assert.ok(bannisterTenant.domains.includes("https://bannistercommunications.com.au"));
});
