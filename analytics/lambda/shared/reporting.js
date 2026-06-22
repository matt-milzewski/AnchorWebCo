const { cleanPath } = require("./events");
const { matchesStep, totalEnquiriesFromAggregates } = require("./aggregates");

function calculateFunnels(events, tenant) {
  return (tenant.funnels || []).map((funnel) => {
    const steps = funnel.steps.map((step, index) => {
      const count = events.filter((event) => matchesStep(event, step)).length;
      const previous = index === 0 ? count : null;
      return { index: index + 1, step, count, previous };
    });

    const withDropOff = steps.map((step, index) => {
      if (index === 0) return { ...step, drop_off_percent: 0 };
      const prev = steps[index - 1].count;
      const drop = prev === 0 ? 0 : Math.max(0, ((prev - step.count) / prev) * 100);
      return { ...step, drop_off_percent: Number(drop.toFixed(1)) };
    });

    return {
      name: funnel.name,
      steps: withDropOff,
      worst_field: ["Quote", "Audit"].includes(funnel.name) ? worstAbandonmentField(events, funnel.name) : null
    };
  });
}

function worstAbandonmentField(events, funnelName) {
  const form = funnelName === "Audit" ? "audit" : "contact";
  const submittedVisitors = new Set(
    events
      .filter((event) => event.type === `form-submit-${form}`)
      .map((event) => event.visitor)
      .filter(Boolean)
  );
  const abandoned = events.filter((event) => event.type === "field-blur" && event.properties?.form === form && !submittedVisitors.has(event.visitor));
  const counts = new Map();
  for (const event of abandoned) {
    const field = event.properties?.field || "unknown";
    counts.set(field, (counts.get(field) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function conversionRateForEntryPages(events) {
  const entryByVisitor = new Map();
  const conversionsByPath = new Map();
  const visitsByPath = new Map();
  const conversionTypes = new Set(["form-submit-contact", "form-submit-audit", "click-call", "click-whatsapp", "click-email"]);

  for (const event of events) {
    if (event.type === "pageview" && event.visitor && !entryByVisitor.has(event.visitor)) {
      const path = cleanPath(event.path);
      entryByVisitor.set(event.visitor, path);
      visitsByPath.set(path, (visitsByPath.get(path) || 0) + 1);
    }
  }

  for (const event of events) {
    if (conversionTypes.has(event.type) && event.visitor) {
      const path = entryByVisitor.get(event.visitor);
      if (path) conversionsByPath.set(path, (conversionsByPath.get(path) || 0) + 1);
    }
  }

  return [...visitsByPath.entries()].map(([path, visits]) => {
    const conversions = conversionsByPath.get(path) || 0;
    return { path, visits, conversions, conversion_rate: visits ? Number(((conversions / visits) * 100).toFixed(1)) : 0 };
  }).sort((a, b) => b.conversions - a.conversions || b.visits - a.visits);
}

function renderMonthlyReport({ tenant, month, events, aggregates }) {
  const totalEnquiries = totalEnquiriesFromAggregates(aggregates);
  const funnels = calculateFunnels(events, tenant);
  const entryPages = conversionRateForEntryPages(events).slice(0, 10);
  const list = (items) => items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "<p>No data yet.</p>";
  const bySk = (category) => aggregates
    .filter((item) => item.SK.includes(`#${category}#`))
    .map((item) => `${item.SK.split("#").slice(3).join(" / ")}: ${item.count}`);

  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#17211b;">
<h1>${tenant.display_name} analytics report, ${month}</h1>
<p><strong>Total enquiries:</strong> ${totalEnquiries}</p>
<h2>Enquiries by channel</h2>${list(bySk("enquiries"))}
<h2>Demand mix</h2>${list([...bySk("service_type"), ...bySk("timeline"), ...bySk("business_type")])}
<h2>Funnels</h2>${list(funnels.map((funnel) => `${funnel.name}: ${funnel.steps.map((step) => `step ${step.index} ${step.count} (${step.drop_off_percent}% drop-off)`).join(", ")}${funnel.worst_field ? `. Worst field: ${funnel.worst_field}` : ""}`))}
<h2>Top entry pages and conversion rate</h2>${list(entryPages.map((page) => `${page.path}: ${page.conversions}/${page.visits} (${page.conversion_rate}%)`))}
<h2>Traffic by source and region</h2>${list([...bySk("source"), ...bySk("region")])}<p>Brisbane inner-west traffic is broken out where server-side region data allows it. Search engines hide most query data, so this report complements Google Search Console rather than replacing it.</p>
<h2>Mobile vs desktop conversion rate</h2>${list(bySk("device"))}
<h2>Care plans page</h2>${list(events.filter((event) => event.path === "/website-care-plans").map((event) => event.type).slice(0, 20))}
<h2>Core Web Vitals</h2>${list(bySk("web_vitals"))}
</body></html>`;
}

module.exports = {
  calculateFunnels,
  conversionRateForEntryPages,
  renderMonthlyReport,
  worstAbandonmentField
};
