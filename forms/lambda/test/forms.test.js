const test = require("node:test");
const assert = require("node:assert/strict");
const { _private } = require("../index");

test("parseRoute extracts siteId", () => {
  assert.deepEqual(_private.parseRoute("/api/forms/anchor-web-co"), { siteId: "anchor-web-co" });
  assert.equal(_private.parseRoute("/api/forms"), null);
});

test("assessSubmission rejects missing required fields", () => {
  const result = _private.assessSubmission({
    fields: { name: "Matt", email: "bad" },
    site: { requiredFields: ["name", "email", "message"] },
    event: { headers: { origin: "https://www.anchorwebco.com.au", "user-agent": "node-test" } },
  });
  assert.equal(result.spam, false);
  assert.deepEqual(result.errors, ["Message is required.", "A valid email address is required."]);
});

test("assessSubmission flags honeypot spam", () => {
  const result = _private.assessSubmission({
    fields: { name: "Bot", email: "bot@example.com", message: "Hello", company: "Filled" },
    site: {},
    event: { headers: { origin: "https://www.anchorwebco.com.au", "user-agent": "node-test" } },
  });
  assert.equal(result.spam, true);
  assert.ok(result.reasons.includes("honeypot-filled"));
});

test("assessSubmission accepts a legitimate current website", () => {
  const result = _private.assessSubmission({
    fields: {
      name: "Bardon Electrical",
      email: "owner@example.com",
      message: "I need a new site.",
      current_website: "https://example.com",
      website: "https://legacy-field.example",
      _startedAt: String(Date.now() - 5000),
    },
    site: {
      autoReplyEnabled: true,
      allowedOrigins: ["https://www.anchorwebco.com.au"],
      honeypotFields: ["company", "_gotcha"],
    },
    event: { headers: { origin: "https://www.anchorwebco.com.au", "user-agent": "node-test" } },
  });
  assert.equal(result.spam, false);
  assert.deepEqual(result.errors, []);
});

test("assessSubmission suppresses auto-reply abuse without browser provenance", () => {
  const result = _private.assessSubmission({
    fields: {
      name: "Bot",
      email: "target@example.com",
      message: "Send an unsolicited receipt",
    },
    site: {
      autoReplyEnabled: true,
      allowedOrigins: ["https://www.anchorwebco.com.au"],
    },
    event: { headers: { "user-agent": "script" } },
  });
  assert.equal(result.spam, true);
  assert.ok(result.reasons.includes("origin-not-allowed"));
  assert.ok(result.reasons.includes("missing-start-time"));
});

test("publicFields removes honeypot and timing fields", () => {
  assert.deepEqual(
    _private.publicFields(
      {
        name: "Matt",
        company: "bot",
        _startedAt: "1",
        analytics_form_type: "contact",
        source_page: "/contact",
        cta: "cta-quote",
        message: "Hi",
      },
      { honeypotFields: ["company"] },
    ),
    { name: "Matt", message: "Hi" },
  );
});

test("buildEmail includes flexible custom fields", () => {
  const email = _private.buildEmail({
    fields: {
      name: "Matt",
      email: "matt@example.com",
      service_type: "Website",
      message: "Can you help?",
      company: "",
    },
    site: { name: "Anchor Web Co", subjectPrefix: "[Anchor]" },
    siteId: "anchor-web-co",
    submissionId: "sub_123",
    ip: "127.0.0.1",
    origin: "https://www.anchorwebco.com.au",
  });
  assert.match(email.subject, /^\[Anchor\]/);
  assert.match(email.text, /Service Type:/);
  assert.equal(email.replyTo, "matt@example.com");
});

test("buildAutoReplyEmail confirms receipt without marketing language", () => {
  const email = _private.buildAutoReplyEmail({
    fields: { name: "Alex Morgan", email: "alex@example.com" },
    site: {
      name: "Anchor Web Co",
      autoReplyResponseWindow: "within two business days",
      autoReplyPhone: "0439 499 944",
      autoReplyPlannerUrl: "https://www.anchorwebco.com.au/website-planner.html",
      autoReplyPricingUrl: "https://www.anchorwebco.com.au/pricing.html",
    },
  });

  assert.match(email.subject, /received your Anchor Web Co enquiry/i);
  assert.match(email.text, /Hi Alex/);
  assert.match(email.text, /within two business days/);
  assert.match(email.text, /not been added to a marketing list/i);
  assert.match(email.html, /instant website planner/i);
});

test("buildHealthPayload exposes the configured form service without personal data", () => {
  assert.deepEqual(
    _private.buildHealthPayload("anchor-web-co", {
      name: "Anchor Web Co",
      autoReplyEnabled: true,
      recipientEmail: "private@example.com",
    }),
    {
      ok: true,
      siteId: "anchor-web-co",
      siteName: "Anchor Web Co",
      autoReplyEnabled: true,
    },
  );
});
