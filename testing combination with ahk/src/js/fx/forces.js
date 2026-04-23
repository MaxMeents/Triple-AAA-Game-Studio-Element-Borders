/* ================================================================
   FX-ENGINE v2  —  forces.js
   ----------------------------------------------------------------
   Pluggable force field library.  Each force is a pure function
   `(p, dt, ctx)` that mutates a particle's velocity.  Forces are
   invoked every frame, in array order, from the emitter loop.

   Forces accept configuration through their own object.  Example:

     forces: [
       { type: "gravity",   y: 0.12 },
       { type: "noise",     scale: 0.02, strength: 0.4, flow: 0.3 },
       { type: "attractor", x: 0.5, y: 0.5, strength: 0.08 },
       { type: "vortex",    strength: 0.06 },
     ]

   Positions inside force descriptors accept normalised [0..1]
   coordinates when `rel` is true (default) or pixel coordinates
   when `rel: false`.

   Built-ins: gravity · wind · drag · clamp · noise · curl · turbulence
              attractor · repeller · vortex · spring · swarm · bounce
              magneticField · orbit · brake · jitter · followEdge · seek
              repelWalls · cap

   Extend at runtime via FX.addForce(name, fn).
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const core = NS.core, noise = NS.noise;
  if (!core) { console.warn("[fx/forces] core.js not loaded"); return; }
  const { PI, TAU, random, hypot } = core;

  const resolveX = (f, W) => f.rel === false ? (f.x ?? W / 2) : ((f.x ?? 0.5) * W);
  const resolveY = (f, H) => f.rel === false ? (f.y ?? H / 2) : ((f.y ?? 0.5) * H);

  const FORCES = Object.create(null);

  // -----------------------------------------------------------------
  //  Linear forces
  // -----------------------------------------------------------------
  FORCES.gravity = (p, dt, f) => { p.vy += (f.y ?? 0.1) * dt * 60; };
  FORCES.wind    = (p, dt, f) => { p.vx += (f.x ?? 0) * dt * 60; p.vy += (f.y ?? 0) * dt * 60; };
  FORCES.drag    = (p, dt, f) => { const k = f.k ?? 0.98; p.vx *= k; p.vy *= k; };
  FORCES.brake   = (p, dt, f) => { const k = Math.max(0, 1 - (f.strength ?? 1) * dt); p.vx *= k; p.vy *= k; };
  FORCES.jitter  = (p, dt, f) => {
    const s = f.strength ?? 0.3;
    p.vx += (random() - 0.5) * s;
    p.vy += (random() - 0.5) * s;
  };
  FORCES.cap = (p, dt, f) => {
    const max = f.max ?? 3;
    const v2 = p.vx * p.vx + p.vy * p.vy;
    if (v2 > max * max) {
      const s = max / Math.sqrt(v2);
      p.vx *= s; p.vy *= s;
    }
  };

  // -----------------------------------------------------------------
  //  Field-driven forces (noise)
  // -----------------------------------------------------------------
  FORCES.noise = (p, dt, f, ctx) => {
    if (!noise) return;
    const scale = f.scale ?? 0.01;
    const str   = f.strength ?? 0.3;
    const flow  = f.flow ?? 0.2;
    const oct   = f.octaves ?? 2;
    const nx = noise.fbm(p.x * scale + ctx.time * flow, p.y * scale, oct);
    const ny = noise.fbm(p.x * scale,                    p.y * scale + ctx.time * flow, oct);
    p.vx += nx * str;
    p.vy += ny * str;
  };

  FORCES.curl = (p, dt, f, ctx) => {
    if (!noise) return;
    const scale = f.scale ?? 0.01;
    const str   = f.strength ?? 0.5;
    const v = noise.curl2D(p.x * scale + ctx.time * (f.flow ?? 0.1), p.y * scale);
    p.vx += v.x * str;
    p.vy += v.y * str;
  };

  FORCES.turbulence = (p, dt, f, ctx) => {
    if (!noise) return;
    const scale = f.scale ?? 0.025;
    const str   = f.strength ?? 0.6;
    const v = noise.warp(p.x * scale + ctx.time * 0.15, p.y * scale);
    const ang = v * TAU;
    p.vx += Math.cos(ang) * str;
    p.vy += Math.sin(ang) * str;
  };

  // -----------------------------------------------------------------
  //  Radial forces (point sources)
  // -----------------------------------------------------------------
  FORCES.attractor = (p, dt, f, ctx) => {
    const ax = resolveX(f, ctx.W), ay = resolveY(f, ctx.H);
    const dx = ax - p.x, dy = ay - p.y;
    const d  = hypot(dx, dy) + 1;
    const rd = f.radius ?? Infinity;
    if (d > rd) return;
    const falloff = f.falloff ?? 1;
    const s = (f.strength ?? 0.05) / Math.pow(d, falloff);
    p.vx += dx * s;
    p.vy += dy * s;
  };
  FORCES.repeller = (p, dt, f, ctx) => {
    const ax = resolveX(f, ctx.W), ay = resolveY(f, ctx.H);
    const dx = p.x - ax, dy = p.y - ay;
    const d  = hypot(dx, dy) + 1;
    const rd = f.radius ?? Infinity;
    if (d > rd) return;
    const s = (f.strength ?? 1) / (d * d);
    p.vx += dx * s;
    p.vy += dy * s;
  };
  FORCES.vortex = (p, dt, f, ctx) => {
    const ax = resolveX(f, ctx.W), ay = resolveY(f, ctx.H);
    const dx = p.x - ax, dy = p.y - ay;
    const d  = hypot(dx, dy) + 1;
    const rd = f.radius ?? Infinity;
    if (d > rd) return;
    const s = (f.strength ?? 0.05);
    const swirl = (f.swirl ?? 1);
    p.vx += (-dy / d) * s * swirl;
    p.vy += ( dx / d) * s * swirl;
    if (f.pull) {
      p.vx += (dx / d) * -f.pull;
      p.vy += (dy / d) * -f.pull;
    }
  };
  FORCES.magneticField = (p, dt, f, ctx) => {
    // Perpendicular to velocity — gentle circular bend
    const s = (f.strength ?? 0.05);
    p.vx += -p.vy * s;
    p.vy +=  p.vx * s;
  };

  // -----------------------------------------------------------------
  //  State-driven forces (act on particle, not world)
  // -----------------------------------------------------------------
  FORCES.spring = (p, dt, f) => {
    // Pull toward spawn origin (Hooke's law)
    const k = f.k ?? 0.02;
    const damp = f.damp ?? 0.9;
    p.vx += (p.cx - p.x) * k;
    p.vy += (p.cy - p.y) * k;
    p.vx *= damp;
    p.vy *= damp;
  };
  FORCES.seek = (p, dt, f, ctx) => {
    // Steer toward a moving target (pulsing centre by default)
    const tx = resolveX(f, ctx.W) + (f.wobbleX ? Math.cos(ctx.time * 2) * f.wobbleX : 0);
    const ty = resolveY(f, ctx.H) + (f.wobbleY ? Math.sin(ctx.time * 2) * f.wobbleY : 0);
    const dx = tx - p.x, dy = ty - p.y;
    const d  = hypot(dx, dy) + 1;
    const s  = (f.strength ?? 0.05);
    p.vx += (dx / d) * s;
    p.vy += (dy / d) * s;
  };
  FORCES.orbit = (p, dt, f, ctx) => {
    // Maintain radial distance from a point
    const ax = resolveX(f, ctx.W), ay = resolveY(f, ctx.H);
    const dx = p.x - ax, dy = p.y - ay;
    const d  = hypot(dx, dy) + 1;
    const target = f.radius ?? 40;
    const err = d - target;
    const tangX = -dy / d, tangY = dx / d;
    p.vx += tangX * (f.swirl ?? 0.4);
    p.vy += tangY * (f.swirl ?? 0.4);
    p.vx += (-dx / d) * err * (f.k ?? 0.02);
    p.vy += (-dy / d) * err * (f.k ?? 0.02);
  };

  // -----------------------------------------------------------------
  //  Boundary forces (keep things inside/outside a region)
  // -----------------------------------------------------------------
  FORCES.bounce = (p, dt, f, ctx) => {
    const pad = f.padding ?? 2;
    const e   = f.e ?? 0.7;
    if (p.x < pad)             { p.x = pad;             p.vx = Math.abs(p.vx) * e; }
    if (p.x > ctx.W - pad)     { p.x = ctx.W - pad;     p.vx = -Math.abs(p.vx) * e; }
    if (p.y < pad)             { p.y = pad;             p.vy = Math.abs(p.vy) * e; }
    if (p.y > ctx.H - pad)     { p.y = ctx.H - pad;     p.vy = -Math.abs(p.vy) * e; }
  };
  FORCES.clamp = (p, dt, f, ctx) => {
    const pad = f.padding ?? 0;
    p.x = p.x < pad ? pad : p.x > ctx.W - pad ? ctx.W - pad : p.x;
    p.y = p.y < pad ? pad : p.y > ctx.H - pad ? ctx.H - pad : p.y;
  };
  FORCES.repelWalls = (p, dt, f, ctx) => {
    const pad = f.padding ?? 6;
    const s   = f.strength ?? 0.2;
    if (p.x < pad)               p.vx += (pad - p.x) * s;
    if (p.x > ctx.W - pad)       p.vx -= (p.x - (ctx.W - pad)) * s;
    if (p.y < pad)               p.vy += (pad - p.y) * s;
    if (p.y > ctx.H - pad)       p.vy -= (p.y - (ctx.H - pad)) * s;
  };

  // -----------------------------------------------------------------
  //  Perimeter-aware forces
  // -----------------------------------------------------------------
  FORCES.followEdge = (p, dt, f) => {
    // Re-align velocity along the emission tangent (good for rivers).
    const s = f.strength ?? 0.04;
    p.vx += p.tx * s;
    p.vy += p.ty * s;
  };

  // -----------------------------------------------------------------
  //  Simplistic swarm/flocking — approximate (no spatial hash).
  //  Ignored for huge particle counts; keep disabled by default.
  // -----------------------------------------------------------------
  FORCES.swarm = (p, dt, f, ctx) => {
    const others = ctx.particles;
    if (!others || others.length < 2) return;
    let cx = 0, cy = 0, n = 0;
    for (let i = 0; i < others.length; i += Math.max(1, (others.length / 32) | 0)) {
      const o = others[i];
      if (o === p) continue;
      const dx = o.x - p.x, dy = o.y - p.y;
      if (dx * dx + dy * dy < (f.radius || 30) ** 2) {
        cx += o.x; cy += o.y; n++;
      }
    }
    if (n === 0) return;
    cx /= n; cy /= n;
    const dx = cx - p.x, dy = cy - p.y;
    const s = (f.strength ?? 0.02);
    p.vx += dx * s; p.vy += dy * s;
  };

  // -----------------------------------------------------------------
  //  Driver
  // -----------------------------------------------------------------
  function applyForces(p, forces, dt, ctx) {
    if (!forces) return;
    for (let i = 0; i < forces.length; i++) {
      const f  = forces[i];
      const fn = typeof f === "function" ? f : FORCES[f.type];
      if (fn) fn(p, dt, f, ctx);
    }
  }

  function addForce(name, fn) { FORCES[name] = fn; }

  NS.forces = { applyForces, addForce, FORCES };
})();
