const fs = require("node:fs");
const path = require("node:path");

const publicPages = [
  "index.html",
  "web-design-brisbane-inner-west.html",
  "web-design-red-hill.html",
  "local-seo-brisbane-inner-west.html",
  "pricing.html",
  "website-care-plans.html",
  "work.html",
  "free-website-audit-brisbane.html",
  "health-check.html",
  "about.html",
  "contact.html",
];

module.exports = function () {
  return publicPages.map((fileName) => {
    const absolutePath = path.join(process.cwd(), "src", fileName);
    const stats = fs.statSync(absolutePath);

    return {
      fileName,
      url: fileName === "index.html" ? "/" : `/${fileName}`,
      lastmod: stats.mtime.toISOString(),
    };
  });
};
