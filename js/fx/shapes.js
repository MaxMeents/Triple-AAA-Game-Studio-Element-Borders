/* ================================================================
   FX-ENGINE v2  —  shapes.js
   ----------------------------------------------------------------
   The shape library — every primitive a particle can render as.

   Shapes are selected via the `shape` field on an emitter config.
   Each shape receives (ctx, particle, cfg) and is responsible for
   one drawing pass.  A few conventions are used:

     • p._a     current alpha (pre-computed by the emitter)
     • p._size  current size  (pre-computed by the emitter)
     • p.rot    current rotation in radians
     • p.hue    particle hue (0..360)
     • cfg.sat / cfg.lit  override saturation / lightness

   Colour is resolved via `drawColor` which respects:
     • cfg.color (raw CSS colour string)
     • cfg.colorRamp (HSLA stops, evaluated over life)
     • per-particle p._c0 / p._c1 gradient (set when colorGradient is on)
     • fallback to HSL from hue/sat/lit

   To register a shape from user code:  FX.addShape(name, meta, fn).
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const core   = NS.core;
  const tracks = NS.tracks;
  if (!core) { console.warn("[fx/shapes] core.js not loaded"); return; }
  const { PI, TAU, HALF_PI, random, rnd, hsla, parseColor, lerpHSL, getEase } = core;

  const SHAPES    = Object.create(null);
  const SHAPE_META = Object.create(null);
  function defShape(name, meta, fn) {
    SHAPES[name] = fn;
    SHAPE_META[name] = Object.assign({ category: "basic" }, meta || {});
  }

  // =================================================================
  //  Colour resolution — used by every shape.
  // =================================================================
  function drawColor(cfg, p, alphaMul) {
    alphaMul = alphaMul == null ? 1 : alphaMul;
    // Birth→death colour gradient (cfg.colorGradient)
    if (p._c0) {
      const u = core.clamp01(1 - p.life);
      const k = p._colEase ? p._colEase(u) : u;
      const c = lerpHSL(p._c0, p._c1, k);
      return hsla(c, alphaMul);
    }
    // Named colour ramp (cfg.colorRamp: [hslaStops…])
    if (cfg.colorRamp && tracks) {
      const c = tracks.evalRamp(cfg.colorRamp, p, cfg.colorRampEase);
      if (c) return hsla(c, alphaMul);
    }
    // Raw CSS colour (cfg.color)
    if (cfg.color) {
      if (!p._cParsed) p._cParsed = parseColor(cfg.color) || { h: 0, s: 0, l: 100, a: 1 };
      return hsla(p._cParsed, alphaMul);
    }
    // Default: HSL from particle hue
    const a = (p._a != null ? p._a : 1) * alphaMul;
    return "hsla(" + (p.hue | 0) + "," + (cfg.sat ?? 100) + "%," + (cfg.lit ?? 70) + "%," + a.toFixed(3) + ")";
  }

  // =================================================================
  //  BASIC
  // =================================================================
  defShape("dot", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  defShape("square", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, s = Math.ceil(p._size);
    if (s <= 0 || a <= 0) return;
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.fillRect(Math.round(p.x) - s, Math.round(p.y) - s, s * 2, s * 2);
  });

  defShape("rect", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, s = p._size;
    if (s <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = drawColor(cfg, p, a);
    const w = s * (cfg.aspect || 1.6), h = s * 0.6;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  });

  defShape("triangle", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.866, r * 0.5);
    ctx.lineTo(-r * 0.866, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  defShape("poly", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const sides = cfg.sides || 6;
    const lockToEdge = cfg.spin === false || cfg.spin === 0;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.rotate(lockToEdge ? (p.a || 0) : p.rot);
    if (cfg.stroke) { ctx.strokeStyle = drawColor(cfg, p, a); ctx.lineWidth = cfg.lineWidth || 1; }
    else            { ctx.fillStyle = drawColor(cfg, p, a); }
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * TAU;
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    cfg.stroke ? ctx.stroke() : ctx.fill();
    ctx.restore();
  });

  defShape("hex", { category: "basic" }, (ctx, p, cfg) => {
    const prev = cfg.sides; cfg.sides = 6;
    SHAPES.poly(ctx, p, cfg);
    if (prev == null) delete cfg.sides; else cfg.sides = prev;
  });

  defShape("pentagon", { category: "basic" }, (ctx, p, cfg) => {
    const prev = cfg.sides; cfg.sides = 5;
    SHAPES.poly(ctx, p, cfg);
    if (prev == null) delete cfg.sides; else cfg.sides = prev;
  });

  defShape("ring", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
  });

  defShape("cross", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    const lock = cfg.spin === false || cfg.spin === 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(lock ? 0 : p.rot);
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();
    ctx.restore();
  });

  defShape("plus", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.fillStyle = drawColor(cfg, p, a);
    const t = r * (cfg.thickness || 0.3);
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.rotate(cfg.spin === 0 ? 0 : p.rot);
    ctx.fillRect(-r, -t, r * 2, t * 2);
    ctx.fillRect(-t, -r, t * 2, r * 2);
    ctx.restore();
  });

  defShape("diamond", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const c1 = drawColor(cfg, p, a);
    const dimmer = Object.assign({}, cfg, { lit: (cfg.lit ?? 70) - 20 });
    const c2 = drawColor(dimmer, p, a);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0);
    ctx.closePath(); ctx.fill();
    if (cfg.stroke !== false) {
      ctx.strokeStyle = "rgba(255,255,255," + a + ")";
      ctx.lineWidth = 0.6; ctx.stroke();
    }
    ctx.restore();
  });

  defShape("star", { category: "basic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const points = cfg.points || 5;
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const ang = (i / (points * 2)) * TAU - HALF_PI;
      const rr = i & 1 ? r * (cfg.innerRatio ?? 0.45) : r;
      const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // =================================================================
  //  GLOW / ACCENT — radial gradient style
  // =================================================================
  defShape("glow", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a;
    const r = p._size * (cfg.glowScale || 2);
    if (r <= 0 || a <= 0) return;
    const base = cfg.color ? parseColor(cfg.color) || { h: 0, s: 0, l: 70, a: 1 }
                           : { h: p.hue, s: cfg.sat ?? 100, l: cfg.lit ?? 70, a: 1 };
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    const hot = { h: base.h, s: base.s, l: Math.min(95, base.l + 15), a: base.a };
    const cold = { h: base.h, s: base.s, l: Math.max(0, base.l - 20), a: 0 };
    g.addColorStop(0, hsla(hot, a));
    g.addColorStop(cfg.glowMid ?? 0.5, hsla(base, a * 0.4));
    g.addColorStop(1, hsla(cold, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  defShape("halo", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const base = cfg.color ? parseColor(cfg.color)
                           : { h: p.hue, s: cfg.sat ?? 100, l: cfg.lit ?? 70, a: 1 };
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r);
    g.addColorStop(0, hsla(base, 0));
    g.addColorStop(0.8, hsla(base, a));
    g.addColorStop(1, hsla(base, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  defShape("lensflare", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
    g.addColorStop(0, drawColor(cfg, p, a));
    g.addColorStop(1, drawColor(cfg, p, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 0.8;
    ctx.beginPath(); ctx.moveTo(-r * 3, 0); ctx.lineTo(r * 3, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r * 2); ctx.lineTo(0, r * 2); ctx.stroke();
    ctx.restore();
  });

  defShape("sparkle", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size * 1.4;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(r * 0.5, r * 0.5);
    ctx.moveTo(-r * 0.5, r * 0.5); ctx.lineTo(r * 0.5, -r * 0.5);
    ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, TAU); ctx.fill();
    ctx.restore();
  });

  defShape("ringpulse", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const inner = cfg.innerRatio ?? 0.8;
    const g = ctx.createRadialGradient(p.x, p.y, r * inner, p.x, p.y, r);
    g.addColorStop(0, drawColor(cfg, p, 0));
    g.addColorStop(0.5, drawColor(cfg, p, a));
    g.addColorStop(1, drawColor(cfg, p, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  defShape("firefly", { category: "accent" }, (ctx, p, cfg) => {
    const blink = Math.abs(Math.sin(p.phase * 3));
    const a = p._a * blink, r = p._size * (0.6 + 0.4 * blink);
    if (r <= 0 || a <= 0) return;
    SHAPES.glow(ctx, Object.assign({}, p, { _a: a, _size: r }), cfg);
  });

  // =================================================================
  //  MOTION — streaks, arrows, trails
  // =================================================================
  defShape("streak", { category: "motion" }, (ctx, p, cfg) => {
    const a = p._a;
    if (a <= 0) return;
    const len = (cfg.len || 10) * (cfg.lenMod === "fade" ? p.life : 1);
    const vx = p.tx || Math.cos(p.a || 0), vy = p.ty || Math.sin(p.a || 0);
    const nx = -vy, ny = vx;
    const dirX = cfg.streakDir === "tangent" ? vx : nx;
    const dirY = cfg.streakDir === "tangent" ? vy : ny;
    const x2 = p.x - dirX * len, y2 = p.y - dirY * len;
    const g = ctx.createLinearGradient(p.x, p.y, x2, y2);
    g.addColorStop(0, drawColor(cfg, p, a));
    g.addColorStop(1, drawColor(cfg, p, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = cfg.lineWidth || 1.4;
    ctx.lineCap = cfg.lineCap || "round";
    if (cfg.shadow) { ctx.shadowColor = "hsl(" + (p.hue | 0) + ",100%,60%)"; ctx.shadowBlur = cfg.shadow; }
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
    if (cfg.shadow) ctx.shadowBlur = 0;
  });

  defShape("arrow", { category: "motion" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const ang = cfg.pointAlong === "inward" ? (p.a || 0) + HALF_PI
               : cfg.pointAlong === "tangent" ? (p.a || 0)
               : cfg.pointAlong === "outward" ? (p.a || 0) - HALF_PI
               : p.rot;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r, r * 0.6);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r, -r * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  defShape("chevron", { category: "motion" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const ang = cfg.pointAlong === "tangent" ? (p.a || 0) : p.rot;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.5); ctx.lineTo(r * 0.3, 0); ctx.lineTo(-r * 0.9, r * 0.5);
    ctx.stroke();
    ctx.restore();
  });

  // =================================================================
  //  GEOMETRIC — bars, arcs, line patterns
  // =================================================================
  defShape("bar", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a;
    const h = p._size * (cfg.barLen || 4);
    const w = cfg.barWidth || 2;
    if (h <= 0 || a <= 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.transform(p.tx, p.ty, -p.ty, p.tx, 0, 0);
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.fillRect(-w / 2, 0, w, h);
    ctx.restore();
  });

  defShape("arc", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, cfg.arcLen ?? PI * 1.2);
    ctx.stroke();
    ctx.restore();
  });

  defShape("pixel", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a, s = Math.max(1, Math.round(p._size));
    if (a <= 0) return;
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), s, s);
  });

  defShape("bracket", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1.4;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r);
    ctx.lineTo(-r, -r);
    ctx.lineTo(-r, r);
    ctx.lineTo(-r * 0.6, r);
    ctx.moveTo(r * 0.6, -r);
    ctx.lineTo(r, -r);
    ctx.lineTo(r, r);
    ctx.lineTo(r * 0.6, r);
    ctx.stroke();
    ctx.restore();
  });

  defShape("tick", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const ang = (p.a || 0) + HALF_PI;   // perpendicular to edge
    const x2 = p.x + Math.cos(ang) * r;
    const y2 = p.y + Math.sin(ang) * r;
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1.2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
  });

  // =================================================================
  //  THEMATIC — flame, flake, smoke, lightning, bubble, crystal
  // =================================================================
  defShape("flame", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    const h = p.hue;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
    g.addColorStop(0,    "hsla(" + ((h + 20) | 0) + ",100%,80%," + a + ")");
    g.addColorStop(0.5,  "hsla(" + (h | 0) + ",100%,60%," + (a * 0.7) + ")");
    g.addColorStop(1,    "hsla(" + ((h - 20) | 0) + ",100%,40%,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();
  });

  defShape("ember", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    // Glow + flicker core.  Uses a radial gradient (cheap) instead of
    // canvas shadowBlur, which is ~10–50× slower per draw.
    const flick = 0.8 + 0.2 * Math.sin(p.phase * 10);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
    const h = p.hue | 0;
    g.addColorStop(0,    "hsla(" + h + ",100%," + (60 * flick + 25 | 0) + "%," + a + ")");
    g.addColorStop(0.4,  "hsla(" + h + ",100%,55%," + (a * 0.6) + ")");
    g.addColorStop(1,    "hsla(" + h + ",100%,40%,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();
  });

  defShape("flake", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 0.8;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + p.rot;
      const x2 = p.x + Math.cos(ang) * r;
      const y2 = p.y + Math.sin(ang) * r;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
      const bx = p.x + Math.cos(ang) * r * 0.6;
      const by = p.y + Math.sin(ang) * r * 0.6;
      const pang = ang + HALF_PI;
      ctx.beginPath();
      ctx.moveTo(bx - Math.cos(pang) * r * 0.25, by - Math.sin(pang) * r * 0.25);
      ctx.lineTo(bx + Math.cos(pang) * r * 0.25, by + Math.sin(pang) * r * 0.25);
      ctx.stroke();
    }
  });

  defShape("smoke", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size * 1.5;
    if (r <= 0 || a <= 0) return;
    const base = cfg.color ? parseColor(cfg.color) : { h: p.hue, s: 20, l: 60, a: 1 };
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, hsla(base, a * 0.5));
    g.addColorStop(1, hsla(base, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  defShape("lightning", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a;
    if (a <= 0) return;
    const segs = cfg.segments || 4;
    const len = p._size * (cfg.lightningLen || 2);
    const ox = p.tx, oy = p.ty;
    const nx = -oy, ny = ox;
    ctx.save();
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1.2;
    ctx.shadowColor = "hsl(" + (p.hue | 0) + ",100%,70%)";
    ctx.shadowBlur = cfg.shadow ?? 8;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const j = (random() - 0.5) * p._size * 1.8;
      ctx.lineTo(p.x + ox * len * t + nx * j, p.y + oy * len * t + ny * j);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  defShape("bubble", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = drawColor(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 0.9;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255," + (a * 0.45) + ")";
    ctx.beginPath(); ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.2, 0, TAU); ctx.fill();
  });

  defShape("crystal", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    const bright = Object.assign({}, cfg, { lit: (cfg.lit ?? 70) + 20 });
    g.addColorStop(0, drawColor(bright, p, a));
    g.addColorStop(1, drawColor(cfg,    p, a));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.55, -r * 0.2);
    ctx.lineTo(r * 0.4,  r);
    ctx.lineTo(-r * 0.4, r);
    ctx.lineTo(-r * 0.55, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255," + (a * 0.5) + ")";
    ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  });

  defShape("leaf", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  });

  defShape("petal", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r, -r * 0.2, 0, r);
    ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r);
    ctx.fill();
    ctx.restore();
  });

  defShape("heart", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size;
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(r / 14, r / 14);
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.bezierCurveTo( 10, -14,  18,  0,  0,  14);
    ctx.bezierCurveTo(-18,   0, -10, -14,  0, -3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // =================================================================
  //  TEXT / GLYPHS
  // =================================================================
  defShape("glyph", { category: "text" }, (ctx, p, cfg) => {
    const a = p._a, s = p._size;
    if (s <= 1 || a <= 0) return;
    ctx.fillStyle = drawColor(cfg, p, a);
    ctx.font = (cfg.bold ? "bold " : "") + (cfg.italic ? "italic " : "") + s + "px " + (cfg.font || "serif");
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ch = typeof cfg.glyph === "function" ? cfg.glyph(p) : (p.glyph || cfg.glyph || "✦");
    if (cfg.glow) {
      ctx.shadowColor = "hsl(" + (p.hue | 0) + ",100%,70%)";
      ctx.shadowBlur = cfg.glow;
    }
    if (cfg.rotate !== false) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(ch, p.x, p.y);
    }
    if (cfg.glow) ctx.shadowBlur = 0;
  });

  defShape("digit", { category: "text" }, (ctx, p, cfg) => {
    if (!p.glyph) p.glyph = String((random() * 10) | 0);
    const prev = cfg.font; cfg.font = cfg.font || "monospace";
    SHAPES.glyph(ctx, p, cfg);
    cfg.font = prev;
  });

  defShape("rune", { category: "text" }, (ctx, p, cfg) => {
    if (!p.glyph) {
      const pool = cfg.runes || "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛞᛟ";
      p.glyph = pool[(random() * pool.length) | 0];
    }
    SHAPES.glyph(ctx, p, cfg);
  });

  defShape("emoji", { category: "text" }, (ctx, p, cfg) => {
    if (!p.glyph) p.glyph = cfg.glyph || "✨";
    const prev = cfg.font; cfg.font = cfg.font || "system-ui";
    SHAPES.glyph(ctx, p, cfg);
    cfg.font = prev;
  });

  // =================================================================
  //  META
  // =================================================================
  defShape("custom", { category: "meta" }, (ctx, p, cfg) => {
    if (cfg.draw) cfg.draw(ctx, p, cfg);
  });

  defShape("composite", { category: "meta" }, (ctx, p, cfg) => {
    // Render several shapes in sequence per particle
    const list = cfg.shapes || [];
    for (let i = 0; i < list.length; i++) {
      const sc = list[i];
      const fn = SHAPES[sc.shape];
      if (!fn) continue;
      const merged = Object.assign({}, cfg, sc);
      fn(ctx, p, merged);
    }
  });

  // -----------------------------------------------------------------
  NS.shapes = { SHAPES, SHAPE_META, defShape, drawColor };
})();
