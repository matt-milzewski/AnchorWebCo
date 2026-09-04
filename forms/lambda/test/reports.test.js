const test = require("node:test");
const assert = require("node:assert/strict");
const { _private } = require("../reports");

test("monthly summary counts spam, sites, reasons, and delivery issues", () => {
  const summary = _private.summarize([
    { siteId: "anchor-web-co", status: "delivered", spam: false },
    { siteId: "anchor-web-co", status: "spam", spam: true, spamReasons: ["honeypot-filled"] },
    { siteId: "haven-homes-co", status: "bounced", spam: false },
  ], { count: 10, rate: 90 });

  assert.equal(summary.total, 3);
  assert.equal(summary.legitimate, 2);
  assert.equal(summary.spam, 1);
  assert.equal(summary.spamRate, 33.3);
  assert.equal(summary.bySite["anchor-web-co"].spam, 1);
  assert.equal(summary.reasons["honeypot-filled"], 1);
  assert.equal(summary.deliveryIssues.bounced, 1);
  assert.equal(summary.highSpam, false);
});

test("high-volume or sustained spam is highlighted", () => {
  const highCount = _private.summarize(Array.from({ length: 25 }, () => ({ status: "spam", spam: true })));
  assert.equal(highCount.highSpam, true);

  const highRate = _private.summarize([
    ...Array.from({ length: 6 }, () => ({ status: "spam", spam: true })),
    ...Array.from({ length: 4 }, () => ({ status: "delivered", spam: false })),
  ], { count: 25, rate: 50 });
  assert.equal(highRate.highSpam, true);
});

test("monthly email is aggregate-only and labels test sends", () => {
  const summary = _private.summarize([
    { siteId: "anchor-web-co", status: "spam", spam: true, spamReasons: ["rate-limit"] },
  ], { count: 25, rate: 50 });
  const message = _private.buildMessage(summary, {
    since: "2026-08-01T00:00:00.000Z",
    until: "2026-08-31T00:00:00.000Z",
  }, { test: true });

  assert.match(message.subject, /^\[TEST\]/);
  assert.match(message.body, /aggregate counts only/);
  assert.doesNotMatch(message.body, /matt@example\.com|private enquiry text/i);
});

test("report window covers the trailing 30 days", () => {
  const window = _private.reportWindow(new Date("2026-09-01T00:00:00.000Z"));
  assert.equal(window.since, "2026-08-02T00:00:00.000Z");
  assert.equal(window.until, "2026-09-01T00:00:00.000Z");
});

test("monthly query uses the reporting index and aliases reserved fields", () => {
  const query = _private.buildQuery({
    since: "2026-08-01T00:00:00.000Z",
    until: "2026-09-01T00:00:00.000Z",
  });
  assert.equal(query.IndexName, "all-submitted-at-index");
  assert.match(query.KeyConditionExpression, /BETWEEN :since AND :until/);
  assert.equal(query.ExpressionAttributeNames["#status"], "status");
  assert.equal(query.ExclusiveStartKey, undefined);
});
