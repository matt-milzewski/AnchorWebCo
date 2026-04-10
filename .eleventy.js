const fs = require("node:fs");
const path = require("node:path");

const INPUT_DIR = "src";

function formatDate(value, options) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    ...options,
  }).format(date);
}

function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = function (eleventyConfig) {
  [
    "css",
    "js",
    "img",
    "icons",
    "images",
    "admin",
  ].forEach((directory) => {
    const directoryPath = path.join(INPUT_DIR, directory);

    if (fs.existsSync(directoryPath)) {
      eleventyConfig.addPassthroughCopy(directoryPath);
    }
  });

  fs.readdirSync(INPUT_DIR, { withFileTypes: true })
    .filter((entry) => {
      return entry.isFile() && [".html", ".txt", ".xml"].includes(path.extname(entry.name));
    })
    .forEach((entry) => {
      eleventyConfig.addPassthroughCopy(path.join(INPUT_DIR, entry.name));
    });

  eleventyConfig.addFilter("readableDate", (value) => {
    return formatDate(value, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  });

  eleventyConfig.addFilter("dateToISO", (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  });

  eleventyConfig.addFilter("slugify", slugify);

  eleventyConfig.addCollection("blog", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/blog/posts/**/*.md").sort((left, right) => {
      return left.date - right.date;
    });
  });

  return {
    dir: {
      input: INPUT_DIR,
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: false,
    dataTemplateEngine: "njk",
  };
};
