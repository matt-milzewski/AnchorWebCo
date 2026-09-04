const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

const env = {
  submissionsTable: process.env.FORM_SUBMISSIONS_TABLE,
  alertsTopicArn: process.env.FORM_ALERTS_TOPIC_ARN,
  dashboardUrl: process.env.FORM_ADMIN_DASHBOARD_URL || "",
  spamCountThreshold: Number(process.env.FORM_MONTHLY_SPAM_COUNT_THRESHOLD || 25),
  spamRateThreshold: Number(process.env.FORM_MONTHLY_SPAM_RATE_THRESHOLD || 50),
};

function reportWindow(now = new Date()) {
  const until = new Date(now);
  const since = new Date(until.getTime() - 30 * 86400000);
  return { since: since.toISOString(), until: until.toISOString() };
}

function buildQuery(window, cursor) {
  return {
    TableName: env.submissionsTable,
    IndexName: "all-submitted-at-index",
    KeyConditionExpression: "#all = :all AND #submittedAt BETWEEN :since AND :until",
    ExpressionAttributeValues: { ":all": "ALL", ":since": window.since, ":until": window.until },
    ProjectionExpression: "siteId, #status, spam, spamReasons",
    ExpressionAttributeNames: {
      "#all": "allKey",
      "#submittedAt": "submittedAt",
      "#status": "status",
    },
    ...(cursor ? { ExclusiveStartKey: cursor } : {}),
  };
}

async function loadSubmissions(window) {
  const items = [];
  let cursor;
  do {
    const result = await dynamo.send(new QueryCommand(buildQuery(window, cursor)));
    items.push(...(result.Items || []));
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return items;
}

function increment(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function summarize(items, thresholds = {}) {
  const bySite = {};
  const reasons = {};
  const deliveryIssues = {};
  let spam = 0;
  for (const item of items) {
    const siteId = String(item.siteId || "unknown");
    if (!bySite[siteId]) bySite[siteId] = { total: 0, spam: 0 };
    bySite[siteId].total += 1;
    const isSpam = item.spam === true || item.status === "spam";
    if (isSpam) {
      spam += 1;
      bySite[siteId].spam += 1;
      for (const reason of item.spamReasons || []) increment(reasons, String(reason));
    }
    if (["delivery_failed", "bounced", "complained"].includes(item.status)) {
      increment(deliveryIssues, String(item.status));
    }
  }
  const total = items.length;
  const spamRate = total ? Math.round((spam / total) * 1000) / 10 : 0;
  const countThreshold = Number(thresholds.count ?? env.spamCountThreshold);
  const rateThreshold = Number(thresholds.rate ?? env.spamRateThreshold);
  const highSpam = spam >= countThreshold || (total >= 10 && spam >= 5 && spamRate >= rateThreshold);
  return {
    total,
    legitimate: total - spam,
    spam,
    spamRate,
    highSpam,
    bySite,
    reasons,
    deliveryIssues,
  };
}

function orderedLines(counts, formatter) {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, value]) => formatter(key, value));
}

function buildMessage(summary, window, options = {}) {
  const prefix = options.test ? "[TEST] " : "";
  const attention = summary.highSpam ? "Attention: " : "";
  const subject = `${prefix}${attention}Anchor Forms monthly spam report`.slice(0, 100);
  const siteLines = orderedLines(summary.bySite, (siteId, counts) =>
    `- ${siteId}: ${counts.total} total, ${counts.spam} blocked as spam`,
  );
  const reasonLines = orderedLines(summary.reasons, (reason, count) => `- ${reason}: ${count}`);
  const issueLines = orderedLines(summary.deliveryIssues, (status, count) => `- ${status}: ${count}`);
  const body = [
    `${prefix}Anchor Forms monthly operational summary`,
    "",
    `Period: ${window.since.slice(0, 10)} through ${window.until.slice(0, 10)} (rolling 30 days)`,
    `Total submissions: ${summary.total}`,
    `Legitimate submissions: ${summary.legitimate}`,
    `Spam blocked: ${summary.spam} (${summary.spamRate}%)`,
    `Spam activity: ${summary.highSpam ? "HIGH - review the dashboard" : "within the configured threshold"}`,
    "",
    "By site:",
    ...(siteLines.length ? siteLines : ["- No submissions in this period"]),
    "",
    "Top spam signals:",
    ...(reasonLines.length ? reasonLines : ["- None"]),
    "",
    "Non-spam delivery issues:",
    ...(issueLines.length ? issueLines : ["- None"]),
    ...(env.dashboardUrl ? ["", `Dashboard: ${env.dashboardUrl}`] : []),
    "",
    "This report contains aggregate counts only; it does not include contact details or message content.",
  ].join("\n");
  return { subject, body };
}

async function publishReport(message) {
  if (!env.alertsTopicArn) throw new Error("FORM_ALERTS_TOPIC_ARN is required.");
  await sns.send(new PublishCommand({
    TopicArn: env.alertsTopicArn,
    Subject: message.subject,
    Message: message.body,
  }));
}

exports.handler = async function handler(event = {}) {
  const window = reportWindow();
  const summary = summarize(await loadSubmissions(window));
  const message = buildMessage(summary, window, { test: event.test === true });
  await publishReport(message);
  console.log(JSON.stringify({
    event: "monthly_forms_report_sent",
    test: event.test === true,
    total: summary.total,
    spam: summary.spam,
    highSpam: summary.highSpam,
  }));
  return { sent: true, test: event.test === true, summary };
};

exports._private = { buildMessage, buildQuery, reportWindow, summarize };
