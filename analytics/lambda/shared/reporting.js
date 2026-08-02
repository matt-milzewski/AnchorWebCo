const { CONVERSION_EVENTS, FORM_EVENTS, cleanPath } = require("./events");
const { matchesStep, sourceFor, totalEnquiriesFromAggregates } = require("./aggregates");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sessionId(event, index = 0) {
  return event.properties?.session_id || event.visitor || `unattributed-${event.received_at || index}`;
}

function groupSessions(events) {
  const grouped = new Map();
  events.forEach((event, index) => {
    const id = sessionId(event, index);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(event);
  });
  return [...grouped.entries()].map(([id, sessionEvents]) => ({
    id,
    events: sessionEvents.sort((a, b) => String(a.received_at || a.SK || "").localeCompare(String(b.received_at || b.SK || "")))
  }));
}

function sessionSummaries(events) {
  return groupSessions(events).map((session) => {
    const pageviews = session.events.filter((event) => event.type === "pageview");
    const entry = pageviews[0] || session.events[0];
    const exit = pageviews[pageviews.length - 1] || entry;
    return {
      ...session,
      entry,
      exit,
      pageviews,
      converted: session.events.some((event) => CONVERSION_EVENTS.has(event.type)),
      formConverted: session.events.some((event) => FORM_EVENTS.has(event.type))
    };
  }).filter((session) => session.entry);
}

