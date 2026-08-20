/* Section 9 shadow pager — works from inline #arch-data, then /section9/arch.json */
(function () {
  const root = document.getElementById("pager");
  if (!root) return;
  const status = document.getElementById("pager-status");
  const prev = document.getElementById("pager-prev");
  const next = document.getElementById("pager-next");
  const idxEl = document.getElementById("pager-idx");
  const dots = document.getElementById("pager-dots");
  const grid = document.getElementById("plate-grid");
  let plates = [];
  let i = 0;

  function show(n) {
    if (!plates.length) return;
    i = (n + plates.length) % plates.length;
    const p = plates[i];
    const nEl = root.querySelector("[data-n]");
    const tEl = root.querySelector("[data-title]");
    const bEl = root.querySelector("[data-body]");
    if (nEl) nEl.textContent = p.n || String(i + 1).padStart(2, "0");
    if (tEl) tEl.textContent = p.title || "";
    if (bEl) bEl.textContent = p.body || "";
    if (idxEl) idxEl.textContent = i + 1 + " / " + plates.length;
    root.dataset.id = p.id || "";
    if (dots) {
      [...dots.children].forEach((el, k) => el.classList.toggle("is-on", k === i));
    }
  }

  function paintGrid() {
    if (!grid) return;
    grid.innerHTML = "";
    plates.forEach((p, k) => {
      const art = document.createElement("article");
      art.innerHTML = "<h3></h3><p></p>";
      art.querySelector("h3").textContent = (p.n || "") + " · " + (p.title || "");
      art.querySelector("p").textContent = p.body || "";
      art.style.cursor = "pointer";
      art.onclick = () => show(k);
      grid.appendChild(art);
    });
  }

  function paintDots() {
    if (!dots) return;
    dots.innerHTML = "";
    plates.forEach((p, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p.n || String(k + 1);
      b.setAttribute("aria-label", "Plate " + (p.title || k + 1));
      b.onclick = () => show(k);
      dots.appendChild(b);
    });
  }

  function load(data) {
    plates = data.plates || [];
    if (status && data.interface) status.textContent = data.interface;
    paintGrid();
    paintDots();
    show(0);
  }

  const inline = document.getElementById("arch-data");
  if (inline && inline.textContent.trim()) {
    try {
      load(JSON.parse(inline.textContent));
    } catch (e) {
      /* fall through to fetch */
    }
  }
  if (!plates.length) {
    fetch("/section9/arch.json")
      .then((r) => r.json())
      .then(load)
      .catch(() => {
        if (status) status.textContent = "Could not load plates.";
      });
  }

  fetch("http://127.0.0.1:4212/api/station")
    .then((r) => r.json())
    .then((st) => {
      const live = document.getElementById("node-live");
      if (!live) return;
      live.textContent = st.live
        ? "NLSAR node LIVE · " + (st.mode || "sound")
        : "NLSAR node offline · visualist continuity";
      live.dataset.live = st.live ? "1" : "0";
    })
    .catch(() => {
      const live = document.getElementById("node-live");
      if (live) live.textContent = "NLSAR backend not on this browser — pager is static. Local bot: http://127.0.0.1:4212/bot";
    });

  if (prev) prev.onclick = () => show(i - 1);
  if (next) next.onclick = () => show(i + 1);
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(i - 1);
    if (e.key === "ArrowRight") show(i + 1);
  });
})();
