/* =============================================================
   APP — Builds the showcase grid, manages paging, lazy-attaches
   canvas effects per page for performance, and handles search.

   Scales to thousands of effects:
   - Names for id N come from BORDER_EFFECTS[N-1] OR FX_META[N].name.
   - Effects 1..50 are CSS-only (classes .b01..b50).
   - Effects 51+ are canvas-driven and registered with window.TRAIL.
   - Only the active page's cards exist in the DOM. Switching pages
     destroys the old cards and builds just the new page's 50. This
     keeps DOM cost, CSS animation cost, and canvas count flat.
   ============================================================= */
(function () {
  const grid = document.getElementById("grid");
  const tpl = document.getElementById("card-tpl");
  const search = document.getElementById("search");
  const names = window.BORDER_EFFECTS || [];
  const meta  = window.FX_META || {};

  const PAGE_SIZE = 50;
  // Effects 1-50 are rendered by the original CSS classes (see
  // css/borders-*.css).  Effects 51+ are engine-fueled canvas.
  const CSS_RANGE = [1, 50];

  // ---- Figure out total effect count -------------------------------
  let total = names.length;
  for (const k in meta) total = Math.max(total, +k);

  function nameFor(idx) {
    return (names[idx - 1] && names[idx - 1]) || (meta[idx] && meta[idx].name) || `Effect #${idx}`;
  }
  function pageOf(idx)   { return Math.ceil(idx / PAGE_SIZE); }
  const numPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---- Lightweight specs (no DOM) ---------------------------------
  const specs = []; // { idx, name, page, isCanvas }
  for (let idx = 1; idx <= total; idx++) {
    specs.push({
      idx,
      name: nameFor(idx),
      page: pageOf(idx),
      isCanvas: idx > CSS_RANGE[1],   // ids 1-50 are CSS-rendered
    });
  }

  // ---- Nav bar -----------------------------------------------------
  const nav = document.createElement("nav");
  nav.className = "pagenav";
  const brand = document.createElement("span");
  brand.className = "brand";
  brand.textContent = "AAA Borders";
  nav.appendChild(brand);

  const tabs = [];
  for (let p = 1; p <= numPages; p++) {
    const b = document.createElement("button");
    b.className = "tab";
    b.type = "button";
    b.dataset.page = p;
    const lo = (p - 1) * PAGE_SIZE + 1;
    const hi = Math.min(p * PAGE_SIZE, total);
    b.innerHTML = `Page ${p} <span class="count">${lo}-${hi}</span>`;
    b.addEventListener("click", () => showPage(p));
    nav.appendChild(b);
    tabs.push(b);
  }
  const spacer = document.createElement("span"); spacer.className = "spacer"; nav.appendChild(spacer);
  const meta2 = document.createElement("span"); meta2.className = "meta";
  meta2.textContent = `${total} effects`;
  nav.appendChild(meta2);

  document.body.insertBefore(nav, document.body.firstChild);

  // ---- Build / tear down cards per page ---------------------------
  let currentPage = 0;           // 0 = uninitialized
  let liveCards = [];            // currently mounted { spec, el, sq }
  let currentQuery = "";

  function buildCard(spec) {
    const pad = String(spec.idx).padStart(2, "0");
    const node = tpl.content.firstElementChild.cloneNode(true);
    const sq = node.querySelector(".square");
    sq.classList.add("b" + pad);                  // CSS hook for ids 1-50
    if (spec.isCanvas) sq.classList.add("trail"); // canvas-host for 51+
    node.querySelector(".num").textContent = "#" + pad;
    node.querySelector(".name").textContent = spec.name;
    node.dataset.name = spec.name.toLowerCase();
    node.dataset.page = spec.page;
    return { spec, el: node, sq };
  }

  function teardownPage() {
    // Detach canvases first so the TRAIL engine releases resources
    if (window.TRAIL) {
      for (const c of liveCards) {
        if (c.spec.isCanvas && window.TRAIL.isAttached(c.sq)) window.TRAIL.detach(c.sq);
      }
    }
    // Then remove DOM
    for (const c of liveCards) {
      if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
    }
    liveCards = [];
  }

  function showPage(p) {
    if (p === currentPage) return;
    teardownPage();
    currentPage = p;
    tabs.forEach(t => t.classList.toggle("active", +t.dataset.page === p));

    // Build only the 50 cards for this page, in one DocumentFragment for speed.
    const frag = document.createDocumentFragment();
    for (const spec of specs) {
      if (spec.page !== p) continue;
      const card = buildCard(spec);
      frag.appendChild(card.el);
      liveCards.push(card);
    }
    grid.appendChild(frag);

    // Apply any active search query immediately to the fresh cards
    applyFilter(currentQuery);

    // Attach canvas effects only for visible, on-page, canvas cards
    if (window.TRAIL) {
      for (const c of liveCards) {
        if (!c.spec.isCanvas) continue;
        if (c.el.classList.contains("page-hidden")) continue;
        if (window.TRAIL.has(c.spec.idx)) window.TRAIL.attach(c.sq, c.spec.idx);
      }
    }

    // Scroll to top of grid on page change
    const r = grid.getBoundingClientRect();
    if (r.top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 80), behavior: "smooth" });
  }

  function applyFilter(q) {
    for (const c of liveCards) {
      const matches = !q || c.spec.name.toLowerCase().includes(q);
      c.el.classList.toggle("page-hidden", !matches);
    }
  }

  // ---- Filter ------------------------------------------------------
  if (search) {
    search.addEventListener("input", (e) => {
      currentQuery = e.target.value.trim().toLowerCase();
      applyFilter(currentQuery);
      // Detach canvases that just got hidden and attach ones that re-appeared
      if (window.TRAIL) {
        for (const c of liveCards) {
          if (!c.spec.isCanvas) continue;
          const hidden = c.el.classList.contains("page-hidden");
          const attached = window.TRAIL.isAttached(c.sq);
          if (hidden && attached) window.TRAIL.detach(c.sq);
          else if (!hidden && !attached && window.TRAIL.has(c.spec.idx)) window.TRAIL.attach(c.sq, c.spec.idx);
        }
      }
    });
  }

  // ---- Initial page ------------------------------------------------
  showPage(1);
})();
