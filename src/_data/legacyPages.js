const fs = require("node:fs");
const path = require("node:path");
const locationSeoPages = require("./locationSeoPages.json");

const publicPages = [
  "index.html",
  "web-design-brisbane-inner-west.html",
  "web-design-red-hill.html",
  ...locationSeoPages.map((page) => page.fileName),
  "local-seo-brisbane-inner-west.html",
  "pricing.html",
  "website-care-plans.html",
  "work.html",
  "health-check.html",
  "website-planner.html",
  "web-design-brisbane-tradies.html",
  "about.html",
  "contact.html",
  "privacy.html",
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
