const fs = require("node:fs");
const path = require("node:path");

const siteId = process.env.ANCHOR_CMS_SITE_ID || "anchor-web-co";
const apiBase = process.env.ANCHOR_CMS_API_BASE;
const outputPath = path.resolve(__dirname, "..", "src", "_data", "cmsBlogPosts.json");

async function main() {
  if (!apiBase) {
    console.log("ANCHOR_CMS_API_BASE not set; using checked-in cmsBlogPosts.json.");
    return;
  }

  const url = `${apiBase.replace(/\/$/, "")}/api/cms/sites/${encodeURIComponent(siteId)}/published-posts`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "anchor-web-co-build",
    },
  });

  if (!response.ok) {
    throw new Error(`CMS fetch failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.posts)) {
    throw new Error("CMS response did not include a posts array.");
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(payload.posts, null, 2)}\n`);
  console.log(`Fetched ${payload.posts.length} CMS posts for ${siteId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
