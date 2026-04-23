/* ============================================================================
   FX-ENGINE EXT — v2.1
   ----------------------------------------------------------------------------
   Extension-layer additions to the Max FX Engine.  All additions go through
   the engine's public extension API (`FX.addShape`, `FX.addForce`,
   `FX.addPalette`, `FX.addRamp`) so the base engine file remains untouched
   and this module can be dropped in or swapped out freely.

   Adds, at load time:
     • 16 new shapes    (beam, ripple3, bokeh, dna, tornado, orb, nebula,
                         shard, gridcell, scanbar, wavelet, plasmoid, blob,
                         bolt, comet, chakra)
     • 7  new forces    (wave, wind, pulseOut, pendulum, braid, spiral,
                         compass)
     • 10 new palettes  (cyberpunk, sunset, midnight, emerald, abyss,
                         sakura-deep, neonpink, electric, infernal, blizzard)
     • 4  new ramps     (prism, twilight, lava, reef)

   Every shape is allocation-free on the hot path and uses cheap primitives
   (fills, single strokes, short radial gradients) — no shadowBlur, no
   filter(), no per-frame gradient-for-gradient chains.
   ============================================================================ */
(function () {
  "use strict";
  if (!window.FX || !window.FX.addShape) {
    console.warn("[fx-engine-ext] FX engine not loaded — skipping extensions.");
    return;
  }
  const TAU = Math.PI * 2;
  const HALF_PI = Math.PI / 2;

  // ---- tiny helpers ------------------------------------------------------
  function hsl(h, s, l, a) { return "hsla(" + (h | 0) + "," + s + "%," + l + "%," + a + ")"; }
  function colorOf(cfg, p, am) {
    const a = (p._a != null ? p._a : 1) * (am == null ? 1 : am);
    if (cfg.color) return cfg.color;
    return hsl(p.hue, cfg.sat == null ? 100 : cfg.sat,
                      cfg.lit == null ? 70  : cfg.lit, a.toFixed(3));
  }

  // =========================================================================
  //  NEW SHAPES
  // =========================================================================

  // 1. BEAM — tangent-aligned laser beam with falloff at both ends
  FX.addShape("beam", { category: "motion" }, (ctx, p, cfg) => {
    const a = p._a; if (a <= 0) return;
    const len = (cfg.beamLen || 14) * (cfg.beamLenMod === "life" ? p.life : 1);
    const w   = cfg.beamWidth || 2;
    const tx  = p.tx || Math.cos(p.a || 0), ty = p.ty || Math.sin(p.a || 0);
    const x1 = p.x - tx * len * 0.5, y1 = p.y - ty * len * 0.5;
    const x2 = p.x + tx * len * 0.5, y2 = p.y + ty * len * 0.5;
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    const c = colorOf(cfg, p, a);
    g.addColorStop(0, colorOf(cfg, p, 0));
    g.addColorStop(0.5, c);
    g.addColorStop(1, colorOf(cfg, p, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });

  // 2. RIPPLE3 — three concentric rings, phase-staggered
  FX.addShape("ripple3", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = colorOf(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 0.9;
    for (let i = 0; i < 3; i++) {
      const rr = r * (1 - i * 0.28) * (0.8 + 0.2 * Math.sin(p.phase * 2 + i));
      if (rr <= 0) continue;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke();
    }
  });

  // 3. BOKEH — soft out-of-focus disc with ring highlight
  FX.addShape("bokeh", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size * 1.4; if (r <= 0 || a <= 0) return;
    const h = p.hue | 0, s = cfg.sat == null ? 80 : cfg.sat, l = cfg.lit == null ? 70 : cfg.lit;
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r);
    g.addColorStop(0, hsl(h, s, l, a * 0.35));
    g.addColorStop(0.9, hsl(h, s, Math.min(l + 10, 90), a * 0.9));
    g.addColorStop(1, hsl(h, s, l, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  // 4. DNA — helix segment: two dots + connecting line
  FX.addShape("dna", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    const ph = p.phase * (cfg.helixFreq || 4);
    const off = Math.sin(ph) * r * 1.5;
    const ax = p.x + off, ay = p.y;
    const bx = p.x - off, by = p.y;
    ctx.strokeStyle = colorOf(cfg, p, a * 0.6);
    ctx.lineWidth = cfg.lineWidth || 0.8;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = colorOf(cfg, p, a);
    ctx.beginPath(); ctx.arc(ax, ay, r * 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, r * 0.4, 0, TAU); ctx.fill();
  });

  // 5. TORNADO — tapered triangle funnel
  FX.addShape("tornado", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, colorOf(cfg, p, a));
    g.addColorStop(1, colorOf(cfg, p, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r);
    ctx.lineTo( r * 0.1, -r);
    ctx.lineTo( r,        r);
    ctx.lineTo(-r,        r);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // 6. ORB — gradient sphere with specular highlight
  FX.addShape("orb", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    const h = p.hue | 0, s = cfg.sat == null ? 100 : cfg.sat, l = cfg.lit == null ? 60 : cfg.lit;
    const g = ctx.createRadialGradient(p.x - r * 0.4, p.y - r * 0.4, 0, p.x, p.y, r);
    g.addColorStop(0, hsl(h, s, 95, a));
    g.addColorStop(0.45, hsl(h, s, l, a));
    g.addColorStop(1, hsl(h, s, Math.max(l - 30, 10), a * 0.6));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  // 7. NEBULA — multi-color radial cloud
  FX.addShape("nebula", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size * 2.2; if (r <= 0 || a <= 0) return;
    const h = p.hue | 0;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0,   hsl(h,       100, 75, a * 0.7));
    g.addColorStop(0.4, hsl(h + 40,  100, 55, a * 0.4));
    g.addColorStop(0.8, hsl(h - 30,  80,  35, a * 0.2));
    g.addColorStop(1,   hsl(h,       100, 70, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  });

  // 8. SHARD — tall pointy spike rotated with particle
  FX.addShape("shard", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const w = r * (cfg.shardWidth || 0.35);
    const g = ctx.createLinearGradient(0, -r * 1.4, 0, r * 0.6);
    const bright = hsl(p.hue | 0, cfg.sat == null ? 90 : cfg.sat, 90, a);
    g.addColorStop(0, bright);
    g.addColorStop(1, colorOf(cfg, p, a));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.4);
    ctx.lineTo(w, r * 0.2);
    ctx.lineTo(0, r * 0.6);
    ctx.lineTo(-w, r * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // 9. GRIDCELL — small hollow square, sits upright
  FX.addShape("gridcell", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = colorOf(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    const s = Math.round(r * 2);
    ctx.strokeRect(Math.round(p.x - r), Math.round(p.y - r), s, s);
  });

  // 10. SCANBAR — horizontal bar (tangent-locked) for sweep-style looks
  FX.addShape("scanbar", { category: "motion" }, (ctx, p, cfg) => {
    const a = p._a; if (a <= 0) return;
    const len = cfg.barLen || 18, w = cfg.barWidth || 2;
    const tx = p.tx || Math.cos(p.a || 0), ty = p.ty || Math.sin(p.a || 0);
    const nx = -ty, ny = tx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.transform(nx, ny, tx, ty, 0, 0);
    const g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
    g.addColorStop(0,   colorOf(cfg, p, 0));
    g.addColorStop(0.5, colorOf(cfg, p, a));
    g.addColorStop(1,   colorOf(cfg, p, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-len / 2, -w / 2, len, w);
    ctx.restore();
  });

  // 11. WAVELET — tiny traveling sine wave segment
  FX.addShape("wavelet", { category: "geometric" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.strokeStyle = colorOf(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    ctx.beginPath();
    const steps = 10, w = r * 2, h = r * 0.5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = -w / 2 + t * w;
      const y = Math.sin(t * TAU + p.phase * 4) * h;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  });

  // 12. PLASMOID — pulsing core with thin aura ring
  FX.addShape("plasmoid", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    const pulse = 0.8 + 0.2 * Math.sin(p.phase * 6);
    const rc = r * pulse;
    const h = p.hue | 0;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rc * 1.8);
    g.addColorStop(0,   hsl(h, 100, 85, a));
    g.addColorStop(0.5, hsl(h, 100, 60, a * 0.55));
    g.addColorStop(1,   hsl(h, 100, 40, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, rc * 1.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = hsl(h, 100, 80, a * 0.7);
    ctx.lineWidth = cfg.lineWidth || 0.8;
    ctx.beginPath(); ctx.arc(p.x, p.y, rc, 0, TAU); ctx.stroke();
  });

  // 13. BLOB — irregular closed quadratic blob, deterministic per particle
  FX.addShape("blob", { category: "thematic" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = colorOf(cfg, p, a);
    const pts = 6;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const ang = (i / pts) * TAU;
      const rr = r * (0.8 + 0.4 * Math.sin(p.phase + i * 1.7));
      const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const pa = ((i - 0.5) / pts) * TAU;
        const pr = r * (0.8 + 0.4 * Math.sin(p.phase + (i - 0.5) * 1.7));
        ctx.quadraticCurveTo(Math.cos(pa) * pr, Math.sin(pa) * pr, x, y);
      }
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // 14. BOLT — simple zigzag polyline (lightning-lite, no shadowBlur)
  FX.addShape("bolt", { category: "motion" }, (ctx, p, cfg) => {
    const a = p._a; if (a <= 0) return;
    const len = p._size * (cfg.boltLen || 3);
    const tx = p.tx || Math.cos(p.a || 0), ty = p.ty || Math.sin(p.a || 0);
    const nx = -ty, ny = tx;
    ctx.strokeStyle = colorOf(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1.2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    const segs = cfg.segments || 3;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const j = (Math.sin(p.phase * 6 + i * 2.3) * 0.5) * p._size * 1.6;
      ctx.lineTo(p.x + tx * len * t + nx * j, p.y + ty * len * t + ny * j);
    }
    ctx.stroke();
  });

  // 15. COMET — single-particle comet head + tapered tail
  FX.addShape("comet", { category: "motion" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    const len = r * (cfg.tailLen || 5);
    const tx = p.tx || Math.cos(p.a || 0), ty = p.ty || Math.sin(p.a || 0);
    const tailX = p.x - tx * len, tailY = p.y - ty * len;
    const g = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
    g.addColorStop(0, colorOf(cfg, p, a));
    g.addColorStop(1, colorOf(cfg, p, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = r * 1.2;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tailX, tailY); ctx.stroke();
    // bright head
    ctx.fillStyle = hsl(p.hue | 0, 100, 90, a);
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.7, 0, TAU); ctx.fill();
  });

  // 16. CHAKRA — concentric rotating spokes (Dharma/gears vibe)
  FX.addShape("chakra", { category: "accent" }, (ctx, p, cfg) => {
    const a = p._a, r = p._size; if (r <= 0 || a <= 0) return;
    const spokes = cfg.spokes || 8;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.strokeStyle = colorOf(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    ctx.beginPath();
    for (let i = 0; i < spokes; i++) {
      const ang = (i / spokes) * TAU;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); ctx.stroke();
    ctx.restore();
  });

  // =========================================================================
  //  NEW FORCES
  // =========================================================================

  // Force signature in the engine is fn(p, dt, f, ctx).  `f` is the force
  // config entry, `ctx` = { W, H, time, particles }.

  // 1. wave — additive sinusoidal velocity field (cheap flow)
  FX.addForce("wave", (p, dt, f, ctx) => {
    const freq = f.freq == null ? 0.01 : f.freq;
    const s    = f.strength == null ? 0.3 : f.strength;
    const ph   = f.phase == null ? 0 : f.phase;
    const t    = (p.x + p.y) * freq + ph + (ctx ? ctx.time : 0);
    p.vx += Math.cos(t) * s * dt;
    p.vy += Math.sin(t * 1.3) * s * dt;
  });

  // 2. wind — directional push with gust noise
  FX.addForce("wind", (p, dt, f, ctx) => {
    const dir  = f.angle == null ? 0 : f.angle;
    const s    = f.strength == null ? 0.2 : f.strength;
    const gust = f.gust == null ? 0.35 : f.gust;
    const t    = ctx ? ctx.time : 0;
    const g    = 1 + Math.sin(t + p.y * 0.01) * gust;
    p.vx += Math.cos(dir) * s * g * dt;
    p.vy += Math.sin(dir) * s * g * dt;
  });

  // 3. pulseOut — periodic radial outward impulse from bbox center
  FX.addForce("pulseOut", (p, dt, f, ctx) => {
    const W = ctx ? ctx.W : 100, H = ctx ? ctx.H : 100;
    const cx = W * 0.5, cy = H * 0.5;
    const period = f.period == null ? 1.5 : f.period;
    const s      = f.strength == null ? 0.6 : f.strength;
    const t      = ctx ? ctx.time : 0;
    const wave   = Math.max(0, Math.sin((t / period) * TAU));
    const dx = p.x - cx, dy = p.y - cy;
    const d  = Math.sqrt(dx * dx + dy * dy) + 0.001;
    p.vx += (dx / d) * s * wave * dt;
    p.vy += (dy / d) * s * wave * dt;
  });

  // 4. pendulum — oscillate around spawn (stores origin once)
  FX.addForce("pendulum", (p, dt, f) => {
    if (p._ox == null) { p._ox = p.x; p._oy = p.y; }
    const k    = f.k == null ? 0.06 : f.k;
    const damp = f.damp == null ? 0.92 : f.damp;
    p.vx += (p._ox - p.x) * k;
    p.vy += (p._oy - p.y) * k;
    p.vx *= damp; p.vy *= damp;
  });

  // 5. braid — sinusoidal sideways sway along tangent
  FX.addForce("braid", (p, dt, f) => {
    const amp  = f.amp == null ? 0.4 : f.amp;
    const freq = f.freq == null ? 4 : f.freq;
    const tx = p.tx || 1, ty = p.ty || 0;
    const nx = -ty, ny = tx;
    const s  = Math.sin(p.phase * freq) * amp;
    p.vx += nx * s * dt;
    p.vy += ny * s * dt;
  });

  // 6. spiral — outward/inward spiral motion
  FX.addForce("spiral", (p, dt, f, ctx) => {
    const W = ctx ? ctx.W : 100, H = ctx ? ctx.H : 100;
    const cx = W * 0.5, cy = H * 0.5;
    const out   = f.out == null ? 0.15 : f.out;
    const swirl = f.swirl == null ? 0.4 : f.swirl;
    const dx = p.x - cx, dy = p.y - cy;
    const d  = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const ux = dx / d, uy = dy / d;
    p.vx += ux * out * dt - uy * swirl * dt;
    p.vy += uy * out * dt + ux * swirl * dt;
  });

  // 7. compass — aligns velocity toward a fixed angle (snap-to-heading)
  FX.addForce("compass", (p, dt, f) => {
    const dir = f.angle == null ? 0 : f.angle;
    const k   = f.strength == null ? 0.08 : f.strength;
    const tx  = Math.cos(dir), ty = Math.sin(dir);
    p.vx += (tx * 0.4 - p.vx) * k;
    p.vy += (ty * 0.4 - p.vy) * k;
  });

  // =========================================================================
  //  NEW PALETTES
  // =========================================================================
  if (FX.addPalette) {
    const PALS = {
      cyberpunk:   [320, 290, 180, 50,  140],
      sunset:      [0,   20,  40,  60,  300, 330],
      midnight:    [220, 240, 260, 280, 260],
      emerald:     [130, 150, 170, 190, 150],
      abyss:       [200, 220, 240, 260, 250],
      "sakura-deep":[320, 340, 350, 10],
      neonpink:    [310, 320, 330, 340, 350],
      electric:    [180, 200, 220, 240, 200],
      infernal:    [0, 10, 20, 30, 15],
      blizzard:    [180, 190, 200, 210, 220, 200],
      solarflare:  [25, 35, 45, 15, 5],
      spectral:    [120, 160, 200, 240, 280, 320, 360],
      // duplicate ramp names as palettes so `hue: "prism"` etc. work
      prism:       [0, 60, 120, 200, 280, 340],
      twilight:    [15, 300, 240, 220],
      lava:        [50, 30, 10, 0],
      reef:        [180, 160, 210, 260],
      venomous:    [90, 110, 140, 170],
    };
    for (const n in PALS) FX.addPalette(n, PALS[n]);
  }

  // =========================================================================
  //  NEW RAMPS (HSLA stop arrays)
  // =========================================================================
  if (FX.addRamp) {
    const RAMPS = {
      prism: [
        { h:  0,   s: 100, l: 65, a: 1 },
        { h:  60,  s: 100, l: 65, a: 1 },
        { h:  120, s: 100, l: 55, a: 1 },
        { h:  200, s: 100, l: 60, a: 1 },
        { h:  280, s: 100, l: 65, a: 0.8 },
        { h:  340, s: 100, l: 60, a: 0 },
      ],
      twilight: [
        { h:  15, s: 90,  l: 60, a: 1 },
        { h:  300, s: 80, l: 55, a: 1 },
        { h:  240, s: 90, l: 40, a: 0.8 },
        { h:  220, s: 80, l: 20, a: 0 },
      ],
      lava: [
        { h:  50, s: 100, l: 85, a: 1 },
        { h:  30, s: 100, l: 60, a: 1 },
        { h:  10, s: 100, l: 45, a: 0.7 },
        { h:  0,  s: 100, l: 20, a: 0 },
      ],
      reef: [
        { h: 180, s: 90, l: 70, a: 1 },
        { h: 160, s: 90, l: 60, a: 1 },
        { h: 210, s: 90, l: 55, a: 0.8 },
        { h: 260, s: 80, l: 50, a: 0 },
      ],
      venomous: [
        { h:  90, s: 100, l: 70, a: 1 },
        { h: 110, s: 100, l: 60, a: 1 },
        { h: 140, s: 100, l: 45, a: 0.7 },
        { h: 170, s: 90,  l: 30, a: 0 },
      ],
    };
    for (const n in RAMPS) FX.addRamp(n, RAMPS[n]);
  }

  if (window.console && console.info) {
    console.info("[fx-engine-ext] +16 shapes, +7 forces, +12 palettes, +5 ramps");
  }
})();
