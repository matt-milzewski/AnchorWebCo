const { CONVERSION_EVENTS, aggregateSk, cleanPath, monthKey } = require("./events");

function channelForEvent(type) {
  if (type === "click-call") return "call";
  if (type === "click-whatsapp") return "whatsapp";
  if (type === "click-email") return "email";
  if (type === "form-submit-contact" || type === "form-submit-audit") return "form";
  return "";
}

function sourceFor(properties = {}) {
  const utm = properties.utm || {};
  if (utm.source) return String(utm.source).toLowerCase();
  if (properties.referrer) {
    try {
      return new URL(properties.referrer).hostname.replace(/^www\./, "");
    } catch {
      return "referral";
    }
  }
  return "direct";
}

function aggregateKeysForEvent(event, tenant) {
  const month = monthKey(new Date(event.received_at));
  const props = event.properties || {};
  const keys = [];

  keys.push(aggregateSk(month, "event", "type", event.type));
  keys.push(aggregateSk(month, "page", "path", event.path));
  keys.push(aggregateSk(month, "device", "type", event.device || props.device || "unknown"));
  keys.push(aggregateSk(month, "region", "name", event.region || "unknown"));
  keys.push(aggregateSk(month, "source", "name", sourceFor(props)));

  if (CONVERSION_EVENTS.has(event.type)) {
    keys.push(aggregateSk(month, "enquiries", "channel", channelForEvent(event.type)));
  }

  if (event.type === "form-submit-contact") {
    if (props.service_type) keys.push(aggregateSk(month, "service_type", "value", props.service_type));
    if (props.timeline) keys.push(aggregateSk(month, "timeline", "value", props.timeline));
  }

  if (event.type === "form-submit-audit" && props.business_type) {
    keys.push(aggregateSk(month, "business_type", "value", props.business_type));
  }

  if (event.type === "field-blur") {
    keys.push(aggregateSk(month, "field_blur", props.form || "unknown", props.field || "unknown"));
  }

  if (event.type === "web-vitals") {
    ["lcp", "inp", "cls"].forEach((metric) => {
      if (props[metric] !== undefined) keys.push(aggregateSk(month, "web_vitals", metric, passFail(metric, props[metric])));
    });
  }

  for (const funnel of tenant.funnels || []) {
    funnel.steps.forEach((step, index) => {
      if (matchesStep(event, step)) keys.push(aggregateSk(month, "funnel", funnel.name, `step-${index + 1}`));
    });
  }

  return [...new Set(keys)];
}

function matchesStep(event, step) {
  if (step.match === "pageview" && event.type !== "pageview") return false;
  if (step.match === "event" && event.type !== step.type) return false;
  if (step.path && cleanPath(event.path) !== cleanPath(step.path)) return false;
  if (step.path_prefix && !cleanPath(event.path).startsWith(cleanPath(step.path_prefix))) return false;
  return true;
}

function passFail(metric, value) {
  const n = Number(value);
  if (metric === "lcp") return n <= 2500 ? "pass" : "fail";
  if (metric === "inp") return n <= 200 ? "pass" : "fail";
  if (metric === "cls") return n <= 0.1 ? "pass" : "fail";
  return "unknown";
}

function totalEnquiriesFromAggregates(items) {
  return items
    .filter((item) => /^AGG#.+#enquiries#channel#/.test(item.SK))
    .reduce((sum, item) => sum + Number(item.count || 0), 0);
}

module.exports = {
  aggregateKeysForEvent,
  channelForEvent,
  matchesStep,
  sourceFor,
  totalEnquiriesFromAggregates
};
