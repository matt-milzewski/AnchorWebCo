const crypto = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESv2Client({});
const ssm = new SSMClient({});

const env = {
  sitesConfigParameter: process.env.FORM_SITES_CONFIG_PARAMETER,
  turnstileSecretParameter: process.env.FORM_TURNSTILE_SECRET_PARAMETER,
  submissionsTable: process.env.FORM_SUBMISSIONS_TABLE,
  rateLimitTable: process.env.FORM_RATE_LIMIT_TABLE,
  allowedOrigins: splitList(process.env.FORM_ALLOWED_ORIGINS),
  defaultFromEmail: process.env.FORM_DEFAULT_FROM_EMAIL || "info@anchorwebco.com.au",
  defaultReplyToEmail: process.env.FORM_DEFAULT_REPLY_TO_EMAIL || "info@anchorwebco.com.au",
  configurationSetName: process.env.FORM_SES_CONFIGURATION_SET || "",
  abuseHashKey: process.env.FORM_ABUSE_HASH_KEY || "local-development-only",
  rateLimitWindowSeconds: Number(process.env.FORM_RATE_LIMIT_WINDOW_SECONDS || 3600),
  rateLimitMaxRequests: Number(process.env.FORM_RATE_LIMIT_MAX_REQUESTS || 8),
  destinationRateLimitMaxRequests: Number(process.env.FORM_DESTINATION_RATE_LIMIT_MAX_REQUESTS || 3),
  maxPayloadBytes: Number(process.env.FORM_MAX_PAYLOAD_BYTES || 32000),
  submissionRetentionDays: Number(process.env.FORM_SUBMISSION_RETENTION_DAYS || 180),
  spamRetentionDays: Number(process.env.FORM_SPAM_RETENTION_DAYS || 30),
};

const CONTROL_FIELDS = new Set([
  "_subject", "_startedAt", "formStartedAt", "_idempotencyKey", "_turnstileToken",
  "cf-turnstile-response", "analytics_form_type", "source_page", "cta",
]);
let cachedSitesConfig;
let cachedSitesConfigUntil = 0;
let cachedTurnstileSecret;

function splitList(value = "") {
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function log(event, details = {}) {
  console.log(JSON.stringify({ event, ...details }));
}

function responseHeaders(event, extra = {}) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const allowedOrigin = env.allowedOrigins.includes(origin) ? origin : "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin, vary: "origin" } : {}),
    ...extra,
  };
}

function json(event, statusCode, body, headers = {}) {
  return { statusCode, headers: responseHeaders(event, headers), body: JSON.stringify(body) };
}

