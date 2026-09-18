import { writeFile } from "node:fs/promises";
import path from "node:path";

const base = JSON.parse(process.env.FORM_SITE_CONFIGS_JSON || "[]");
if (!Array.isArray(base)) throw new Error("FORM_SITE_CONFIGS_JSON must contain an array.");
const extraRaw = String(process.env.HAVEN_FORM_SITE_CONFIG_JSON || "").trim();
const parsedExtra = extraRaw ? JSON.parse(extraRaw) : [];
const extras = Array.isArray(parsedExtra) ? parsedExtra : [parsedExtra];
const extraIds = new Set(extras.map((site) => site.siteId));
const sites = base.filter((site) => !extraIds.has(site.siteId)).concat(extras);
const turnstileEnabled = Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
const havenRecipientEmail = String(process.env.HAVEN_RECIPIENT_EMAIL || "").trim();
const bannisterRecipientEmail = String(process.env.BANNISTER_RECIPIENT_EMAIL || "").trim();
const coastwideRecipientEmail = String(process.env.COASTWIDE_RECIPIENT_EMAIL || "").trim();
const halterRecipientEmail = String(process.env.HALTER_RECIPIENT_EMAIL || "").trim();
// Halter has not settled on a production domain yet, so its origins can be
// overridden from a repo variable without a code change. The default is the
// domain the Halter site itself falls back to.
const halterAllowedOrigins = String(process.env.HALTER_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const anchorAllowedFields = [
  "name", "email", "phone", "project_stage", "business_suburb", "message", "current_website",
  "recommended_package", "recommended_care", "planner_source",
];
const havenAllowedFields = ["name", "phone", "email", "address", "service", "message"];
const bannisterSite = {
  siteId: "bannister-communications",
  name: "Bannister Communications",
  recipientEmail: bannisterRecipientEmail,
  allowedOrigins: [
    "https://bannistercommunications.com",
    "https://www.bannistercommunications.com",
  ],
  requiredFields: ["name", "phone", "email", "message", "consent"],
  allowedFields: ["name", "phone", "email", "address", "service", "message", "consent"],
  fieldMaxLengths: {
    name: 120,
    phone: 40,
    email: 254,
    address: 200,
    service: 120,
    message: 5000,
    consent: 10,
  },
  honeypotFields: ["company", "_gotcha"],
  replyToField: "email",
  subjectPrefix: "[Bannister Communications]",
  subject: "New website quote enquiry",
  spamThreshold: 2,
  maxLinks: 3,
  minimumSubmitMs: 3000,
  autoReplyEnabled: false,
  turnstileRequired: false,
  destinationRateLimitMaxRequests: 3,
};

const coastwideSite = {
  siteId: "coastwide-exterior-cleaning",
  name: "Coastwide Exterior Cleaning",
  recipientEmail: coastwideRecipientEmail,
  allowedOrigins: [
    "https://coastwideexteriors.com.au",
    "https://www.coastwideexteriors.com.au",
  ],
  requiredFields: ["name", "phone", "email", "address", "consent"],
  allowedFields: ["name", "phone", "email", "address", "service", "message", "consent"],
  fieldMaxLengths: {
    name: 120,
    phone: 40,
    email: 254,
    address: 200,
    service: 120,
    message: 5000,
    consent: 10,
  },
  honeypotFields: ["company", "_gotcha"],
  replyToField: "email",
  subjectPrefix: "[Coastwide Exterior Cleaning]",
  subject: "New website quote enquiry",
  spamThreshold: 2,
  maxLinks: 3,
  minimumSubmitMs: 3000,
  autoReplyEnabled: false,
  turnstileRequired: false,
  destinationRateLimitMaxRequests: 3,
};

const halterSite = {
  siteId: "halter",
  name: "Halter",
  recipientEmail: halterRecipientEmail,
  allowedOrigins: halterAllowedOrigins.length
    ? halterAllowedOrigins
    : ["https://halter.security", "https://www.halter.security"],
  requiredFields: ["name", "email", "message"],
  allowedFields: ["name", "email", "message", "company_name", "role", "agents_in_production"],
  fieldMaxLengths: {
    name: 120,
    email: 254,
    message: 5000,
    company_name: 120,
    role: 80,
    agents_in_production: 120,
  },
  // Deliberately NOT ["company", "_gotcha"] like the other sites: Halter's
  // waitlist asks for the visitor's company, and a filled honeypot is spam on
  // its own with no threshold to clear. Adding "company" here would silently
  // bin every genuine signup. The form posts the company as `company_name`.
  honeypotFields: ["_gotcha"],
  replyToField: "email",
  subjectPrefix: "[Halter Waitlist]",
  subject: "New Halter waitlist request",
  spamThreshold: 2,
  maxLinks: 3,
  minimumSubmitMs: 3000,
  autoReplyEnabled: false,
  turnstileRequired: false,
  destinationRateLimitMaxRequests: 3,
};

const sourceControlledSiteIds = new Set([
  bannisterSite.siteId,
  coastwideSite.siteId,
  halterSite.siteId,
]);
const configuredSites = sites.filter((site) => !sourceControlledSiteIds.has(site.siteId));
configuredSites.push(bannisterSite, coastwideSite, halterSite);

for (const site of configuredSites) {
  if (site.siteId === "anchor-web-co") {
    Object.assign(site, {
      honeypotFields: ["company", "_gotcha"],
      allowedFields: anchorAllowedFields,
      // Auto-replies are enabled only when the server can verify Turnstile;
      // without that boundary they can be abused to email arbitrary victims.
      autoReplyEnabled: turnstileEnabled,
      autoReplySubject: "We received your Anchor Web Co enquiry",
      autoReplyResponseWindow: "within two business days",
      autoReplyPhone: "0439 499 944",
      autoReplyPlannerUrl: "https://www.anchorwebco.com.au/website-planner.html",
      autoReplyPricingUrl: "https://www.anchorwebco.com.au/pricing.html",
      turnstileRequired: turnstileEnabled,
      turnstileAction: "contact_submit",
      turnstileHostnames: ["anchorwebco.com.au", "www.anchorwebco.com.au"],
      destinationRateLimitMaxRequests: 3,
    });
  }
  if (site.siteId === "haven-homes-co") {
    Object.assign(site, {
      recipientEmail: havenRecipientEmail || site.recipientEmail,
      allowedFields: havenAllowedFields,
      turnstileRequired: turnstileEnabled,
      turnstileAction: "contact_submit",
      turnstileHostnames: ["havenhomesco.com.au", "www.havenhomesco.com.au", "dl4dzzrd6411l.cloudfront.net"],
      destinationRateLimitMaxRequests: 2,
    });
  }
  if (site.autoReplyEnabled && !turnstileEnabled) {
    site.autoReplyEnabled = false;
  }
  if (!site.recipientEmail) throw new Error("Missing recipient email for " + site.siteId + ".");
}

const allowedOrigins = [...new Set(configuredSites.flatMap((site) => Array.isArray(site.allowedOrigins) ? site.allowedOrigins : []))];
const target = process.env.FORM_SITE_CONFIG_OUTPUT || path.resolve("forms/terraform/site_configs.auto.tfvars.json");
await writeFile(target, JSON.stringify({
  site_configs: configuredSites,
  allowed_origins: allowedOrigins,
  turnstile_secret_key: process.env.TURNSTILE_SECRET_KEY || "",
}, null, 2));
console.log("Prepared " + configuredSites.length + " site configurations. Turnstile required: " + turnstileEnabled + ".");
