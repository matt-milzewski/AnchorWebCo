const crypto = require("node:crypto");

const CONVERSION_EVENTS = new Set([
  "form-submit-contact",
  "form-submit-audit",
  "click-call",
  "click-whatsapp",
  "click-email"
]);

const FORM_EVENTS = new Set([
  "form-submit-contact",
  "form-submit-audit"
]);

const STANDARD_EVENTS = new Set([
  "pageview",
  "cta-quote",
  "cta-see-work",
  "cta-see-plans",
  "click-call",
  "click-whatsapp",
  "click-email",
  "outbound-portfolio",
  "form-start-contact",
  "form-submit-contact",
  "form-error-contact",
  "form-start-audit",
  "form-submit-audit",
  "form-error-audit",
  "field-blur",
  "scroll-depth",
  "web-vitals"
]);

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function ulidLike(date = new Date()) {
  const time = date.getTime().toString(36).padStart(10, "0");
  return `${time}${crypto.randomBytes(10).toString("hex")}`;
}

function tenantPk(clientId) {
  return `TENANT#${clientId}`;
}

function eventSk(date = new Date(), id = ulidLike(date)) {
  return `EVT#${date.toISOString()}#${id}`;
}

function aggregateSk(month, category, dimension, value) {
  const parts = ["AGG", month, category];
  if (dimension) parts.push(dimension);
  if (value !== undefined && value !== null && value !== "") parts.push(String(value).toLowerCase().replace(/\s+/g, "-"));
  return parts.join("#");
}

function ttlForRawEvent(date = new Date()) {
  const ttl = new Date(date);
  ttl.setMonth(ttl.getMonth() + 13);
  return Math.floor(ttl.getTime() / 1000);
}

function cleanPath(path) {
  if (!path) return "/";
  try {
    const url = path.startsWith("http") ? new URL(path) : new URL(path, "https://example.test");
    const clean = url.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    return clean || "/";
  } catch {
    return String(path).split("?")[0] || "/";
  }
}

module.exports = {
  CONVERSION_EVENTS,
  FORM_EVENTS,
  STANDARD_EVENTS,
  aggregateSk,
  cleanPath,
  dayKey,
  eventSk,
  monthKey,
  tenantPk,
  ttlForRawEvent,
  ulidLike
};
