/* ================================================================
   FX-ENGINE v2  —  devtools.js
   ----------------------------------------------------------------
   Lightweight developer tooling.  Fully opt-in:

     FX.dev.showStats()            mount floating stats HUD
     FX.dev.hideStats()
     FX.dev.showCatalogue()        grid of every shape/preset
     FX.dev.hideCatalogue()
     FX.dev.benchmark(cfg, ms)     spins up one instance, measures
     FX.dev.describe(cfg)          string summary of a config

   Nothing in this module runs at load-time.  If devtools.js is
   omitted, the engine still functions.
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  if (!window.FX) { console.warn("[fx/devtools] FX not initialised"); return; }

  // -----------------------------------------------------------------
  //  Stats HUD
  // -----------------------------------------------------------------
  let statsEl = null, statsTimer = 0;
  function showStats() {
    if (statsEl) return;
    statsEl = document.createElement("div");
    statsEl.id = "fx-stats";
    statsEl.style.cssText = [
      "position:fixed", "right:10px", "bottom:10px", "z-index:99999",
      "background:rgba(5,10,18,.86)",
      "color:#8eefff",
      "font:600 11px/1.45 ui-monospace,Menlo,Consolas,monospace",
      "padding:8px 10px",
      "border-radius:8px",
      "border:1px solid rgba(255,255,255,.06)",
      "pointer-events:none",
      "box-shadow:0 4px 18px -4px rgba(0,0,0,.5)",
      "white-space:pre",
      "min-width:150px",
    ].join(";");
    document.body.appendChild(statsEl);
    statsTimer = setInterval(() => {
      const q = FX.quality;
      const snap = FX.inspect();
      statsEl.textContent =
        "FX-ENGINE v2\n" +
        "fps    " + snap.fps.toFixed(1) + "\n" +
        "qual   " + q.value.toFixed(2) + "\n" +
        "shapes " + snap.shapes + "\n" +
        "forces " + snap.forces + "\n" +
        "preset " + snap.presets + "\n" +
        "palette " + snap.palettes;
    }, 300);
  }
  function hideStats() {
    if (!statsEl) return;
    clearInterval(statsTimer);
    statsEl.remove(); statsEl = null; statsTimer = 0;
  }

  // -----------------------------------------------------------------
  //  Catalogue — show each registered shape in a small preview box.
  //  Useful to confirm new shapes render correctly.
  // -----------------------------------------------------------------
  let catEl = null;
  function showCatalogue() {
    if (catEl) return;
    catEl = document.createElement("div");
    catEl.id = "fx-catalogue";
    catEl.style.cssText = [
      "position:fixed", "inset:40px", "z-index:99998",
      "overflow:auto",
      "background:rgba(5,10,18,.95)",
      "color:#e6ecff",
      "font:600 12px/1.4 ui-sans-serif,Segoe UI,system-ui,sans-serif",
      "padding:20px",
      "display:grid",
      "grid-template-columns:repeat(auto-fill,minmax(140px,1fr))",
      "gap:12px",
      "border:1px solid rgba(255,255,255,.08)",
      "border-radius:12px",
      "box-shadow:0 20px 80px -20px rgba(0,0,0,.8)",
    ].join(";");
    const close = document.createElement("button");
    close.textContent = "✕";
    close.style.cssText = "position:absolute;top:10px;right:14px;background:transparent;color:#fff;border:none;font:800 18px/1 sans-serif;cursor:pointer;";
    close.onclick = hideCatalogue;
    catEl.appendChild(close);

    const shapes = FX.shapes;
    for (const name in shapes) {
      const tile = document.createElement("figure");
      tile.style.cssText = "margin:0;padding:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:8px;text-align:center;";
      const c = document.createElement("canvas");
      c.width = 120; c.height = 60;
      c.style.cssText = "display:block;width:100%;height:60px;border-radius:4px;background:#0a0f18;";
      const ctx = c.getContext("2d");
      drawSamplePreview(ctx, name, 120, 60);
      const label = document.createElement("figcaption");
      label.textContent = name;
      label.style.cssText = "margin-top:6px;font-size:11px;color:#8eefff;";
      tile.appendChild(c);
      tile.appendChild(label);
      catEl.appendChild(tile);
    }
    document.body.appendChild(catEl);
  }
  function hideCatalogue() {
    if (!catEl) return;
    catEl.remove(); catEl = null;
  }
  function drawSamplePreview(ctx, shapeName, W, H) {
    const shapes = FX.shapes;
    const fn = shapes[shapeName];
    if (!fn) return;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const p = {
        x: (W / 7) * (i + 1),
        y: H / 2,
        vx: 0, vy: 0, a: 0, side: 0,
        tx: 1, ty: 0, nx: 0, ny: 1,
        rot: i * 0.4,
        phase: i,
        life: 0.9 - i * 0.05,
        maxLife: 1,
        size: 5 + i * 0.5,
        hue: i * 50,
        _a: 1 - i * 0.05,
        _size: 5 + i * 0.4,
        seed: i, born: 0,
      };
      fn(ctx, p, { lineWidth: 1, sides: 6, points: 5 });
    }
  }

  // -----------------------------------------------------------------
  //  Tiny benchmark — spin up an instance in a detached canvas and
  //  measure how many updates/draws fit in the given window.
  // -----------------------------------------------------------------
  function benchmark(cfg, ms) {
    ms = ms || 1000;
    const factory = FX(cfg);
    const inst = factory();
    const off = document.createElement("canvas");
    off.width = 220; off.height = 220;
    const ctx = off.getContext("2d");
    const W = 220, H = 220;
    const start = performance.now();
    let frames = 0;
    while (performance.now() - start < ms) {
      inst.step(1 / 60, W, H);
      ctx.clearRect(0, 0, W, H);
      inst.draw(ctx, W, H);
      frames++;
    }
    const dur = performance.now() - start;
    inst.dispose && inst.dispose();
    return {
      frames,
      ms: dur,
      fps: frames / (dur / 1000),
      particles: inst.inspect().particles,
    };
  }

  // -----------------------------------------------------------------
  //  Describe — human-readable summary of a config
  // -----------------------------------------------------------------
  function describe(cfg) {
    const out = [];
    if (cfg.preset) out.push("preset: " + (Array.isArray(cfg.preset) ? cfg.preset.join(", ") : cfg.preset));
    if (cfg.emitters) out.push("emitters: " + cfg.emitters.length);
    else {
      out.push("kind:   " + (cfg.kind || "perimeter"));
      out.push("shape:  " + (cfg.shape || "glow"));
      out.push("hue:    " + (typeof cfg.hue === "object" ? JSON.stringify(cfg.hue) : (cfg.hue ?? "none")));
      if (cfg.count != null) out.push("count:  " + cfg.count);
      if (cfg.rate  != null) out.push("rate:   " + cfg.rate);
      if (cfg.life)          out.push("life:   [" + cfg.life.join(", ") + "]");
      if (cfg.forces)        out.push("forces: " + cfg.forces.map(f => f.type).join(", "));
    }
    return out.join("\n");
  }

  // -----------------------------------------------------------------
  //  Publish
  // -----------------------------------------------------------------
  FX.dev = {
    showStats, hideStats,
    showCatalogue, hideCatalogue,
    benchmark, describe,
  };
})();
