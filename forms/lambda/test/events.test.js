const test = require("node:test");
const assert = require("node:assert/strict");
const { _private } = require("../events");

test("SES feedback has honest delivery states", () => {
  assert.equal(_private.mapStatus("Delivery"), "delivered");
  assert.equal(_private.mapStatus("Bounce"), "bounced");
  assert.equal(_private.mapStatus("Complaint"), "complained");
  assert.equal(_private.mapStatus("DeliveryDelay"), "delivery_delayed");
  assert.equal(_private.mapStatus("Send"), "");
});

test("SES tags recover the submission boundary", () => {
  assert.equal(_private.firstTag({ tags: { submissionId: ["sub_123"] } }, "submissionId"), "sub_123");
});

test("SES feedback is message-bound and monotonic", () => {
  const update = _private.feedbackUpdate({
    eventType: "Delivery",
    mail: {
      messageId: "ses-message-123",
      timestamp: "2026-09-03T01:00:00.000Z",
      tags: {
        siteId: ["anchor-web-co"],
        submissionId: ["submission-123"],
        messageType: ["lead"],
      },
    },
    delivery: { timestamp: "2026-09-03T01:00:05.000Z" },
  });

  assert.equal(update.command.ExpressionAttributeValues[":messageId"], "ses-message-123");
  assert.equal(update.command.ExpressionAttributeValues[":rank"], 30);
  assert.equal(update.command.ExpressionAttributeValues[":at"], "2026-09-03T01:00:05.000Z");
  assert.equal(update.command.ExpressionAttributeNames["#messageId"], "sesMessageId");
  assert.match(update.command.ConditionExpression, /#messageId = :messageId/);
  assert.match(update.command.ConditionExpression, /#rank < :rank/);

  assert.ok(_private.statusRank("Complaint") > _private.statusRank("Delivery"));
  assert.ok(_private.statusRank("Delivery") > _private.statusRank("DeliveryDelay"));
  assert.equal(_private.feedbackUpdate({ eventType: "Delivery", mail: {} }), null);
});
