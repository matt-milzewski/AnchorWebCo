const fs = require("node:fs");
const path = require("node:path");

module.exports = function () {
  const srcDirectory = path.join(process.cwd(), "src");

  return fs.readdirSync(srcDirectory)
    .filter((fileName) => fileName.endsWith(".html"))
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
