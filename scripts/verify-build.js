const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const outputRoot = path.resolve("_site");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function occurrences(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function resolveLocalPath(urlValue) {
  const pathname = new URL(urlValue, "https://www.anchorwebco.com.au").pathname;
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");

  if (!relativePath) return path.join(outputRoot, "index.html");
  if (pathname.endsWith("/")) return path.join(outputRoot, relativePath, "index.html");

  const exact = path.join(outputRoot, relativePath);
  if (path.extname(relativePath)) return exact;

  const htmlVariant = `${exact}.html`;
  return fs.existsSync(htmlVariant) ? htmlVariant : path.join(exact, "index.html");
}

assert.ok(fs.existsSync(outputRoot), "Run npm run build before verifying the output.");

const htmlFiles = walk(outputRoot)
  .filter((file) => file.endsWith(".html"))
  .filter((file) => !file.includes(`${path.sep}admin${path.sep}`));

assert.equal(
  walk(outputRoot).some((file) => /bh[-_]?lock|bhlocksandsecurity/i.test(path.basename(file))),
  false,
  "Legacy BH Lock assets must not be present in the public build.",
);

const titles = new Map();

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(outputRoot, file);

  assert.equal(occurrences(html, /<title>[^<]+<\/title>/g), 1, `${relative}: title`);
  assert.equal(occurrences(html, /<meta name="description" content="[^"]+">/g), 1, `${relative}: description`);
  assert.equal(occurrences(html, /<link rel="canonical" href="https:\/\/www\.anchorwebco\.com\.au\/[^"]*">/g), 1, `${relative}: canonical`);
  assert.equal(occurrences(html, /<h1(?:\s|>)/g), 1, `${relative}: H1`);
  assert.equal(occurrences(html, /<meta property="og:image" content="https:\/\/www\.anchorwebco\.com\.au\/[^"]+">/g), 1, `${relative}: og:image`);
  assert.equal(occurrences(html, /<meta property="og:image:width" content="\d+">/g), 1, `${relative}: og:image width`);
  assert.equal(occurrences(html, /<meta property="og:image:height" content="\d+">/g), 1, `${relative}: og:image height`);
  assert.equal(occurrences(html, /<meta name="twitter:card" content="summary_large_image">/g), 1, `${relative}: Twitter card`);
  assert.equal(occurrences(html, /<link rel="stylesheet" href="\/css\/tailwind-build\.css">/g), 1, `${relative}: compiled Tailwind CSS`);
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/, `${relative}: Tailwind browser CDN`);
  assert.equal(occurrences(html, /href="#"/g), 0, `${relative}: empty hash link`);

  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  assert.ok(!titles.has(title), `${relative}: duplicate title also used by ${titles.get(title)}`);
  titles.set(title, relative);

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${relative}: invalid JSON-LD`);
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (
      value.startsWith("#")
      || value.startsWith("mailto:")
      || value.startsWith("tel:")
      || value.startsWith("http:")
      || value.startsWith("https:")
      || value.startsWith("//")
      || value.startsWith("/api/")
      || value.startsWith("__ANCHOR_")
    ) {
      continue;
    }

    const localPath = resolveLocalPath(value);
    assert.ok(fs.existsSync(localPath), `${relative}: missing local target ${value}`);
  }

  assert.doesNotMatch(html, /Hervey Bay|Fraser Coast|Sunshine Coast/i, `${relative}: retired regional positioning`);
  assert.doesNotMatch(html, /BH Lock|bhlocks|bh-lock/i, `${relative}: retired BH Lock portfolio reference`);
  assert.doesNotMatch(
    html,
    /Primary area|Supporting area|Later expansion|first SEO priority|minimum has been lifted|Brisbane’s inner west is the market|launch structure targets/i,
    `${relative}: internal business-planning language`,
  );
  assert.doesNotMatch(
    html,
    /Ongoing care is optional|Optional care starts/i,
    `${relative}: disconnected optional-care positioning`,
  );
  if (!["index.html", "work.html"].includes(relative)) {
    assert.doesNotMatch(html, /Maryborough/i, `${relative}: retired regional positioning`);
  }
}

const pricingHtml = fs.readFileSync(path.join(outputRoot, "pricing.html"), "utf8");
assert.match(pricingHtml, /Step 1 · One-off build/, "pricing.html: build step");
assert.match(pricingHtml, /Step 2 · Ongoing hosting &amp; care/, "pricing.html: hosting and care step");
assert.match(pricingHtml, /Every new Anchor-built website is paired with a hosting and care plan/, "pricing.html: connected offer");

const contactHtml = fs.readFileSync(path.join(outputRoot, "contact.html"), "utf8");
assert.match(contactHtml, /name="care_plan"/, "contact.html: separate hosting and care selection");

console.log(
  `Verified ${htmlFiles.length} public HTML files with unique metadata, valid JSON-LD, and working internal targets.`,
);
