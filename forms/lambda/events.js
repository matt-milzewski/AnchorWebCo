const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.FORM_SUBMISSIONS_TABLE;

function firstTag(mail, name) {
  const value = mail?.tags?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function mapStatus(eventType) {
  return {
    Delivery: "delivered",
    Bounce: "bounced",
    Complaint: "complained",
    DeliveryDelay: "delivery_delayed",
    Reject: "delivery_failed",
    RenderingFailure: "delivery_failed",
  }[eventType] || "";
}

function statusRank(eventType) {
  return {
    DeliveryDelay: 20,
    Delivery: 30,
    Bounce: 40,
    Reject: 40,
    RenderingFailure: 40,
    Complaint: 50,
  }[eventType] || 0;
}

function eventTimestamp(payload, eventType) {
  const eventKey = {
    Delivery: "delivery",
    Bounce: "bounce",
    Complaint: "complaint",
    DeliveryDelay: "deliveryDelay",
    Reject: "reject",
    RenderingFailure: "renderingFailure",
  }[eventType];
  const raw = payload[eventKey]?.timestamp || payload.mail?.timestamp || "";
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function feedbackUpdate(payload) {
  const eventType = payload.eventType || payload.notificationType || "";
  const status = mapStatus(eventType);
  const rank = statusRank(eventType);
  const siteId = firstTag(payload.mail, "siteId");
  const submissionId = firstTag(payload.mail, "submissionId");
  const messageType = firstTag(payload.mail, "messageType") || "lead";
  const messageId = String(payload.mail?.messageId || "");
  if (!status || !rank || !siteId || !submissionId || !messageId) return null;
  const autoReply = messageType === "auto_reply";
  const statusField = autoReply ? "autoReplyStatus" : "status";
  const rankField = autoReply ? "autoReplyStatusRank" : "deliveryStatusRank";
  const timestampField = autoReply ? "autoReplyEventAt" : "deliveryEventAt";
  const messageIdField = autoReply ? "autoReplyMessageId" : "sesMessageId";
  const eventField = autoReply ? "lastAutoReplySesEvent" : "lastLeadSesEvent";
  const at = eventTimestamp(payload, eventType);
  return {
    siteId, submissionId, messageType, status,
    command: {
      TableName: tableName,
      Key: { siteId, submissionId },
      UpdateExpression: "SET #status = :status, #rank = :rank, #at = :at, #event = :event",
      ExpressionAttributeNames: {
        "#status": statusField, "#rank": rankField, "#at": timestampField,
        "#messageId": messageIdField, "#event": eventField,
      },
      ExpressionAttributeValues: {
        ":status": status, ":rank": rank, ":at": at,
        ":event": eventType, ":messageId": messageId,
      },
      ConditionExpression: "#messageId = :messageId AND "
        + "(attribute_not_exists(#rank) OR #rank < :rank "
        + "OR (#rank = :rank AND (attribute_not_exists(#at) OR #at <= :at)))",
    },
  };
}

async function applyFeedback(payload) {
  const update = feedbackUpdate(payload);
  if (!update) return false;
  try {
    await dynamo.send(new UpdateCommand(update.command));
    console.log(JSON.stringify({
      event: "ses_feedback", siteId: update.siteId, submissionId: update.submissionId,
      messageType: update.messageType, status: update.status,
    }));
    return true;
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") throw error;
    console.log(JSON.stringify({
      event: "ses_feedback_ignored", siteId: update.siteId,
      submissionId: update.submissionId, messageType: update.messageType,
    }));
    return false;
  }
}

exports.handler = async function handler(event) {
  for (const record of event.Records || []) {
    try {
      const payload = JSON.parse(record.Sns?.Message || "{}");
      await applyFeedback(payload);
    } catch (error) {
      console.error(JSON.stringify({ event: "ses_feedback_failed", errorName: error.name }));
      throw error;
    }
  }
};

exports._private = { eventTimestamp, feedbackUpdate, firstTag, mapStatus, statusRank };
