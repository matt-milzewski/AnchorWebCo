const cmsPosts = require("./cmsBlogPosts.json");
const localPosts = require("./localBlogPosts.js");

const legacyRegionalSlugs = new Set([
  "google-ads-hervey-bay",
  "seo-maryborough-local-search",
  "web-design-maryborough",
  "tradies-websites-more-jobs",
  "seo-hervey-bay-fraser-coast",
  "hervey-bay-seo-company",
  "local-seo-hervey-bay",
  "website-design-sunshine-coast",
  "brisbane-business-seo",
  "mobile-first-design",
  "google-my-business-optimization",
  "website-speed-optimization",
  "website-design-guide",
]);

module.exports = [...localPosts, ...cmsPosts.filter((post) => !legacyRegionalSlugs.has(post.slug))]
  .filter((post) => post.status === "published")
  .map((post) => ({
    ...post,
    url: `/blog/${post.slug}/`,
  }))
  .sort((left, right) => new Date(right.date) - new Date(left.date));
