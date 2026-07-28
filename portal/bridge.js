/**
 * Bridge iama.cc portal pages → live Plate OS (ngrok / local).
 */
(function () {
  function base() {
    return (window.NLS_PLATE_LIVE_BASE || "").replace(/\/$/, "");
  }

  function path(key) {
    const paths = window.NLS_PLATE_PATHS || {};
    return (paths[key] || "/");
  }

  function href(key) {
    const b = base();
    if (!b) return "#";
    return b + path(key);
  }

  function wire(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.href = href(key);
  }

  function setStatus(ok, detail) {
    const pill = document.getElementById("live-status");
    const urlEl = document.getElementById("live-url");
    const banner = document.getElementById("live-banner");
    const b = base();
    if (pill) {
      pill.textContent = ok ? "live" : "offline / update live-config";
      pill.classList.toggle("off", !ok);
    }
    if (urlEl) urlEl.textContent = b ? " → " + b : "";
    if (banner) {
      banner.classList.toggle("off", !ok);
      banner.textContent = ok
        ? "Live Plate OS attached: " + b
        : "Live system not reachable. Start PlateArchServer + ngrok, set portal/live-config.js";
    }
  }

  function probe() {
    const b = base();
    if (!b) {
      setStatus(false);
      return;
    }
    // ngrok free may inject interstitial; health still useful when skip header works
    fetch(b + path("health"), {
      method: "GET",
      mode: "cors",
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then((r) => {
        setStatus(r.ok);
      })
      .catch(() => setStatus(false));
  }

  function init() {
    wire("btn-live-plate", "home");
    wire("btn-live-accounts", "accounts");
    wire("btn-live-demo", "demo");
    wire("btn-live-mobility", "mobility");
    wire("btn-live-licenses", "licenses");
    wire("btn-live-assets", "assets");
    wire("btn-live-diagrams", "diagrams");
    probe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
