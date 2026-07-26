#!/usr/bin/env node
/**
 * Fetch catalogue cover rasters from Internet Archive (Wayback)
 * for images discovered in the nlsrecordings scrape.
 *
 * Node only — no npm packages.
 *
 * Usage:
 *   node scripts/fetch-covers.js
 *   node scripts/fetch-covers.js --force
 */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..");
const CATALOGUE = path.join(ROOT, "content", "catalogue.json");
const OUT_DIR = path.join(ROOT, "assets", "covers");
const FORCE = process.argv.includes("--force");

/** Preferred original upload paths per slug (from scrape). */
const COVER_SOURCES = {
  "discrete-geometry": [
    "https://nlsrecordings.com/wp-content/uploads/2020/02/a0521774041_10.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2020/02/a0521774041_10-650x650.jpg",
  ],
  "echo-clone-internet-2": [
    "https://nlsrecordings.com/wp-content/uploads/2022/04/EchoClone_LS_Art-copy.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2022/04/EchoClone_LS_Art-copy-1024x1024.jpg",
  ],
  "nach-dem-sturm": [
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a4097470495_10.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a4097470495_10-650x650.jpg",
  ],
  nonlineari: [
    "https://nlsrecordings.com/wp-content/uploads/2024/04/Satori_a-copy.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2024/04/Satori_a-copy-1024x1024.jpg",
  ],
  "project-aoa-single": [
    "https://nlsrecordings.com/wp-content/uploads/2021/03/874558_large.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2021/03/874558_large-650x650.jpg",
  ],
  "project-aoa-ver-2-ep": [
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a3285547429_10.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a3285547429_10-650x650.jpg",
  ],
  "project-aoa-ver-3-day-after-mono-ep": [
    "https://nlsrecordings.com/wp-content/uploads/2021/03/fb72bac0a37f9898add31be87544aaa6.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2021/03/fb72bac0a37f9898add31be87544aaa6-650x650.jpg",
  ],
  "state-of-the-rest": [
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a3696429314_10.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a3696429314_10-650x650.jpg",
  ],
  "the-nexus-remix": [
    "https://nlsrecordings.com/wp-content/uploads/2021/11/CS686826-01A-BIG.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2021/11/CS686826-01A-BIG-650x650.jpg",
  ],
  "this-is-white-powder-opera": [
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a1079902083_10.jpg",
    "https://nlsrecordings.com/wp-content/uploads/2021/03/a1079902083_10-650x650.jpg",
  ],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error("too many redirects"));
    const u = new URL(url);
    const lib = u.protocol === "http:" ? http : https;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "NLSCoverBot/1.0 (+https://iama.cc; research archive recovery)",
          Accept: "image/*,application/json,*/*",
        },
        timeout: 90000,
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          return resolve(get(next, redirects + 1));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode !== 200) {
            return reject(
              new Error(`HTTP ${res.statusCode} for ${url} (${buf.length}b)`)
            );
          }
          resolve({
            buf,
            contentType: res.headers["content-type"] || "",
            url,
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
  });
}

async function cdxBest(originalUrl) {
  // Prefer latest 200 image snapshot
  const variants = [
    originalUrl,
    originalUrl.replace("https://", "http://"),
    originalUrl.replace("http://", "https://"),
  ];
  for (const orig of [...new Set(variants)]) {
    const api =
      "https://web.archive.org/cdx/search/cdx?url=" +
      encodeURIComponent(orig) +
      "&output=json&fl=timestamp,original,statuscode,mimetype,length&filter=statuscode:200&limit=20";
    try {
      const { buf } = await get(api);
      const data = JSON.parse(buf.toString("utf8"));
      if (!Array.isArray(data) || data.length < 2) continue;
      const rows = data.slice(1);
      // prefer largest, then newest
      rows.sort((a, b) => {
        const la = parseInt(a[4] || "0", 10);
        const lb = parseInt(b[4] || "0", 10);
        if (lb !== la) return lb - la;
        return String(b[0]).localeCompare(String(a[0]));
      });
      const [ts, original] = rows[0];
      return {
        ts,
        original,
        wayback: `https://web.archive.org/web/${ts}id_/${original}`,
      };
    } catch (e) {
      // try next variant
    }
    await sleep(400);
  }
  return null;
}

function extFrom(url, contentType) {
  const pathPart = url.split("?")[0].toLowerCase();
  if (pathPart.endsWith(".png")) return ".png";
  if (pathPart.endsWith(".webp")) return ".webp";
  if (pathPart.endsWith(".gif")) return ".gif";
  if (pathPart.endsWith(".jpeg")) return ".jpg";
  if (pathPart.endsWith(".jpg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

function snipMagic(buf) {
  // jpeg ff d8, png 89 50, gif 47 49, webp RIFF
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return ".gif";
  if (buf.toString("ascii", 0, 4) === "RIFF") return ".webp";
  return null;
}

async function fetchOne(slug, candidates) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // skip if raster already exists
  const existing = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.startsWith(slug + ".") && !f.endsWith(".svg"));
  if (existing.length && !FORCE) {
    const f = existing[0];
    console.log(`  skip (exists) ${f}`);
    return `/assets/covers/${f}`;
  }

  for (const src of candidates) {
    process.stdout.write(`  CDX ${path.basename(src)} … `);
    let hit = null;
    try {
      hit = await cdxBest(src);
    } catch (e) {
      console.log("cdx fail", e.message);
      continue;
    }
    if (!hit) {
      console.log("no archive");
      await sleep(500);
      continue;
    }
    console.log(`ts=${hit.ts}`);
    // try id_ raw then normal playback
    const urls = [
      hit.wayback,
      `https://web.archive.org/web/${hit.ts}/${hit.original}`,
    ];
    for (const u of urls) {
      try {
        await sleep(600);
        const { buf, contentType } = await get(u);
        if (buf.length < 2000) {
          console.log(`    too small ${buf.length}b`);
          continue;
        }
        // reject HTML error pages
        const head = buf.slice(0, 200).toString("utf8").toLowerCase();
        if (head.includes("<!doctype") || head.includes("<html")) {
          console.log("    got HTML, skip");
          continue;
        }
        const magic = snipMagic(buf);
        if (!magic) {
          console.log("    unknown binary, skip");
          continue;
        }
        const ext = magic || extFrom(src, contentType);
        const outName = `${slug}${ext}`;
        const outPath = path.join(OUT_DIR, outName);
        // remove old svg-only fallback? keep svg as alt; prefer raster in catalogue
        fs.writeFileSync(outPath, buf);
        console.log(`    OK ${outName} (${buf.length} bytes)`);
        return `/assets/covers/${outName}`;
      } catch (e) {
        console.log(`    fetch fail: ${e.message}`);
      }
    }
  }
  return null;
}

async function main() {
  const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
  console.log(`Fetching covers for ${catalogue.length} releases…`);

  let ok = 0;
  for (const item of catalogue) {
    const slug = item.slug;
    const sources = COVER_SOURCES[slug] || [];
    console.log(`\n[${slug}]`);
    if (!sources.length) {
      console.log("  no sources mapped");
      continue;
    }
    const cover = await fetchOne(slug, sources);
    if (cover) {
      item.cover = cover;
      ok++;
    } else {
      console.log("  FALLBACK keep", item.cover || "(none)");
    }
  }

  fs.writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 2) + "\n");
  console.log(`\nDone. ${ok}/${catalogue.length} rasters. Updated content/catalogue.json`);
  console.log("Next: node build.js");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
