const posts = require("./cmsBlogPosts.json");

module.exports = posts
  .filter((post) => post.status === "published")
  .map((post) => ({
    ...post,
    url: `/blog/${post.slug}/`,
  }))
  .sort((left, right) => new Date(right.date) - new Date(left.date));
