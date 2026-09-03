const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
  assert.ok(result.reasons.includes("missing-origin"));
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
      challengeRequired: false,
    },
  );
});

test("Turnstile is a server-verifiable acceptance boundary", () => {
  const site = {
    allowedOrigins: ["https://www.anchorwebco.com.au"],
    turnstileAction: "contact_submit",
  };
  assert.deepEqual(
    _private.validateTurnstileResponse({ success: false }, site),
    { ok: false, reason: "challenge-failed" },
  );
  assert.deepEqual(
    _private.validateTurnstileResponse({
      success: true,
      hostname: "attacker.example",
      action: "contact_submit",
    }, site),
    { ok: false, reason: "challenge-hostname-mismatch" },
  );
  assert.deepEqual(
    _private.validateTurnstileResponse({
      success: true,
      hostname: "www.anchorwebco.com.au",
      action: "contact_submit",
    }, site),
    { ok: true },
  );
});

test("normalization enforces each site's field allowlist", () => {
  assert.deepEqual(
    _private.normalizeFields(
      { name: "Matt", message: "Hello", injected: "drop me", _turnstileToken: "token" },
      { allowedFields: ["name", "message"] },
    ),
    { name: "Matt", message: "Hello", _turnstileToken: "token" },
  );
});

test("client idempotency keys are stable and malformed keys are replaced", () => {
  const valid = "01912f5b-7bc6-7cd9-8f3f-0123456789ab";
  assert.equal(_private.requestedSubmissionId({ _idempotencyKey: valid }), valid);
  assert.notEqual(_private.requestedSubmissionId({ _idempotencyKey: "short" }), "short");
});

test("persisted and in-flight submissions never masquerade as delivered duplicates", () => {
  // Crash-after-write reproducer: the durable `stored` record must be resumed,
  // not returned to the browser as a conversion-worthy success.
  assert.equal(_private.classifyExistingSubmission({ status: "stored", spam: false }), "retryable");
  // Concurrent duplicate reproducer: one sender owns the `sending` claim.
  assert.equal(_private.classifyExistingSubmission({ status: "sending", spam: false }), "pending");
  // Legitimate control: only SES-accepted/final delivery states are successful.
  assert.equal(_private.classifyExistingSubmission({ status: "ses_accepted", spam: false }), "successful");
  assert.equal(_private.classifyExistingSubmission({ status: "delivered", spam: false }), "successful");
  assert.equal(_private.classifyExistingSubmission({ status: "delivery_failed", spam: false }), "retryable");
});

test("durable conditional storage precedes the first email side effect", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const handlerStart = source.indexOf("async function handleSubmit");
  const stored = source.indexOf("const stored = await storeOnce(baseItem)", handlerStart);
  const claimed = source.indexOf("await claimSubmissionForDelivery", handlerStart);
  const email = source.indexOf("await sendLeadEmail", handlerStart);
  assert.ok(stored > handlerStart);
  assert.ok(claimed > stored);
  assert.ok(email > claimed);
  assert.match(source, /ConditionExpression: "attribute_not_exists\(siteId\) AND attribute_not_exists\(submissionId\)"/);
  assert.match(source, /ConditionExpression: "#status = :stored OR #status = :failed"/);
});

test("migration scrubs legacy raw network metadata", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "scripts", "backfill-submissions.js"),
    "utf8",
  );
  assert.match(source, /REMOVE #ip, #userAgent/);
  assert.match(source, /"#ip": "ip", "#userAgent": "userAgent"/);
});

test("auto-reply fails closed without a server-verifiable challenge", () => {
  const handler = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  const builder = fs.readFileSync(
    path.join(__dirname, "..", "..", "scripts", "build-site-config.mjs"),
    "utf8",
  );
  assert.match(handler, /if \(!site\.turnstileRequired\) return \{ sent: false, reason: "challenge-required" \}/);
  assert.match(builder, /autoReplyEnabled: turnstileEnabled/);
});
