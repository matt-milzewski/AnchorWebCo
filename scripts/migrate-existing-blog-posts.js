const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "src", "blog", "posts");
const archiveDir = path.join(root, "docs", "saved-blog-posts");
const dataDir = path.join(root, "src", "_data");
const outputPath = path.join(dataDir, "cmsBlogPosts.json");

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });

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

function dateOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function readPosts() {
  return fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(sourceDir, file);
      const parsed = matter(fs.readFileSync(filePath, "utf8"));
      const slug =
        parsed.data.permalink
          ?.replace(/^\/blog\//, "")
          .replace(/\/$/, "") ||
        slugify(parsed.data.title || path.basename(file, ".md"));

      return {
        title: parsed.data.title || slug,
        slug,
        date: dateOnly(parsed.data.date),
        status: "published",
        description: parsed.data.description || "",
        seoTitle: parsed.data.title || "",
        seoDescription: parsed.data.description || "",
        featuredImage: parsed.data.featuredImage || "",
        body: markdown.render(parsed.content.trim()),
        sourceFile: file,
      };
    })
    .sort((left, right) => new Date(right.date) - new Date(left.date));
}

fs.mkdirSync(archiveDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const posts = readPosts();

for (const post of posts) {
  const from = path.join(sourceDir, post.sourceFile);
  const to = path.join(archiveDir, post.sourceFile);
  if (!fs.existsSync(to)) {
    fs.copyFileSync(from, to);
  }
}

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    posts.map(({ sourceFile, ...post }) => post),
    null,
    2,
  )}\n`,
);

console.log(`Archived ${posts.length} Markdown posts to ${path.relative(root, archiveDir)}`);
console.log(`Wrote ${posts.length} CMS posts to ${path.relative(root, outputPath)}`);
