const crypto = require("node:crypto");
const { queryTenant } = require("./shared/store");

function verifyToken(token) {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = crypto
    .createHmac("sha256", process.env.DASHBOARD_TOKEN_SECRET || "dev")
    .update(payloadB64)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  if (payload.exp && Date.now() > payload.exp * 1000) return null;
  return payload;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body)
  };
}

async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") return response(204, {});
  const token = event.queryStringParameters?.token || event.headers?.authorization?.replace(/^Bearer\s+/i, "");
  const payload = verifyToken(token);
  if (!payload?.client_id) return response(401, { error: "Invalid token." });

  const month = event.queryStringParameters?.month || new Date().toISOString().slice(0, 7);
  const aggregates = await queryTenant(payload.client_id, `AGG#${month}`);
  return response(200, {
    client_id: payload.client_id,
    month,
    aggregates
  });
}

module.exports = {
  handler,
  verifyToken
};
