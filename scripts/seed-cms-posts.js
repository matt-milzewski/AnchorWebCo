const fs = require("node:fs");
const path = require("node:path");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const siteId = process.env.ANCHOR_CMS_SITE_ID || "anchor-web-co";
const tableName = process.env.ANCHOR_CMS_POSTS_TABLE;
const postsPath = path.resolve(__dirname, "..", "src", "_data", "cmsBlogPosts.json");

if (!tableName) {
  console.error("ANCHOR_CMS_POSTS_TABLE is required.");
  process.exit(1);
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

async function main() {
  for (const post of posts) {
    await dynamo.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          ...post,
          siteId,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  }

  console.log(`Seeded ${posts.length} posts into ${tableName} for ${siteId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
