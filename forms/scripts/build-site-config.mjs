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

const anchorAllowedFields = [
  "name", "email", "phone", "project_stage", "business_suburb", "message", "current_website",
  "recommended_package", "recommended_care", "planner_source",
];
const havenAllowedFields = ["name", "phone", "email", "address", "service", "message"];

for (const site of sites) {
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

const allowedOrigins = [...new Set(sites.flatMap((site) => Array.isArray(site.allowedOrigins) ? site.allowedOrigins : []))];
const target = process.env.FORM_SITE_CONFIG_OUTPUT || path.resolve("forms/terraform/site_configs.auto.tfvars.json");
await writeFile(target, JSON.stringify({
  site_configs: sites,
  allowed_origins: allowedOrigins,
  turnstile_secret_key: process.env.TURNSTILE_SECRET_KEY || "",
}, null, 2));
console.log("Prepared " + sites.length + " site configurations. Turnstile required: " + turnstileEnabled + ".");
