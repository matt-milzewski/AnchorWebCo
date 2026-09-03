const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({});
const env = {
  submissionsTable: process.env.FORM_SUBMISSIONS_TABLE,
  sitesConfigParameter: process.env.FORM_SITES_CONFIG_PARAMETER,
  userPoolId: process.env.FORM_ADMIN_USER_POOL_ID,
  clientId: process.env.FORM_ADMIN_CLIENT_ID,
  cognitoDomain: process.env.FORM_ADMIN_COGNITO_DOMAIN,
  redirectUri: process.env.FORM_ADMIN_REDIRECT_URI,
  logoutUri: process.env.FORM_ADMIN_LOGOUT_URI,
  allowedOrigin: process.env.FORM_ADMIN_ALLOWED_ORIGIN,
};
let cachedSites;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": env.allowedOrigin,
      vary: "origin",
    },
    body: JSON.stringify(body),
  };
}

function publicConfig() {
  return {
    region: process.env.AWS_REGION,
    userPoolId: env.userPoolId,
    clientId: env.clientId,
    cognitoDomain: env.cognitoDomain,
    redirectUri: env.redirectUri,
    logoutUri: env.logoutUri,
  };
}

async function loadSites() {
  if (cachedSites) return cachedSites;
  const result = await ssm.send(new GetParameterCommand({
    Name: env.sitesConfigParameter,
    WithDecryption: true,
  }));
  cachedSites = JSON.parse(result.Parameter?.Value || "{}").sites || [];
  return cachedSites;
}

function maskEmail(value) {
  const [local, domain] = String(value || "").split("@");
  if (!local || !domain) return "Not configured";
  return local.slice(0, 2) + "***@" + domain;
}

function encodeCursor(value) {
  return value ? Buffer.from(JSON.stringify(value)).toString("base64url") : null;
}

function decodeCursor(value) {
  if (!value) return undefined;
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")); } catch { return undefined; }
}

function safeItem(item) {
  if (!item) return item;
  const { ipHash, userAgentHash, allKey, ...safe } = item;
  return safe;
}

function buildRecentQuery({ siteId, limit = 50, cursor, status, since }) {
  const names = { "#pk": "allKey" };
  const values = { ":pk": "ALL" };
  let keyCondition = "#pk = :pk";
  if (since) {
    names["#at"] = "submittedAt";
    keyCondition += " AND #at >= :since";
    values[":since"] = since;
  }
  const input = {
    TableName: env.submissionsTable,
    IndexName: "all-submitted-at-index",
    KeyConditionExpression: keyCondition,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ScanIndexForward: false,
    Limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
    ExclusiveStartKey: decodeCursor(cursor),
  };
  const filters = [];
  if (siteId) {
    filters.push("#site = :site");
    input.ExpressionAttributeNames["#site"] = "siteId";
    input.ExpressionAttributeValues[":site"] = siteId;
  }
  if (status) {
    filters.push("#status = :status");
    input.ExpressionAttributeNames["#status"] = "status";
    input.ExpressionAttributeValues[":status"] = status;
  }
  if (filters.length) input.FilterExpression = filters.join(" AND ");
  return input;
}

async function queryRecent(options) {
  const input = buildRecentQuery(options);
  const result = await dynamo.send(new QueryCommand(input));
  return {
    items: (result.Items || []).map(safeItem),
    nextCursor: encodeCursor(result.LastEvaluatedKey),
  };
}

async function summary() {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const items = [];
  let cursor;
  do {
    const page = await queryRecent({ limit: 100, since, cursor });
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor && items.length < 1000);
  const sites = await loadSites();
  const statusCounts = {};
  const siteCounts = {};
  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    siteCounts[item.siteId] = (siteCounts[item.siteId] || 0) + 1;
  }
  return {
    windowDays: 30,
    total: items.length,
    truncated: Boolean(cursor),
    statusCounts,
    sites: sites.map((site) => ({
      siteId: site.siteId,
      name: site.name || site.siteId,
      destination: maskEmail(site.recipientEmail || site.recipientEmails),
      count: siteCounts[site.siteId] || 0,
      autoReplyEnabled: Boolean(site.autoReplyEnabled),
      challengeRequired: Boolean(site.turnstileRequired),
    })),
  };
}

function pathParts(event) {
  return String(event.rawPath || event.path || "/").split("/").filter(Boolean);
}

exports.handler = async function handler(event) {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const parts = pathParts(event);
    if (method === "GET" && parts.join("/") === "api/forms-admin/config") {
      return response(200, publicConfig());
    }
    if (method !== "GET") return response(404, { error: "Not found." });
    const route = parts.slice(2);
    if (route[0] === "summary") return response(200, await summary());
    if (route[0] === "submissions" && route.length === 1) {
      return response(200, await queryRecent({
        siteId: event.queryStringParameters?.siteId || "",
        status: event.queryStringParameters?.status || "",
        limit: event.queryStringParameters?.limit,
        cursor: event.queryStringParameters?.cursor,
      }));
    }
    if (route[0] === "submissions" && route.length === 3) {
      const result = await dynamo.send(new GetCommand({
        TableName: env.submissionsTable,
        Key: { siteId: decodeURIComponent(route[1]), submissionId: decodeURIComponent(route[2]) },
      }));
      return result.Item ? response(200, safeItem(result.Item)) : response(404, { error: "Not found." });
    }
    return response(404, { error: "Not found." });
  } catch (error) {
    console.error(JSON.stringify({ event: "forms_admin_failed", errorName: error.name }));
    return response(500, { error: "Unable to load form reporting." });
  }
};

exports._private = { buildRecentQuery, decodeCursor, encodeCursor, maskEmail, publicConfig, safeItem };
