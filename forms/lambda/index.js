const crypto = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESv2Client({});
const ssm = new SSMClient({});

const env = {
  sitesConfigParameter: process.env.FORM_SITES_CONFIG_PARAMETER,
  submissionsTable: process.env.FORM_SUBMISSIONS_TABLE,
  rateLimitTable: process.env.FORM_RATE_LIMIT_TABLE,
  allowedOrigins: splitList(process.env.FORM_ALLOWED_ORIGINS),
  defaultFromEmail: process.env.FORM_DEFAULT_FROM_EMAIL || "info@anchorwebco.com.au",
  defaultReplyToEmail: process.env.FORM_DEFAULT_REPLY_TO_EMAIL || "info@anchorwebco.com.au",
  rateLimitWindowSeconds: Number(process.env.FORM_RATE_LIMIT_WINDOW_SECONDS || 3600),
  rateLimitMaxRequests: Number(process.env.FORM_RATE_LIMIT_MAX_REQUESTS || 8),
  maxPayloadBytes: Number(process.env.FORM_MAX_PAYLOAD_BYTES || 32000),
};

let cachedSitesConfig;
let cachedSitesConfigUntil = 0;

function splitList(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function json(event, statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: responseHeaders(event, headers),
    body: JSON.stringify(body),
  };
}

function responseHeaders(event, extra = {}) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const allowedOrigin = env.allowedOrigins.includes(origin) ? origin : env.allowedOrigins[0] || "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...(allowedOrigin
      ? {
          "access-control-allow-origin": allowedOrigin,
          "vary": "origin",
        }
      : {}),
    ...extra,
  };
}

function options(event) {
  return {
    statusCode: 204,
    headers: responseHeaders(event, {
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "3600",
    }),
    body: "",
  };
}

function parseRoute(path) {
  const match = String(path || "").match(/^\/api\/forms\/([^/]+)$/);
  return match ? { siteId: decodeURIComponent(match[1]) } : null;
}

function parseBody(event) {
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
  if (Buffer.byteLength(rawBody, "utf8") > env.maxPayloadBytes) {
    const error = new Error("Form submission is too large.");
    error.statusCode = 413;
    throw error;
  }

  const contentType = String(event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return rawBody ? JSON.parse(rawBody) : {};
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }
  return rawBody ? JSON.parse(rawBody) : {};
}

async function getSecureParameter(name) {
  const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  return result.Parameter?.Value || "";
}

async function loadSitesConfig() {
  if (cachedSitesConfig && Date.now() < cachedSitesConfigUntil) return cachedSitesConfig;
  const raw = await getSecureParameter(env.sitesConfigParameter);
  cachedSitesConfig = JSON.parse(raw);
  cachedSitesConfigUntil = Date.now() + 30 * 1000;
  return cachedSitesConfig;
}

async function getSite(siteId) {
  const config = await loadSitesConfig();
  const site = config.sites?.find((item) => item.siteId === siteId);
  if (!site) {
    const error = new Error(`Unknown form site: ${siteId}`);
    error.statusCode = 404;
    throw error;
  }
  return site;
}

function getClientIp(event) {
  return (
    event.requestContext?.http?.sourceIp ||
    String(event.headers?.["x-forwarded-for"] || event.headers?.["X-Forwarded-For"] || "").split(",")[0].trim() ||
    "unknown"
  );
}

