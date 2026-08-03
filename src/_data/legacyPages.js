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
  "web-design-cleaners-brisbane.html",
  "web-design-electricians-brisbane.html",
  "web-design-security-companies-brisbane.html",
  "web-design-plumbers-brisbane.html",
  "work-coastwide-exterior-cleaning-website.html",
  "work-bannister-communications-website.html",
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
      url: fileName === "index.html"
        ? "/"
        : fileName === "work-coastwide-exterior-cleaning-website.html"
          ? "/work/coastwide-exterior-cleaning-website.html"
          : fileName === "work-bannister-communications-website.html"
            ? "/work/bannister-communications-website.html"
            : `/${fileName}`,
      lastmod: stats.mtime.toISOString(),
    };
  });
};
