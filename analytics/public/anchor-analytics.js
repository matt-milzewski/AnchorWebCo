(function () {
  "use strict";

  var script = document.currentScript || document.querySelector("script[data-client-id][src*='anchor-analytics']");
  var clientId = script && script.getAttribute("data-client-id");
  var endpoint = script && (script.getAttribute("data-endpoint") || script.getAttribute("data-ingest-url"));
  var session = {
    lastCta: null,
    lastCtaPage: null,
    formStarted: {},
    scrollDepths: {}
  };

  if (!clientId || !endpoint) return;

  function path() {
    return window.location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "") || "/";
  }

  function sourcePage() {
    return session.lastCtaPage || path();
  }

  function utm() {
    var params = new URLSearchParams(window.location.search);
    var data = {};
    ["source", "medium", "campaign", "term", "content"].forEach(function (key) {
      var value = params.get("utm_" + key);
      if (value) data[key] = value;
    });
    return data;
  }

  function device() {
    var width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width < 768) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  }

  function send(type, properties) {
    var payload = JSON.stringify({
      client_id: clientId,
      type: type,
      path: path(),
      properties: Object.assign({
        path: path(),
        source_page: sourcePage(),
        viewport: { width: window.innerWidth || 0, height: window.innerHeight || 0 },
        device: device()
      }, properties || {})
    });

    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "omit"
    }).catch(function () {});
  }

  function trackClick(element) {
    var type = element.getAttribute("data-track");
    var props = {};

    Array.prototype.forEach.call(element.attributes, function (attr) {
      if (attr.name.indexOf("data-track-prop-") === 0) {
        props[attr.name.replace("data-track-prop-", "").replace(/-/g, "_")] = attr.value;
      }
    });

    if (type.indexOf("cta-") === 0) {
      session.lastCta = type;
      session.lastCtaPage = path();
      try {
        sessionStorage.setItem("anchorAnalyticsLastCta", JSON.stringify({ cta: type, source_page: path() }));
      } catch (_) {}
    }

    if (!props.source_page) props.source_page = sourcePage();
    send(type, props);
  }

  function restoreCta() {
    try {
      var saved = JSON.parse(sessionStorage.getItem("anchorAnalyticsLastCta") || "null");
      if (saved) {
        session.lastCta = saved.cta;
        session.lastCtaPage = saved.source_page;
      }
    } catch (_) {}
  }

  function formName(form) {
    return form.getAttribute("data-analytics-form") || (form.id && form.id.indexOf("audit") >= 0 ? "audit" : "contact");
  }

  function fieldName(field) {
    return field.getAttribute("data-analytics-field") || field.name || field.id || "unknown";
  }

  function selectValue(form, names) {
    for (var i = 0; i < names.length; i += 1) {
      var field = form.querySelector("[name='" + names[i] + "']");
      if (field) return field.value || "";
    }
    return "";
  }

  function wireForms() {
    Array.prototype.forEach.call(document.querySelectorAll("form"), function (form) {
      var name = formName(form);
      var startType = name === "audit" ? "form-start-audit" : "form-start-contact";
      var submitType = name === "audit" ? "form-submit-audit" : "form-submit-contact";
      var errorType = name === "audit" ? "form-error-audit" : "form-error-contact";

      form.addEventListener("focusin", function () {
        if (session.formStarted[name]) return;
        session.formStarted[name] = true;
        send(startType, { source_page: sourcePage() });
      }, true);

      form.addEventListener("blur", function (event) {
        var target = event.target;
        if (!target || !("name" in target)) return;
        send("field-blur", { form: name, field: fieldName(target) });
      }, true);

      form.addEventListener("submit", function () {
        setHidden(form, "source_page", sourcePage());
        setHidden(form, "cta", session.lastCta || "");

        var invalid = form.querySelector(":invalid");
        if (invalid) {
          send(errorType, { field: fieldName(invalid) });
          return;
        }

        var props = { source_page: sourcePage(), cta: session.lastCta || "" };
        if (name === "audit") {
          props.business_type = selectValue(form, ["business_type", "businessType", "type_of_business", "business-type"]);
        } else {
          props.service_type = selectValue(form, ["service_type", "service", "what_are_you_looking_for"]);
          props.timeline = selectValue(form, ["timeline", "preferred_timeline"]);
        }
        send(submitType, props);
      });
    });
  }

  function setHidden(form, name, value) {
    var field = form.querySelector("input[name='" + name + "']");
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      form.appendChild(field);
    }
    field.value = value || "";
  }

  function wireClicks() {
    document.addEventListener("click", function (event) {
      var tracked = event.target.closest && event.target.closest("[data-track]");
      if (tracked) trackClick(tracked);

      var link = event.target.closest && event.target.closest("a[href]");
      if (!link) return;
      var href = link.getAttribute("href") || "";
      var location = link.getAttribute("data-location") || link.closest("header") && "header" || link.closest("footer") && "footer" || "body";
      if (href.indexOf("tel:") === 0) send("click-call", { location: location, source_page: sourcePage() });
      if (href.indexOf("mailto:") === 0) send("click-email", { source_page: sourcePage() });
      if (/wa\.me|whatsapp/i.test(href)) send("click-whatsapp", { source_page: sourcePage() });
    });
  }

  function wireScrollDepth() {
    [25, 50, 75, 100].forEach(function (depth) { session.scrollDepths[depth] = false; });
    function check() {
      var doc = document.documentElement;
      var max = Math.max(1, doc.scrollHeight - window.innerHeight);
      var pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      [25, 50, 75, 100].forEach(function (depth) {
        if (!session.scrollDepths[depth] && pct >= depth) {
          session.scrollDepths[depth] = true;
          send("scroll-depth", { path: path(), depth: depth });
        }
      });
    }
    window.addEventListener("scroll", check, { passive: true });
    check();
  }

  function wireWebVitals() {
    var metrics = { lcp: 0, inp: 0, cls: 0 };
    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (last) metrics.lcp = Math.round(last.startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (!entry.hadRecentInput) metrics.cls += entry.value || 0;
        });
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          var duration = entry.duration || 0;
          if (duration > metrics.inp) metrics.inp = Math.round(duration);
        });
      }).observe({ type: "event", buffered: true, durationThreshold: 40 });
    } catch (_) {}

    window.addEventListener("pagehide", function () {
      send("web-vitals", { path: path(), device: device(), lcp: metrics.lcp, inp: metrics.inp, cls: Number(metrics.cls.toFixed(3)) });
    });
    setTimeout(function () {
      send("web-vitals", { path: path(), device: device(), lcp: metrics.lcp, inp: metrics.inp, cls: Number(metrics.cls.toFixed(3)) });
    }, 8000);
  }

  restoreCta();
  send("pageview", {
    path: path(),
    referrer: document.referrer || "",
    utm: utm(),
    viewport: { width: window.innerWidth || 0, height: window.innerHeight || 0 },
    device: device()
  });
  wireClicks();
  wireForms();
  wireScrollDepth();
  wireWebVitals();
})();
