const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs
  .readFileSync("src/js/posthog-init.js", "utf8")
  .replaceAll("__ANCHOR_POSTHOG_KEY__", "phc_test")
  .replaceAll("__ANCHOR_POSTHOG_HOST__", "https://eu.i.posthog.com");

function element(hidden = false) {
  return {
    hidden,
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
  };
}

const banner = element(true);
const settings = element();
const accept = element();
const reject = element();
const googleConsentCalls = [];
let cookieValue = "";

const document = {
  getElementById(id) {
    return id === "analytics-consent" ? banner : id === "analytics-settings" ? settings : null;
  },
  querySelector(selector) {
    if (selector === '[data-analytics-choice="accept"]') return accept;
    if (selector === '[data-analytics-choice="reject"]') return reject;
    return null;
  },
  createElement() {
    return {};
  },
  getElementsByTagName() {
    return [{ parentNode: { insertBefore() {} } }];
  },
  addEventListener() {},
};

Object.defineProperty(document, "cookie", {
  get() {
    return cookieValue;
  },
  set(value) {
    cookieValue = value.split(";", 1)[0];
  },
});

const window = {
  document,
  location: { origin: "https://www.anchorwebco.com.au", pathname: "/" },
  addEventListener() {},
  gtag(...args) {
    googleConsentCalls.push(args);
  },
};

vm.runInNewContext(source, { window, document, URL }, { filename: "posthog-init.js" });

assert.equal(window.posthog._i.length, 1, "PostHog should initialize once");
const config = window.posthog._i[0][1];
assert.equal(config.cookieless_mode, "on_reject");
assert.equal(config.person_profiles, "never");
assert.equal(config.session_recording.maskAllInputs, true);
assert.equal(config.session_recording.blockSelector, "form, [data-ph-block]");
assert.equal(banner.hidden, false, "Choice banner should appear when no preference exists");

let optIns = 0;
let optOuts = 0;
const client = {
  get_explicit_consent_status: () => "pending",
  opt_in_capturing: () => { optIns += 1; },
  opt_out_capturing: () => { optOuts += 1; },
};

config.loaded(client);
reject.listeners.click();
assert.equal(cookieValue, "anchor_analytics_choice=reject");
assert.equal(optOuts, 1, "Reject should keep PostHog in cookieless mode");
assert.equal(googleConsentCalls.at(-1)[2].ad_storage, "denied");
assert.equal(banner.hidden, true);

settings.listeners.click();
assert.equal(banner.hidden, false, "Footer control should reopen analytics settings");
accept.listeners.click();
assert.equal(cookieValue, "anchor_analytics_choice=accept");
assert.equal(optIns, 1, "Accept should enable full analytics and masked replay");
assert.equal(googleConsentCalls.at(-1)[2].ad_storage, "granted");
assert.equal(banner.hidden, true);

console.log("PASS consent-aware PostHog and Google Ads controls");
