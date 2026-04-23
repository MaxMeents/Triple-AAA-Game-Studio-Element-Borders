/* ================================================================
   FX-ENGINE v2  —  border.js
   ----------------------------------------------------------------
   Non-particle renderers for CSS-style border effects.

   Particle systems are great for trails / sparkles / ambient, but
   many classic border looks are really *the whole perimeter drawn
   as a gradient* — neon glows, rotating conic sweeps, dashed
   chasers, marching ants, double strokes, pulsing rings.  Those
   aren't particles.  This module adds two new emitter `kind`s:

       kind: "stroke"       perimeter traced + stroked with an
                            animated style (solid / conic / linear /
                            hue-cycle / ramp + optional dash march
                            + optional pulse of width/alpha +
                            optional multi-layer stacking)

       kind: "glowFrame"    soft radial-glow inside the border
                            (equivalent to a pulsing `box-shadow:
                            inset`), optionally animated.

   Both renderers are stateful but allocation-free after warmup,
   and both expose the same `{ update, draw, dispose, parts }`
   interface as particle emitters, so `engine.js` composition
   and `app.js` lazy-loading work unchanged.

   Usage example:

     FX({
       kind: "stroke",
       perimShape: "roundrect", cornerRadius: 18,
       lineWidth: 3,
       colorMode: "conic",        // rotating conic gradient
       rotateSpeed: 0.35,
       glow: 14,
       pulseAlpha: true,
       pulseSpeed: 2,
       layers: [                  // second stroke, inset slightly
         { lineWidth: 1, colorMode: "cycle", cycleSpeed: 60, inset: 6 }
       ]
     })
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const core = NS.core, geom = NS.geometry, palettes = NS.palettes;
  if (!core || !geom) { console.warn("[fx/border] missing dependencies"); return; }
  const { PI, TAU, HALF_PI, lerp, clamp } = core;
  const { perim } = geom;

  // -----------------------------------------------------------------
  //  1. Path tracer — draws a closed perimeter path into `ctx`
  //     without filling/stroking.  Callers apply their own style.
  // -----------------------------------------------------------------
  function tracePath(ctx, W, H, opts) {
    const shape = opts.shape || "rect";
    const inset = opts.inset ?? 2;

    if (shape === "rect") {
      ctx.beginPath();
      ctx.rect(inset, inset, W - 2 * inset, H - 2 * inset);
      return;
    }
    if (shape === "roundrect") {
      const r = Math.max(0,
        Math.min(opts.cornerRadius ?? Math.min(W, H) * 0.14,
                 Math.min(W, H) / 2 - inset));
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(inset, inset, W - 2 * inset, H - 2 * inset, r);
      } else {
        const x = inset, y = inset, w = W - 2 * inset, h = H - 2 * inset;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);            ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
      return;
    }
    if (shape === "circle" || shape === "ellipse") {
      const rx = (shape === "ellipse" ? W / 2 : Math.min(W, H) / 2) - inset;
      const ry = (shape === "ellipse" ? H / 2 : Math.min(W, H) / 2) - inset;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, rx, ry, 0, 0, TAU);
      return;
    }
    // Generic: sample perimeter as polyline
    const N = opts.samples || 160;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const p = perim(i / N, W, H, opts);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  // -----------------------------------------------------------------
  //  2. Default gradient stops used when the config doesn't supply
  //     its own.  Keep as CSS strings for maximum flexibility.
  // -----------------------------------------------------------------
  const DEFAULT_CONIC = [
    [0.00, "#ff2d6e"], [0.16, "#ffcf3e"], [0.33, "#4cff9a"],
    [0.50, "#35e9ff"], [0.66, "#5a8bff"], [0.83, "#bd5bff"],
    [1.00, "#ff2d6e"],
  ];
  const DEFAULT_LINEAR = [
    [0.00, "rgba(0,255,240,0)"],
    [0.50, "rgba(0,255,240,1)"],
    [1.00, "rgba(0,255,240,0)"],
  ];

  // -----------------------------------------------------------------
  //  3. Style resolvers
  // -----------------------------------------------------------------
  function resolveStroke(ctx, L, W, H, time) {
    if (L.color && !L.colorMode) return L.color;

    // Rotating conic gradient — supported on modern browsers.
    if (L.colorMode === "conic" && ctx.createConicGradient) {
      const angle = time * (L.rotateSpeed ?? 0.5);
      const g = ctx.createConicGradient(angle, W / 2, H / 2);
      const stops = L.conicStops || DEFAULT_CONIC;
      for (const [p, c] of stops) g.addColorStop(p, c);
      return g;
    }

    // Scrolling linear gradient along one axis.
    if (L.colorMode === "linear") {
      const horizontal = L.linearAxis !== "y";
      const g = horizontal
        ? ctx.createLinearGradient(0, 0, W, 0)
        : ctx.createLinearGradient(0, 0, 0, H);
      const phase = (time * (L.scrollSpeed ?? 0.25)) % 1;
      const stops = L.linearStops || DEFAULT_LINEAR;
      for (const [p, c] of stops) {
        const t = ((p + phase) % 1 + 1) % 1;
        g.addColorStop(t, c);
      }
      return g;
    }

    // Time-cycling single hue.
    if (L.colorMode === "cycle") {
      const hue = (time * (L.cycleSpeed ?? 60)) % 360;
      return "hsl(" + (hue | 0) + "," + (L.sat ?? 100) + "%," + (L.lit ?? 60) + "%)";
    }

    // Hue spec via palette / number / range.
    let hue = 200;
    if (typeof L.hue === "number") hue = L.hue;
    else if (Array.isArray(L.hue) && L.hue.length === 2) {
      // Ping-pong between the two hues.
      const t = (Math.sin(time * (L.hueSpeed ?? 1)) + 1) / 2;
      hue = lerp(L.hue[0], L.hue[1], t);
    } else if (typeof L.hue === "string" && palettes && palettes.HUES[L.hue]) {
      const P = palettes.HUES[L.hue];
      hue = P[Math.floor(time * (L.paletteSpeed ?? 0.5)) % P.length];
    }
    return "hsl(" + (hue | 0) + "," + (L.sat ?? 100) + "%," + (L.lit ?? 60) + "%)";
  }

  function resolveLineWidth(L, time) {
    const base = L.lineWidth ?? 2;
    if (L.pulseSize) {
      const amp = typeof L.pulseSize === "number" ? L.pulseSize : 0.3;
      return base * (1 + Math.sin(time * (L.pulseSpeed ?? 3)) * amp);
    }
    return base;
  }

  function resolveAlpha(L, time) {
    if (L.pulseAlpha) {
      const amp = typeof L.pulseAlpha === "number" ? L.pulseAlpha : 0.5;
      return clamp(0.5 + amp * Math.sin(time * (L.pulseSpeed ?? 3)), 0, 1);
    }
    return L.alpha ?? 1;
  }

  function resolveGlowColor(L, time) {
    if (L.glowColor) return L.glowColor;
    if (L.color && !L.colorMode) return L.color;
    if (typeof L.hue === "number") return "hsl(" + (L.hue | 0) + ",100%,60%)";
    if (L.colorMode === "cycle") {
      return "hsl(" + ((time * (L.cycleSpeed ?? 60)) % 360 | 0) + ",100%,60%)";
    }
    return "#ffffff";
  }

  // -----------------------------------------------------------------
  //  4. Stroke renderer
  // -----------------------------------------------------------------
  function makeStrokeRenderer(cfg, global) {
    const perimBase = {
      shape: cfg.perimShape || global.perimShape || "rect",
      inset: cfg.inset ?? 2,
      cornerRadius: cfg.cornerRadius ?? global.cornerRadius,
      sides:   cfg.perimSides   ?? global.perimSides,
      points:  cfg.perimPoints  ?? global.perimPoints,
      innerRatio: cfg.perimInnerRatio ?? global.perimInnerRatio,
      exponent:   cfg.perimExponent   ?? global.perimExponent,
      rotate:     cfg.perimRotate     ?? global.perimRotate,
      samples: cfg.samples,
    };
    // Layers: the base config itself + any explicit `layers` array.
    const layers = [cfg].concat(Array.isArray(cfg.layers) ? cfg.layers : []);
    const state = { time: 0, dashOffset: 0 };

    function update(dt, W, H, time) {
      state.time = time;
      if (cfg.dashSpeed) state.dashOffset += cfg.dashSpeed * dt;
      for (let i = 1; i < layers.length; i++) {
        const L = layers[i];
        if (L.dashSpeed) L._dashOffset = (L._dashOffset || 0) + L.dashSpeed * dt;
      }
    }

    function drawLayer(ctx, W, H, L, extraOffset) {
      const opts = Object.assign({}, perimBase, L.perim || {});
      if (L.inset != null) opts.inset = L.inset;
      if (L.shape) opts.shape = L.shape;

      ctx.save();
      ctx.globalCompositeOperation = L.blend || "source-over";
      ctx.lineWidth = resolveLineWidth(L, state.time);
      ctx.lineCap   = L.lineCap  || "butt";
      ctx.lineJoin  = L.lineJoin || "round";
      ctx.globalAlpha = resolveAlpha(L, state.time);

      if (L.dash) {
        ctx.setLineDash(L.dash);
        const off = (L === cfg ? state.dashOffset : (L._dashOffset || 0)) + (extraOffset || 0);
        ctx.lineDashOffset = -off;
      }
      if (L.glow) {
        ctx.shadowColor = resolveGlowColor(L, state.time);
        ctx.shadowBlur  = L.glow;
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      }

      tracePath(ctx, W, H, opts);
      ctx.strokeStyle = resolveStroke(ctx, L, W, H, state.time);
      ctx.stroke();

      if (L.fill) {
        ctx.globalAlpha = (L.fillAlpha ?? 0.15) * ctx.globalAlpha;
        ctx.fillStyle = typeof L.fill === "string" ? L.fill : resolveStroke(ctx, L, W, H, state.time);
        ctx.fill();
      }
      ctx.restore();
    }

    function draw(ctx, W, H) {
      for (const L of layers) drawLayer(ctx, W, H, L);
    }

    return { update, draw, dispose() {}, parts: [], kind: "stroke", cfg };
  }

  // -----------------------------------------------------------------
  //  5. Glow-frame renderer — soft inset radial glow.
  //     Uses a multi-stroke fake: several concentric strokes with
  //     decreasing alpha & increasing width, simulating a blurred
  //     inner shadow without the cost of `filter: blur`.
  // -----------------------------------------------------------------
  function makeGlowFrameRenderer(cfg, global) {
    const perimBase = {
      shape: cfg.perimShape || global.perimShape || "rect",
      inset: cfg.inset ?? 2,
      cornerRadius: cfg.cornerRadius ?? global.cornerRadius,
      sides:   cfg.perimSides   ?? global.perimSides,
      points:  cfg.perimPoints  ?? global.perimPoints,
      innerRatio: cfg.perimInnerRatio ?? global.perimInnerRatio,
      exponent:   cfg.perimExponent   ?? global.perimExponent,
      rotate:     cfg.perimRotate     ?? global.perimRotate,
      samples: cfg.samples,
    };
    const state = { time: 0 };
    const bands = cfg.bands || 6;
    const baseWidth = cfg.width || 14;
    const intensity = cfg.intensity ?? 0.6;

    function update(dt, W, H, time) { state.time = time; }

    function draw(ctx, W, H) {
      const pulse = cfg.pulseSpeed
        ? 0.5 + 0.5 * Math.sin(state.time * cfg.pulseSpeed)
        : 1;
      const color = resolveGlowColor(cfg, state.time);
      ctx.save();
      ctx.globalCompositeOperation = cfg.blend || "lighter";
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        const w = baseWidth * (0.4 + t * 1.6);
        const a = intensity * (1 - t) * pulse;
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.lineWidth = w;
        ctx.strokeStyle = color;
        const opts = Object.assign({}, perimBase, { inset: (perimBase.inset || 2) + w * 0.4 });
        tracePath(ctx, W, H, opts);
        ctx.stroke();
      }
      ctx.restore();
    }

    return { update, draw, dispose() {}, parts: [], kind: "glowFrame", cfg };
  }

  // -----------------------------------------------------------------
  //  6. Dispatcher — called by emitter.js when it sees an unfamiliar
  //     kind.  Returns a renderer if the kind is ours, else null.
  // -----------------------------------------------------------------
  function createRenderer(kind, cfg, global) {
    if (kind === "stroke")     return makeStrokeRenderer(cfg, global);
    if (kind === "glowFrame")  return makeGlowFrameRenderer(cfg, global);
    return null;
  }

  NS.border = {
    tracePath,
    createRenderer,
    makeStrokeRenderer,
    makeGlowFrameRenderer,
    DEFAULT_CONIC, DEFAULT_LINEAR,
  };
})();
