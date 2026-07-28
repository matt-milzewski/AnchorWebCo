const fs = require("node:fs");
const path = require("node:path");
const tls = require("node:tls");

const configPath = path.resolve("automation/managed-sites.json");
const sites = JSON.parse(fs.readFileSync(configPath, "utf8"));
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 15000);
const minimumCertificateDays = Number(process.env.MONITOR_MIN_CERTIFICATE_DAYS || 21);

async function fetchPage(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const startedAt = Date.now();
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "AnchorWebCo-Monitor/1.0 (+https://www.anchorwebco.com.au/)",
        ...headers,
      },
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      durationMs: Date.now() - startedAt,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

function certificateStatus(urlValue) {
  const url = new URL(urlValue);
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: url.hostname,
      port: 443,
      servername: url.hostname,
      rejectUnauthorized: true,
      timeout: timeoutMs,
    });

    function finish(result) {
      socket.destroy();
      resolve(result);
    }

    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      const expiresAt = new Date(certificate.valid_to);
      const daysRemaining = Math.floor((expiresAt.getTime() - Date.now()) / 86400000);
      finish({
        ok: Number.isFinite(daysRemaining) && daysRemaining >= minimumCertificateDays,
        daysRemaining,
        expiresAt: Number.isNaN(expiresAt.getTime()) ? null : expiresAt.toISOString(),
      });
    });
    socket.once("timeout", () => finish({ ok: false, error: "TLS connection timed out" }));
    socket.once("error", (error) => finish({ ok: false, error: error.message }));
  });
}

async function monitorSite(site) {
  const checks = [];
  const baseUrl = new URL(site.url);

  try {
    const home = await fetchPage(baseUrl.href);
    checks.push({
      check: "homepage",
      ok: home.ok && (!site.expectedText || home.body.includes(site.expectedText)),
      status: home.status,
      durationMs: home.durationMs,
      detail: site.expectedText && !home.body.includes(site.expectedText) ? `Missing expected text: ${site.expectedText}` : home.finalUrl,
    });
  } catch (error) {
    checks.push({ check: "homepage", ok: false, detail: error.message });
  }

  const certificate = await certificateStatus(baseUrl.href);
  checks.push({
    check: "ssl",
    ok: certificate.ok,
    detail: certificate.error || `${certificate.daysRemaining} days remaining (${certificate.expiresAt})`,
  });

  for (const corePath of site.corePaths || []) {
    const url = new URL(corePath, baseUrl);
    try {
      const page = await fetchPage(url.href);
      checks.push({
        check: `core-page ${url.pathname}`,
        ok: page.ok,
        status: page.status,
        durationMs: page.durationMs,
        detail: page.finalUrl,
      });
    } catch (error) {
      checks.push({ check: `core-page ${url.pathname}`, ok: false, detail: error.message });
    }
  }

  if (site.formPath) {
    const formUrl = new URL(site.formPath, baseUrl);
    try {
      const page = await fetchPage(formUrl.href);
      checks.push({
        check: `form-page ${formUrl.pathname}`,
        ok: page.ok && /<form(?:\s|>)/i.test(page.body),
        status: page.status,
        durationMs: page.durationMs,
        detail: /<form(?:\s|>)/i.test(page.body) ? "Form markup found" : "No form markup found",
      });
    } catch (error) {
      checks.push({ check: `form-page ${formUrl.pathname}`, ok: false, detail: error.message });
    }
  }

  if (site.formEndpoint) {
    try {
      const endpoint = await fetchPage(site.formEndpoint, {
        accept: "application/json",
        origin: baseUrl.origin,
      });
      let payload = null;
      try {
        payload = JSON.parse(endpoint.body);
      } catch {
        payload = null;
      }
      checks.push({
        check: "form-endpoint",
        ok: endpoint.ok && payload?.ok === true && (!site.formSiteId || payload.siteId === site.formSiteId),
        status: endpoint.status,
        durationMs: endpoint.durationMs,
        detail: payload?.ok === true ? `Healthy configuration for ${payload.siteId || "configured site"}` : "Endpoint did not return a healthy configuration",
      });
    } catch (error) {
      checks.push({ check: "form-endpoint", ok: false, detail: error.message });
    }
  }

  return {
    name: site.name,
    url: site.url,
    ok: checks.every((check) => check.ok),
    checks,
  };
}

async function main() {
  const results = [];
  for (const site of sites) {
    results.push(await monitorSite(site));
  }

  const report = {
    checkedAt: new Date().toISOString(),
    ok: results.every((site) => site.ok),
    results,
  };
  fs.mkdirSync(path.resolve("monitor-output"), { recursive: true });
  fs.writeFileSync(path.resolve("monitor-output/latest.json"), `${JSON.stringify(report, null, 2)}\n`);

  for (const site of results) {
    console.log(`${site.ok ? "PASS" : "FAIL"} ${site.name} ${site.url}`);
    for (const check of site.checks) {
      console.log(`  ${check.ok ? "PASS" : "FAIL"} ${check.check}${check.status ? ` [${check.status}]` : ""}: ${check.detail || ""}`);
    }
  }

  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
