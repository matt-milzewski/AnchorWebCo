const fs = require("node:fs");
const path = require("node:path");

module.exports = function () {
  const srcDirectory = path.join(process.cwd(), "src");

  return fs.readdirSync(srcDirectory)
    .filter((fileName) => fileName.endsWith(".html"))
    .filter((fileName) => {
      const contents = fs.readFileSync(path.join(srcDirectory, fileName), "utf8");
      const metaTags = contents.match(/<meta\s+[^>]*>/gi) || [];

      return !metaTags.some((tag) => {
        return /name=["']robots["']/i.test(tag) && /content=["'][^"']*noindex/i.test(tag);
      });
    })
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const absolutePath = path.join(srcDirectory, fileName);
      const stats = fs.statSync(absolutePath);

      return {
        fileName,
        url: fileName === "index.html" ? "/" : `/${fileName}`,
        lastmod: stats.mtime.toISOString(),
      };
    });
};