function normalizeFields(input) {
  const fields = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const cleanKey = String(key).trim();
    if (!cleanKey) return;
    fields[cleanKey] = Array.isArray(value) ? value.join(", ") : String(value).trim();
  });
  return fields;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function humanizeKey(key) {
  return String(key)
    .replace(/^_+/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assessSubmission({ fields, site, event }) {
  const reasons = [];
  const errors = [];
  const honeypotFields = site.honeypotFields || ["company", "_gotcha", "website"];
  const requiredFields = site.requiredFields || ["name", "email", "message"];
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const allowedOrigins = site.allowedOrigins || [];
  const userAgent = event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "";
  const combinedText = Object.values(fields).join(" ").toLowerCase();
  const linkCount = (combinedText.match(/https?:\/\//g) || []).length;
  const suspiciousTerms = ["casino", "viagra", "crypto", "forex", "loan offer", "whatsapp marketing"];

  if (allowedOrigins.length && origin && !allowedOrigins.includes(origin)) reasons.push("origin-not-allowed");
  if (!userAgent) reasons.push("missing-user-agent");
  if (honeypotFields.some((field) => fields[field])) reasons.push("honeypot-filled");
  if (linkCount > Number(site.maxLinks || 3)) reasons.push("too-many-links");
  if (suspiciousTerms.some((term) => combinedText.includes(term))) reasons.push("suspicious-keyword");

  const startedAt = Number(fields._startedAt || fields.formStartedAt || 0);
  if (startedAt && Date.now() - startedAt < Number(site.minimumSubmitMs || 3000)) reasons.push("submitted-too-fast");

  requiredFields.forEach((field) => {
    if (!fields[field]) errors.push(`${humanizeKey(field)} is required.`);
  });

  const emailField = site.replyToField || "email";
  if (fields[emailField] && !isEmail(fields[emailField])) errors.push("A valid email address is required.");

  const spamScore = reasons.length;
  return {
    errors,
    spam: spamScore >= Number(site.spamThreshold || 2) || reasons.includes("honeypot-filled"),
    spamScore,
    reasons,
  };
}

async function checkRateLimit(siteId, ip) {
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = env.rateLimitWindowSeconds;
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const key = `${siteId}#${ip}#${windowStart}`;
  const result = await dynamo.send(
    new UpdateCommand({
      TableName: env.rateLimitTable,
      Key: { rateKey: key },
      UpdateExpression: "ADD submissionCount :one SET expiresAt = :expiresAt",
      ExpressionAttributeValues: {
        ":one": 1,
        ":expiresAt": windowStart + windowSeconds * 2,
      },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  return Number(result.Attributes?.submissionCount || 0) <= env.rateLimitMaxRequests;
}

function publicFields(fields, site) {
  const hidden = new Set([...(site.honeypotFields || ["company", "_gotcha", "website"]), "_startedAt", "formStartedAt"]);
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !hidden.has(key)));
}

function buildEmail({ fields, site, siteId, submissionId, ip, origin }) {
  const visibleFields = publicFields(fields, site);
  const rows = Object.entries(visibleFields);
  const subjectField = fields._subject || site.subject || `New form submission from ${site.name || siteId}`;
  const subjectPrefix = site.subjectPrefix || `[${site.name || siteId}]`;
  const subject = `${subjectPrefix} ${subjectField}`.slice(0, 180);
  const plainLines = [
    `New form submission for ${site.name || siteId}`,
    "",
    ...rows.flatMap(([key, value]) => [`${humanizeKey(key)}:`, String(value || ""), ""]),
    "Metadata:",
    `Submission ID: ${submissionId}`,
    `Site ID: ${siteId}`,
    `Origin: ${origin || "unknown"}`,
    `IP: ${ip}`,
  ];
  const htmlRows = rows
    .map(
      ([key, value]) =>
        `<tr><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb;width:180px;">${escapeHtml(humanizeKey(key))}</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;"><h1 style="font-size:20px;">New form submission</h1><p>${escapeHtml(site.name || siteId)}</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">${htmlRows}</table><p style="color:#6b7280;font-size:12px;margin-top:24px;">Submission ${escapeHtml(submissionId)} from ${escapeHtml(origin || "unknown")} / ${escapeHtml(ip)}</p></body></html>`;

  return {
    subject,
    text: plainLines.join("\n"),
    html,
    replyTo: isEmail(fields[site.replyToField || "email"]) ? fields[site.replyToField || "email"] : env.defaultReplyToEmail,
  };
}

async function sendLeadEmail({ fields, site, siteId, submissionId, ip, origin }) {
  const email = buildEmail({ fields, site, siteId, submissionId, ip, origin });
  const toAddresses = splitList(site.recipientEmail || site.recipientEmails || "");
  if (!toAddresses.length) {
    const error = new Error(`No recipient configured for ${siteId}`);
    error.statusCode = 500;
    throw error;
  }

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: site.fromEmail || env.defaultFromEmail,
      Destination: {
        ToAddresses: toAddresses,
      },
      ReplyToAddresses: [email.replyTo],
      Content: {
        Simple: {
          Subject: { Data: email.subject },
          Body: {
            Text: { Data: email.text },
            Html: { Data: email.html },
          },
        },
      },
    }),
  );
}

async function storeSubmission(item) {
  await dynamo.send(
    new PutCommand({
      TableName: env.submissionsTable,
      Item: item,
    }),
  );
}

async function handleSubmit(event, siteId) {
  const site = await getSite(siteId);
  const fields = normalizeFields(parseBody(event));
  const ip = getClientIp(event);
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const submissionId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const assessment = assessSubmission({ fields, site, event });

  if (assessment.errors.length) {
    return json(event, 400, { ok: false, errors: assessment.errors });
  }

  const withinRateLimit = await checkRateLimit(siteId, ip);
  const spam = assessment.spam || !withinRateLimit;
  const spamReasons = withinRateLimit ? assessment.reasons : [...assessment.reasons, "rate-limit"];
  const baseItem = {
    siteId,
    submissionId,
    submittedAt,
    status: spam ? "spam" : "accepted",
    spam,
    spamReasons,
    spamScore: spamReasons.length,
    origin,
    ip,
    userAgent: event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "",
    recipientEmail: site.recipientEmail || site.recipientEmails || "",
    fields: publicFields(fields, site),
  };

  if (spam) {
    await storeSubmission(baseItem);
    return json(event, 200, { ok: true, spam: true });
  }

  await sendLeadEmail({ fields, site, siteId, submissionId, ip, origin });
  await storeSubmission({ ...baseItem, status: "sent" });
  return json(event, 200, { ok: true, submissionId });
}

exports.handler = async function handler(event) {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path || "/";

    if (method === "OPTIONS") return options(event);

    const route = parseRoute(path);
    if (!route || method !== "POST") return json(event, 404, { error: "Not found." });

    return handleSubmit(event, route.siteId);
  } catch (error) {
    console.error(error);
    return json({ headers: {} }, error.statusCode || 500, { error: error.message || "Unexpected error." });
  }
};

exports._private = {
  assessSubmission,
  buildEmail,
  humanizeKey,
  normalizeFields,
  parseRoute,
  publicFields,
};
