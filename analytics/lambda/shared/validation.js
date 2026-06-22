const { STANDARD_EVENTS, cleanPath } = require("./events");

function normaliseOrigin(origin) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.hostname}`.toLowerCase();
  } catch {
    return String(origin).replace(/\/$/, "").toLowerCase();
  }
}

function domainAllowed(origin, tenant) {
  const normalised = normaliseOrigin(origin);
  return (tenant.domains || []).map(normaliseOrigin).includes(normalised);
}

function validateEventPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") errors.push("Payload must be an object.");
  if (!payload.client_id || typeof payload.client_id !== "string") errors.push("client_id is required.");
  if (!payload.type || typeof payload.type !== "string") errors.push("type is required.");
  if (payload.type && !STANDARD_EVENTS.has(payload.type)) errors.push(`Unknown event type: ${payload.type}`);
  if (payload.properties && typeof payload.properties !== "object") errors.push("properties must be an object.");

  const properties = payload.properties || {};
  if (payload.type === "pageview" && !properties.path && !payload.path) errors.push("pageview requires path.");
  if (payload.type === "scroll-depth" && !properties.depth) errors.push("scroll-depth requires depth.");
  if (payload.type === "field-blur" && (!properties.form || !properties.field)) errors.push("field-blur requires form and field.");
  if (payload.type === "form-submit-contact") {
    ["service_type", "timeline", "source_page", "cta"].forEach((field) => {
      if (!properties[field]) errors.push(`form-submit-contact requires ${field}.`);
    });
  }
  if (payload.type === "form-submit-audit") {
    ["business_type", "source_page"].forEach((field) => {
      if (!properties[field]) errors.push(`form-submit-audit requires ${field}.`);
    });
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function normaliseEvent(payload, context) {
  const properties = { ...(payload.properties || {}) };
  const path = cleanPath(payload.path || properties.path || context.path || "/");
  properties.path = path;
  return {
    client_id: payload.client_id,
    type: payload.type,
    path,
    properties,
    received_at: context.now.toISOString()
  };
}

module.exports = {
  domainAllowed,
  normaliseEvent,
  normaliseOrigin,
  validateEventPayload
};
