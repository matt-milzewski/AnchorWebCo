const test = require("node:test");
const assert = require("node:assert/strict");
const { _private } = require("../notifications");

test("SNS operational notifications become SES emails", () => {
  const email = _private.notificationEmail({
    Sns: {
      Subject: "[TEST] Anchor Forms delivery failure alert",
      Message: "A requested delivery-channel test.",
    },
  });
  assert.equal(email.FromEmailAddress, "info@anchorwebco.com.au");
  assert.deepEqual(email.Destination.ToAddresses, ["info@anchorwebco.com.au"]);
  assert.equal(email.Content.Simple.Subject.Data, "[TEST] Anchor Forms delivery failure alert");
  assert.equal(email.Content.Simple.Body.Text.Data, "A requested delivery-channel test.");
});

test("notification subjects are bounded and missing content is safe", () => {
  const email = _private.notificationEmail({ Sns: { Subject: "x".repeat(500) } });
  assert.equal(email.Content.Simple.Subject.Data.length, 180);
  assert.match(email.Content.Simple.Body.Text.Data, /operational notification/);
});
