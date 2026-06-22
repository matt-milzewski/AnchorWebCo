const crypto = require("node:crypto");

function visitorHash({ saltSecret, date, clientId, ip, userAgent }) {
  const day = date.toISOString().slice(0, 10);
  return crypto
    .createHash("sha256")
    .update(`${saltSecret}:${day}:${clientId}:${ip || ""}:${userAgent || ""}`)
    .digest("hex")
    .slice(0, 32);
}

function deriveRegion(headers = {}) {
  const get = (name) => headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
  const cloudfrontRegion = get("cloudfront-viewer-city") || get("x-viewer-city");
  const region = get("cloudfront-viewer-country-region-name") || get("cloudfront-viewer-region") || get("x-viewer-region");
  const country = get("cloudfront-viewer-country") || get("x-viewer-country");
  const city = cloudfrontRegion ? decodeURIComponent(String(cloudfrontRegion).replace(/\+/g, " ")) : "";

  const combined = [city, region, country].filter(Boolean).join(", ");
  if (/brisbane|indooroopilly|toowong|kenmore|taringa|st lucia|chapel hill|fig tree pocket/i.test(combined)) {
    return "Brisbane inner-west";
  }
  if (/maryborough|hervey|fraser coast|tinana|pialba|urangan|eli waters/i.test(combined)) {
    return "Fraser Coast";
  }
  if (combined) return combined;
  return "Unknown";
}

function detectDevice({ userAgent = "", viewport = {} }) {
  const ua = String(userAgent);
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  const width = Number(viewport.width || viewport.w || 0);
  if (width && width < 768) return "mobile";
  if (width && width < 1100) return "tablet";
  return "desktop";
}

function isBot(userAgent = "") {
  return /bot|crawler|spider|preview|facebookexternalhit|slurp|bingpreview|headless|lighthouse/i.test(String(userAgent));
}

module.exports = {
  deriveRegion,
  detectDevice,
  isBot,
  visitorHash
};
