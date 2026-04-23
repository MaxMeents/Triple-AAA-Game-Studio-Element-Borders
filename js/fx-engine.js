/* ================================================================
   FX-ENGINE.JS — Declarative border-effect factory
   ----------------------------------------------------------------
   This is the "heavy lifting" authoring layer. It lets you describe
   an entire border animation as a plain-JS config. One `FX({...})`
   call produces a factory that plugs straight into the existing
   trail engine via window.TRAIL.register.

   Design goals:
   - Cover >90% of real cases declaratively (shape, motion, color,
     lifetime, blending, symmetry).
   - Be composable: up to N emitters per effect (ambient + head).
   - Escape hatches everywhere: init(p), update(p,dt), customDraw.
   - Cheap: reuses the shared rAF loop, no per-frame allocations
     beyond the particle pool it already owns.

   Thousands of effects become tuples of { shape, motion, palette }.
   ================================================================ */
(function () {
  "use strict";
  if (!window.TRAIL) { console.warn("fx-engine: window.TRAIL missing"); return; }
  const { register, perim, TAU, rnd } = window.TRAIL;

  // ---------------------------------------------------------------
  //  Palettes — hue shortcuts used by effect authors
  // ---------------------------------------------------------------
  const PALETTES = {
    fire:     [5, 20, 35, 45],
    ember:    [10, 25, 40],
    ice:      [180, 195, 210],
    frost:    [195, 210, 220],
    plasma:   [270, 290, 310],
    void:     [260, 275, 290],
    toxic:    [90, 110, 130],
    blood:    [350, 0, 10],
    gold:     [40, 45, 50],
    silver:   [210],
    rainbow:  [0, 60, 120, 180, 240, 300],
    sunset:   [15, 30, 330, 345],
    ocean:    [180, 200, 220, 240],
    forest:   [90, 110, 130, 150],
    neon:     [320, 180, 60, 280],
    pastel:   [330, 45, 150, 210, 270],
    royal:    [45, 280, 200],
    mono:     [0],
  };

  // ---------------------------------------------------------------
  //  Small helpers
  // ---------------------------------------------------------------
  function resolveHue(h) {
    if (h == null) return () => 0;
    if (typeof h === "function") return h;
    if (typeof h === "number") return () => h;
    if (typeof h === "string") {
      if (h === "rainbow") return () => Math.random() * 360;
      if (PALETTES[h]) { const P = PALETTES[h]; return () => P[(Math.random() * P.length) | 0]; }
      // Hex color — return a sentinel and let drawer use cfg.color directly
      return () => 0;
    }
    if (Array.isArray(h)) {
      if (h.length === 2 && typeof h[0] === "number" && h[1] - h[0] < 360 && typeof h[1] === "number") {
        return () => rnd(h[0], h[1]);
      }
      return () => h[(Math.random() * h.length) | 0];
    }
    return () => 0;
  }

  // Compute effective size modifier for this tick
  function sizeFactor(mod, p) {
    if (!mod || mod === "const") return 1;
    if (mod === "fade")   return p.life;
    if (mod === "grow")   return 1 - p.life;
    if (mod === "pulse")  return Math.sin(p.life * Math.PI);
    if (mod === "twinkle")return Math.abs(Math.sin(p.phase * 3));
    if (mod === "breathe")return 0.6 + 0.4 * Math.sin(p.phase);
    if (typeof mod === "function") return mod(p);
    return 1;
  }
  function alphaFactor(mod, p) {
    if (!mod || mod === "life")   return p.life;
    if (mod === "pulse")          return Math.sin(p.life * Math.PI);
    if (mod === "twinkle")        return Math.abs(Math.sin(p.phase * 3)) * p.life;
    if (mod === "const")          return 1;
    if (typeof mod === "number")  return mod * p.life;
    if (typeof mod === "function")return mod(p);
    return p.life;
  }

  // ---------------------------------------------------------------
  //  Shape library — each draws one particle. Colors come from cfg.
  // ---------------------------------------------------------------
  const SHAPES = {};

  function strokeCol(cfg, p, a) {
    if (cfg.color) return cfg.color + alphaToHex(a);
    return `hsla(${p.hue},${cfg.sat ?? 100}%,${cfg.lit ?? 70}%,${a})`;
  }
  function fillCol(cfg, p, a) { return strokeCol(cfg, p, a); }
  function alphaToHex(a) {
    const v = Math.max(0, Math.min(255, (a * 255) | 0));
    return v.toString(16).padStart(2, "0");
  }

  SHAPES.dot = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod, p);
    if (r <= 0 || a <= 0) return;
    ctx.fillStyle = fillCol(cfg, p, a);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  };

  SHAPES.glow = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod || "pulse", p) * 2;
    if (r <= 0 || a <= 0) return;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    const h = p.hue, sat = cfg.sat ?? 100, lit = cfg.lit ?? 70;
    g.addColorStop(0, cfg.color || `hsla(${h},${sat}%,${Math.min(95, lit + 15)}%,${a})`);
    g.addColorStop(1, cfg.color ? cfg.color + "00" : `hsla(${h},${sat}%,${lit - 20}%,0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  };

  SHAPES.ring = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod, p);
    if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = strokeCol(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
  };

  SHAPES.cross = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod || "pulse", p);
    if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = strokeCol(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 1;
    const noSpin = cfg.spin === false || cfg.spin === 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(noSpin ? 0 : p.rot);
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();
    ctx.restore();
  };

  SHAPES.star = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod || "fade", p);
    if (r <= 0 || a <= 0) return;
    const points = cfg.points || 5;
    ctx.fillStyle = fillCol(cfg, p, a);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const ang = (i / (points * 2)) * TAU - Math.PI / 2;
      const rr = i & 1 ? r * (cfg.innerRatio || 0.45) : r;
      const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  SHAPES.poly = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod || "fade", p);
    if (r <= 0 || a <= 0) return;
    const sides = cfg.sides || 6;
    const orientToEdge = cfg.spin === false || cfg.spin === 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(orientToEdge ? (p.a || 0) : p.rot);
    if (cfg.stroke) { ctx.strokeStyle = strokeCol(cfg, p, a); ctx.lineWidth = cfg.lineWidth || 1; }
    else            { ctx.fillStyle = fillCol(cfg, p, a); }
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * TAU;
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    cfg.stroke ? ctx.stroke() : ctx.fill();
    ctx.restore();
  };

  SHAPES.rect = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const s = p.size * sizeFactor(cfg.sizeMod, p);
    if (s <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = fillCol(cfg, p, a);
    const w = s * (cfg.aspect || 1.6), h = s * 0.6;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  };

  SHAPES.square = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const s = Math.ceil(p.size * sizeFactor(cfg.sizeMod, p));
    if (s <= 0 || a <= 0) return;
    ctx.fillStyle = fillCol(cfg, p, a);
    ctx.fillRect(Math.round(p.x) - s, Math.round(p.y) - s, s * 2, s * 2);
  };

  SHAPES.triangle = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod, p);
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = fillCol(cfg, p, a);
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.87, r * 0.5); ctx.lineTo(-r * 0.87, r * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  SHAPES.diamond = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod, p);
    if (r <= 0 || a <= 0) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    const c1 = cfg.color || `hsla(${p.hue},${cfg.sat ?? 100}%,95%,${a})`;
    const c2 = cfg.color || `hsla(${p.hue},${cfg.sat ?? 100}%,55%,${a})`;
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0);
    ctx.closePath(); ctx.fill();
    if (cfg.stroke !== false) {
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 0.6; ctx.stroke();
    }
    ctx.restore();
  };

  SHAPES.flame = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod || "fade", p);
    if (r <= 0 || a <= 0) return;
    const h = p.hue;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
    g.addColorStop(0, `hsla(${h + 20},100%,80%,${a})`);
    g.addColorStop(0.5, `hsla(${h},100%,60%,${a * 0.7})`);
    g.addColorStop(1, `hsla(${h - 20},100%,40%,0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();
  };

  SHAPES.flake = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod || "grow", p);
    if (r <= 0 || a <= 0) return;
    ctx.strokeStyle = strokeCol(cfg, p, a);
    ctx.lineWidth = cfg.lineWidth || 0.8;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + p.rot;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
      ctx.stroke();
    }
  };

  SHAPES.glyph = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const s = p.size * sizeFactor(cfg.sizeMod, p);
    if (s <= 1 || a <= 0) return;
    ctx.fillStyle = fillCol(cfg, p, a);
    ctx.font = `${cfg.bold ? "bold " : ""}${s}px ${cfg.font || "serif"}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ch = typeof cfg.glyph === "function" ? cfg.glyph(p) : (p.glyph || cfg.glyph || "✦");
    if (cfg.glow) { ctx.shadowColor = `hsl(${p.hue},100%,70%)`; ctx.shadowBlur = cfg.glow; }
    ctx.fillText(ch, p.x, p.y);
    if (cfg.glow) ctx.shadowBlur = 0;
  };

  SHAPES.streak = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    if (a <= 0) return;
    const len = (cfg.len || 10) * (cfg.lenMod === "fade" ? p.life : 1);
    const vx = p.tx || Math.cos(p.a || 0), vy = p.ty || Math.sin(p.a || 0);
    const nx = -vy, ny = vx;
    const dirX = cfg.streakDir === "tangent" ? vx : nx;
    const dirY = cfg.streakDir === "tangent" ? vy : ny;
    const x2 = p.x - dirX * len, y2 = p.y - dirY * len;
    const g = ctx.createLinearGradient(p.x, p.y, x2, y2);
    g.addColorStop(0, strokeCol(cfg, p, a));
    g.addColorStop(1, strokeCol(cfg, p, 0));
    ctx.strokeStyle = g; ctx.lineWidth = cfg.lineWidth || 1.4;
    if (cfg.shadow) { ctx.shadowColor = `hsl(${p.hue},100%,60%)`; ctx.shadowBlur = cfg.shadow; }
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
    if (cfg.shadow) ctx.shadowBlur = 0;
  };

  SHAPES.arrow = (ctx, p, cfg) => {
    const a = alphaFactor(cfg.alpha, p);
    const r = p.size * sizeFactor(cfg.sizeMod, p);
    if (r <= 0 || a <= 0) return;
    const ang = cfg.pointAlong === "inward" ? (p.a || 0) + Math.PI / 2
              : cfg.pointAlong === "tangent" ? (p.a || 0)
              : p.rot;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
    ctx.fillStyle = fillCol(cfg, p, a);
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(-r, r * 0.6); ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r, -r * 0.6); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  SHAPES.bar = (ctx, p, cfg) => {
    // Vertical bar orthogonal to edge — nice for equalizers / scan lines
    const a = alphaFactor(cfg.alpha, p);
    const h = p.size * sizeFactor(cfg.sizeMod || "pulse", p) * (cfg.barLen || 4);
    const w = cfg.barWidth || 2;
    if (h <= 0 || a <= 0) return;
    const tx = p.tx, ty = p.ty, nx = -ty, ny = tx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.transform(tx, ty, nx, ny, 0, 0);
    ctx.fillStyle = fillCol(cfg, p, a);
    ctx.fillRect(-w / 2, 0, w, h);
    ctx.restore();
  };

  SHAPES.custom = (ctx, p, cfg) => cfg.draw && cfg.draw(ctx, p, cfg);

  // ---------------------------------------------------------------
  //  Motion modifiers
  // ---------------------------------------------------------------
  function applyMotion(p, cfg, dt) {
    if (cfg.orbit) {
      if (p.orbA == null) { p.orbA = Math.random() * TAU; p.orbR = cfg.orbit.r || 4; }
      p.orbA += (cfg.orbit.w || 3) * dt;
      const r = p.orbR * (cfg.orbit.shrink ? p.life : 1);
      p.x = p.cx + Math.cos(p.orbA) * r;
      p.y = p.cy + Math.sin(p.orbA) * r;
    } else {
      p.x += p.vx; p.y += p.vy;
    }
    if (cfg.gravity) p.vy += cfg.gravity;
    if (cfg.wind)    p.vx += cfg.wind;
    const drag = cfg.drag ?? 0.99;
    p.vx *= drag; p.vy *= drag;
    if (cfg.sway) {
      p.x += Math.sin(p.phase) * cfg.sway;
    }
    if (cfg.attract) {
      const dx = cfg.attract.x - p.x, dy = cfg.attract.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.vx += dx / d * cfg.attract.strength;
      p.vy += dy / d * cfg.attract.strength;
    }
  }

  // ---------------------------------------------------------------
  //  Spawn builder — converts (cfg, W, H, emitter) to a new particle
  // ---------------------------------------------------------------
  function makeSpawner(cfg, hueFn) {
    return function spawn(W, H, headT) {
      const inset = cfg.inset ?? 2;
      const h = headT != null
        ? perim(headT, W, H, inset)
        : perim(Math.random(), W, H, inset);
      const tan = { x: Math.cos(h.a), y: Math.sin(h.a) };
      const nrm = { x: -tan.y, y: tan.x }; // inward
      const jit = cfg.jitter || 0;
      const p = {
        x: h.x + (jit ? rnd(-jit, jit) : 0),
        y: h.y + (jit ? rnd(-jit, jit) : 0),
        cx: h.x, cy: h.y,
        a: h.a, side: h.side,
        tx: tan.x, ty: tan.y,
        vx: 0, vy: 0,
        life: 1,
        maxLife: rnd((cfg.life && cfg.life[0]) || 0.8, (cfg.life && cfg.life[1]) || 1.4),
        size: (cfg.size || 2) * rnd(cfg.sizeVar?.[0] ?? 0.7, cfg.sizeVar?.[1] ?? 1.2),
        rot: Math.random() * TAU,
        vr: rnd(-(cfg.spin ?? 2), (cfg.spin ?? 2)),
        phase: Math.random() * TAU,
        hue: hueFn(),
        seed: Math.random(),
      };
      if (cfg.velInward)  { p.vx += nrm.x * cfg.velInward;  p.vy += nrm.y * cfg.velInward; }
      if (cfg.velOutward) { p.vx -= nrm.x * cfg.velOutward; p.vy -= nrm.y * cfg.velOutward; }
      if (cfg.velTangent) {
        const s = cfg.velTangentSign ?? (Math.random() < 0.5 ? -1 : 1);
        p.vx += tan.x * cfg.velTangent * s;
        p.vy += tan.y * cfg.velTangent * s;
      }
      if (cfg.spread) { p.vx += rnd(-cfg.spread, cfg.spread); p.vy += rnd(-cfg.spread, cfg.spread); }
      if (cfg.init) cfg.init(p);
      return p;
    };
  }

  // ---------------------------------------------------------------
  //  Master factory
  //
  //  cfg: {
  //    // Core
  //    kind: 'perimeter' | 'head' | 'dual' | 'burst'
  //    count: 50,                    // perimeter/dual target
  //    rate: 40,                     // head emit rate per sec
  //    speed: 0.28,                  // head perimeter speed
  //    inset, life:[lo,hi], size, sizeVar, spin, jitter,
  //    velInward, velOutward, velTangent, spread, gravity, wind, drag,
  //    orbit: { r, w, shrink }, attract: { x, y, strength },
  //    // Render
  //    shape: 'glow' | 'dot' | ... | 'custom',
  //    hue, sat, lit, color, alpha, sizeMod, lineWidth, shadow,
  //    blend: 'lighter' | 'source-over',
  //    // Escape hatches
  //    init(p), update(p, dt), draw(ctx, p, cfg),   // draw for shape:'custom'
  //    // Dual-layer head accents
  //    head: { rate, size, shape, hue, ... }         // uses the same grammar
  //    // Symmetry — draws each particle mirrored N times around center
  //    symmetry: 1,
  //  }
  // ---------------------------------------------------------------
  function FX(cfg) {
    const hueFn = resolveHue(cfg.hue);
    const spawner = makeSpawner(cfg, hueFn);
    const shapeFn = SHAPES[cfg.shape || "glow"] || SHAPES.glow;

    // Optional nested head emitter (own sub-config)
    let headFX = null;
    if (cfg.head) {
      const hCfg = Object.assign({ shape: "glow", kind: "head", speed: 0.3, rate: 60 }, cfg.head);
      const hHue = resolveHue(hCfg.hue);
      const hSpawner = makeSpawner(hCfg, hHue);
      const hShape = SHAPES[hCfg.shape] || SHAPES.glow;
      headFX = { cfg: hCfg, spawn: hSpawner, shape: hShape, parts: [], t: Math.random() };
    }

    return function instantiate() {
      const parts = [];
      const state = { t: Math.random() };

      return {
        step(dt, W, H) {
          // Main emitter
          if (cfg.kind === "head") {
            state.t = (state.t + (cfg.speed || 0.28) * dt) % 1;
            const rate = (cfg.rate || 40) * dt;
            let emit = (rate | 0) + (Math.random() < (rate - (rate | 0)) ? 1 : 0);
            for (let i = 0; i < emit; i++) parts.push(spawner(W, H, state.t));
          } else if (cfg.kind === "burst") {
            // burst: emit a pulse every cfg.interval seconds
            state.acc = (state.acc || 0) + dt;
            if (state.acc >= (cfg.interval || 0.5)) {
              state.acc = 0;
              const n = cfg.burstCount || 12;
              const t = Math.random();
              for (let i = 0; i < n; i++) parts.push(spawner(W, H, t));
            }
          } else {
            const target = cfg.count || 50;
            while (parts.length < target) parts.push(spawner(W, H));
          }

          // Update main
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            applyMotion(p, cfg, dt);
            p.rot += p.vr * dt;
            p.phase += cfg.phaseSpeed || 0.08;
            p.life -= dt / p.maxLife;
            if (cfg.update) cfg.update(p, dt);
            if (p.life <= 0) parts.splice(i, 1);
          }

          // Head sub-emitter (if present)
          if (headFX) {
            headFX.t = (headFX.t + (headFX.cfg.speed || 0.3) * dt) % 1;
            const rate = (headFX.cfg.rate || 60) * dt;
            let emit = (rate | 0) + (Math.random() < (rate - (rate | 0)) ? 1 : 0);
            for (let i = 0; i < emit; i++) headFX.parts.push(headFX.spawn(W, H, headFX.t));
            for (let i = headFX.parts.length - 1; i >= 0; i--) {
              const p = headFX.parts[i];
              applyMotion(p, headFX.cfg, dt);
              p.rot += p.vr * dt;
              p.phase += headFX.cfg.phaseSpeed || 0.08;
              p.life -= dt / p.maxLife;
              if (headFX.cfg.update) headFX.cfg.update(p, dt);
              if (p.life <= 0) headFX.parts.splice(i, 1);
            }
          }
        },
        draw(ctx, W, H) {
          ctx.globalCompositeOperation = cfg.blend || "lighter";
          const sym = cfg.symmetry | 0;
          if (sym > 1) {
            const cxw = W / 2, cyw = H / 2;
            for (let s = 0; s < sym; s++) {
              ctx.save();
              ctx.translate(cxw, cyw);
              ctx.rotate((s / sym) * TAU);
              ctx.translate(-cxw, -cyw);
              for (const p of parts) shapeFn(ctx, p, cfg);
              ctx.restore();
            }
          } else {
            for (const p of parts) shapeFn(ctx, p, cfg);
          }
          if (headFX) {
            ctx.globalCompositeOperation = headFX.cfg.blend || "lighter";
            for (const p of headFX.parts) headFX.shape(ctx, p, headFX.cfg);
            // Bright head glyph
            if (headFX.cfg.headDot !== false) {
              const h = perim(headFX.t, W, H, headFX.cfg.inset ?? 3);
              const hue = typeof headFX.cfg.headDotHue === "number" ? headFX.cfg.headDotHue : 0;
              const col = headFX.cfg.headDotColor
                        || `hsl(${hue || 50}, 100%, 90%)`;
              const r = headFX.cfg.headDotR || 5;
              const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 2);
              g.addColorStop(0, col);
              g.addColorStop(1, "rgba(0,0,0,0)");
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(h.x, h.y, r * 2, 0, TAU); ctx.fill();
            }
          }
        },
      };
    };
  }

  // ---------------------------------------------------------------
  //  Bulk registration helper
  //    defineEffects([{ id, name, ...cfg }, ...])
  //  Writes window.FX_META[id] = name and registers the effect.
  //  (Names are separately mirrored into BORDER_EFFECTS by app.js.)
  // ---------------------------------------------------------------
  function defineEffects(list) {
    window.FX_META = window.FX_META || {};
    for (const spec of list) {
      const { id, name, factory, ...cfg } = spec;
      window.FX_META[id] = { name };
      if (factory) {
        register(id, factory);
      } else {
        register(id, FX(cfg));
      }
    }
  }

  // ---------------------------------------------------------------
  //  Public surface
  // ---------------------------------------------------------------
  window.FX = FX;
  window.FX.define = defineEffects;
  window.FX.palettes = PALETTES;
  window.FX.shapes = SHAPES;                 // extend by assignment
  window.FX.addShape = (n, fn) => { SHAPES[n] = fn; };
  window.FX.resolveHue = resolveHue;
})();
