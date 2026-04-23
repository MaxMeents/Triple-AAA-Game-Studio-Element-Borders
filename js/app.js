/* =============================================================
   APP — Builds the showcase grid, manages paging, lazy-attaches
   canvas effects per page for performance, and handles search.

   Scales to thousands of effects:
   - Names for id N come from BORDER_EFFECTS[N-1] OR FX_META[N].name.
   - Effects 1..50 are CSS-only (classes .b01..b50).
   - Effects 51+ are canvas-driven and registered with window.TRAIL.
   - Canvases attach only when their page is active, detach on leave.
   ============================================================= */
(function () {
  const grid = document.getElementById("grid");
  const tpl = document.getElementById("card-tpl");
  const search = document.getElementById("search");
  const names = window.BORDER_EFFECTS || [];
  const meta  = window.FX_META || {};

  const PAGE_SIZE = 50;
  const CSS_RANGE = [1, 50];   // effects that are pure CSS classes

  // ---- Figure out total effect count -------------------------------
  let total = names.length;
  for (const k in meta) total = Math.max(total, +k);

  function nameFor(idx) {
    return (names[idx - 1] && names[idx - 1]) || (meta[idx] && meta[idx].name) || `Effect #${idx}`;
  }
  function pageOf(idx)   { return Math.ceil(idx / PAGE_SIZE); }
  const numPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---- Build cards -------------------------------------------------
  const cards = []; // { idx, el, sq, page }
  for (let idx = 1; idx <= total; idx++) {
    const pad = String(idx).padStart(2, "0");
    const node = tpl.content.firstElementChild.cloneNode(true);
    const sq = node.querySelector(".square");
    sq.classList.add("b" + pad);
    const isCanvas = idx > CSS_RANGE[1];
    if (isCanvas) sq.classList.add("trail");
    node.querySelector(".num").textContent = "#" + pad;
    const nm = nameFor(idx);
    node.querySelector(".name").textContent = nm;
    node.dataset.name = nm.toLowerCase();
    node.dataset.page = pageOf(idx);
    grid.appendChild(node);
    cards.push({ idx, el: node, sq, page: pageOf(idx), isCanvas });
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

  // ---- Paging: lazy attach/detach canvases ------------------------
  let currentPage = 1;
  function showPage(p) {
    currentPage = p;
    tabs.forEach(t => t.classList.toggle("active", +t.dataset.page === p));
    const shouldBeAttached = new Set();

    for (const c of cards) {
      const onPage = c.page === p;
      c.el.classList.toggle("page-hidden", !onPage);
      if (onPage && c.isCanvas) shouldBeAttached.add(c);
    }

    if (window.TRAIL) {
      // Detach cards on other pages
      for (const c of cards) {
        if (c.isCanvas && c.page !== p && window.TRAIL.isAttached(c.sq)) {
          window.TRAIL.detach(c.sq);
        }
      }
      // Attach cards on current page
      for (const c of shouldBeAttached) {
        if (!window.TRAIL.isAttached(c.sq) && window.TRAIL.has(c.idx)) {
          window.TRAIL.attach(c.sq, c.idx);
        }
      }
    }

    // Scroll to top of grid on page change
    const r = grid.getBoundingClientRect();
    if (r.top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 80), behavior: "smooth" });
  }

  // ---- Filter ------------------------------------------------------
  if (search) {
    search.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      // Search is scoped to the current page so canvas attach/detach stays coherent.
      grid.querySelectorAll(".card").forEach((c) => {
        const pageOk = +c.dataset.page === currentPage;
        const matches = !q || c.dataset.name.includes(q);
        c.classList.toggle("page-hidden", !(pageOk && matches));
      });
    });
  }

  // ---- Initial page ------------------------------------------------
  showPage(1);

  // ---- Canvas particle overlay for Stardust Trail (#44) -----------
  // Enhances the CSS fallback with real particle physics.
  const stardustSquare = grid.querySelector(".b44");
  if (stardustSquare) attachStardust(stardustSquare);

  function attachStardust(host) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit;z-index:2;";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let W, H, particles;

    function resize() {
      const r = host.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      W = r.width; H = r.height;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Particles travel along the perimeter.
    particles = Array.from({ length: 26 }, () => spawn());

    function spawn() {
      return {
        t: Math.random(),               // 0..1 around perimeter
        speed: 0.0008 + Math.random() * 0.0016,
        size: 0.6 + Math.random() * 1.6,
        hue: 190 + Math.random() * 140, // cool range
        life: 0.6 + Math.random() * 0.4,
      };
    }

    function perimeterPoint(t) {
      // Map 0..1 around a rounded rect perimeter approximated as a rect.
      const p = (W + H) * 2;
      let d = t * p;
      if (d < W)                   return { x: d,           y: 0 };
      d -= W;
      if (d < H)                   return { x: W,           y: d };
      d -= H;
      if (d < W)                   return { x: W - d,       y: H };
      d -= W;
      return { x: 0, y: H - d };
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      particles.forEach((p) => {
        p.t = (p.t + p.speed) % 1;
        const { x, y } = perimeterPoint(p.t);
        const r = p.size;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
        grd.addColorStop(0, `hsla(${p.hue},100%,85%,${p.life})`);
        grd.addColorStop(1, "hsla(0,0%,100%,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, r * 6, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    tick();
  }
})();
