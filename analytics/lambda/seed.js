const fs = require("node:fs");
const path = require("node:path");
const { putTenant } = require("./shared/store");

async function handler(event) {
  if (event.RequestType === "Delete") return respond(event, "SUCCESS");

  const dir = path.join(__dirname, "tenants");
  const tenantFiles = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
  for (const file of tenantFiles) {
    const tenant = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    await putTenant(tenant);
  }
  return respond(event, "SUCCESS", { seeded: tenantFiles.length });
}

async function respond(event, status, data = {}) {
  if (!event.ResponseURL) return { status, data };
  const https = require("node:https");
  const body = JSON.stringify({
    Status: status,
    Reason: status,
    PhysicalResourceId: "anchor-analytics-tenants",
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data
  });
  await new Promise((resolve, reject) => {
    const request = https.request(event.ResponseURL, {
      method: "PUT",
      headers: { "content-type": "", "content-length": Buffer.byteLength(body) }
    }, (response) => {
      response.resume();
      response.on("end", resolve);
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
  return { status, data };
}

module.exports = {
  handler
};