function options(event) {
  return {
    statusCode: 204,
    headers: responseHeaders(event, {
      "access-control-allow-methods": "GET,POST,OPTIONS",
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
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";
  if (Buffer.byteLength(rawBody, "utf8") > env.maxPayloadBytes) {
    const error = new Error("Form submission is too large.");
    error.statusCode = 413;
    throw error;
  }
  const contentType = String(event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }
  return rawBody ? JSON.parse(rawBody) : {};
}

async function getSecureParameter(name) {
  if (!name) return "";
  const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  return result.Parameter?.Value || "";
}

async function loadSitesConfig() {
  if (cachedSitesConfig && Date.now() < cachedSitesConfigUntil) return cachedSitesConfig;
  cachedSitesConfig = JSON.parse(await getSecureParameter(env.sitesConfigParameter));
  cachedSitesConfigUntil = Date.now() + 30000;
  return cachedSitesConfig;
}

async function loadTurnstileSecret() {
  if (cachedTurnstileSecret !== undefined) return cachedTurnstileSecret;
  cachedTurnstileSecret = await getSecureParameter(env.turnstileSecretParameter);
  if (cachedTurnstileSecret === "__not_configured__") cachedTurnstileSecret = "";
  return cachedTurnstileSecret;
}

async function getSite(siteId) {
  const config = await loadSitesConfig();
  const site = config.sites?.find((item) => item.siteId === siteId);
  if (!site) {
    const error = new Error("Unknown form site.");
    error.statusCode = 404;
    throw error;
  }
  return site;
}

function getClientIp(event) {
  return event.requestContext?.http?.sourceIp ||
    String(event.headers?.["x-forwarded-for"] || event.headers?.["X-Forwarded-For"] || "").split(",")[0].trim() ||
    "unknown";
}

function hashIdentifier(value) {
  return crypto.createHmac("sha256", env.abuseHashKey).update(String(value || "unknown")).digest("hex");
}

function normalizeFields(input, site = {}) {
  const fields = {};
  const allowed = Array.isArray(site.allowedFields) && site.allowedFields.length
    ? new Set([...site.allowedFields, ...(site.honeypotFields || []), ...CONTROL_FIELDS])
    : null;
  Object.entries(input || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const cleanKey = String(key).trim();
    if (!cleanKey || (allowed && !allowed.has(cleanKey))) return;
    fields[cleanKey] = (Array.isArray(value) ? value.join(", ") : String(value)).trim();
  });
  return fields;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function humanizeKey(key) {
  return String(key).replace(/^_+/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function validateFieldLengths(fields, site) {
  const errors = [];
  const overrides = site.fieldMaxLengths || {};
  for (const [key, value] of Object.entries(fields)) {
    if (CONTROL_FIELDS.has(key) || (site.honeypotFields || []).includes(key)) continue;
    const maximum = Number(overrides[key] || (key === "message" ? 8000 : 2000));
    if (String(value).length > maximum) errors.push(humanizeKey(key) + " is too long.");
  }
  return errors;
}

function assessSubmission({ fields, site, event }) {
  const reasons = [];
  const errors = validateFieldLengths(fields, site);
  const honeypotFields = site.honeypotFields || ["company", "_gotcha", "website"];
  const requiredFields = site.requiredFields || ["name", "email", "message"];
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const allowedOrigins = site.allowedOrigins || [];
  const userAgent = event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "";
  const combinedText = Object.entries(fields)
    .filter(([key]) => !CONTROL_FIELDS.has(key))
    .map(([, value]) => value).join(" ").toLowerCase();
  const linkCount = (combinedText.match(/https?:\/\//g) || []).length;
  const suspiciousTerms = ["casino", "viagra", "crypto", "forex", "loan offer", "whatsapp marketing"];

  if (allowedOrigins.length && origin && !allowedOrigins.includes(origin)) reasons.push("origin-not-allowed");
  if (!origin) reasons.push("missing-origin");
  if (!userAgent) reasons.push("missing-user-agent");
  if (honeypotFields.some((field) => fields[field])) reasons.push("honeypot-filled");
  if (linkCount > Number(site.maxLinks || 3)) reasons.push("too-many-links");
  if (suspiciousTerms.some((term) => combinedText.includes(term))) reasons.push("suspicious-keyword");
  const startedAt = Number(fields._startedAt || fields.formStartedAt || 0);
  if (startedAt && Date.now() - startedAt < Number(site.minimumSubmitMs || 3000)) reasons.push("submitted-too-fast");
  if (!startedAt) reasons.push("missing-start-time");
  requiredFields.forEach((field) => {
    if (!fields[field]) errors.push(humanizeKey(field) + " is required.");
  });
  const emailField = site.replyToField || "email";
  if (fields[emailField] && !isEmail(fields[emailField])) errors.push("A valid email address is required.");
  return {
    errors,
    spam: reasons.length >= Number(site.spamThreshold || 2) ||
      reasons.includes("honeypot-filled") || reasons.includes("origin-not-allowed"),
    spamScore: reasons.length,
    reasons,
  };
}

function expectedTurnstileHostnames(site) {
  if (Array.isArray(site.turnstileHostnames) && site.turnstileHostnames.length) return site.turnstileHostnames;
  return (site.allowedOrigins || []).flatMap((origin) => {
    try { return [new URL(origin).hostname]; } catch { return []; }
  });
}

function validateTurnstileResponse(result, site) {
  if (!result?.success) return { ok: false, reason: "challenge-failed" };
  const hostnames = expectedTurnstileHostnames(site);
  if (hostnames.length && !hostnames.includes(result.hostname)) {
    return { ok: false, reason: "challenge-hostname-mismatch" };
  }
  const expectedAction = site.turnstileAction || "contact_submit";
  if (expectedAction && result.action !== expectedAction) {
    return { ok: false, reason: "challenge-action-mismatch" };
  }
  return { ok: true };
}

async function verifyTurnstile({ fields, site, ip }) {
  if (!site.turnstileRequired) return { ok: true, skipped: true };
  const token = fields._turnstileToken || fields["cf-turnstile-response"] || "";
  if (!token) return { ok: false, reason: "challenge-missing" };
  const secret = await loadTurnstileSecret();
  if (!secret) {
    const error = new Error("Challenge verification is not configured.");
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return { ok: false, reason: "challenge-unavailable" };
  return validateTurnstileResponse(await response.json(), site);
}

async function checkRateLimit(siteId, dimension, valueHash, maximum = env.rateLimitMaxRequests) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / env.rateLimitWindowSeconds) * env.rateLimitWindowSeconds;
  const key = [siteId, dimension, valueHash, windowStart].join("#");
  const result = await dynamo.send(new UpdateCommand({
    TableName: env.rateLimitTable,
    Key: { rateKey: key },
    UpdateExpression: "ADD submissionCount :one SET expiresAt = :expiresAt",
    ExpressionAttributeValues: {
      ":one": 1,
      ":expiresAt": windowStart + env.rateLimitWindowSeconds * 2,
    },
    ReturnValues: "UPDATED_NEW",
  }));
  return Number(result.Attributes?.submissionCount || 0) <= maximum;
}

function publicFields(fields, site) {
  const hidden = new Set([...(site.honeypotFields || ["company", "_gotcha", "website"]), ...CONTROL_FIELDS]);
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !hidden.has(key)));
}

function buildEmail({ fields, site, siteId, submissionId, origin }) {
  const rows = Object.entries(publicFields(fields, site));
  const subjectField = fields._subject || site.subject || "New form submission from " + (site.name || siteId);
  const subject = ((site.subjectPrefix || "[" + (site.name || siteId) + "]") + " " + subjectField).slice(0, 180);
  const text = [
    "New form submission for " + (site.name || siteId), "",
    ...rows.flatMap(([key, value]) => [humanizeKey(key) + ":", String(value || ""), ""]),
    "Metadata:", "Submission ID: " + submissionId, "Site ID: " + siteId, "Origin: " + (origin || "unknown"),
  ].join("\n");
  const htmlRows = rows.map(([key, value]) =>
    '<tr><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb;width:180px;">' +
    escapeHtml(humanizeKey(key)) + '</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap;">' +
    escapeHtml(value) + "</td></tr>").join("");
  const html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;"><h1 style="font-size:20px;">New form submission</h1><p>' +
    escapeHtml(site.name || siteId) + '</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">' +
    htmlRows + '</table><p style="color:#6b7280;font-size:12px;margin-top:24px;">Submission ' +
    escapeHtml(submissionId) + " from " + escapeHtml(origin || "unknown") + "</p></body></html>";
  return {
    subject, text, html,
    replyTo: isEmail(fields[site.replyToField || "email"])
      ? fields[site.replyToField || "email"] : env.defaultReplyToEmail,
  };
}

function sesTracking(siteId, submissionId, messageType) {
  return {
    ...(env.configurationSetName ? { ConfigurationSetName: env.configurationSetName } : {}),
    EmailTags: [
      { Name: "siteId", Value: siteId.slice(0, 256) },
      { Name: "submissionId", Value: submissionId.slice(0, 256) },
      { Name: "messageType", Value: messageType },
    ],
  };
}

async function sendLeadEmail({ fields, site, siteId, submissionId, origin }) {
  const email = buildEmail({ fields, site, siteId, submissionId, origin });
  const toAddresses = splitList(site.recipientEmail || site.recipientEmails || "");
  if (!toAddresses.length) throw new Error("No recipient configured for this form.");
  const result = await ses.send(new SendEmailCommand({
    FromEmailAddress: site.fromEmail || env.defaultFromEmail,
    Destination: { ToAddresses: toAddresses },
    ReplyToAddresses: [email.replyTo],
    Content: { Simple: {
      Subject: { Data: email.subject },
      Body: { Text: { Data: email.text }, Html: { Data: email.html } },
    }},
    ...sesTracking(siteId, submissionId, "lead"),
  }));
  return result.MessageId || "";
}

function buildAutoReplyEmail({ fields, site }) {
  const name = String(fields.name || "").trim().split(/\s+/)[0] || "there";
  const responseWindow = site.autoReplyResponseWindow || "within two business days";
  const phone = site.autoReplyPhone || "";
  const plannerUrl = site.autoReplyPlannerUrl || "";
  const pricingUrl = site.autoReplyPricingUrl || "";
  const siteName = site.name || "Anchor Web Co";
  const subject = site.autoReplySubject || "We received your " + siteName + " enquiry";
  const links = [
    plannerUrl ? "Plan your website: " + plannerUrl : "",
    pricingUrl ? "Review build + care pricing: " + pricingUrl : "",
  ].filter(Boolean);
  const text = [
    "Hi " + name, "", "Thanks for contacting " + siteName + ". Your enquiry arrived safely.",
    "Matt will review it and reply personally " + responseWindow + ".",
    phone ? "If the matter is time-sensitive, call " + phone + "." : null,
    "", ...links, "",
    "This is a transactional receipt for the enquiry you submitted. You have not been added to a marketing list.",
  ].filter((line) => line !== null).join("\n");
  const htmlLinks = [
    plannerUrl ? '<li><a href="' + escapeHtml(plannerUrl) + '">Use the instant website planner</a></li>' : "",
    pricingUrl ? '<li><a href="' + escapeHtml(pricingUrl) + '">Review build + care pricing</a></li>' : "",
  ].filter(Boolean).join("");
  const html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17211b;line-height:1.6;max-width:640px;margin:0 auto;padding:24px;"><h1 style="font-size:24px;">Your enquiry arrived safely.</h1><p>Hi ' +
    escapeHtml(name) + ",</p><p>Thanks for contacting " + escapeHtml(siteName) +
    ". Matt will review your brief and reply personally " + escapeHtml(responseWindow) + ".</p>" +
    (phone ? '<p>If the matter is time-sensitive, call <a href="tel:' + escapeHtml(phone.replace(/\s+/g, "")) + '">' + escapeHtml(phone) + "</a>.</p>" : "") +
    (htmlLinks ? "<p>While you wait:</p><ul>" + htmlLinks + "</ul>" : "") +
    '<p style="color:#64748b;font-size:13px;margin-top:28px;">This is a transactional receipt for the enquiry you submitted. You have not been added to a marketing list.</p></body></html>';
  return { subject, text, html };
}

async function sendAutoReplyEmail({ fields, site, siteId, submissionId }) {
  if (!site.autoReplyEnabled || !isEmail(fields.email)) return { sent: false, reason: "disabled" };
  // Acknowledgements can otherwise be abused as a mail reflector. Keep this
  // server-side guard even though the deployment config disables them too.
  if (!site.turnstileRequired) return { sent: false, reason: "challenge-required" };
  const allowed = await checkRateLimit(
    siteId, "destination", hashIdentifier(fields.email.toLowerCase()),
    Number(site.destinationRateLimitMaxRequests || env.destinationRateLimitMaxRequests),
  );
  if (!allowed) return { sent: false, reason: "destination-rate-limit" };
  const email = buildAutoReplyEmail({ fields, site });
  const result = await ses.send(new SendEmailCommand({
    FromEmailAddress: site.fromEmail || env.defaultFromEmail,
    Destination: { ToAddresses: [fields.email] },
    ReplyToAddresses: [site.autoReplyReplyTo || env.defaultReplyToEmail],
    Content: { Simple: {
      Subject: { Data: email.subject },
      Body: { Text: { Data: email.text }, Html: { Data: email.html } },
    }},
    ...sesTracking(siteId, submissionId, "auto_reply"),
  }));
  return { sent: true, messageId: result.MessageId || "" };
}

async function storeSubmission(item) {
  await dynamo.send(new PutCommand({
    TableName: env.submissionsTable,
    Item: item,
    ConditionExpression: "attribute_not_exists(siteId) AND attribute_not_exists(submissionId)",
  }));
}

async function getSubmission(siteId, submissionId) {
  const result = await dynamo.send(new GetCommand({
    TableName: env.submissionsTable, Key: { siteId, submissionId },
  }));
  return result.Item;
}

async function updateSubmission(siteId, submissionId, updates) {
  const names = {};
  const values = {};
  const assignments = [];
  Object.entries(updates).forEach(([key, value], index) => {
    names["#k" + index] = key;
    values[":v" + index] = value;
    assignments.push("#k" + index + " = :v" + index);
  });
  await dynamo.send(new UpdateCommand({
    TableName: env.submissionsTable,
    Key: { siteId, submissionId },
    UpdateExpression: "SET " + assignments.join(", "),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

function requestedSubmissionId(fields) {
  const value = String(fields._idempotencyKey || "");
  return /^[A-Za-z0-9_-]{16,80}$/.test(value) ? value : crypto.randomUUID();
}

async function storeOnce(item) {
  try {
    await storeSubmission(item);
    return { created: true, item };
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") throw error;
    return { created: false, item: await getSubmission(item.siteId, item.submissionId) };
  }
}

const SUCCESSFUL_DELIVERY_STATUSES = new Set([
  "accepted", // Backwards compatibility for records written by the v1 handler.
  "ses_accepted", "delivery_delayed", "delivered", "bounced", "complained",
]);

function classifyExistingSubmission(existing) {
  if (existing?.spam || existing?.status === "spam") return "blocked";
  if (SUCCESSFUL_DELIVERY_STATUSES.has(existing?.status)) return "successful";
  if (["stored", "delivery_failed"].includes(existing?.status)) return "retryable";
  if (existing?.status === "sending") return "pending";
  return "failed";
}

function duplicateResponse(event, existing, submissionId) {
  const disposition = classifyExistingSubmission(existing);
  if (disposition === "blocked") return json(event, 200, { ok: true, accepted: false });
  if (disposition === "successful") {
    return json(event, 200, { ok: true, accepted: true, submissionId, duplicate: true });
  }
  if (disposition === "pending") {
    return json(event, 202, {
      ok: true, accepted: false, pending: true, submissionId,
      error: "Your enquiry is still being processed. Please retry shortly.",
    });
  }
  return json(event, 503, {
    ok: false, accepted: false, submissionId,
    error: "We could not confirm delivery yet. Please retry with the same submission.",
  });
}

async function claimSubmissionForDelivery(siteId, submissionId) {
  try {
    const result = await dynamo.send(new UpdateCommand({
      TableName: env.submissionsTable,
      Key: { siteId, submissionId },
      UpdateExpression: "SET #status = :sending, sendingAt = :sendingAt",
      ConditionExpression: "#status = :stored OR #status = :failed",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":stored": "stored", ":failed": "delivery_failed", ":sending": "sending",
        ":sendingAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }));
    return { claimed: true, item: result.Attributes };
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") throw error;
    return { claimed: false, item: await getSubmission(siteId, submissionId) };
  }
}

async function handleSubmit(event, siteId) {
  const site = await getSite(siteId);
  const fields = normalizeFields(parseBody(event), site);
  const ip = getClientIp(event);
  const ipHash = hashIdentifier(ip);
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const submissionId = requestedSubmissionId(fields);
  const submittedAt = new Date().toISOString();
  const assessment = assessSubmission({ fields, site, event });
  if (assessment.errors.length) {
    return json(event, 400, { ok: false, accepted: false, errors: assessment.errors });
  }

  const withinRateLimit = await checkRateLimit(siteId, "source", ipHash);
  const challenge = await verifyTurnstile({ fields, site, ip });
  const spamReasons = [
    ...assessment.reasons,
    ...(!withinRateLimit ? ["rate-limit"] : []),
    ...(!challenge.ok ? [challenge.reason] : []),
  ];
  const spam = assessment.spam || !withinRateLimit || !challenge.ok;
  const retentionDays = spam ? env.spamRetentionDays : env.submissionRetentionDays;
  const baseItem = {
    allKey: "ALL", siteId, submissionId, submittedAt,
    expiresAt: Math.floor(Date.now() / 1000) + retentionDays * 86400,
    status: spam ? "spam" : "stored",
    spam, spamReasons, spamScore: spamReasons.length, origin, ipHash,
    userAgentHash: hashIdentifier(event.headers?.["user-agent"] || event.headers?.["User-Agent"] || ""),
    fields: publicFields(fields, site),
  };
  const stored = await storeOnce(baseItem);
  if (!stored.created && classifyExistingSubmission(stored.item) !== "retryable") {
    return duplicateResponse(event, stored.item, submissionId);
  }
  if (spam) {
    log("form_submission_blocked", { siteId, submissionId, reasons: spamReasons });
    const challengeFailed = spamReasons.some((reason) => reason.startsWith("challenge-"));
    return json(event, challengeFailed ? 422 : 200, {
      ok: !challengeFailed, accepted: false,
      ...(challengeFailed ? { error: "Please complete the anti-spam check and try again." } : {}),
    });
  }

  const claimed = await claimSubmissionForDelivery(siteId, submissionId);
  if (!claimed.claimed) return duplicateResponse(event, claimed.item, submissionId);

  try {
    const sesMessageId = await sendLeadEmail({ fields, site, siteId, submissionId, origin });
    await updateSubmission(siteId, submissionId, {
      status: "ses_accepted", deliveryStatusRank: 10,
      sesMessageId, sesAcceptedAt: new Date().toISOString(),
    });
    let autoReply = { sent: false, reason: "disabled" };
    try {
      autoReply = await sendAutoReplyEmail({ fields, site, siteId, submissionId });
      await updateSubmission(siteId, submissionId, {
        autoReplyStatus: autoReply.sent ? "ses_accepted" : autoReply.reason,
        ...(autoReply.sent ? { autoReplyStatusRank: 10 } : {}),
        ...(autoReply.messageId ? { autoReplyMessageId: autoReply.messageId } : {}),
      });
    } catch (error) {
      await updateSubmission(siteId, submissionId, { autoReplyStatus: "failed" });
      log("form_auto_reply_failed", { siteId, submissionId, errorName: error.name });
    }
    log("form_submission_accepted", { siteId, submissionId, autoReply: autoReply.sent });
    return json(event, 200, { ok: true, accepted: true, submissionId });
  } catch (error) {
    await updateSubmission(siteId, submissionId, {
      status: "delivery_failed", failedAt: new Date().toISOString(), failureType: error.name || "Error",
    });
    log("form_delivery_failed", { siteId, submissionId, errorName: error.name });
    return json(event, 503, {
      ok: false, accepted: false,
      error: "We could not deliver your enquiry just now. Please try again.",
    });
  }
}

function buildHealthPayload(siteId, site) {
  return {
    ok: true, siteId, siteName: site.name || siteId,
    autoReplyEnabled: Boolean(site.autoReplyEnabled),
    challengeRequired: Boolean(site.turnstileRequired),
  };
}

async function handleHealth(event, siteId) {
  return json(event, 200, buildHealthPayload(siteId, await getSite(siteId)));
}

exports.handler = async function handler(event) {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path || "/";
    if (method === "OPTIONS") return options(event);
    const route = parseRoute(path);
    if (!route) return json(event, 404, { error: "Not found." });
    if (method === "GET") return handleHealth(event, route.siteId);
    if (method !== "POST") return json(event, 404, { error: "Not found." });
    return handleSubmit(event, route.siteId);
  } catch (error) {
    log("form_request_failed", { errorName: error.name, statusCode: error.statusCode || 500 });
    return json(event, error.statusCode || 500, {
      ok: false, accepted: false,
      error: error.statusCode && error.statusCode < 500 ? error.message : "Unexpected form service error.",
    });
  }
};

exports._private = {
  assessSubmission, buildAutoReplyEmail, buildEmail, buildHealthPayload,
  classifyExistingSubmission, expectedTurnstileHostnames, hashIdentifier, humanizeKey, normalizeFields,
  parseRoute, publicFields, requestedSubmissionId, validateFieldLengths,
  validateTurnstileResponse,
};
