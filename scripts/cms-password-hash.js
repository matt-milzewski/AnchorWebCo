const { hashPasswordForSetup } = require("../cms/lambda");

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/cms-password-hash.js <password>");
  process.exit(1);
}

console.log(hashPasswordForSetup(password));
