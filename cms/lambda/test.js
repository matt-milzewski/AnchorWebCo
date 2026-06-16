const assert = require("node:assert/strict");
const { hashPasswordForSetup } = require("./index");

const hash = hashPasswordForSetup("demo-password");

assert.match(hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);

console.log("CMS Lambda utility checks passed.");
