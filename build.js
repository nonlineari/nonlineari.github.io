#!/usr/bin/env node
/**
 * NLS static site builder — Node.js only (no npm packages).
 *
 * Usage:
 *   node build.js
 *   node build.js --watch   # rebuild when content/ or styles.css change
 *
 * Edit files under content/, then re-run. Output is static HTML at site root.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CONTENT = path.join(ROOT, "content");
const POSTS_DIR = path.join(CONTENT, "posts");

// ── helpers ──────────────────────────────────────────────────────────────

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data, "utf8");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function short(s, n = 170) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

/** Minimal front-matter + body parser (no deps). */
function parseMarkdownPost(raw, fallbackSlug) {
  let meta = {};
  let body = raw;
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = raw.slice(3, end).trim();
      body = raw.slice(end + 4).replace(/^\s+/, "");
      for (const line of fm.split("\n")) {
        const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
        if (!m) continue;
        let key = m[1];
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        } else if (val.startsWith("[") || val.startsWith("{")) {
          try {
            val = JSON.parse(val);
          } catch (_) {
            /* keep string */
          }
        }
        meta[key] = val;
      }
    }
  }
  const title = meta.title || fallbackSlug;
  const slug = meta.slug || fallbackSlug;
  const date = meta.date || "2020-01-01";
  const tags = Array.isArray(meta.tags)
    ? meta.tags
    : typeof meta.tags === "string"
      ? meta.tags.split(/[,\s]+/).filter(Boolean)
      : ["journal"];
  const summary = meta.summary || short(body, 180);
  return { slug, title, date, tags, summary, body: body.trim() };
}

/** Load posts: prefer content/posts/*.md, else content/posts.json */
function loadPosts() {
  const fromMd = [];
  if (fs.existsSync(POSTS_DIR)) {
    for (const name of fs.readdirSync(POSTS_DIR).sort()) {
      if (!name.endsWith(".md") || name.startsWith("_")) continue;
      const raw = fs.readFileSync(path.join(POSTS_DIR, name), "utf8");
      const slug = name.replace(/\.md$/, "");
      fromMd.push(parseMarkdownPost(raw, slug));
    }
  }
  if (fromMd.length) {
    fromMd.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return fromMd;
  }
  const jf = path.join(CONTENT, "posts.json");
  if (fs.existsSync(jf)) {
    return readJson(jf).sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );
  }
  return [];
}

