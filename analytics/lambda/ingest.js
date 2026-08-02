const { aggregateKeysForEvent } = require("./shared/aggregates");
const { eventSk, tenantPk, ttlForRawEvent } = require("./shared/events");
const { deriveRegion, detectDevice, isBot, visitorHash } = require("./shared/privacy");
const { getTenant, incrementAggregate, putEvent } = require("./shared/store");
const { domainAllowed, normaliseEvent, validateEventPayload } = require("./shared/validation");

function response(statusCode, body = "") {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    },
    body: body ? JSON.stringify(body) : ""
  };
}

function emitMetric(metricName, details = {}) {
  console.log(JSON.stringify({
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [{
        Namespace: "AnchorWebCo/Analytics",
        Dimensions: [["Service"]],
        Metrics: [{ Name: metricName, Unit: "Count" }]
      }]
    },
    Service: "Ingest",
    [metricName]: 1,
    ...details
  }));
}

async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") return response(204);

  const now = new Date();
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    emitMetric("RejectedEvents", { reason: "invalid_json" });
    return response(400, { error: "Invalid JSON." });
  }

  const validation = validateEventPayload(payload);
  if (!validation.ok) {
    emitMetric("RejectedEvents", { reason: "invalid_payload", client_id: payload.client_id || "unknown" });
    return response(400, { errors: validation.errors });
  }

  const tenant = await getTenant(payload.client_id);
  if (!tenant) {
    emitMetric("RejectedEvents", { reason: "unknown_tenant", client_id: payload.client_id });
    return response(404, { error: "Unknown tenant." });
  }

  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (!domainAllowed(origin, tenant)) {
    emitMetric("RejectedEvents", { reason: "origin_not_allowed", client_id: payload.client_id });
    return response(403, { error: "Origin not allowed." });
  }

  const userAgent = event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "";
  if (isBot(userAgent)) {
    emitMetric("BotEvents", { client_id: payload.client_id });
    return response(204);
  }

  const sourceIp = event.requestContext?.http?.sourceIp || event.headers?.["x-forwarded-for"]?.split(",")[0] || "";
  const normalised = normaliseEvent(payload, { now, path: event.rawPath });
  const region = deriveRegion(event.headers || {});
  const device = detectDevice({ userAgent, viewport: normalised.properties.viewport });
  const visitor = visitorHash({
    saltSecret: process.env.ANALYTICS_DAILY_SALT_SECRET || "dev",
    date: now,
    clientId: payload.client_id,
    ip: sourceIp,
    userAgent
  });

  const item = {
    PK: tenantPk(payload.client_id),
    SK: eventSk(now),
    client_id: payload.client_id,
    type: normalised.type,
    path: normalised.path,
    properties: normalised.properties,
    visitor,
    region,
    device,
    received_at: normalised.received_at,
    ttl: ttlForRawEvent(now)
  };

  await putEvent(item);
  const aggregateKeys = aggregateKeysForEvent(item, tenant);
  await Promise.all(aggregateKeys.map((SK) => incrementAggregate(item.PK, SK)));
  emitMetric("AcceptedEvents", { client_id: payload.client_id, event_type: normalised.type });

  return response(204);
}

module.exports = {
  emitMetric,
  handler
};
