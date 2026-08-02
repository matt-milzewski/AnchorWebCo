(function () {
  "use strict";

  var token = "__ANCHOR_POSTHOG_KEY__";
  var apiHost = "__ANCHOR_POSTHOG_HOST__";
  if (!token || token.indexOf("__ANCHOR_") === 0 || !/^https:\/\//.test(apiHost)) return;

  // Minimal form of PostHog's official array loader. Calls made before the
  // library arrives are queued and replayed by array.js.
  var posthog = window.posthog = window.posthog || [];
  posthog.people = posthog.people || [];
  posthog._i = posthog._i || [];
  posthog.capture = posthog.capture || function () {
    posthog.push(["capture"].concat(Array.prototype.slice.call(arguments)));
  };
  posthog.init = posthog.init || function (key, config) {
    posthog._i.push([key, config, undefined]);
    var script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = config.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
    var first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(script, first);
  };

  function pathOnly(value) {
    try {
      return new URL(value, window.location.origin).pathname || "/";
    } catch (_) {
      return "/";
    }
  }

  posthog.init(token, {
    api_host: apiHost,
    ui_host: apiHost.replace(".i.posthog.com", ".posthog.com"),
    defaults: "2026-06-25",
    cookieless_mode: "always",
    person_profiles: "never",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: {
      css_selector_ignorelist: ["form", ".ph-no-autocapture", "[data-ph-no-autocapture]"],
      element_attribute_ignorelist: ["value", "name"]
    },
    disable_capture_url_hashes: true,
    mask_personal_data_properties: true,
    custom_personal_data_properties: ["email", "phone", "name", "website", "url"],
    advanced_disable_feature_flags: true,
    disable_surveys: true,
    session_recording: {
      maskAllInputs: true,
      blockSelector: "form, [data-ph-block]",
      maskTextSelector: ".ph-mask, [data-ph-mask]"
    },
    before_send: function (event) {
      if (!event || !event.properties) return event;
      ["$current_url", "$referrer", "$initial_current_url", "$initial_referrer"].forEach(function (key) {
        if (event.properties[key]) event.properties[key] = pathOnly(event.properties[key]);
      });
      return event;
    }
  });

  window.addEventListener("anchor:form-success", function (event) {
    var detail = event.detail || {};
    posthog.capture("enquiry submitted", {
      form: detail.form || "contact",
      source_page: pathOnly(detail.source_page || window.location.pathname),
      cta: detail.cta || ""
    });
  });

  window.addEventListener("anchor:planner-complete", function () {
    posthog.capture("website plan completed", { source_page: pathOnly(window.location.pathname) });
  });

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    var channel = href.indexOf("tel:") === 0 ? "call" : href.indexOf("mailto:") === 0 ? "email" : /wa\.me|whatsapp/i.test(href) ? "whatsapp" : "";
    if (channel) {
      posthog.capture("contact intent", {
        channel: channel,
        source_page: pathOnly(window.location.pathname),
        location: link.getAttribute("data-location") || (link.closest("header") ? "header" : link.closest("footer") ? "footer" : "body")
      });
    }
  });
})();