function calculateFunnels(events, tenant) {
  const sessions = groupSessions(events);
  return (tenant.funnels || []).map((funnel) => {
    const counts = funnel.steps.map(() => 0);
    for (const session of sessions) {
      let nextStep = 0;
      for (const event of session.events) {
        if (nextStep < funnel.steps.length && matchesStep(event, funnel.steps[nextStep])) {
          counts[nextStep] += 1;
          nextStep += 1;
        }
      }
    }
    const steps = funnel.steps.map((step, index) => ({ index: index + 1, step, count: counts[index] }));

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
      .map((event, index) => sessionId(event, index))
      .filter(Boolean)
  );
  const abandoned = events.filter((event, index) => event.type === "field-blur" && event.properties?.form === form && !submittedVisitors.has(sessionId(event, index)));
  const counts = new Map();
  for (const event of abandoned) {
    const field = event.properties?.field || "unknown";
    counts.set(field, (counts.get(field) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function conversionRateForEntryPages(events) {
  const visitsByPath = new Map();
  for (const session of sessionSummaries(events)) {
    if (!session.pageviews.length) continue;
    const path = cleanPath(session.entry.path);
    const row = visitsByPath.get(path) || { visits: 0, conversions: 0, nextPages: new Map() };
    row.visits += 1;
    if (session.converted) row.conversions += 1;
    const next = session.pageviews[1] && cleanPath(session.pageviews[1].path);
    if (next) row.nextPages.set(next, (row.nextPages.get(next) || 0) + 1);
    visitsByPath.set(path, row);
  }

  return [...visitsByPath.entries()].map(([path, row]) => {
    const visits = row.visits;
    const conversions = row.conversions;
    return { path, visits, conversions, conversion_rate: visits ? Number(((conversions / visits) * 100).toFixed(1)) : 0 };
  }).map((row) => {
    const detail = visitsByPath.get(row.path);
    const next = [...detail.nextPages.entries()].sort((a, b) => b[1] - a[1])[0];
    return { ...row, next_page: next ? next[0] : "—", next_page_sessions: next ? next[1] : 0 };
  }).sort((a, b) => b.visits - a.visits || b.conversions - a.conversions);
}

function pagePerformance(events) {
  const rows = new Map();
  for (const session of sessionSummaries(events)) {
    const unique = new Set();
    for (const pageview of session.pageviews) {
      const path = cleanPath(pageview.path);
      const row = rows.get(path) || { path, pageviews: 0, sessions: 0, exits: 0 };
      row.pageviews += 1;
      rows.set(path, row);
      unique.add(path);
    }
    for (const path of unique) rows.get(path).sessions += 1;
    if (session.pageviews.length) rows.get(cleanPath(session.exit.path)).exits += 1;
  }
  return [...rows.values()].map((row) => ({
    ...row,
    exit_rate: row.sessions ? Number(((row.exits / row.sessions) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.pageviews - a.pageviews);
}

function linkClickThroughs(events) {
  const rows = new Map();
  events.forEach((event, index) => {
    if (event.type !== "link-click") return;
    const props = event.properties || {};
    const source = cleanPath(props.source_page || event.path);
    const destination = props.link_destination || "unknown";
    const location = props.link_location || "body";
    const key = `${source}\u0000${destination}\u0000${location}`;
    const row = rows.get(key) || { source, destination, location, text: props.link_text || "", clicks: 0, sessions: new Set() };
    row.clicks += 1;
    row.sessions.add(sessionId(event, index));
    rows.set(key, row);
  });
  return [...rows.values()].map((row) => ({ ...row, sessions: row.sessions.size })).sort((a, b) => b.clicks - a.clicks);
}

function conversionBreakdown(events, dimension) {
  const rows = new Map();
  for (const session of sessionSummaries(events)) {
    if (!session.pageviews.length) continue;
    let value = "unknown";
    if (dimension === "source") value = sourceFor(session.entry.properties || {});
    if (dimension === "device") value = session.entry.device || session.entry.properties?.device || "unknown";
    if (dimension === "region") value = session.entry.region || "unknown";
    const row = rows.get(value) || { value, sessions: 0, conversions: 0 };
    row.sessions += 1;
    if (session.converted) row.conversions += 1;
    rows.set(value, row);
  }
  return [...rows.values()].map((row) => ({
    ...row,
    conversion_rate: row.sessions ? Number(((row.conversions / row.sessions) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.sessions - a.sessions);
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

function webVitalsByPage(events) {
  const rows = new Map();
  for (const event of events) {
    if (event.type !== "web-vitals") continue;
    const props = event.properties || {};
    const key = `${cleanPath(event.path)}\u0000${event.device || props.device || "unknown"}`;
    const row = rows.get(key) || { path: cleanPath(event.path), device: event.device || props.device || "unknown", lcp: [], inp: [], cls: [] };
    if (Number(props.lcp) > 0) row.lcp.push(Number(props.lcp));
    if (Number(props.inp) > 0) row.inp.push(Number(props.inp));
    if (Number(props.cls) >= 0) row.cls.push(Number(props.cls));
    rows.set(key, row);
  }
  return [...rows.values()].map((row) => ({
    path: row.path,
    device: row.device,
    samples: Math.max(row.lcp.length, row.inp.length, row.cls.length),
    lcp: percentile(row.lcp, 0.75),
    inp: percentile(row.inp, 0.75),
    cls: percentile(row.cls, 0.75)
  })).sort((a, b) => b.samples - a.samples);
}

function conversionPriorityFlags(events, tenant) {
  if (!events.some((event) => event.type === "pageview")) {
    return ["DATA COLLECTION FAILURE: no raw events were stored. Conversion findings are unavailable until tracking is restored."];
  }
  const flags = [];
  const funnels = calculateFunnels(events, tenant);

  for (const funnel of funnels) {
    if (funnel.steps.length < 2) continue;
    const first = funnel.steps[0];
    const second = funnel.steps[1];
    if (first.count >= 10 && second.count / first.count < 0.2) {
      const rate = Math.round((second.count / first.count) * 100);
      flags.push(`${funnel.name}: only ${rate}% moved from step 1 to step 2. Review the entry-page promise and primary action.`);
      continue;
    }

    if (funnel.steps.length >= 3) {
      const completion = funnel.steps[2];
      if (second.count >= 5 && completion.count / second.count < 0.5) {
        const rate = Math.round((completion.count / second.count) * 100);
        flags.push(`${funnel.name}: only ${rate}% moved from step 2 to completion. Review form friction, errors and response expectations.`);
      }
    }
  }

  const formErrors = events.filter((event) => /^form-error-/.test(event.type)).length;
  if (formErrors >= 3) {
    flags.push(`Forms: ${formErrors} errors were recorded. Check the affected fields and submission endpoint.`);
  }

  return flags.length
    ? flags.slice(0, 5)
    : ["No high-confidence conversion issue crossed the automatic alert thresholds this month."];
}

function renderMonthlyReport({ tenant, month, events, aggregates }) {
  const totalEnquiries = totalEnquiriesFromAggregates(aggregates);
  const sessions = sessionSummaries(events);
  const pageviews = events.filter((event) => event.type === "pageview").length;
  const confirmedForms = events.filter((event) => FORM_EVENTS.has(event.type)).length;
  const intentClicks = events.filter((event) => ["click-call", "click-whatsapp", "click-email"].includes(event.type)).length;
  const funnels = calculateFunnels(events, tenant);
  const entryPages = conversionRateForEntryPages(events).slice(0, 10);
  const pages = pagePerformance(events).slice(0, 10);
  const links = linkClickThroughs(events).slice(0, 15);
  const sources = conversionBreakdown(events, "source").slice(0, 10);
  const regions = conversionBreakdown(events, "region").slice(0, 10);
  const devices = conversionBreakdown(events, "device");
  const vitals = webVitalsByPage(events).slice(0, 10);
  const priorityFlags = conversionPriorityFlags(events, tenant);
  const list = (items) => items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>No data yet.</p>";
  const bySk = (category) => aggregates
    .filter((item) => item.SK.includes(`#${category}#`))
    .map((item) => `${item.SK.split("#").slice(3).join(" / ")}: ${item.count}`);

  const trackingHealthy = events.length > 0 && pageviews > 0;
  const trackingBanner = trackingHealthy
    ? `<div style="padding:14px;background:#e7f6ec;border:1px solid #7cc994;"><strong>Tracking health:</strong> ${events.length} events stored across ${sessions.length} sessions.</div>`
    : `<div style="padding:14px;background:#feecec;border:2px solid #c62828;color:#8b1111;"><strong>DATA COLLECTION FAILED.</strong> No usable pageviews were stored for this month. Traffic and conversion totals below are unavailable, not zero.</div>`;

  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#17211b;">
<h1>${escapeHtml(tenant.display_name)} analytics report, ${escapeHtml(month)}</h1>
${trackingBanner}
<h2>Monthly snapshot</h2>
<p><strong>Sessions:</strong> ${trackingHealthy ? sessions.length : "Unavailable"}<br><strong>Pageviews:</strong> ${trackingHealthy ? pageviews : "Unavailable"}<br><strong>Total enquiries:</strong> ${trackingHealthy ? totalEnquiries : "Unavailable"}<br><strong>Confirmed forms:</strong> ${trackingHealthy ? confirmedForms : "Unavailable"}<br><strong>Call, email and WhatsApp clicks:</strong> ${trackingHealthy ? intentClicks : "Unavailable"}</p>
<h2>Enquiries by channel</h2>${list(bySk("enquiries"))}
<h2>Demand mix</h2>${list([...bySk("service_type"), ...bySk("timeline"), ...bySk("budget"), ...bySk("business_suburb"), ...bySk("lead_source"), ...bySk("business_type")])}
<h2>Calls to action</h2>${list(bySk("cta"))}
<h2>Funnels</h2>${list(funnels.map((funnel) => `${funnel.name}: ${funnel.steps.map((step) => `step ${step.index} ${step.count} (${step.drop_off_percent}% drop-off)`).join(", ")}${funnel.worst_field ? `. Worst field: ${funnel.worst_field}` : ""}`))}
<h2>Automated conversion priorities</h2>${list(priorityFlags)}
<h2>Top entry pages, next page and conversion rate</h2>${list(entryPages.map((page) => `${page.path}: ${page.visits} sessions, ${page.conversions} converted (${page.conversion_rate}%). Most common next page: ${page.next_page} (${page.next_page_sessions}).`))}
<h2>Most viewed and exit pages</h2>${list(pages.map((page) => `${page.path}: ${page.pageviews} views in ${page.sessions} sessions; ${page.exits} exits (${page.exit_rate}%).`))}
<h2>Exact link click-through paths</h2>${list(links.map((link) => `${link.source} → ${link.destination} (${link.location}${link.text ? `, “${link.text}”` : ""}): ${link.clicks} clicks across ${link.sessions} sessions.`))}
<h2>Traffic by source and region</h2><h3>Source conversion rate</h3>${list(sources.map((row) => `${row.value}: ${row.sessions} sessions, ${row.conversions} converted (${row.conversion_rate}%).`))}
<h2>Traffic by region</h2>${list(regions.map((row) => `${row.value}: ${row.sessions} sessions, ${row.conversions} converted (${row.conversion_rate}%).`))}<p>Brisbane inner-west traffic is broken out where server-side region data allows it. Search engines hide most query data, so this report complements Google Search Console rather than replacing it.</p>
<h2>Mobile vs desktop conversion rate</h2>${list(devices.map((row) => `${row.value}: ${row.sessions} sessions, ${row.conversions} converted (${row.conversion_rate}%).`))}
<h2>Care plans page</h2>${list(pages.filter((page) => page.path === "/website-care-plans").map((page) => `${page.pageviews} views in ${page.sessions} sessions; ${page.exits} exits (${page.exit_rate}%).`))}
<h2>Core Web Vitals (75th percentile)</h2>${list(vitals.map((row) => `${row.path} / ${row.device} (${row.samples} samples): LCP ${row.lcp === null ? "n/a" : `${row.lcp}ms`}, INP ${row.inp === null ? "n/a" : `${row.inp}ms`}, CLS ${row.cls === null ? "n/a" : row.cls}.`))}
</body></html>`;
}

module.exports = {
  calculateFunnels,
  conversionBreakdown,
  conversionPriorityFlags,
  conversionRateForEntryPages,
  groupSessions,
  linkClickThroughs,
  pagePerformance,
  renderMonthlyReport,
  sessionSummaries,
  webVitalsByPage,
  worstAbandonmentField
};
