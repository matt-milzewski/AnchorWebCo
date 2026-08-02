const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { tenantPk } = require("./events");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function tableName() {
  return process.env.ANALYTICS_TABLE_NAME || "anchor_analytics";
}

async function getTenant(clientId) {
  const result = await client.send(new GetCommand({
    TableName: tableName(),
    Key: { PK: tenantPk(clientId), SK: "CFG#TENANT" }
  }));
  return result.Item || null;
}

async function putTenant(tenant) {
  await client.send(new PutCommand({
    TableName: tableName(),
    Item: {
      PK: tenantPk(tenant.client_id),
      SK: "CFG#TENANT",
      ...tenant
    }
  }));
  await client.send(new PutCommand({
    TableName: tableName(),
    Item: {
      PK: "REGISTRY#TENANTS",
      SK: `TENANT#${tenant.client_id}`,
      client_id: tenant.client_id,
      display_name: tenant.display_name,
      reporting_enabled: Boolean(tenant.reporting_enabled),
      plan_tier: tenant.plan_tier || "none",
      updated_at: new Date().toISOString()
    }
  }));
}

async function putEvent(item) {
  await client.send(new PutCommand({
    TableName: tableName(),
    Item: item
  }));
}

async function incrementAggregate(PK, SK, amount = 1) {
  await client.send(new UpdateCommand({
    TableName: tableName(),
    Key: { PK, SK },
    UpdateExpression: "ADD #count :inc SET updated_at = :now",
    ExpressionAttributeNames: { "#count": "count" },
    ExpressionAttributeValues: { ":inc": amount, ":now": new Date().toISOString() }
  }));
}

async function queryTenant(clientId, skPrefix) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await client.send(new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": tenantPk(clientId),
        ":sk": skPrefix
      },
      ExclusiveStartKey
    }));
    items.push(...(result.Items || []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function listTenantConfigs(clientIds) {
  if (!clientIds || !clientIds.length) {
    const registryItems = [];
    let ExclusiveStartKey;
    do {
      const registry = await client.send(new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": "REGISTRY#TENANTS",
          ":sk": "TENANT#"
        },
        ExclusiveStartKey
      }));
      registryItems.push(...(registry.Items || []));
      ExclusiveStartKey = registry.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    clientIds = registryItems.map((item) => item.client_id).filter(Boolean);
  }

  const tenants = [];
  for (const clientId of clientIds) {
    const tenant = await getTenant(clientId);
    if (tenant) tenants.push(tenant);
  }
  return tenants;
}

module.exports = {
  client,
  getTenant,
  incrementAggregate,
  listTenantConfigs,
  putEvent,
  putTenant,
  queryTenant,
  tableName
};
