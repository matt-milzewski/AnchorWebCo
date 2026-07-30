const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const locationPages = require("../src/_data/locationSeoPages.json");

const outputRoot = path.resolve("_site");
const siteOrigin = "https://www.anchorwebco.com.au";
const comparisonFiles = [
  "web-design-brisbane-inner-west.html",
  "web-design-red-hill.html",
  "web-design-brisbane-tradies.html",
];

function occurrences(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lt: "<",
    nbsp: " ",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };

  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity);
}

function textOnly(value) {
  return decodeEntities(
    String(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function mainHtml(html, fileName) {
  const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  assert.ok(match, `${fileName}: missing main content`);
  return match[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
}

function normaliseForComparison(value) {
  return textOnly(value)
    .toLowerCase()
    .replace(
      /\b(?:brisbane(?:'s)?|queensland|qld|inner west|paddington|ashgrove|red hill|bardon|kelvin grove|milton|auchenflower|petrie terrace|toowong|newmarket)\b/g,
      " location ",
    )
    .replace(/\$\s?[\d,.]+(?:\s*(?:per month|per year|\/mo|\/year))?/g, " price ")
    .replace(/\b\d[\d,.]*\b/g, " number ")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseForExact(value) {
  return textOnly(value)
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value) {
  return normaliseForComparison(value).split(" ").filter(Boolean);
}

function shingles(value, size = 3) {
  const tokens = words(value);
  const result = new Set();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

function jaccard(left, right) {
  const intersection = [...left].filter((item) => right.has(item)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function contentBlocks(main) {
  const blocks = new Set();
  for (const match of main.matchAll(/<(?:h2|h3|p)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|p)>/gi)) {
    const normalised = normaliseForComparison(match[1]);
    if (normalised.split(" ").filter(Boolean).length >= 8) blocks.add(normalised);
  }
  return blocks;
}

function blockOverlap(left, right) {
  const intersection = [...left].filter((item) => right.has(item)).length;
  const denominator = Math.min(left.size, right.size);
  return denominator ? intersection / denominator : 0;
}

function parseSchemas(html, fileName) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
    assert.doesNotThrow(() => JSON.parse(match[1]), `${fileName}: invalid JSON-LD`);
    return JSON.parse(match[1]);
  });
}

function visibleFaqs(main) {
  return [...main.matchAll(/<details\b[^>]*>[\s\S]*?<summary\b[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<p\b[^>]*class="[^"]*\bstep-card__body\b[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/details>/gi)]
    .map((match) => ({
      question: normaliseForExact(match[1]),
      answer: normaliseForExact(match[2]),
    }));
}

function readOutput(relativePath) {
  const absolutePath = path.join(outputRoot, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath}: missing from generated site`);
  return fs.readFileSync(absolutePath, "utf8");
}

assert.ok(fs.existsSync(outputRoot), "Run npm run build before verifying location pages.");

const sitemap = readOutput("sitemap.xml");
const imageSitemap = readOutput("sitemap-images.xml");
const pageDocuments = new Map();

for (const page of locationPages) {
  const html = readOutput(page.fileName);
  const main = mainHtml(html, page.fileName);
  const mainText = textOnly(main);
  const schemas = parseSchemas(html, page.fileName);
  const expectedCanonical = `${siteOrigin}${page.url}`;
  const descriptionMatch = html.match(/<meta name="description" content="([^"]+)">/);
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);

  assert.ok(titleMatch, `${page.fileName}: missing title`);
  assert.ok(titleMatch[1].length <= 60, `${page.fileName}: title is longer than 60 characters`);
  assert.match(titleMatch[1], new RegExp(page.suburb, "i"), `${page.fileName}: title does not own the suburb intent`);
  assert.ok(descriptionMatch, `${page.fileName}: missing description`);
  assert.ok(
    descriptionMatch[1].length >= 120 && descriptionMatch[1].length <= 160,
    `${page.fileName}: description should be 120–160 characters (found ${descriptionMatch[1].length})`,
  );
  assert.equal(
    occurrences(html, new RegExp(`<link rel="canonical" href="${expectedCanonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`, "g")),
    1,
    `${page.fileName}: exact self-referencing canonical`,
  );
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i, `${page.fileName}: unexpectedly noindex`);
  assert.ok(words(mainText).length >= 500, `${page.fileName}: main content is below the 500-word useful-content floor`);

  const evidence = new Set([...main.matchAll(/data-location-evidence="([^"]+)"/g)].map((match) => match[1]));
  assert.ok(evidence.size >= 4, `${page.fileName}: fewer than four distinct evidence categories`);
  assert.match(html, new RegExp(`src="${page.heroImage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${page.fileName}: local hero image`);
  assert.ok(
    fs.existsSync(path.join(outputRoot, page.heroImage.replace(/^\//, ""))),
    `${page.fileName}: hero image is missing from the generated site`,
  );

  for (const location of page.ctaLocations) {
    assert.match(html, new RegExp(`data-track-prop-button-location="${location}"`), `${page.fileName}: tracked CTA ${location}`);
  }
  assert.ok(occurrences(html, /data-track="cta-quote"/g) >= 2, `${page.fileName}: needs tracked hero and final CTAs`);
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);
  for (const link of page.trackedLinks) {
    assert.ok(
      anchors.some(
        (anchor) => anchor.includes(`href="${link.href}"`)
          && anchor.includes(`data-track="${link.event}"`)
          && anchor.includes(`data-track-prop-button-location="${link.location}"`),
      ),
      `${page.fileName}: missing ${link.event} tracking for ${link.href} at ${link.location}`,
    );
  }
  assert.match(html, /\$1,970/, `${page.fileName}: entry build price`);
  assert.match(html, /\$79/, `${page.fileName}: entry care price`);
  assert.match(html, /paired with|build \+ care|build and care/i, `${page.fileName}: connected build and care offer`);

  const falseBaseClaim = new RegExp(
    `(?:Anchor Web Co|I|we(?:'re| are)?)\\s+(?:is\\s+|am\\s+|are\\s+)?based in ${page.suburb}`,
    "i",
  );
  assert.doesNotMatch(mainText, falseBaseClaim, `${page.fileName}: false ${page.suburb} base claim`);
  assert.doesNotMatch(
    html,
    new RegExp(`"addressLocality"\\s*:\\s*"${page.suburb}"`, "i"),
    `${page.fileName}: false ${page.suburb} postal address`,
  );
  assert.match(mainText, /based (?:next door |nearby )?in Red Hill|Red Hill based/i, `${page.fileName}: honest Red Hill base statement`);

  const service = schemas.find((schema) => schema["@type"] === "Service");
  assert.ok(service, `${page.fileName}: missing Service schema`);
  assert.equal(service.url, expectedCanonical, `${page.fileName}: Service URL`);
  assert.equal(service.provider?.["@id"], `${siteOrigin}/#business`, `${page.fileName}: Service provider`);
  assert.equal(service.areaServed?.["@type"], "Place", `${page.fileName}: Service area type`);
  assert.equal(service.areaServed?.name, `${page.suburb}, Queensland ${page.postcode}`, `${page.fileName}: Service area name`);
  assert.equal(service.serviceType, "Website design and development", `${page.fileName}: Service type matches the build-only offer`);
  assert.equal(String(service.offers?.lowPrice), "1970", `${page.fileName}: Service lowPrice`);

  const professionalService = schemas.find((schema) => schema["@type"] === "ProfessionalService");
  assert.equal(professionalService?.address?.addressLocality, "Red Hill", `${page.fileName}: global business locality`);

  const faqSchema = schemas.find((schema) => schema["@type"] === "FAQPage");
  assert.ok(faqSchema, `${page.fileName}: missing FAQPage schema`);
  const visible = visibleFaqs(main);
  const markedUp = faqSchema.mainEntity.map((entity) => ({
    question: normaliseForExact(entity.name),
    answer: normaliseForExact(entity.acceptedAnswer?.text),
  }));
  assert.deepEqual(markedUp, visible, `${page.fileName}: visible FAQs and FAQ schema differ`);

  assert.equal(
    occurrences(sitemap, new RegExp(`<loc>${expectedCanonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>`, "g")),
    1,
    `${page.fileName}: standard sitemap entry`,
  );
  assert.equal(
    occurrences(imageSitemap, new RegExp(`<loc>${expectedCanonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>`, "g")),
    1,
    `${page.fileName}: image sitemap page entry`,
  );
  assert.match(
    imageSitemap,
    new RegExp(`<image:loc>${siteOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${page.heroImage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</image:loc>`),
    `${page.fileName}: image sitemap hero entry`,
  );

  for (const inboundPage of page.requiredInboundPages) {
    const inboundHtml = readOutput(inboundPage);
    assert.match(
      inboundHtml,
      new RegExp(`href="${page.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
      `${inboundPage}: missing contextual link to ${page.url}`,
    );
  }

  pageDocuments.set(page.fileName, {
    main,
    shingles: shingles(main),
    blocks: contentBlocks(main),
  });
}

for (const fileName of comparisonFiles) {
  const html = readOutput(fileName);
  const main = mainHtml(html, fileName);
  pageDocuments.set(fileName, {
    main,
    shingles: shingles(main),
    blocks: contentBlocks(main),
  });
}

const entries = [...pageDocuments.entries()];
for (let leftIndex = 0; leftIndex < locationPages.length; leftIndex += 1) {
  const [leftName, left] = entries[leftIndex];
  for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
    const [rightName, right] = entries[rightIndex];
    const similarity = jaccard(left.shingles, right.shingles);
    const overlap = blockOverlap(left.blocks, right.blocks);
    assert.ok(
      similarity < 0.25,
      `${leftName} and ${rightName}: normalised three-word-shingle similarity ${similarity.toFixed(3)} is too high`,
    );
    assert.ok(
      overlap <= 0.2,
      `${leftName} and ${rightName}: exact content-block overlap ${(overlap * 100).toFixed(1)}% is too high`,
    );
    console.log(
      `PASS ${leftName} vs ${rightName}: similarity ${similarity.toFixed(3)}, exact-block overlap ${(overlap * 100).toFixed(1)}%`,
    );
  }
}

console.log(
  `Verified ${locationPages.length} useful, differentiated and honestly located suburb pages with complete discovery, schema, CTA and FAQ coverage.`,
);
