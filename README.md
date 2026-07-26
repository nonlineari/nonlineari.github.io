# nonlineari.github.io

**NLS RECORDS** — public site.

- **Site:** https://iama.cc/
- **Text mode:** https://iama.cc/text/
- **Builder:** Node only (`node build.js`) — no npm packages

## Quick start

```bash
node build.js              # rebuild HTML from content/
node build.js --watch      # rebuild on content changes
node scripts/serve.js      # preview http://127.0.0.1:8080
```

Requires Node ≥ 16.

## Content

| Path | Role |
|------|------|
| `content/site.json` | Site name and description |
| `content/catalogue.json` | Releases |
| `content/artists.json` | Artists |
| `content/shop.json` | Shop links |
| `content/posts/*.md` | Journal posts |
| `content/posts/_template.md` | Post template |
| `assets/covers/` | Optional cover art (`{slug}.jpg`) |
| `build.js` | Static generator |
| `styles.css` | Styles |

Edit `content/`, run `node build.js`, then commit and push `main`.

### New journal post

```bash
cp content/posts/_template.md content/posts/my-slug.md
# edit file
node build.js
git add content/posts/my-slug.md journal/ index.html data/ text/ sitemap.xml
git commit -m "Add post my-slug"
git push
```

### New release

Add an entry in `content/catalogue.json`, optional cover at `assets/covers/{slug}.jpg`, then `node build.js` and push.

### Shop

Edit `content/shop.json` (Bandcamp, Discogs, etc.).

## Text mode

Generated under `/text/` for terminal browsers (lynx, w3m, links). Also: `/text/all.txt`.

## Deploy

```bash
node build.js
git add -A
git commit -m "Update site"
git push origin main
```
