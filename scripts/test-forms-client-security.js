const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const main = fs.readFileSync(path.join(__dirname, "..", "src", "js", "main.js"), "utf8");
const contact = fs.readFileSync(path.join(__dirname, "..", "src", "contact.html"), "utf8");
assert.match(main, /responseData\.accepted === true/);
assert.match(main, /responseData\.submissionId/);
assert.ok(
  main.indexOf("responseData.accepted === true") < main.indexOf("anchor:form-success"),
  "conversion events must occur only after an explicit accepted response",
);
assert.match(main, /rotateIdempotency = response\.status < 500 && !responseData\.pending/);
assert.doesNotMatch(
  contact,
  /instant email receipt|automatic receipt/i,
  "the contact page must not promise an auto-reply while Turnstile is optional",
);
console.log("Verified that blocked form responses cannot become Anchor conversions.");