function bodyToHtml(text) {
  const parts = String(text || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.map((p) => `<p>${esc(p)}</p>`).join("\n        ");
}

// ── layout ───────────────────────────────────────────────────────────────

function nav(active) {
  const links = [
    ["catalogue", "/catalogue/", "Catalogue"],
    ["artists", "/artists/", "Artists"],
    ["journal", "/journal/", "Journal"],
    ["shop", "/shop/", "Shop"],
    ["about", "/about/", "About"],
    ["text", "/text/", "Text"],
    ["github", "https://github.com/nonlineari", "GitHub"],
  ];
  return links
    .map(([key, href, label]) => {
      const cls = key === active ? ' class="is-active"' : "";
      const ext =
        key === "github"
          ? ' rel="noopener noreferrer" target="_blank"'
          : "";
      return `<a href="${href}"${cls}${ext}>${label}</a>`;
    })
    .join("\n        ");
}

/** Map a graphical path to the /text/ equivalent. */
function toTextPath(pagePath) {
  const p = pagePath || "/";
  if (p === "/" || p === "") return "/text/";
  if (p.startsWith("/text")) return p;
  // /catalogue/foo/ → /text/catalogue/foo/
  return "/text" + (p.startsWith("/") ? p : "/" + p);
}

function shell(site, { title, description, path: pagePath, active, body, image }) {
  const desc = description || site.description;
  const domain = (site.domain || "https://iama.cc").replace(/\/$/, "");
  const canon =
    pagePath === "/" ? `${domain}/` : `${domain}${pagePath}`;
  const textPath = toTextPath(pagePath);
  const brand = site.name || "NLS RECORDS";
  // Logo mark stays short; full legal name is NLS RECORDS (not combined with NLS RECORDINGS)
  const logoShort = "NLS";
  let ogBlock = "";
  if (image) {
    const ogImage = image.startsWith("http") ? image : `${domain}${image}`;
    ogBlock = `
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${esc(ogImage)}" />`;
  } else {
    ogBlock = `
  <meta name="twitter:card" content="summary" />`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="theme-color" content="#050505" />
  <meta name="application-name" content="${esc(brand)}" />
  <link rel="canonical" href="${esc(canon)}" />
  <link rel="alternate" type="text/html" href="${esc(textPath)}" title="Text mode" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(canon)}" />
  <meta property="og:site_name" content="${esc(brand)}" />${ogBlock}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <script src="/assets/js/text-browser.js" defer></script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <a class="text-mode-banner" href="${esc(textPath)}" id="text-mode-link">Text mode (terminal browsers)</a>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="logo" href="/" aria-label="${esc(brand)} home" title="${esc(brand)}">
        <span class="logo-mark" aria-hidden="true"></span>
        <span class="logo-text">${esc(logoShort)}</span>
        <span class="logo-full">${esc(brand)}</span>
      </a>
      <nav class="nav" aria-label="Primary">
        ${nav(active)}
      </nav>
    </div>
  </header>
  <main id="main">
${body}
  </main>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <span class="footer-brand">${esc(brand)}</span>
      <span class="footer-copy">© <span class="y"></span> nonlineari · all rights reserved</span>
      <a class="footer-link" href="${esc(textPath)}">Text mode</a>
      <a class="footer-link" href="${esc(site.github)}" rel="noopener noreferrer" target="_blank">github.com/nonlineari</a>
    </div>
  </footer>
  <script>
    document.querySelectorAll(".y").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  </script>
</body>
</html>
`;
}

/**
 * Cover markup matching /catalogue/nonlineari/ standard:
 * square full-bleed JPEG, explicit dimensions, mobile-safe attrs.
 */
function coverImg(src, alt, { className = "card-cover", width = 1200, height = 1200, eager = false } = {}) {
  if (!src) {
    return `<div class="${className} placeholder" role="img" aria-label="${esc(alt || "No cover")}"></div>`;
  }
  const loading = eager ? "eager" : "lazy";
  const fetchPriority = eager ? ' fetchpriority="high"' : "";
  return `<img class="${className}" src="${esc(src)}" alt="${esc(alt || "")}" width="${width}" height="${height}" loading="${loading}" decoding="async"${fetchPriority} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px" />`;
}

function releaseCards(catalogue) {
  return catalogue
    .map((a, i) => {
      // Only Nonlineari (or any item with cover) renders an <img>
      const media = a.cover
        ? `<figure class="card-figure">
              ${coverImg(a.cover, `${a.title} cover art`, {
                className: "card-cover",
                eager: i < 4,
              })}
            </figure>`
        : "";
      return `        <li class="card card--release${a.cover ? " card--has-cover" : " card--no-cover"}">
          <a class="card-link" href="/catalogue/${esc(a.slug)}/">
            ${media}
            <div class="card-body">
              <span class="cat">${esc(a.cat_label || "NLR")}${a.year ? ` · ${esc(a.year)}` : ""}</span>
              <h3>${esc(a.title)}</h3>
              <p>${esc(a.summary || short(a.body, 140))}</p>
            </div>
          </a>
        </li>`;
    })
    .join("\n");
}

// ── pages ────────────────────────────────────────────────────────────────

function buildIndex(site, catalogue, posts, artists) {
  const recent = posts.slice(0, 4);
  const journal = recent
    .map(
      (p) => `        <li class="card">
          <a class="card-link" href="/journal/${esc(p.slug)}/">
            <span class="cat">${esc((p.tags && p.tags[0]) || "journal")} · ${esc(p.date)}</span>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.summary)}</p>
          </a>
        </li>`
    )
    .join("\n");

  const artistRow = artists
    .slice(0, 4)
    .map(
      (a) => `        <article class="plate">
          <h3><a href="/artists/${esc(a.slug)}/">${esc(a.name)}</a></h3>
          <p>${esc(a.summary)}</p>
          <a class="text-link" href="/artists/${esc(a.slug)}/">profile →</a>
        </article>`
    )
    .join("\n");

  const body = `
    <section class="hero wrap">
      <p class="eyebrow">Music label · visual systems · protocol</p>
      <h1>
        <span class="line">NLS</span>
        <span class="line accent">RECORDS</span>
      </h1>
      <p class="lede">
        High-contrast catalogue for sound, image, and the intermediate field between them.
        Minimal plate. Cyan stamp. No soft edges.
      </p>
      <div class="hero-actions">
        <a class="btn primary" href="/catalogue/">Enter catalogue</a>
        <a class="btn ghost" href="/journal/">Journal</a>
      </div>
      <div class="hero-meta" aria-hidden="true">
        <span>CH 01–42</span>
        <span>//</span>
        <span>#33F7DD</span>
        <span>//</span>
        <span>IAMA.CC</span>
      </div>
    </section>

    <section id="catalogue" class="section wrap">
      <header class="section-head">
        <h2>Catalogue</h2>
        <p class="section-sub">${catalogue.length} plates · <a href="/catalogue/">view all</a></p>
      </header>
      <ul class="grid catalogue">
${releaseCards(catalogue)}
      </ul>
    </section>

    <section class="section wrap signal">
      <header class="section-head">
        <h2>Artists</h2>
        <p class="section-sub"><a href="/artists/">directory</a></p>
      </header>
      <div class="signal-grid">
${artistRow}
      </div>
    </section>

    <section class="section wrap">
      <header class="section-head">
        <h2>Journal</h2>
        <p class="section-sub">latest notes · <a href="/journal/">all posts</a></p>
      </header>
      <ul class="grid catalogue">
${journal || '        <li class="card"><p>No posts yet.</p></li>'}
      </ul>
    </section>

    <section id="signal" class="section wrap signal">
      <header class="section-head">
        <h2>Signal</h2>
        <p class="section-sub">stack · shop · source</p>
      </header>
      <div class="signal-grid">
        <article class="plate">
          <h3>Protocol lab</h3>
          <p>ML-KEM · Noise XX · X3DH · MIDI/NLS channels 1–42.</p>
          <a class="text-link" href="https://github.com/nonlineari/audio-ml-toolkit" rel="noopener noreferrer" target="_blank">audio-ml-toolkit →</a>
        </article>
        <article class="plate">
          <h3>Shop &amp; listen</h3>
          <p>Storefronts and free-release lines. Update links in content/shop.json.</p>
          <a class="text-link" href="/shop/">open shop →</a>
        </article>
        <article class="plate">
          <h3>Source</h3>
          <p>Static site built with Node alone. Edit content/, run node build.js.</p>
          <a class="text-link" href="${esc(site.github)}/nonlineari.github.io" rel="noopener noreferrer" target="_blank">repo →</a>
        </article>
        <article class="plate">
          <h3>Text / terminal</h3>
          <p>Plain HTML for lynx, w3m, links — plus a single all.txt dump.</p>
          <a class="text-link" href="/text/">open text mode →</a>
        </article>
      </div>
    </section>
`;
  return shell(site, {
    title: `${site.name} · nonlineari`,
    description: site.description,
    path: "/",
    active: "",
    body,
  });
}

function buildCatalogueIndex(site, catalogue) {
  const body = `
    <section class="page-hero wrap">
      <p class="breadcrumb"><a href="/">Home</a> / Catalogue</p>
      <h1>Catalogue</h1>
      <p class="section-sub" style="margin-top:0.75rem;border:0;padding:0">${catalogue.length} releases</p>
    </section>
    <section class="section wrap" style="border-bottom:0">
      <ul class="grid catalogue">
${releaseCards(catalogue)}
      </ul>
    </section>
`;
  return shell(site, {
    title: `Catalogue · ${site.name}`,
    description: "NLS RECORDS catalogue — ambient, beats, experimental plates.",
    path: "/catalogue/",
    active: "catalogue",
    body,
  });
}

function buildRelease(site, a) {
  const tags = (a.cats || [])
    .map((c) => `<span class="tag">${esc(c)}</span>`)
    .join("") || '<span class="tag">nlsrecords</span>';
  const hasCover = Boolean(a.cover);
  const media = hasCover
    ? `<figure class="release-media">
          ${coverImg(a.cover, `${a.title} cover art`, {
            className: "release-cover",
            width: 1200,
            height: 1200,
            eager: true,
          })}
        </figure>`
    : "";
  const shop = a.shop_url
    ? `<a class="btn primary" href="${esc(a.shop_url)}" rel="noopener noreferrer" target="_blank">Buy / listen</a>`
    : "";
  const body = `
    <article class="wrap release${hasCover ? " release--with-cover" : ""}">
      <p class="breadcrumb"><a href="/">Home</a> / <a href="/catalogue/">Catalogue</a> / ${esc(a.title)}</p>
      <div class="release-layout${hasCover ? "" : " release-layout--text"}">
        ${media}
        <div class="release-copy">
          <span class="cat">${esc(a.cat_label || "NLR")}${a.year ? ` · ${esc(a.year)}` : ""}</span>
          <h1>${esc(a.title)}</h1>
          <div class="body">
            ${bodyToHtml(a.body || a.summary)}
          </div>
          <div class="tags">${tags}</div>
          <div class="back-row hero-actions">
            <a class="btn ghost" href="/catalogue/">← All plates</a>
            ${shop}
          </div>
        </div>
      </div>
    </article>
`;
  return shell(site, {
    title: `${a.title} · ${site.name}`,
    description: a.summary || short(a.body, 160),
    path: `/catalogue/${a.slug}/`,
    active: "catalogue",
    body,
    image: hasCover ? a.cover : "",
  });
}

function buildArtistsIndex(site, artists) {
  const cards = artists
    .map(
      (a) => `        <li class="card">
          <a class="card-link" href="/artists/${esc(a.slug)}/">
            <span class="cat">${esc(a.role || "artist")}</span>
            <h3>${esc(a.name)}</h3>
            <p>${esc(a.summary)}</p>
          </a>
        </li>`
    )
    .join("\n");
  const body = `
    <section class="page-hero wrap">
      <p class="breadcrumb"><a href="/">Home</a> / Artists</p>
      <h1>Artists</h1>
    </section>
    <section class="section wrap" style="border-bottom:0">
      <ul class="grid catalogue">
${cards}
      </ul>
    </section>
`;
  return shell(site, {
    title: `Artists · ${site.name}`,
    description: "NLS artists and visual systems practices.",
    path: "/artists/",
    active: "artists",
    body,
  });
}

function buildArtist(site, a) {
  const links = (a.links || [])
    .map((l) => {
      const ext = /^https?:/.test(l.url)
        ? ' rel="noopener noreferrer" target="_blank"'
        : "";
      return `<a class="btn ghost" href="${esc(l.url)}"${ext}>${esc(l.label)}</a>`;
    })
    .join("\n            ");
  const body = `
    <article class="wrap release">
      <p class="breadcrumb"><a href="/">Home</a> / <a href="/artists/">Artists</a> / ${esc(a.name)}</p>
      <span class="cat">${esc(a.role || "artist")}</span>
      <h1>${esc(a.name)}</h1>
      <div class="body">
        ${bodyToHtml(a.body || a.summary)}
      </div>
      <div class="back-row hero-actions">
        <a class="btn ghost" href="/artists/">← All artists</a>
        ${links}
      </div>
    </article>
`;
  return shell(site, {
    title: `${a.name} · ${site.name}`,
    description: a.summary,
    path: `/artists/${a.slug}/`,
    active: "artists",
    body,
  });
}

function buildJournalIndex(site, posts) {
  const cards = posts
    .map(
      (p) => `        <li class="card">
          <a class="card-link" href="/journal/${esc(p.slug)}/">
            <span class="cat">${esc((p.tags && p.tags[0]) || "journal")} · ${esc(p.date)}</span>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.summary)}</p>
          </a>
        </li>`
    )
    .join("\n");
  const body = `
    <section class="page-hero wrap">
      <p class="breadcrumb"><a href="/">Home</a> / Journal</p>
      <h1>Journal</h1>
      <p class="section-sub" style="margin-top:0.75rem;border:0;padding:0">${posts.length} posts · edit content/posts/*.md</p>
    </section>
    <section class="section wrap" style="border-bottom:0">
      <ul class="grid catalogue">
${cards}
      </ul>
    </section>
`;
  return shell(site, {
    title: `Journal · ${site.name}`,
    description: "NLS journal — notes, interviews, production.",
    path: "/journal/",
    active: "journal",
    body,
  });
}

function buildPost(site, p) {
  const tags = (p.tags || [])
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join("");
  const body = `
    <article class="wrap release">
      <p class="breadcrumb"><a href="/">Home</a> / <a href="/journal/">Journal</a> / ${esc(p.title)}</p>
      <span class="cat">${esc(p.date)}</span>
      <h1>${esc(p.title)}</h1>
      <div class="body">
        ${bodyToHtml(p.body)}
      </div>
      <div class="tags">${tags}</div>
      <div class="back-row">
        <a class="btn ghost" href="/journal/">← All posts</a>
      </div>
    </article>
`;
  return shell(site, {
    title: `${p.title} · ${site.name}`,
    description: p.summary,
    path: `/journal/${p.slug}/`,
    active: "journal",
    body,
  });
}

function buildShop(site, shop) {
  const links = (shop.links || [])
    .filter((l) => l.url && !l.placeholder)
    .map((l) => {
      const ext = /^https?:/.test(l.url)
        ? ' rel="noopener noreferrer" target="_blank"'
        : "";
      return `        <a class="plate shop-link" href="${esc(l.url)}"${ext}>
          <span class="cat">${esc(l.kind || "link")}</span>
          <h3>${esc(l.label)}</h3>
          <span class="text-link">open →</span>
        </a>`;
    })
    .join("\n");
  const placeholders = (shop.links || [])
    .filter((l) => l.placeholder || !l.url)
    .map(
      (l) => `        <div class="plate shop-link is-placeholder">
          <span class="cat">${esc(l.kind || "shop")}</span>
          <h3>${esc(l.label)}</h3>
          <p class="muted">Set URL in content/shop.json</p>
        </div>`
    )
    .join("\n");

  const body = `
    <section class="page-hero wrap">
      <p class="breadcrumb"><a href="/">Home</a> / Shop</p>
      <h1>${esc(shop.title || "Shop")}</h1>
      <p class="lede" style="margin-top:1rem">${esc(shop.intro || "")}</p>
    </section>
    <section class="section wrap" style="border-bottom:0">
      <div class="signal-grid shop-grid">
${links}
${placeholders}
      </div>
    </section>
`;
  return shell(site, {
    title: `Shop · ${site.name}`,
    description: shop.intro || "NLS shop and listen links.",
    path: "/shop/",
    active: "shop",
    body,
  });
}

function buildAbout(site) {
  const body = `
    <section class="page-hero wrap">
      <p class="breadcrumb"><a href="/">Home</a> / About</p>
      <h1>About ${esc(site.name)}</h1>
    </section>
    <section class="wrap about" style="padding:2rem 0 4rem">
      <div class="about-body">
        <p>
          <strong>NLS</strong> (Nonlinear / nonlineari) is a music and visual systems label.
          The practice treats sound and image as one medium — realizations in time,
          space, and network infrastructure.
        </p>
        <p>
          The original site <code>nlsrecordings.com</code> is offline. This rebuild on
          <code>iama.cc</code> restores catalogue plates and a dark high-contrast label
          surface. Hosted on GitHub Pages under
          <a href="${esc(site.github)}">nonlineari</a>.
        </p>
        <p>
          Content is plain JSON + Markdown. Rebuild with Node only:
          <code>node build.js</code> — no npm install required.
        </p>
        <p class="mono-line">nonlineari · NLS RECORDS · earth</p>
      </div>
    </section>
`;
  return shell(site, {
    title: `About · ${site.name}`,
    description: site.description,
    path: "/about/",
    active: "about",
    body,
  });
}

function build404(site) {
  const body = `
    <section class="wrap error-box">
      <p class="code">Error 404</p>
      <h1>Plate not found</h1>
      <p style="color:var(--text-muted);max-width:28rem">
        This path is empty. Return to the catalogue or the main plate.
      </p>
      <div class="hero-actions" style="margin-top:1.5rem">
        <a class="btn primary" href="/">Home</a>
        <a class="btn ghost" href="/catalogue/">Catalogue</a>
      </div>
    </section>
`;
  return shell(site, {
    title: `404 · ${site.name}`,
    description: "Page not found",
    path: "/404.html",
    active: "",
    body,
  });
}

function ensureStyles() {
  const cssPath = path.join(ROOT, "styles.css");
  let css = fs.readFileSync(cssPath, "utf8");
  const marker = "/* === build.js extensions === */";
  if (css.includes(marker)) return;
  css += `
${marker}
/* Catalogue display standard = /catalogue/nonlineari/ (full-bleed square sleeve) */
.nav a.is-active { color: var(--accent); }
.grid.catalogue {
  grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
  gap: 1px;
}
.card--release {
  padding: 0;
  overflow: hidden;
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
}
.card--release .card-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
}
.card--release .card-link:hover .card-cover {
  opacity: 0.92;
}
.card-figure {
  margin: 0;
  padding: 0;
  width: 100%;
  background: #000;
  border-bottom: 1px solid var(--border);
  line-height: 0;
}
.card-cover {
  width: 100%;
  max-width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  object-position: center;
  display: block;
  background: #0a0a0a;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}
.card-cover.placeholder {
  min-height: 0;
  aspect-ratio: 1 / 1;
  background: linear-gradient(135deg, #0c0c0c 0%, #121212 50%, #0a0a0a 100%);
  position: relative;
  line-height: normal;
}
.card-cover.placeholder::after {
  content: "NLS";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  color: #33f7dd;
  opacity: 0.45;
  line-height: normal;
}
.card-body { padding: 1.1rem 1.15rem 1.35rem; flex: 1; }
.card--release .card-body h3 {
  margin: 0 0 0.5rem;
  font-family: var(--mono);
  font-weight: 500;
  font-size: 1rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.card--release .card-body p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.card--release .cat {
  display: block;
  font-family: var(--mono);
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.65rem;
}
/* Detail page — same sleeve treatment as nonlineari */
.release--with-cover {
  padding-top: 2rem;
  padding-bottom: 3.5rem;
  max-width: none;
}
.release--with-cover .release-layout {
  display: grid;
  gap: 2rem 2.5rem;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}
@media (min-width: 800px) {
  .release--with-cover .release-layout {
    grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  }
}
.release-media {
  margin: 0;
  width: 100%;
  max-width: 420px;
  background: #000;
  border: 1px solid var(--border);
  line-height: 0;
}
.release-cover {
  width: 100%;
  max-width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  object-position: center;
  display: block;
  background: #0a0a0a;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}
.release-cover.placeholder {
  aspect-ratio: 1 / 1;
  background: linear-gradient(135deg, #0c0c0c, #121212);
  position: relative;
  line-height: normal;
}
.release-cover.placeholder::after {
  content: "NLS";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  letter-spacing: 0.2em;
  color: #33f7dd;
  opacity: 0.4;
  font-size: 0.85rem;
  line-height: normal;
}
.release-copy { max-width: 36rem; }
@media (max-width: 640px) {
  .release-media { max-width: 100%; }
  .card-body { padding: 1rem; }
  .release--with-cover { padding-top: 1.25rem; }
}
.shop-link { display: block; text-decoration: none; color: inherit; transition: border-color 0.15s; }
.shop-link:hover { border-color: var(--accent); color: inherit; }
.shop-link.is-placeholder { opacity: 0.55; }
.shop-link .muted { color: var(--text-dim); font-size: 0.85rem; margin: 0.5rem 0 0; }
.page-hero { padding: 3rem 0 2rem; border-bottom: 1px solid var(--border); }
.page-hero h1 {
  margin: 0;
  font-family: var(--mono);
  font-weight: 500;
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.breadcrumb {
  margin: 0 0 1rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.breadcrumb a { color: var(--text-muted); }
.breadcrumb a:hover { color: var(--accent); }
.release { padding: 2.5rem 0 3.5rem; max-width: 48rem; }
.release .cat {
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}
.release h1 {
  margin: 0.5rem 0 1.25rem;
  font-family: var(--mono);
  font-weight: 500;
  font-size: clamp(1.5rem, 4vw, 2.1rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.release .body { color: var(--text-muted); font-size: 1.02rem; line-height: 1.65; }
.release .tags { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag {
  font-family: var(--mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid var(--border);
  padding: 0.35rem 0.55rem;
  color: var(--text-muted);
}
.back-row { margin-top: 2.5rem; }
.error-box { padding: 5rem 0; }
.error-box .code {
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: var(--accent);
  text-transform: uppercase;
}
.error-box h1 {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

// ── text / terminal browser site (lynx, w3m, links, elinks) ─────────────

function textNav(here, brand) {
  const b = brand || "NLS RECORDS";
  const items = [
    ["/text/", "Home"],
    ["/text/catalogue/", "Catalogue"],
    ["/text/artists/", "Artists"],
    ["/text/journal/", "Journal"],
    ["/text/shop/", "Shop"],
    ["/text/about/", "About"],
    ["/text/all.txt", "All as plain text"],
    ["/?graphic=1", "Graphical site"],
  ];
  const links = items
    .map(([href, label]) => {
      if (href === here) return `<li><strong>${esc(label)}</strong></li>`;
      return `<li><a href="${esc(href)}">${esc(label)}</a></li>`;
    })
    .join("\n");
  return `<nav aria-label="Text site">
<p>${esc(b)} — text mode (terminals / lynx / w3m / links)</p>
<ul>
${links}
</ul>
</nav>
<hr>`;
}

function textShell(site, { title, body, path: pagePath }) {
  const domain = (site.domain || "https://iama.cc").replace(/\/$/, "");
  const brand = site.name || "NLS RECORDS";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index,follow">
  <meta name="application-name" content="${esc(brand)}">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(domain + pagePath)}">
  <!-- No CSS: optimized for text browsers (lynx, w3m, links) -->
</head>
<body>
${textNav(pagePath, brand)}
${body}
<hr>
<p><a href="/text/">Text home</a> · <a href="/?graphic=1">Graphical home</a> · <a href="/text/all.txt">all.txt</a></p>
<p><small>${esc(brand)} · ${esc(site.domain)} · terminal edition</small></p>
</body>
</html>
`;
}

function parasText(text) {
  return String(text || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n");
}

function plainBlock(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildTextSite(site, catalogue, artists, posts, shop) {
  const T = path.join(ROOT, "text");

  // home
  writeFile(
    path.join(T, "index.html"),
    textShell(site, {
      path: "/text/",
      title: `${site.name} text home`,
      body: `
<main>
<h1>${esc(site.name || "NLS RECORDS")} — text mode</h1>
<p>${esc(site.description)}</p>
<p>This section is plain HTML for terminal browsers (lynx, w3m, links, elinks, browsh). Images and layout chrome are omitted. Graphical site auto-detects text browsers and can send you here.</p>
<h2>Sections</h2>
<ol>
  <li><a href="/text/catalogue/">Catalogue</a> — ${catalogue.length} releases</li>
  <li><a href="/text/artists/">Artists</a> — ${artists.length} profiles</li>
  <li><a href="/text/journal/">Journal</a> — ${posts.length} posts</li>
  <li><a href="/text/shop/">Shop &amp; links</a></li>
  <li><a href="/text/about/">About</a></li>
  <li><a href="/text/all.txt">Single plain-text dump (all.txt)</a></li>
</ol>
<h2>Quick catalogue</h2>
<ol>
${catalogue
  .map(
    (a, i) =>
      `  <li><a href="/text/catalogue/${esc(a.slug)}/">${esc(a.title)}</a>${a.year ? ` (${esc(a.year)})` : ""} — ${esc(a.cat_label || "")}</li>`
  )
  .join("\n")}
</ol>
</main>`,
    })
  );

  // catalogue index
  writeFile(
    path.join(T, "catalogue", "index.html"),
    textShell(site, {
      path: "/text/catalogue/",
      title: `Catalogue (text) · ${site.name}`,
      body: `
<main>
<h1>Catalogue</h1>
<p>${catalogue.length} releases. No images in text mode.</p>
<ol>
${catalogue
  .map(
    (a) =>
      `  <li>
    <a href="/text/catalogue/${esc(a.slug)}/">${esc(a.title)}</a>
    — ${esc(a.cat_label || "NLR")}${a.year ? `, ${esc(a.year)}` : ""}
    <br>${esc(a.summary || short(a.body, 120))}
  </li>`
  )
  .join("\n")}
</ol>
</main>`,
    })
  );

  for (const a of catalogue) {
    const tags = (a.cats || []).map((c) => esc(c)).join(", ");
    writeFile(
      path.join(T, "catalogue", a.slug, "index.html"),
      textShell(site, {
        path: `/text/catalogue/${a.slug}/`,
        title: `${a.title} (text) · ${site.name}`,
        body: `
<main>
<p><a href="/text/catalogue/">Back to catalogue</a></p>
<h1>${esc(a.title)}</h1>
<p><strong>${esc(a.cat_label || "NLR")}</strong>${a.year ? ` · ${esc(a.year)}` : ""}${tags ? ` · ${tags}` : ""}</p>
${parasText(a.body || a.summary)}
${a.shop_url ? `<p>Shop / listen: <a href="${esc(a.shop_url)}">${esc(a.shop_url)}</a></p>` : ""}
<p>Graphical page: <a href="/catalogue/${esc(a.slug)}/">/catalogue/${esc(a.slug)}/</a></p>
</main>`,
      })
    );
  }

  // artists
  writeFile(
    path.join(T, "artists", "index.html"),
    textShell(site, {
      path: "/text/artists/",
      title: `Artists (text) · ${site.name}`,
      body: `
<main>
<h1>Artists</h1>
<ol>
${artists
  .map(
    (a) =>
      `  <li><a href="/text/artists/${esc(a.slug)}/">${esc(a.name)}</a> — ${esc(a.role || "")}<br>${esc(a.summary)}</li>`
  )
  .join("\n")}
</ol>
</main>`,
    })
  );

  for (const a of artists) {
    const links = (a.links || [])
      .map((l) => `<li><a href="${esc(l.url)}">${esc(l.label)}</a> — ${esc(l.url)}</li>`)
      .join("\n");
    writeFile(
      path.join(T, "artists", a.slug, "index.html"),
      textShell(site, {
        path: `/text/artists/${a.slug}/`,
        title: `${a.name} (text) · ${site.name}`,
        body: `
<main>
<p><a href="/text/artists/">Back to artists</a></p>
<h1>${esc(a.name)}</h1>
<p><strong>${esc(a.role || "artist")}</strong></p>
${parasText(a.body || a.summary)}
${links ? `<h2>Links</h2><ul>${links}</ul>` : ""}
</main>`,
      })
    );
  }

  // journal
  writeFile(
    path.join(T, "journal", "index.html"),
    textShell(site, {
      path: "/text/journal/",
      title: `Journal (text) · ${site.name}`,
      body: `
<main>
<h1>Journal</h1>
<ol>
${posts
  .map(
    (p) =>
      `  <li><a href="/text/journal/${esc(p.slug)}/">${esc(p.title)}</a> — ${esc(p.date)}<br>${esc(p.summary)}</li>`
  )
  .join("\n")}
</ol>
</main>`,
    })
  );

  for (const p of posts) {
    writeFile(
      path.join(T, "journal", p.slug, "index.html"),
      textShell(site, {
        path: `/text/journal/${p.slug}/`,
        title: `${p.title} (text) · ${site.name}`,
        body: `
<main>
<p><a href="/text/journal/">Back to journal</a></p>
<h1>${esc(p.title)}</h1>
<p>Date: ${esc(p.date)}${(p.tags || []).length ? ` · Tags: ${esc((p.tags || []).join(", "))}` : ""}</p>
${parasText(p.body)}
</main>`,
      })
    );
  }

  // shop
  const shopLinks = (shop.links || [])
    .filter((l) => l.url && !l.placeholder)
    .map((l) => `<li><a href="${esc(l.url)}">${esc(l.label)}</a> — ${esc(l.url)}</li>`)
    .join("\n");
  const shopPending = (shop.links || [])
    .filter((l) => !l.url || l.placeholder)
    .map((l) => `<li>${esc(l.label)} (URL not set)</li>`)
    .join("\n");
  writeFile(
    path.join(T, "shop", "index.html"),
    textShell(site, {
      path: "/text/shop/",
      title: `Shop (text) · ${site.name}`,
      body: `
<main>
<h1>${esc(shop.title || "Shop")}</h1>
<p>${esc(shop.intro || "")}</p>
<ul>
${shopLinks || "<li>No live shop links yet.</li>"}
</ul>
${shopPending ? `<h2>Pending</h2><ul>${shopPending}</ul>` : ""}
</main>`,
    })
  );

  // about
  writeFile(
    path.join(T, "about", "index.html"),
    textShell(site, {
      path: "/text/about/",
      title: `About (text) · ${site.name}`,
      body: `
<main>
<h1>About ${esc(site.name)}</h1>
<p>${esc(site.description)}</p>
<p>NLS (Nonlinear / nonlineari) is a music and visual systems label. Sound and image are treated as one practice.</p>
<p>Original site nlsrecordings.com is offline. This rebuild lives at ${esc(site.domain)} on GitHub Pages.</p>
<p>Text edition: no CSS, no JavaScript, no images. Built with Node alone: node build.js</p>
<p>Graphical site: <a href="/">${esc(site.domain)}/</a></p>
<p>Source: <a href="${esc(site.github)}/nonlineari.github.io">${esc(site.github)}/nonlineari.github.io</a></p>
</main>`,
    })
  );

  // pure plain-text dump for curl / cat / less
  const lines = [];
  lines.push(`${site.name} — TEXT DUMP`);
  lines.push(site.domain);
  lines.push(site.description);
  lines.push("");
  lines.push("Open text HTML: /text/");
  lines.push("Browse with:  lynx https://iama.cc/text/");
  lines.push("              w3m https://iama.cc/text/");
  lines.push("              links https://iama.cc/text/");
  lines.push("              curl -sL https://iama.cc/text/all.txt | less");
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("CATALOGUE");
  lines.push("=".repeat(72));
  for (const a of catalogue) {
    lines.push("");
    lines.push(`* ${a.title}${a.year ? ` (${a.year})` : ""}`);
    lines.push(`  ${a.cat_label || "NLR"} | /text/catalogue/${a.slug}/`);
    lines.push("");
    lines.push(plainBlock(a.body || a.summary));
    if (a.shop_url) lines.push(`  shop: ${a.shop_url}`);
  }
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("ARTISTS");
  lines.push("=".repeat(72));
  for (const a of artists) {
    lines.push("");
    lines.push(`* ${a.name} — ${a.role || "artist"}`);
    lines.push(`  /text/artists/${a.slug}/`);
    lines.push("");
    lines.push(plainBlock(a.body || a.summary));
  }
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("JOURNAL");
  lines.push("=".repeat(72));
  for (const p of posts) {
    lines.push("");
    lines.push(`* ${p.title} [${p.date}]`);
    lines.push(`  /text/journal/${p.slug}/`);
    lines.push("");
    lines.push(plainBlock(p.body));
  }
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("SHOP");
  lines.push("=".repeat(72));
  for (const l of shop.links || []) {
    if (l.url && !l.placeholder) lines.push(`* ${l.label}: ${l.url}`);
    else lines.push(`* ${l.label}: (not set)`);
  }
  lines.push("");
  lines.push(`-- end NLS text dump --`);
  writeFile(path.join(T, "all.txt"), lines.join("\n") + "\n");

  // tiny README for text users
  writeFile(
    path.join(T, "README.txt"),
    `NLS text mode
=============

URLs:
  https://iama.cc/text/           HTML for lynx/w3m/links
  https://iama.cc/text/all.txt    one plain file
  https://iama.cc/                graphical site

Examples:
  lynx https://iama.cc/text/
  w3m https://iama.cc/text/catalogue/
  links -dump https://iama.cc/text/ | less
  curl -sL https://iama.cc/text/all.txt | less

Rebuild:
  node build.js
`
  );
}

// ── main build ───────────────────────────────────────────────────────────

function build() {
  const site = readJson(path.join(CONTENT, "site.json"));
  const catalogue = readJson(path.join(CONTENT, "catalogue.json"));
  const artists = readJson(path.join(CONTENT, "artists.json"));
  const shop = readJson(path.join(CONTENT, "shop.json"));
  const posts = loadPosts();

  ensureStyles();

  // Write normalized data for runtime/debug
  writeFile(path.join(ROOT, "data", "catalogue.json"), JSON.stringify(catalogue, null, 2) + "\n");
  writeFile(path.join(ROOT, "data", "posts.json"), JSON.stringify(posts, null, 2) + "\n");
  writeFile(path.join(ROOT, "data", "artists.json"), JSON.stringify(artists, null, 2) + "\n");

  writeFile(path.join(ROOT, "index.html"), buildIndex(site, catalogue, posts, artists));
  writeFile(path.join(ROOT, "catalogue", "index.html"), buildCatalogueIndex(site, catalogue));
  for (const a of catalogue) {
    writeFile(path.join(ROOT, "catalogue", a.slug, "index.html"), buildRelease(site, a));
  }
  writeFile(path.join(ROOT, "artists", "index.html"), buildArtistsIndex(site, artists));
  for (const a of artists) {
    writeFile(path.join(ROOT, "artists", a.slug, "index.html"), buildArtist(site, a));
  }
  writeFile(path.join(ROOT, "journal", "index.html"), buildJournalIndex(site, posts));
  for (const p of posts) {
    writeFile(path.join(ROOT, "journal", p.slug, "index.html"), buildPost(site, p));
  }
  writeFile(path.join(ROOT, "shop", "index.html"), buildShop(site, shop));
  writeFile(path.join(ROOT, "about", "index.html"), buildAbout(site));
  writeFile(path.join(ROOT, "404.html"), build404(site));

  // Terminal / text-browser edition
  buildTextSite(site, catalogue, artists, posts, shop);

  // site root meta files
  const domainHost = (site.domain || "https://iama.cc").replace(/^https?:\/\//, "").replace(/\/$/, "");
  writeFile(path.join(ROOT, "CNAME"), domainHost + "\n");
  writeFile(
    path.join(ROOT, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${site.domain.replace(/\/$/, "")}/sitemap.xml\n`
  );

  const urls = [
    "/",
    "/catalogue/",
    "/artists/",
    "/journal/",
    "/shop/",
    "/about/",
    "/text/",
    "/text/catalogue/",
    "/text/artists/",
    "/text/journal/",
    "/text/shop/",
    "/text/about/",
    "/text/all.txt",
  ];
  for (const a of catalogue) {
    urls.push(`/catalogue/${a.slug}/`);
    urls.push(`/text/catalogue/${a.slug}/`);
  }
  for (const a of artists) {
    urls.push(`/artists/${a.slug}/`);
    urls.push(`/text/artists/${a.slug}/`);
  }
  for (const p of posts) {
    urls.push(`/journal/${p.slug}/`);
    urls.push(`/text/journal/${p.slug}/`);
  }
  const domain = site.domain.replace(/\/$/, "");
  const sm = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${domain}${u === "/" ? "/" : u}</loc><changefreq>weekly</changefreq></url>`
    ),
    "</urlset>",
    "",
  ];
  writeFile(path.join(ROOT, "sitemap.xml"), sm.join("\n"));

  console.log(`NLS build complete`);
  console.log(`  catalogue: ${catalogue.length}`);
  console.log(`  artists:   ${artists.length}`);
  console.log(`  posts:     ${posts.length}`);
  console.log(`  text mode: /text/ + /text/all.txt`);
  console.log(`  domain:    ${site.domain}`);
}

function watch() {
  build();
  const targets = [CONTENT, path.join(ROOT, "styles.css")];
  console.log("watching content/ and styles.css …");
  let t = null;
  const kick = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      try {
        build();
      } catch (e) {
        console.error(e);
      }
    }, 150);
  };
  for (const target of targets) {
    fs.watch(target, { recursive: true }, kick);
  }
}

if (require.main === module) {
  if (process.argv.includes("--watch")) watch();
  else build();
}

module.exports = { build, loadPosts };
