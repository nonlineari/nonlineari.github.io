/* Section 9 shadow pager — NLSAR plates. Tries local node, else static arch.json. */
(function () {
  const root = document.getElementById("pager");
  if (!root) return;
  const status = document.getElementById("pager-status");
  const prev = document.getElementById("pager-prev");
  const next = document.getElementById("pager-next");
  const idxEl = document.getElementById("pager-idx");
  let plates = [];
  let i = 0;

  function show(n) {
    if (!plates.length) return;
    i = (n + plates.length) % plates.length;
    const p = plates[i];
    root.querySelector("[data-n]").textContent = p.n || String(i + 1).padStart(2, "0");
    root.querySelector("[data-title]").textContent = p.title || "";
    root.querySelector("[data-body]").textContent = p.body || "";
    if (idxEl) idxEl.textContent = i + 1 + " / " + plates.length;
    root.dataset.id = p.id || "";
  }

  function load(data) {
    plates = data.plates || [];
    if (status) {
      status.textContent = data.interface || "Section 9";
    }
    show(0);
  }

  fetch("./arch.json")
    .then((r) => r.json())
    .then(load)
    .catch(() => {
      if (status) status.textContent = "arch.json missing";
    });

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
      if (live) live.textContent = "NLSAR node not on this machine · static pager";
    });

  if (prev) prev.onclick = () => show(i - 1);
  if (next) next.onclick = () => show(i + 1);
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(i - 1);
    if (e.key === "ArrowRight") show(i + 1);
  });
})();
