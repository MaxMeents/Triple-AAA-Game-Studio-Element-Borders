/* ================================================================
   FX-ENGINE v2  —  emitter.js
   ----------------------------------------------------------------
   An Emitter owns a bag of particles and is responsible for:

     • spawning new particles at a rate / pattern
     • stepping their simulation each frame
     • drawing them each frame

   Emitter kinds:

     perimeter       maintain a constant ambient count
     head            single comet walking the perimeter
     multi-head      N comets equally spaced
     burst           timed bursts of N particles
     corners         emits only from corner regions
     side            emits only from one chosen side
     radial          emit from centre outward
     emitterFn(p)    user-defined emission callback

   An effect is composed of one or more Emitters; this module is
   imported by engine.js which handles multi-emitter composition,
   trail buffers, and adaptive quality.
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const core = NS.core, pool = NS.pool, geom = NS.geometry,
        palettes = NS.palettes, tracks = NS.tracks,
        forces = NS.forces, shapesMod = NS.shapes;

  if (!core || !pool || !geom || !palettes || !tracks || !forces || !shapesMod) {
    console.warn("[fx/emitter] missing dependencies"); return;
  }

  const { TAU, random, rnd, clamp } = core;
  const { perim, mapEmission, equallySpaced } = geom;
  const { resolveHue } = palettes;
  const { evalTrack, sizeModifier, alphaModifier } = tracks;
  const { applyForces } = forces;
  const { SHAPES } = shapesMod;
  const { obtain, release } = pool;

  // =================================================================
  //  Public:  makeEmitter(cfg, global)  →  { update, draw, parts }
  //
  //  `global` is the shared FX instance state (time, quality, …)
  // =================================================================
  function makeEmitter(cfg, global) {
    const kind = cfg.kind || "perimeter";

    // Delegate non-particle renderer kinds (stroke / glowFrame / ...)
    // to the border module.  These return the same interface shape so
    // the rest of the engine doesn't need to special-case them.
    if (NS.border && typeof NS.border.createRenderer === "function") {
      const r = NS.border.createRenderer(kind, cfg, global);
      if (r) return r;
    }

    const hueFn = resolveHue(cfg.hue, random);
    const perimOpts = Object.assign(
      {
        shape: cfg.perimShape || global.perimShape || "rect",
        inset: cfg.inset ?? 2,
        cornerRadius: cfg.cornerRadius ?? global.cornerRadius,
        sides:        cfg.perimSides ?? global.perimSides,
        points:       cfg.perimPoints ?? global.perimPoints,
        innerRatio:   cfg.perimInnerRatio ?? global.perimInnerRatio,
        exponent:     cfg.perimExponent ?? global.perimExponent,
        rotate:       cfg.perimRotate ?? global.perimRotate,
      }
    );
    const weighting   = cfg.weighting   ?? global.weighting ?? "uniform";
    const sideFilter  = cfg.side;        // restrict emission to one side index
    const headsCount  = Math.max(1, cfg.heads || 1);
    const headsOffset = cfg.headsOffset || 0;

    // Head walkers
    const walkers = [];
    if (kind === "head" || kind === "multi-head") {
      const spacing = equallySpaced(headsCount, headsOffset);
      for (let i = 0; i < headsCount; i++) {
        walkers.push({ t: spacing[i] + (random() * 0.02 - 0.01) });
      }
    }

    const parts = [];
    const state = { burstAcc: 0, spawnAcc: 0, time: 0 };

    // -----------------------------------------------------------------
    //  Spawn one particle at perimeter-t `t`.
    //  Some kinds provide their own t (head, burst); perimeter kind
    //  samples a fresh random t respecting weighting + sideFilter.
    // -----------------------------------------------------------------
    function spawn(W, H, t) {
      if (t == null) {
        let u = random();
        if (sideFilter != null) {
          u = sideFilter / 4 + u * 0.25;
        }
        t = mapEmission(u, weighting);
      }
      const s = perim(t, W, H, perimOpts);
      const p = obtain();
      const jit = cfg.jitter || 0;
      p.x = s.x + (jit ? rnd(-jit, jit) : 0);
      p.y = s.y + (jit ? rnd(-jit, jit) : 0);
      p.cx = s.x; p.cy = s.y;
      p.a = s.a; p.side = s.side;
      p.tx = s.tx; p.ty = s.ty;
      p.nx = s.nx; p.ny = s.ny;
      p.vx = 0; p.vy = 0;

      p.life = 1;
      const lifeRange = cfg.life || [0.8, 1.4];
      p.maxLife = rnd(lifeRange[0], lifeRange[1]);

      const base = cfg.size || 2;
      const sv = cfg.sizeVar || [0.7, 1.2];
      p.size = base * rnd(sv[0], sv[1]);

      p.rot = random() * TAU;
      const spin = cfg.spin ?? 2;
      p.vr = rnd(-spin, spin);
      p.phase = random() * TAU;
      p.hue = hueFn();
      p.seed = random();
      p.born = global.time;

      if (cfg.velInward)  { p.vx += s.nx * cfg.velInward;  p.vy += s.ny * cfg.velInward; }
      if (cfg.velOutward) { p.vx -= s.nx * cfg.velOutward; p.vy -= s.ny * cfg.velOutward; }
      if (cfg.velTangent) {
        const sign = cfg.velTangentSign ?? (random() < 0.5 ? -1 : 1);
        p.vx += s.tx * cfg.velTangent * sign;
        p.vy += s.ty * cfg.velTangent * sign;
      }
      if (cfg.spread) {
        p.vx += rnd(-cfg.spread, cfg.spread);
        p.vy += rnd(-cfg.spread, cfg.spread);
      }
      if (cfg.speedInit) {
        const a = random() * TAU;
        p.vx += Math.cos(a) * cfg.speedInit;
        p.vy += Math.sin(a) * cfg.speedInit;
      }

      // Birth→death colour gradient
      if (cfg.colorGradient) {
        const g = cfg.colorGradient;
        p._c0 = core.parseColor(typeof g.from === "function" ? g.from(p) : g.from);
        p._c1 = core.parseColor(typeof g.to   === "function" ? g.to(p)   : g.to);
        p._colEase = core.getEase(g.ease || "linear");
      }

      if (cfg.init)    cfg.init(p);
      if (cfg.onSpawn) cfg.onSpawn(p);
      return p;
    }

    // -----------------------------------------------------------------
    //  Update — called each frame
    // -----------------------------------------------------------------
    function update(dt, W, H, globalTime, quality) {
      state.time = globalTime;

      // ---- Emission ----
      switch (kind) {
        case "head":
        case "multi-head": {
          const speed = cfg.speed || 0.28;
          for (const w of walkers) { w.t = (w.t + speed * dt) % 1; }
          const rate = (cfg.rate || 40) * dt * quality;
          for (const w of walkers) {
            let n = rate | 0;
            if (random() < rate - n) n++;
            for (let i = 0; i < n; i++) parts.push(spawn(W, H, w.t));
          }
          break;
        }
        case "burst": {
          state.burstAcc += dt;
          const interval = cfg.interval || 0.5;
          while (state.burstAcc >= interval) {
            state.burstAcc -= interval;
            const n = Math.max(1, Math.round((cfg.burstCount || 12) * quality));
            const t0 = cfg.burstAt != null ? cfg.burstAt : random();
            const spread = cfg.burstSpread || 0;
            for (let i = 0; i < n; i++) {
              const t = spread
                ? (t0 + rnd(-spread, spread) + 1) % 1
                : t0;
              parts.push(spawn(W, H, t));
            }
            if (cfg.onBurst) cfg.onBurst(t0);
          }
          break;
        }
        case "corners": {
          const rate = (cfg.rate || 20) * dt * quality;
          let n = rate | 0;
          if (random() < rate - n) n++;
          for (let i = 0; i < n; i++) {
            const corner = (random() * 4) | 0;
            const jitter = (random() - 0.5) * 0.04;
            parts.push(spawn(W, H, ((corner / 4) + jitter + 1) % 1));
          }
          break;
        }
        case "side": {
          const rate = (cfg.rate || 30) * dt * quality;
          let n = rate | 0;
          if (random() < rate - n) n++;
          const side = sideFilter ?? 0;
          for (let i = 0; i < n; i++) {
            const t = (side / 4) + random() * 0.25;
            parts.push(spawn(W, H, t));
          }
          break;
        }
        case "radial": {
          const target = Math.max(1, Math.round((cfg.count || 40) * quality));
          while (parts.length < target) {
            const p = obtain();
            p.x = W / 2; p.y = H / 2;
            p.cx = W / 2; p.cy = H / 2;
            p.tx = 1; p.ty = 0; p.nx = 0; p.ny = 1;
            p.life = 1;
            p.maxLife = rnd((cfg.life || [0.8, 1.4])[0], (cfg.life || [0.8, 1.4])[1]);
            p.size = (cfg.size || 2) * rnd(0.8, 1.2);
            p.rot = random() * TAU;
            p.vr = rnd(-(cfg.spin ?? 2), (cfg.spin ?? 2));
            p.phase = random() * TAU;
            p.hue = hueFn();
            const a = random() * TAU;
            const sp = cfg.speedInit || 1;
            p.vx = Math.cos(a) * sp;
            p.vy = Math.sin(a) * sp;
            if (cfg.init) cfg.init(p);
            parts.push(p);
          }
          break;
        }
        default: {  // "perimeter"
          const target = Math.max(1, Math.round((cfg.count || 50) * quality));
          while (parts.length < target) parts.push(spawn(W, H));
          break;
        }
      }

      // ---- Simulation ----
      const drag = cfg.drag ?? 0.99;
      const g    = cfg.gravity || 0;
      const wind = cfg.wind || 0;
      const sway = cfg.sway || 0;
      const phaseSpeed = cfg.phaseSpeed ?? 0.08;
      const ctxObj = { W, H, time: globalTime, particles: parts };

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];

        if (cfg.orbit) {
          if (p._orbA == null) { p._orbA = random() * TAU; p._orbR = cfg.orbit.r || 4; }
          p._orbA += (cfg.orbit.w || 3) * dt;
          const r = p._orbR * (cfg.orbit.shrink ? p.life : 1);
          p.x = p.cx + Math.cos(p._orbA) * r;
          p.y = p.cy + Math.sin(p._orbA) * r;
        } else {
          p.x += p.vx;
          p.y += p.vy;
        }

        if (g)    p.vy += g;
        if (wind) p.vx += wind;
        p.vx *= drag;
        p.vy *= drag;

        if (sway) p.x += Math.sin(p.phase) * sway;
        if (cfg.forces) applyForces(p, cfg.forces, dt, ctxObj);

        p.rot += p.vr * dt;
        p.phase += phaseSpeed;
        p.life -= dt / p.maxLife;

        if (cfg.update)    cfg.update(p, dt);
        if (cfg.onUpdate)  cfg.onUpdate(p, dt);

        if (p.life <= 0) {
          if (cfg.onDeath) cfg.onDeath(p);
          if (cfg.subEmitter) spawnChildren(cfg.subEmitter, p, parts);
          parts.splice(i, 1);
          release(p);
          continue;
        }
      }

      // ---- Pre-compute per-frame render helpers ----
      const sizeMod  = cfg.sizeMod;
      const alphaCfg = cfg.alpha;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p._size = cfg.sizeTrack
          ? p.size * evalTrack(cfg.sizeTrack, p, 1)
          : p.size * sizeModifier(sizeMod, p);
        p._a = cfg.alphaTrack
          ? evalTrack(cfg.alphaTrack, p, p.life)
          : alphaModifier(alphaCfg, p);
      }
    }

    function spawnChildren(sub, parent, list) {
      const n = typeof sub.count === "function" ? sub.count(parent) : (sub.count || 3);
      for (let k = 0; k < n; k++) {
        const c = obtain();
        c.x = parent.x; c.y = parent.y;
        c.cx = parent.x; c.cy = parent.y;
        c.a = parent.a; c.side = parent.side;
        c.tx = parent.tx; c.ty = parent.ty;
        c.nx = parent.nx; c.ny = parent.ny;
        const sp = sub.spread ?? 1;
        c.vx = rnd(-sp, sp); c.vy = rnd(-sp, sp);
        c.life = 1;
        c.maxLife = rnd((sub.life || [0.3, 0.6])[0], (sub.life || [0.3, 0.6])[1]);
        c.size = (sub.size || parent.size * 0.5) * rnd(0.7, 1.2);
        c.rot = random() * TAU;
        c.vr = rnd(-(sub.spin ?? 2), (sub.spin ?? 2));
        c.phase = random() * TAU;
        c.hue = sub.hue != null
          ? (typeof sub.hue === "function" ? sub.hue(parent) : sub.hue)
          : parent.hue;
        list.push(c);
      }
    }

    // -----------------------------------------------------------------
    //  Draw — called each frame (after update)
    // -----------------------------------------------------------------
    function draw(ctx, W, H) {
      ctx.globalCompositeOperation = cfg.blend || "lighter";
      const shape = cfg.shape || "glow";
      const drawFn = SHAPES[shape] || SHAPES.glow;
      const sym = (cfg.symmetry | 0) || 1;

      if (sym > 1) {
        const cx = W / 2, cy = H / 2;
        for (let s = 0; s < sym; s++) {
          ctx.save();
          ctx.translate(cx, cy); ctx.rotate((s / sym) * TAU); ctx.translate(-cx, -cy);
          for (let i = 0; i < parts.length; i++) drawFn(ctx, parts[i], cfg);
          ctx.restore();
        }
      } else {
        for (let i = 0; i < parts.length; i++) drawFn(ctx, parts[i], cfg);
      }

      // Head dot accents
      if ((kind === "head" || kind === "multi-head") && cfg.headDot !== false) {
        const r = cfg.headDotR || 5;
        const color = cfg.headDotColor || "hsl(" + (cfg.headDotHue ?? 50) + ",100%,90%)";
        for (const w of walkers) {
          const s = perim(w.t, W, H, perimOpts);
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2);
          g.addColorStop(0, color);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 2, 0, TAU); ctx.fill();
        }
      }

      // Optional per-frame overlay
      if (cfg.overlay) cfg.overlay(ctx, W, H, parts);
    }

    function dispose() {
      for (const p of parts) release(p);
      parts.length = 0;
    }

    return { update, draw, dispose, parts, kind, cfg };
  }

  NS.emitter = { makeEmitter };
})();
