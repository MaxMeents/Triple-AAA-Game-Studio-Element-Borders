/* =============================================================
   APP — Builds the showcase grid, manages paging, lazy-attaches
   canvas effects per page for performance, and handles search.

   Scales to thousands of effects:
   - Names for id N come from BORDER_EFFECTS[N-1] OR FX_META[N].name.
   - Effects 1..50 and 326..425 are CSS-only (.bNN classes).
   - All other ids are canvas-driven and registered with window.TRAIL.
   - Only the active page's cards exist in the DOM. Switching pages
     destroys the old cards and builds just the new page's 50.
   - Search scans every effect (not just the current page) and will
     jump to the first page that contains a match.
   ============================================================= */
(function () {
  const grid = document.getElementById("grid");
  const tpl = document.getElementById("card-tpl");
  const search = document.getElementById("search");
  const names = window.BORDER_EFFECTS || [];
  const meta  = window.FX_META || {};

  const PAGE_SIZE = 50;

  // An id is CSS-rendered if it falls in a known CSS range OR its
  // FX_META entry was flagged `_css`.  Everything else is canvas.
  function isCssId(idx) {
    if (idx >= 1 && idx <= 50) return true;
    if (idx >= 326 && idx <= 425) return true;
    const m = meta[idx];
    return !!(m && m.cfg && m.cfg._css);
  }

  // ---- Figure out total effect count -------------------------------
  let total = names.length;
  for (const k in meta) total = Math.max(total, +k);

  function nameFor(idx) {
    return (names[idx - 1] && names[idx - 1])
        || (meta[idx] && meta[idx].name)
        || `Effect #${idx}`;
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
      isCanvas: !isCssId(idx),
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
    b.addEventListener("click", () => showPage(p, /*fromSearch*/false));
    nav.appendChild(b);
    tabs.push(b);
  }
  const spacer = document.createElement("span"); spacer.className = "spacer"; nav.appendChild(spacer);
  const meta2 = document.createElement("span"); meta2.className = "meta";
  meta2.textContent = `${total} effects`;
  nav.appendChild(meta2);

  document.body.insertBefore(nav, document.body.firstChild);

  // ---- Search-results banner --------------------------------------
  const banner = document.createElement("div");
  banner.className = "search-banner";
  banner.style.cssText = "display:none;padding:6px 14px;font-size:13px;color:#cde;background:#1a1a2a;border-bottom:1px solid #2a2a40;";
  document.body.insertBefore(banner, grid);

  // ---- Build / tear down cards per page ---------------------------
  let currentPage = 0;
  let liveCards = [];
  let currentQuery = "";
  let matchedIds = null;   // Set of ids matching currentQuery, null if no query

  function buildCard(spec) {
    const pad = String(spec.idx).padStart(2, "0");
    const node = tpl.content.firstElementChild.cloneNode(true);
    const sq = node.querySelector(".square");
    sq.classList.add("b" + pad);
    if (spec.isCanvas) sq.classList.add("trail");
    node.querySelector(".num").textContent = "#" + pad;
    node.querySelector(".name").textContent = spec.name;
    node.dataset.name = spec.name.toLowerCase();
    node.dataset.page = spec.page;
    return { spec, el: node, sq };
  }

  function teardownPage() {
    if (window.TRAIL) {
      for (const c of liveCards) {
        if (c.spec.isCanvas && window.TRAIL.isAttached(c.sq)) window.TRAIL.detach(c.sq);
      }
    }
    for (const c of liveCards) {
      if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
    }
    liveCards = [];
  }

  function showPage(p, fromSearch) {
    if (p === currentPage) {
      applyFilter();
      return;
    }
    teardownPage();
    currentPage = p;
    tabs.forEach(t => t.classList.toggle("active", +t.dataset.page === p));

    const frag = document.createDocumentFragment();
    for (const spec of specs) {
      if (spec.page !== p) continue;
      const card = buildCard(spec);
      frag.appendChild(card.el);
      liveCards.push(card);
    }
    grid.appendChild(frag);

    applyFilter();

    if (window.TRAIL) {
      for (const c of liveCards) {
        if (!c.spec.isCanvas) continue;
        if (c.el.classList.contains("page-hidden")) continue;
        if (window.TRAIL.has(c.spec.idx)) window.TRAIL.attach(c.sq, c.spec.idx);
      }
    }

    if (!fromSearch) {
      const r = grid.getBoundingClientRect();
      if (r.top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 80), behavior: "smooth" });
    }
  }

  function applyFilter() {
    const q = currentQuery;
    for (const c of liveCards) {
      const hit = !q || (matchedIds && matchedIds.has(c.spec.idx));
      c.el.classList.toggle("page-hidden", !hit);
    }
    if (window.TRAIL) {
      for (const c of liveCards) {
        if (!c.spec.isCanvas) continue;
        const hidden = c.el.classList.contains("page-hidden");
        const attached = window.TRAIL.isAttached(c.sq);
        if (hidden && attached) window.TRAIL.detach(c.sq);
        else if (!hidden && !attached && window.TRAIL.has(c.spec.idx)) window.TRAIL.attach(c.sq, c.spec.idx);
      }
    }
  }

  // Count matches across every page and update the banner + tab badges.
  function refreshSearchMeta() {
    // Clear old badges
    for (const t of tabs) {
      const badge = t.querySelector(".hits");
      if (badge) badge.remove();
    }
    if (!currentQuery) {
      banner.style.display = "none";
      return;
    }
    const perPage = new Array(numPages + 1).fill(0);
    let total = 0;
    for (const s of specs) {
      if (matchedIds.has(s.idx)) { perPage[s.page]++; total++; }
    }
    banner.style.display = "";
    banner.textContent = total === 0
      ? `No matches for "${currentQuery}"`
      : `${total} match${total === 1 ? "" : "es"} for "${currentQuery}" across all pages`;
    for (let p = 1; p <= numPages; p++) {
      if (perPage[p] > 0) {
        const t = tabs[p - 1];
        const badge = document.createElement("span");
        badge.className = "hits";
        badge.style.cssText = "margin-left:4px;padding:1px 5px;border-radius:8px;background:#3a5;color:#fff;font-size:10px;";
        badge.textContent = perPage[p];
        t.appendChild(badge);
      }
    }
  }

  // Find the first page with a match (prefer current page if it has one).
  function firstMatchPage() {
    if (!matchedIds || matchedIds.size === 0) return null;
    // Prefer current page
    for (const s of specs) {
      if (s.page === currentPage && matchedIds.has(s.idx)) return currentPage;
    }
    // Otherwise earliest page with a match
    for (let p = 1; p <= numPages; p++) {
      for (const s of specs) {
        if (s.page === p && matchedIds.has(s.idx)) return p;
      }
    }
    return null;
  }

  // ---- Filter ------------------------------------------------------
  if (search) {
    search.addEventListener("input", (e) => {
      currentQuery = e.target.value.trim().toLowerCase();
      if (currentQuery) {
        matchedIds = new Set();
        for (const s of specs) {
          if (s.name.toLowerCase().includes(currentQuery)) matchedIds.add(s.idx);
        }
      } else {
        matchedIds = null;
      }
      refreshSearchMeta();

      // If the current page has no matches, jump to the first page that does.
      if (currentQuery && matchedIds.size > 0) {
        const hasCurrent = liveCards.some(c => matchedIds.has(c.spec.idx));
        if (!hasCurrent) {
          const jump = firstMatchPage();
          if (jump && jump !== currentPage) {
            showPage(jump, /*fromSearch*/true);
            return;
          }
        }
      }
      applyFilter();
    });
  }

  // ---- Initial page ------------------------------------------------
  showPage(1);
})();
