# NLS RECORDS (private source)

Private repository. Public site: **https://iama.cc/**

## Local preview

```bash
node build.js
node scripts/serve.js
# http://127.0.0.1:8080
```

## Edit & publish

```bash
# change files under content/ (and optional assets/covers/)
node build.js
git add -A && git commit -m "Update" && git push origin main
```

## Text viewers (terminal)

https://iama.cc/text/ · https://iama.cc/text/all.txt

```bash
w3m https://iama.cc/text/
curl -sL https://iama.cc/text/all.txt | less
```

Graphical browsers: https://iama.cc/  
Text browsers auto-switch via `assets/js/text-browser.js`.
