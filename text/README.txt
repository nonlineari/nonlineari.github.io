NLS text mode
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
