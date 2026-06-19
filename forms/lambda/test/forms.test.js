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

test("publicFields removes honeypot and timing fields", () => {
  assert.deepEqual(
    _private.publicFields(
      { name: "Matt", company: "bot", _startedAt: "1", message: "Hi" },
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
