/* =============================================================
   MODAL — Click-to-edit parameter panel.
   -------------------------------------------------------------
   Listens for clicks on `.card` elements in the grid.  Opens a
   modal with:

     • Live preview canvas driven by an isolated FX instance
     • Auto-generated sliders / selects / checkboxes for every
       tunable field in the effect's config
     • "Reset" button (back to the authored defaults)
     • "Copy Config" button (exports the live JSON)

   Works for every engine-fueled effect (FX_META[id] present).
   For CSS-only effects (ids 1-50) a friendly notice is shown.
   ============================================================= */
(function () {
  "use strict";

  // -----------------------------------------------------------------
  //  Slider hints — maps a known config key to { min, max, step }.
  //  Anything not in the map falls back to generic heuristics.
  // -----------------------------------------------------------------
  const HINTS = {
    // Emitter volume / rate
    count:       { min: 1,    max: 200,  step: 1 },
    rate:        { min: 1,    max: 300,  step: 1 },
    heads:       { min: 1,    max: 8,    step: 1 },
    headsOffset: { min: 0,    max: 1,    step: 0.01 },
    interval:    { min: 0.1,  max: 4,    step: 0.05 },
    burstCount:  { min: 1,    max: 60,   step: 1 },
    burstSpread: { min: 0,    max: 0.5,  step: 0.01 },

    // Particle birth
    size:        { min: 0.3,  max: 24,   step: 0.1 },
    spin:        { min: 0,    max: 8,    step: 0.1 },
    jitter:      { min: 0,    max: 6,    step: 0.1 },
    velInward:   { min: -2,   max: 3,    step: 0.05 },
    velOutward:  { min: -2,   max: 3,    step: 0.05 },
    velTangent:  { min: -3,   max: 3,    step: 0.05 },
    speedInit:   { min: 0,    max: 5,    step: 0.05 },
    spread:      { min: 0,    max: 3,    step: 0.05 },
    speed:       { min: 0.02, max: 1.2,  step: 0.01 },

    // Frame physics
    gravity:     { min: -0.3, max: 0.3,  step: 0.005 },
    wind:        { min: -0.3, max: 0.3,  step: 0.005 },
    drag:        { min: 0.8,  max: 1,    step: 0.002 },
    sway:        { min: 0,    max: 4,    step: 0.1 },
    phaseSpeed:  { min: 0,    max: 0.5,  step: 0.01 },

    // Appearance
    hue:         { min: 0,    max: 360,  step: 1 },
    sat:         { min: 0,    max: 100,  step: 1 },
    lit:         { min: 0,    max: 100,  step: 1 },
    alpha:       { min: 0,    max: 1,    step: 0.02 },
    lineWidth:   { min: 0.2,  max: 10,   step: 0.1 },
    shadow:      { min: 0,    max: 30,   step: 0.5 },
    glow:        { min: 0,    max: 30,   step: 0.5 },
    glowScale:   { min: 0.5,  max: 5,    step: 0.1 },
    glowMid:     { min: 0.1,  max: 0.9,  step: 0.05 },
    symmetry:    { min: 1,    max: 12,   step: 1 },
    points:      { min: 3,    max: 12,   step: 1 },
    sides:       { min: 3,    max: 16,   step: 1 },
    segments:    { min: 1,    max: 12,   step: 1 },
    innerRatio:  { min: 0.1,  max: 0.9,  step: 0.02 },
    aspect:      { min: 0.3,  max: 4,    step: 0.05 },
    thickness:   { min: 0.1,  max: 1,    step: 0.02 },
    barLen:      { min: 1,    max: 20,   step: 0.5 },
    barWidth:    { min: 0.5,  max: 8,    step: 0.1 },
    arcLen:      { min: 0.3,  max: 6.28, step: 0.1 },
    len:         { min: 2,    max: 40,   step: 0.5 },
    lightningLen:{ min: 1,    max: 5,    step: 0.1 },

    // Perimeter
    inset:           { min: 0,  max: 30, step: 0.5 },
    cornerRadius:    { min: 0,  max: 60, step: 1 },
    perimSides:      { min: 3,  max: 16, step: 1 },
    perimPoints:     { min: 3,  max: 12, step: 1 },
    perimInnerRatio: { min: 0.1,max: 0.9,step: 0.02 },
    perimExponent:   { min: 2,  max: 10, step: 0.1 },
    perimRotate:     { min: -3.15, max: 3.15, step: 0.05 },

    // Border (stroke / glowFrame) renderer
    rotateSpeed: { min: -2,  max: 2,   step: 0.02 },
    scrollSpeed: { min: -2,  max: 2,   step: 0.02 },
    cycleSpeed:  { min: 0,   max: 200, step: 2 },
    paletteSpeed:{ min: 0,   max: 5,   step: 0.05 },
    hueSpeed:    { min: 0,   max: 5,   step: 0.05 },
    pulseSpeed:  { min: 0,   max: 10,  step: 0.1 },
    pulseSize:   { min: 0,   max: 1,   step: 0.02 },
    pulseAlpha:  { min: 0,   max: 1,   step: 0.02 },
    dashSpeed:   { min: 0,   max: 200, step: 1 },
    bands:       { min: 2,   max: 20,  step: 1 },
    width:       { min: 2,   max: 60,  step: 1 },
    intensity:   { min: 0,   max: 1,   step: 0.02 },
    fillAlpha:   { min: 0,   max: 1,   step: 0.02 },
    samples:     { min: 32,  max: 400, step: 8 },
  };

  // -----------------------------------------------------------------
  //  Enumerations used to build <select> inputs
  // -----------------------------------------------------------------
  const KINDS      = ["perimeter","head","multi-head","burst","corners","side","radial","stroke","glowFrame"];
  const PERIMS     = ["rect","roundrect","circle","ellipse","polygon","diamond","star","superellipse"];
  const WEIGHTINGS = ["uniform","sides","corners","top","right","bottom","left","bezier"];
  const BLEND      = ["lighter","source-over","screen","multiply","overlay","soft-light","difference"];
  const SIZE_MODS  = ["const","fade","grow","pulse","twinkle","breathe","popout","quake","shrink","swell"];
  const ALPHA_MODS = ["life","const","pulse","twinkle","flicker","strobe","easeOut","easeIn"];
  const COLOR_MODES= ["","conic","linear","cycle"];
  const POINT_ALONG= ["","tangent","inward","outward"];

  // Keys whose value is best represented as a select (when currently a string).
  const SELECT_FOR = {
    kind:       () => KINDS,
    perimShape: () => PERIMS,
    weighting:  () => WEIGHTINGS,
    blend:      () => BLEND,
    sizeMod:    () => SIZE_MODS,
    alpha:      () => ALPHA_MODS,
    shape:      () => Object.keys(window.FX && window.FX.shapes || {}),
    colorMode:  () => COLOR_MODES,
    pointAlong: () => POINT_ALONG,
  };

  // Keys to skip (not user-tunable or too complex for a slider).
  const SKIP = new Set([
    "id","name","factory","init","update","draw","overlay",
    "onSpawn","onUpdate","onDeath","onBurst",
    "colorGradient","colorRamp","conicStops","linearStops",
    "sizeTrack","alphaTrack","forces","subEmitter",
    "glyph","font","global","trail",
    "preset","mixin","shapes",
  ]);

  // -----------------------------------------------------------------
  //  Path helpers ("emitters[0].head.rate", etc.)
  // -----------------------------------------------------------------
  function parsePath(path) {
    const tokens = [];
    path.split(".").forEach(seg => {
      const parts = seg.split(/[\[\]]/).filter(Boolean);
      for (const p of parts) {
        if (/^\d+$/.test(p)) tokens.push(+p); else tokens.push(p);
      }
    });
    return tokens;
  }
  function getByPath(obj, path) {
    const tokens = parsePath(path);
    let cur = obj;
    for (const t of tokens) { if (cur == null) return undefined; cur = cur[t]; }
    return cur;
  }
  function setByPath(obj, path, val) {
    const tokens = parsePath(path);
    let cur = obj;
    for (let i = 0; i < tokens.length - 1; i++) cur = cur[tokens[i]];
    cur[tokens[tokens.length - 1]] = val;
  }

  function deepClone(x) {
    if (x == null || typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map(deepClone);
    const out = {};
    for (const k in x) out[k] = deepClone(x[k]);
    return out;
  }

  // -----------------------------------------------------------------
  //  Slider inference — given a key+value, return a control descriptor
  //  or null to skip.
  //      { kind: "slider", min, max, step, value, path, label }
  //      { kind: "select", options, value, path, label }
  //      { kind: "check",  value, path, label }
  // -----------------------------------------------------------------
  function inferControl(key, value, path) {
    if (SKIP.has(key)) return null;
    if (value == null) return null;
    if (typeof value === "function") return null;

    // Select / enum controls
    if (typeof value === "string" && SELECT_FOR[key]) {
      const opts = SELECT_FOR[key]();
      return { kind: "select", options: opts, value, path, label: key };
    }

    // Booleans → checkbox
    if (typeof value === "boolean") {
      return { kind: "check", value, path, label: key };
    }

    // Numeric → slider
    if (typeof value === "number") {
      const h = HINTS[key] || inferRange(value);
      return { kind: "slider", min: h.min, max: h.max, step: h.step, value, path, label: key };
    }

    // Two-element numeric arrays → two sliders (most common: life, sizeVar, dash)
    if (Array.isArray(value) && value.length === 2 &&
        typeof value[0] === "number" && typeof value[1] === "number") {
      const h = HINTS[key] || (key === "life"  ? { min: 0.1, max: 5, step: 0.05 }
                              : key === "sizeVar" ? { min: 0.2, max: 3, step: 0.05 }
                              : key === "dash"    ? { min: 1, max: 40, step: 1 }
                              : inferRange(Math.max(Math.abs(value[0]), Math.abs(value[1]))));
      return { kind: "range2",
               min: h.min, max: h.max, step: h.step,
               value: value.slice(),
               path, label: key };
    }

    // Objects like `head: {...}` or `orbit: {...}` → recurse via the
    // section walker (handled by buildSections), not here.
    return null;
  }
  function inferRange(v) {
    const a = Math.abs(v);
    if (a < 0.2)   return { min: -0.5, max: 0.5, step: 0.01 };
    if (a < 1)     return { min: -1,   max: 2,   step: 0.02 };
    if (a < 10)    return { min: 0,    max: 20,  step: 0.1  };
    if (a < 100)   return { min: 0,    max: 200, step: 1    };
    return { min: 0, max: 500, step: 1 };
  }

  // -----------------------------------------------------------------
  //  Build the control list from a config object.  Returns an array
  //  of sections:  { title, controls: [...] }
  // -----------------------------------------------------------------
  function buildSections(cfg, rootPath) {
    const sections = [];

    function pushSection(title, obj, basePath) {
      const controls = [];
      for (const key in obj) {
        if (SKIP.has(key)) continue;
        const v = obj[key];
        const path = basePath ? basePath + "." + key : key;
        const c = inferControl(key, v, path);
        if (c) controls.push(c);
      }
      if (controls.length) sections.push({ title, controls });

      // Recurse into object children (head, orbit, head.sub, etc.)
      for (const key in obj) {
        if (SKIP.has(key)) continue;
        const v = obj[key];
        if (v && typeof v === "object" && !Array.isArray(v) && key !== "global" && key !== "trail") {
          // treat as nested section
          pushSection(title + " › " + key, v, (basePath ? basePath + "." : "") + key);
        }
      }
    }

    if (Array.isArray(cfg.emitters) && cfg.emitters.length) {
      pushSection("Root", cfg, rootPath);
      cfg.emitters.forEach((e, i) => {
        pushSection("Emitter #" + (i + 1), e, (rootPath ? rootPath + "." : "") + "emitters[" + i + "]");
      });
    } else {
      pushSection("Effect", cfg, rootPath);
    }
    return sections;
  }

  // -----------------------------------------------------------------
  //  DOM construction
  // -----------------------------------------------------------------
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class")    n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k in n)       n[k] = attrs[k];
      else                   n.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  }

  // -----------------------------------------------------------------
  //  Preview driver — runs its own rAF loop on the modal's canvas
  //  with a fresh FX instance.  Rebuilds on each edit.
  // -----------------------------------------------------------------
  function makePreview(canvas) {
    const ctx = canvas.getContext("2d");
    let inst = null;
    let rafId = 0;
    let last = performance.now();
    let W = 0, H = 0, dpr = 1;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      if (W <= 0 || H <= 0) return false;
      canvas.width  = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (inst && W > 0 && H > 0) {
        if (!inst.clearsSelf) ctx.clearRect(0, 0, W, H);
        inst.step(dt, W, H);
        inst.draw(ctx, W, H);
      }
      rafId = requestAnimationFrame(tick);
    }

    function setInstance(newInst) {
      inst = newInst;
      // Clear any leftover pixels from the previous effect.
      if (W > 0 && H > 0) ctx.clearRect(0, 0, W, H);
    }

    function start() {
      last = performance.now();
      if (!rafId) rafId = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
      inst = null;
      if (W > 0 && H > 0) ctx.clearRect(0, 0, W, H);
    }
    function getSize() { return { W, H }; }
    return { setInstance, resize, start, stop, getSize };
  }

  // -----------------------------------------------------------------
  //  Main modal controller
  // -----------------------------------------------------------------
  function buildModal() {
    const panel = el("div", { class: "fx-modal-panel" });
    const header = el("header");
    const title = el("h2");
    title.innerHTML = "Effect <span class='id'></span>";
    const spacer = el("span", { class: "spacer" });
    const btnClose = el("button", { class: "close", type: "button", html: "×" });
    header.append(title, spacer, btnClose);

    const body = el("div", { class: "fx-modal-body" });
    const previewArea = el("div", { class: "fx-modal-preview" });
    const canvas = el("canvas");
    const cssWrap = el("div", { class: "css-wrap hidden" });
    const hint = el("div", { class: "hint" }); hint.textContent = "live preview";
    previewArea.append(canvas, cssWrap, hint);
    const controls = el("div", { class: "fx-modal-controls" });
    body.append(previewArea, controls);

    const footer = el("footer");
    const btnReset = el("button", { type: "button" }); btnReset.textContent = "Reset";
    const btnCopy  = el("button", { class: "primary", type: "button" }); btnCopy.textContent = "Copy Config";
    const footSpacer = el("span", { class: "spacer" });
    footer.append(btnReset, footSpacer, btnCopy);

    panel.append(header, body, footer);
    const backdrop = el("div", { class: "fx-modal-backdrop" });
    const root = el("div", { class: "fx-modal", id: "fx-modal" }, backdrop, panel);
    document.body.append(root);

    return { root, title, controls, canvas, cssWrap, previewArea, hint, btnClose, btnReset, btnCopy, backdrop };
  }

  function open(ui, preview, id, name) {
    const meta = window.FX_META && window.FX_META[id];
    const pad = String(id).padStart(2, "0");
    ui.title.innerHTML = escapeHtml(name) + " <span class='id'>#" + pad + "</span>";
    ui.controls.innerHTML = "";

    // 1. Show the modal first so layout settles, THEN size the canvas
    //    and kick off rendering.  Opening in the opposite order was the
    //    reason the canvas stayed blank — getBoundingClientRect on a
    //    hidden element returns 0×0.
    ui.root.classList.add("open");
    document.body.style.overflow = "hidden";

    // 2. Reset preview mode — hide both, show the appropriate one below.
    preview.stop();
    ui.canvas.classList.add("hidden");
    ui.cssWrap.classList.add("hidden");
    ui.cssWrap.innerHTML = "";
    ui.cssWrap.style.filter = "";
    ui.cssWrap.style.transform = "";

    // 3. Defer until after layout so dimensions are known.
    requestAnimationFrame(() => {
      if (meta && meta.cfg) {
        ui.hint.textContent = "live preview · engine";
        openCanvasMode(ui, preview, meta);
      } else {
        ui.hint.textContent = "live preview · css";
        openCssMode(ui, id);
      }
    });
  }

  // ---------- CANVAS mode (FX-engine-fueled effects) ----------
  function openCanvasMode(ui, preview, meta) {
    ui.canvas.classList.remove("hidden");
    preview.resize();
    preview.start();

    const baseCfg = deepClone(meta.cfg);
    let liveCfg = deepClone(baseCfg);

    function rebuild() {
      try {
        const factory = window.FX(liveCfg);
        preview.setInstance(factory());
      } catch (err) {
        console.error("[modal] rebuild failed", err);
      }
    }

    function mountControls() {
      ui.controls.innerHTML = "";
      const sections = buildSections(liveCfg, "");
      for (const sec of sections) {
        const sEl = el("section", { class: "fx-section" });
        sEl.append(el("h3", null, document.createTextNode(sec.title)));
        for (const c of sec.controls) sEl.append(renderControl(c, liveCfg, rebuild));
        ui.controls.append(sEl);
      }
    }

    ui.btnCopy.disabled = false;
    ui.btnReset.disabled = false;

    mountControls();
    rebuild();

    ui.btnReset.onclick = () => {
      liveCfg = deepClone(baseCfg);
      mountControls();
      rebuild();
    };
    ui.btnCopy.onclick = () => {
      const text = JSON.stringify(liveCfg, null, 2);
      navigator.clipboard.writeText(text).catch(() => {});
      ui.btnCopy.textContent = "Copied!";
      setTimeout(() => (ui.btnCopy.textContent = "Copy Config"), 1200);
    };
  }

  // ---------- CSS mode (CSS-class-driven effects, ids 1-50) ----------
  function openCssMode(ui, id) {
    const pad = String(id).padStart(2, "0");
    // Build a mini-card inside the CSS wrapper that shares the exact
    // same structure as the grid card, so `.bNN` + `.bNN .inner` styles
    // apply unchanged.
    ui.cssWrap.innerHTML = "";
    const square = el("div", { class: "square b" + pad });
    const inner  = el("div", { class: "inner" });
    square.append(inner);
    ui.cssWrap.append(square);
    ui.cssWrap.classList.remove("hidden");

    // Universal adjusters — these work for ANY CSS border because they
    // operate on the wrapper via `filter` / `transform` post-effects.
    const defaults = {
      hueRotate: 0, saturate: 1, brightness: 1, contrast: 1,
      blur: 0, invert: 0, opacity: 1, scale: 1, rotate: 0,
      speed: 1, // CSS animation speed multiplier
    };
    const live = Object.assign({}, defaults);

    function apply() {
      const f =
        "hue-rotate(" + live.hueRotate + "deg) " +
        "saturate("   + live.saturate + ") " +
        "brightness(" + live.brightness + ") " +
        "contrast("   + live.contrast + ") " +
        "blur("       + live.blur + "px) " +
        "invert("     + live.invert + ") " +
        "opacity("    + live.opacity + ")";
      ui.cssWrap.style.filter = f;
      ui.cssWrap.style.transform =
        "scale(" + live.scale + ") rotate(" + live.rotate + "deg)";
      // Speed: multiply every animation on the preview subtree.
      const dur = (1 / Math.max(0.05, live.speed)).toFixed(2) + "s";
      square.style.setProperty("animation-duration", dur);
      inner.style.setProperty("animation-duration", dur);
      // Some effects use pseudo-elements — apply via inline attribute.
      square.setAttribute("style",
        (square.getAttribute("style") || "") +
        ";--fx-speed:" + live.speed + ";");
    }
    apply();

    // Build slider panel.
    ui.controls.innerHTML = "";
    const intro = el("div", { class: "fx-notice" });
    intro.innerHTML =
      "CSS-class effect <code>.b" + pad + "</code>. Use the sliders below " +
      "to recolour, blur, scale or speed-adjust any CSS border universally.";
    ui.controls.append(intro);

    const sec = el("section", { class: "fx-section" });
    sec.append(el("h3", null, "Universal CSS adjustments"));

    const defs = [
      { label: "Hue Rotate",  key: "hueRotate",  min: -180, max: 180, step: 1,    unit: "°" },
      { label: "Saturation",  key: "saturate",   min: 0,    max: 3,   step: 0.05, unit: "×" },
      { label: "Brightness",  key: "brightness", min: 0,    max: 3,   step: 0.05, unit: "×" },
      { label: "Contrast",    key: "contrast",   min: 0,    max: 3,   step: 0.05, unit: "×" },
      { label: "Blur",        key: "blur",       min: 0,    max: 12,  step: 0.2,  unit: "px" },
      { label: "Invert",      key: "invert",     min: 0,    max: 1,   step: 0.05, unit: ""  },
      { label: "Opacity",     key: "opacity",    min: 0,    max: 1,   step: 0.02, unit: ""  },
      { label: "Scale",       key: "scale",      min: 0.3,  max: 1.6, step: 0.01, unit: "×" },
      { label: "Rotate",      key: "rotate",     min: -180, max: 180, step: 1,    unit: "°" },
      { label: "Speed",       key: "speed",      min: 0.1,  max: 4,   step: 0.05, unit: "×" },
    ];
    for (const d of defs) {
      const row = el("div", { class: "fx-field" });
      const lab = el("label", null, d.label);
      const inp = el("input", { type: "range", min: d.min, max: d.max, step: d.step, value: live[d.key] });
      const val = el("span", { class: "val" });
      val.textContent = formatNum(live[d.key], d.step) + d.unit;
      inp.oninput = () => {
        live[d.key] = parseFloat(inp.value);
        val.textContent = formatNum(live[d.key], d.step) + d.unit;
        apply();
      };
      row.append(lab, inp, val);
      sec.append(row);
    }
    ui.controls.append(sec);

    ui.btnCopy.disabled = false;
    ui.btnReset.disabled = false;
    ui.btnReset.onclick = () => {
      Object.assign(live, defaults);
      // Re-render controls
      openCssMode(ui, id);
    };
    ui.btnCopy.onclick = () => {
      const out = "/* .b" + pad + " adjustments */\nfilter: " + ui.cssWrap.style.filter + ";\ntransform: " + ui.cssWrap.style.transform + ";";
      navigator.clipboard.writeText(out).catch(() => {});
      ui.btnCopy.textContent = "Copied!";
      setTimeout(() => (ui.btnCopy.textContent = "Copy Config"), 1200);
    };
  }

  function close(ui, preview) {
    ui.root.classList.remove("open");
    document.body.style.overflow = "";
    preview.stop();
  }

  function renderControl(c, cfg, onChange) {
    const row = el("div", { class: "fx-field" });
    const lab = el("label", null, c.label);
    lab.title = c.path;
    row.append(lab);

    if (c.kind === "slider") {
      const inp = el("input", { type: "range", min: c.min, max: c.max, step: c.step, value: c.value });
      const val = el("span", { class: "val" });
      val.textContent = formatNum(c.value, c.step);
      inp.oninput = () => {
        const v = parseFloat(inp.value);
        setByPath(cfg, c.path, v);
        val.textContent = formatNum(v, c.step);
        onChange();
      };
      row.append(inp, val);
    }
    else if (c.kind === "range2") {
      const wrap = el("div", { class: "range2" });
      wrap.style.display = "grid";
      wrap.style.gridTemplateColumns = "1fr 1fr";
      wrap.style.gap = "6px";
      const valEl = el("span", { class: "val" });
      valEl.textContent = c.value[0] + "–" + c.value[1];
      for (let i = 0; i < 2; i++) {
        const inp = el("input", { type: "range", min: c.min, max: c.max, step: c.step, value: c.value[i] });
        inp.oninput = () => {
          const v = parseFloat(inp.value);
          setByPath(cfg, c.path + "[" + i + "]", v);
          const arr = getByPath(cfg, c.path);
          valEl.textContent = formatNum(arr[0], c.step) + "–" + formatNum(arr[1], c.step);
          onChange();
        };
        wrap.append(inp);
      }
      row.append(wrap, valEl);
    }
    else if (c.kind === "select") {
      const sel = el("select");
      for (const opt of c.options) {
        const o = el("option", { value: opt }, opt || "(none)");
        if (opt === c.value) o.selected = true;
        sel.append(o);
      }
      const val = el("span", { class: "val" });
      sel.onchange = () => {
        setByPath(cfg, c.path, sel.value);
        onChange();
      };
      row.append(sel, val);
    }
    else if (c.kind === "check") {
      const cb = el("input", { type: "checkbox", checked: c.value });
      const val = el("span", { class: "val" });
      val.textContent = c.value ? "on" : "off";
      cb.onchange = () => {
        setByPath(cfg, c.path, cb.checked);
        val.textContent = cb.checked ? "on" : "off";
        onChange();
      };
      row.append(cb, val);
    }
    return row;
  }

  function formatNum(v, step) {
    if (step >= 1) return String(Math.round(v));
    const decimals = Math.max(0, -Math.floor(Math.log10(step)));
    return v.toFixed(Math.min(3, decimals));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" })[c]);
  }

  // -----------------------------------------------------------------
  //  Bootstrap
  // -----------------------------------------------------------------
  function init() {
    const ui = buildModal();
    const preview = makePreview(ui.canvas);

    function closeModal() { close(ui, preview); }
    ui.btnClose.onclick = closeModal;
    ui.backdrop.onclick = closeModal;
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && ui.root.classList.contains("open")) closeModal();
    });

    // Event delegation — any click on a card opens the modal.
    document.getElementById("grid").addEventListener("click", e => {
      const card = e.target.closest(".card");
      if (!card) return;
      const numEl = card.querySelector(".num");
      if (!numEl) return;
      const id = parseInt(numEl.textContent.replace(/[^\d]/g, ""), 10);
      const name = (card.querySelector(".name") || {}).textContent || ("Effect #" + id);
      open(ui, preview, id, name);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
