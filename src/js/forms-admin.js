(() => {
  "use strict";
  const apiBase = String(window.ANCHOR_FORMS_API_BASE || "").replace(/\/$/, "");
  const elements = {
    login: document.getElementById("login-panel"), dashboard: document.getElementById("dashboard"),
    signIn: document.getElementById("sign-in"), signOut: document.getElementById("sign-out"),
    loginError: document.getElementById("login-error"), summary: document.getElementById("summary-cards"),
    sites: document.getElementById("site-cards"), submissions: document.getElementById("submissions"),
    siteFilter: document.getElementById("site-filter"), statusFilter: document.getElementById("status-filter"),
    refresh: document.getElementById("refresh"), updated: document.getElementById("updated"),
    empty: document.getElementById("empty"), loadMore: document.getElementById("load-more"),
    dialog: document.getElementById("detail-dialog"), detail: document.getElementById("detail-fields"),
    closeDetail: document.getElementById("close-detail"),
  };
  let config;
  let nextCursor = "";

  function token() {
    const value = sessionStorage.getItem("forms_access_token") || "";
    const expiresAt = Number(sessionStorage.getItem("forms_token_expires_at") || 0);
    return expiresAt > Date.now() + 10000 ? value : "";
  }

  function randomValue() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function challengeFor(verifier) {
    const bytes = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function loadConfig() {
    if (!apiBase) throw new Error("The forms API has not been connected to this deployment.");
    const response = await fetch(apiBase + "/api/forms-admin/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Dashboard authentication is unavailable.");
    config = await response.json();
  }

  async function startLogin() {
    const verifier = randomValue();
    const state = randomValue();
    sessionStorage.setItem("forms_pkce_verifier", verifier);
    sessionStorage.setItem("forms_oauth_state", state);
    const params = new URLSearchParams({
      client_id: config.clientId, response_type: "code", scope: "openid email",
      redirect_uri: config.redirectUri, state, code_challenge_method: "S256",
      code_challenge: await challengeFor(verifier),
    });
    window.location.assign(config.cognitoDomain + "/oauth2/authorize?" + params);
  }

  async function finishLogin(code, state) {
    const verifier = sessionStorage.getItem("forms_pkce_verifier") || "";
    const expectedState = sessionStorage.getItem("forms_oauth_state") || "";
    if (!verifier || !state || state !== expectedState) throw new Error("The sign-in response could not be verified.");
    const body = new URLSearchParams({
      grant_type: "authorization_code", client_id: config.clientId,
      code, redirect_uri: config.redirectUri, code_verifier: verifier,
    });
    const response = await fetch(config.cognitoDomain + "/oauth2/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body,
    });
    if (!response.ok) throw new Error("Sign-in could not be completed.");
    const result = await response.json();
    sessionStorage.setItem("forms_access_token", result.access_token);
    sessionStorage.setItem("forms_token_expires_at", String(Date.now() + Number(result.expires_in || 3600) * 1000));
    sessionStorage.removeItem("forms_pkce_verifier");
    sessionStorage.removeItem("forms_oauth_state");
    history.replaceState({}, document.title, location.pathname);
  }

  async function api(path) {
    const response = await fetch(apiBase + path, {
      headers: { Authorization: "Bearer " + token(), Accept: "application/json" },
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) {
      clearSession();
      throw new Error("Your session expired. Please sign in again.");
    }
    if (!response.ok) throw new Error("Reporting data could not be loaded.");
    return response.json();
  }

  function clearSession() {
    sessionStorage.removeItem("forms_access_token");
    sessionStorage.removeItem("forms_token_expires_at");
  }

  function card(label, value) {
    const article = document.createElement("article");
    article.className = "card";
    const labelNode = document.createElement("div");
    labelNode.className = "label"; labelNode.textContent = label;
    const valueNode = document.createElement("div");
    valueNode.className = "metric"; valueNode.textContent = String(value || 0);
    article.append(labelNode, valueNode);
    return article;
  }

  function renderSummary(data) {
    elements.summary.replaceChildren(
      card("All submissions", data.total),
      card("Delivered", data.statusCounts.delivered),
      card("Accepted by SES", data.statusCounts.ses_accepted),
      card("Blocked as spam", data.statusCounts.spam),
      card("Delivery issues", (data.statusCounts.delivery_failed || 0) + (data.statusCounts.bounced || 0) + (data.statusCounts.complained || 0)),
    );
    elements.sites.replaceChildren();
    elements.siteFilter.replaceChildren(new Option("All sites", ""));
    data.sites.forEach((site) => {
      const article = document.createElement("article");
      article.className = "card";
      const title = document.createElement("strong"); title.textContent = site.name;
      const detail = document.createElement("p"); detail.className = "muted";
      detail.textContent = site.destination + " · " + (site.challengeRequired ? "bot check on" : "bot check pending");
      const total = document.createElement("div"); total.className = "metric"; total.textContent = String(site.count);
      article.append(title, detail, total); elements.sites.append(article);
      elements.siteFilter.append(new Option(site.name, site.siteId));
    });
  }

  function compact(value, maximum = 90) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maximum ? text.slice(0, maximum - 1) + "…" : text;
  }

  function appendSubmissions(items, replace) {
    if (replace) elements.submissions.replaceChildren();
    items.forEach((item) => {
      const row = document.createElement("tr");
      const received = document.createElement("td");
      received.textContent = new Date(item.submittedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
      const site = document.createElement("td"); site.textContent = item.siteId;
      const statusCell = document.createElement("td");
      const badge = document.createElement("span"); badge.className = "status " + item.status; badge.textContent = item.status.replace(/_/g, " ");
      statusCell.append(badge);
      const contact = document.createElement("td");
      contact.textContent = compact(item.fields?.name || item.fields?.email || item.fields?.phone || "—", 50);
      const message = document.createElement("td"); message.textContent = compact(item.fields?.message || item.fields?.service || "—");
      const action = document.createElement("td");
      const button = document.createElement("button"); button.className = "secondary"; button.textContent = "View";
      button.addEventListener("click", () => showDetail(item));
      action.append(button); row.append(received, site, statusCell, contact, message, action);
      elements.submissions.append(row);
    });
    elements.empty.classList.toggle("hidden", elements.submissions.children.length > 0);
  }

  function showDetail(item) {
    elements.detail.replaceChildren();
    const values = {
      "Submission ID": item.submissionId, "Business": item.siteId, "Received": new Date(item.submittedAt).toLocaleString("en-AU"),
      "Status": item.status, "Spam reasons": (item.spamReasons || []).join(", "),
      ...Object.fromEntries(Object.entries(item.fields || {}).map(([key, value]) => [key.replace(/_/g, " "), value])),
    };
    Object.entries(values).forEach(([label, value]) => {
      if (!value) return;
      const term = document.createElement("dt"); term.textContent = label;
      const description = document.createElement("dd"); description.textContent = String(value);
      elements.detail.append(term, description);
    });
    elements.dialog.showModal();
  }

  async function loadSubmissions(append = false) {
    const params = new URLSearchParams({ limit: "50" });
    if (elements.siteFilter.value) params.set("siteId", elements.siteFilter.value);
    if (elements.statusFilter.value) params.set("status", elements.statusFilter.value);
    if (append && nextCursor) params.set("cursor", nextCursor);
    const data = await api("/api/forms-admin/submissions?" + params);
    appendSubmissions(data.items || [], !append);
    nextCursor = data.nextCursor || "";
    elements.loadMore.classList.toggle("hidden", !nextCursor);
  }

  async function loadDashboard() {
    const data = await api("/api/forms-admin/summary");
    renderSummary(data);
    await loadSubmissions();
    elements.updated.textContent = "Updated " + new Date().toLocaleTimeString("en-AU");
    elements.login.classList.add("hidden"); elements.dashboard.classList.remove("hidden"); elements.signOut.classList.remove("hidden");
  }

  async function init() {
    try {
      await loadConfig();
      const params = new URLSearchParams(location.search);
      if (params.get("error")) throw new Error("Sign-in was cancelled or could not be completed.");
      if (params.get("code")) await finishLogin(params.get("code"), params.get("state"));
      if (token()) await loadDashboard();
    } catch (error) {
      clearSession();
      elements.login.classList.remove("hidden"); elements.dashboard.classList.add("hidden");
      elements.loginError.textContent = error.message;
    }
  }

  elements.signIn.addEventListener("click", () => startLogin().catch((error) => { elements.loginError.textContent = error.message; }));
  elements.signOut.addEventListener("click", () => {
    clearSession();
    const params = new URLSearchParams({ client_id: config.clientId, logout_uri: config.logoutUri });
    window.location.assign(config.cognitoDomain + "/logout?" + params);
  });
  elements.refresh.addEventListener("click", () => loadDashboard().catch((error) => { elements.updated.textContent = error.message; }));
  elements.siteFilter.addEventListener("change", () => loadSubmissions());
  elements.statusFilter.addEventListener("change", () => loadSubmissions());
  elements.loadMore.addEventListener("click", () => loadSubmissions(true));
  elements.closeDetail.addEventListener("click", () => elements.dialog.close());
  init();
})();
