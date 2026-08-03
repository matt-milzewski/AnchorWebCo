const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const outputRoot = path.resolve("_site");
const origin = "https://www.anchorwebco.com.au";
const servicePages = [
  "web-design-cleaners-brisbane.html",
  "web-design-electricians-brisbane.html",
  "web-design-security-companies-brisbane.html",
  "web-design-plumbers-brisbane.html",
];
const caseStudies = [
  "work/coastwide-exterior-cleaning-website.html",
  "work/bannister-communications-website.html",
];
const articleLinks = new Map([
  ["blog/what-should-cleaning-business-website-include/index.html", "/web-design-cleaners-brisbane.html"],
  ["blog/showcase-before-after-cleaning-work/index.html", "/web-design-cleaners-brisbane.html"],
  ["blog/what-should-electrician-website-include/index.html", "/web-design-electricians-brisbane.html"],
  ["blog/electrician-better-quote-enquiries/index.html", "/web-design-electricians-brisbane.html"],
  ["blog/what-should-plumbing-website-include/index.html", "/web-design-plumbers-brisbane.html"],
  ["blog/what-should-security-company-website-include/index.html", "/web-design-security-companies-brisbane.html"],
]);

function read(relativePath) {
  const filePath = path.join(outputRoot, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath}: missing generated page`);
  return fs.readFileSync(filePath, "utf8");
}

function mainWords(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
  return main
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function mainContent(html) {
  return html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
}

function schemas(html, relativePath) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${relativePath}: invalid JSON-LD`);
    return JSON.parse(match[1]);
  });
}

const sitemap = read("sitemap.xml");
const hub = read("web-design-brisbane-tradies.html");
const footer = fs.readFileSync(path.resolve("src/_includes/footer.njk"), "utf8");

for (const fileName of servicePages) {
  const html = read(fileName);
  const url = `/${fileName}`;
  assert.ok(mainWords(html) >= 800, `${fileName}: service content is below 800 words`);
  assert.match(html, new RegExp(`href="\\/web-design-brisbane-tradies\\.html"`), `${fileName}: missing hub link`);
  assert.match(hub, new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${fileName}: missing hub link to service`);
  assert.match(footer, new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${fileName}: missing footer discovery link`);
  assert.match(sitemap, new RegExp(`<loc>${origin}${url}</loc>`), `${fileName}: missing sitemap entry`);
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i, `${fileName}: noindex present`);
  assert.doesNotMatch(mainContent(html), /\u2014|&mdash;/, `${fileName}: em dash present`);
  const pageSchemas = schemas(html, fileName);
  assert.ok(pageSchemas.some((schema) => schema["@type"] === "Service"), `${fileName}: missing Service schema`);
  assert.ok(pageSchemas.some((schema) => schema["@type"] === "BreadcrumbList"), `${fileName}: missing breadcrumb schema`);
}

for (const relativePath of caseStudies) {
  const html = read(relativePath);
  const url = `/${relativePath}`;
  assert.ok(mainWords(html) >= 450, `${relativePath}: case study content is below 450 words`);
  assert.match(sitemap, new RegExp(`<loc>${origin}${url}</loc>`), `${relativePath}: missing sitemap entry`);
  assert.doesNotMatch(mainContent(html), /\u2014|&mdash;/, `${relativePath}: em dash present`);
  const pageSchemas = schemas(html, relativePath);
  assert.ok(pageSchemas.some((schema) => schema["@type"] === "WebPage"), `${relativePath}: missing WebPage schema`);
  assert.ok(pageSchemas.some((schema) => schema["@type"] === "BreadcrumbList"), `${relativePath}: missing breadcrumb schema`);
}

const localPosts = require("../src/_data/localBlogPosts.js").slice(0, 6);
for (const [relativePath, industryUrl] of articleLinks) {
  const html = read(relativePath);
  const url = `/${relativePath.replace(/index\.html$/, "")}`;
  assert.ok(mainWords(html) >= 700, `${relativePath}: article content is below 700 words`);
  assert.match(html, new RegExp(`href="${industryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${relativePath}: missing industry link`);
  assert.match(sitemap, new RegExp(`<loc>${origin}${url}</loc>`), `${relativePath}: missing sitemap entry`);
  const pageSchemas = schemas(html, relativePath);
  assert.ok(pageSchemas.some((schema) => schema["@type"] === "BlogPosting"), `${relativePath}: missing BlogPosting schema`);
  assert.ok(pageSchemas.some((schema) => schema["@type"] === "BreadcrumbList"), `${relativePath}: missing breadcrumb schema`);
}

for (const post of localPosts) {
  assert.doesNotMatch(post.body, /\u2014|&mdash;/, `${post.slug}: em dash present`);
}

console.log("Verified the Brisbane trades hub, four industry pages, six articles and two case studies.");
