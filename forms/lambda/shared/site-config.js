const zlib = require("node:zlib");

function parseSitesConfig(value) {
  const encoded = String(value || "");
  const jsonValue = encoded.startsWith("gzip:")
    ? zlib.gunzipSync(Buffer.from(encoded.slice(5), "base64")).toString("utf8")
    : encoded;
  return JSON.parse(jsonValue);
}

module.exports = { parseSitesConfig };
