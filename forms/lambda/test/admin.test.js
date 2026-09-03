const test = require("node:test");
const assert = require("node:assert/strict");
const { _private } = require("../admin");

test("dashboard never returns abuse fingerprints", () => {
  assert.deepEqual(
    _private.safeItem({ siteId: "anchor", submissionId: "1", ipHash: "private", userAgentHash: "private", fields: { name: "A" } }),
    { siteId: "anchor", submissionId: "1", fields: { name: "A" } },
  );
});

test("dashboard destinations are masked", () => {
  assert.equal(_private.maskEmail("person@example.com"), "pe***@example.com");
});

test("dashboard cursors fail closed when malformed", () => {
  assert.equal(_private.decodeCursor("not-a-cursor"), undefined);
  const value = { siteId: "anchor", submittedAt: "2026-01-01T00:00:00.000Z" };
  assert.deepEqual(_private.decodeCursor(_private.encodeCursor(value)), value);
});

test("recent query declares only expression aliases it uses", () => {
  const unfiltered = _private.buildRecentQuery({ limit: 50 });
  assert.deepEqual(unfiltered.ExpressionAttributeNames, { "#pk": "allKey" });
  assert.equal(unfiltered.KeyConditionExpression, "#pk = :pk");

  const filtered = _private.buildRecentQuery({ since: "2026-09-01T00:00:00.000Z" });
  assert.equal(filtered.ExpressionAttributeNames["#at"], "submittedAt");
  assert.match(filtered.KeyConditionExpression, /#at >= :since/);
});
