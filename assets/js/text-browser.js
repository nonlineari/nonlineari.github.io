/**
 * Auto-switch to /text/ when a text browser is detected.
 * Works with JS-capable UAs; lynx/w3m without JS use the first-link banner.
 * Skip with:  ?graphic=1  or sessionStorage nls_force_graphic=1
 * Force text: ?text=1
 */
(function () {
  "use strict";

  var path = location.pathname || "/";
  if (path.indexOf("/text") === 0) return;

  var params = new URLSearchParams(location.search || "");
  if (params.get("graphic") === "1") {
    try {
      sessionStorage.setItem("nls_force_graphic", "1");
    } catch (e) {}
    return;
  }
  if (params.get("text") === "1") {
    goText();
    return;
  }
  try {
    if (sessionStorage.getItem("nls_force_graphic") === "1") return;
  } catch (e) {}

  var ua = String(navigator.userAgent || navigator.vendor || "").toLowerCase();

  // Known text / terminal / minimal browsers
  var TEXT_UA =
    /(^|[^a-z])(lynx|w3m|elinks|links|netsurf|dillo|edbrowse|netrik|retawq|offbyone|browsh|eww|xombrero)([^a-z]|$)/i;

  // No graphical viewport heuristics (some TVs spoof); keep strict.
  var isText = TEXT_UA.test(ua);

  // Optional: very old IE without modern layout (unlikely)
  if (!isText && typeof document.documentMode === "number" && document.documentMode < 9) {
    isText = true;
  }

  if (isText) goText();

  function goText() {
    var target = mapToText(path);
    if (location.search && params.get("text") !== "1") {
      // drop graphic query when switching
    }
    if (location.pathname.replace(/\/$/, "") === target.replace(/\/$/, "")) return;
    location.replace(target + (location.hash || ""));
  }

  function mapToText(p) {
    if (!p || p === "/") return "/text/";
    if (p.charAt(0) !== "/") p = "/" + p;
    // already text
    if (p.indexOf("/text") === 0) return p;
    // preserve trailing slash style of site
    var out = "/text" + p;
    if (out.indexOf(".") === -1 && out.slice(-1) !== "/") out += "/";
    return out;
  }
})();
