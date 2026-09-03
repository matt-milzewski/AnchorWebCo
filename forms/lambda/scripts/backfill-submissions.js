const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const tableName = process.env.FORM_SUBMISSIONS_TABLE;
if (!tableName) throw new Error("FORM_SUBMISSIONS_TABLE is required.");
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

(async () => {
  let cursor;
  let updated = 0;
  do {
    const page = await dynamo.send(new ScanCommand({
      TableName: tableName,
      ProjectionExpression: "siteId, submissionId, submittedAt, allKey, #ip, #userAgent",
      ExpressionAttributeNames: { "#ip": "ip", "#userAgent": "userAgent" },
      ExclusiveStartKey: cursor,
    }));
    for (const item of page.Items || []) {
      const addIndex = !item.allKey && Boolean(item.submittedAt);
      const removeLegacyNetworkData = Object.hasOwn(item, "ip") || Object.hasOwn(item, "userAgent");
      if (!addIndex && !removeLegacyNetworkData) continue;
      try {
        const updates = [];
        if (addIndex) updates.push("SET allKey = :all");
        if (removeLegacyNetworkData) updates.push("REMOVE #ip, #userAgent");
        await dynamo.send(new UpdateCommand({
          TableName: tableName,
          Key: { siteId: item.siteId, submissionId: item.submissionId },
          UpdateExpression: updates.join(" "),
          ...(addIndex ? {
            ConditionExpression: "attribute_not_exists(allKey)",
            ExpressionAttributeValues: { ":all": "ALL" },
          } : {}),
          ...(removeLegacyNetworkData ? {
            ExpressionAttributeNames: { "#ip": "ip", "#userAgent": "userAgent" },
          } : {}),
        }));
        updated += 1;
      } catch (error) {
        if (error.name !== "ConditionalCheckFailedException") throw error;
      }
    }
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  console.log("Backfilled reporting indexes for " + updated + " existing submissions.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
