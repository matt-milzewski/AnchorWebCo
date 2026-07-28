const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("cloudfront-function.js", "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(source, context);

function request(uri, options = {}) {
  return {
    request: {
      uri,
      headers: {
        host: { value: options.host || "www.anchorwebco.com.au" },
        "cloudfront-forwarded-proto": { value: options.proto || "https" },
      },
      querystring: options.querystring || {},
    },
  };
}

function expectRedirect(uri, destination, options) {
  const result = context.handler(request(uri, options));
  assert.equal(result.statusCode, 301, `${uri} should return a 301`);
  assert.equal(result.headers.location.value, destination);
}

expectRedirect(
  "/web-design-hervey-bay",
  "https://www.anchorwebco.com.au/web-design-brisbane-inner-west.html",
);
expectRedirect(
  "/seo-maryborough.html",
  "https://www.anchorwebco.com.au/local-seo-brisbane-inner-west.html",
);
expectRedirect(
  "/free-website-audit-hervey-bay",
  "https://www.anchorwebco.com.au/free-website-audit-brisbane.html",
);
expectRedirect(
  "/blog/local-seo-hervey-bay/",
  "https://www.anchorwebco.com.au/blog/local-seo-brisbane-inner-west/",
);
expectRedirect(
  "/blog/website-speed-optimization.html",
  "https://www.anchorwebco.com.au/health-check.html",
);
expectRedirect(
  "/blog-brisbane-seo",
  "https://www.anchorwebco.com.au/blog/local-seo-brisbane-inner-west/",
);
expectRedirect(
  "/pricing",
  "https://www.anchorwebco.com.au/pricing.html?ref=test",
  { querystring: { ref: { value: "test" } } },
);
expectRedirect(
  "/",
  "https://www.anchorwebco.com.au/",
  { host: "anchorwebco.com.au" },
);

const home = context.handler(request("/"));
assert.equal(home.uri, "/index.html");

const blogPost = context.handler(request("/blog/red-hill-business-website/"));
assert.equal(blogPost.uri, "/blog/red-hill-business-website/index.html");

console.log("CloudFront routing checks passed.");
