/*! =====================================================================
 *  Max FX Engine  --  single-file build
 *  ---------------------------------------------------------------------
 *  Modular particle / border FX engine for HTML5 canvas.
 *
 *  USAGE
 *  -----
 *    <script src="Max_FX_Engine.js"></script>
 *    <canvas id="c" width="480" height="320"></canvas>
 *    <script>
 *      const cvs = document.getElementById('c');
 *      const ctx = cvs.getContext('2d');
 *      const inst = FX({
 *        kind: 'perimeter', shape: 'glow', hue: 'rainbow',
 *        count: 40, size: 3, life: [0.8, 1.4]
 *      })();
 *      let last = performance.now();
 *      (function loop(now){
 *        const dt = (now - last)/1000; last = now;
 *        ctx.clearRect(0,0,cvs.width,cvs.height);
 *        inst.step(dt, cvs.width, cvs.height);
 *        inst.draw(ctx, cvs.width, cvs.height);
 *        requestAnimationFrame(loop);
 *      })(last);
 *    </script>
 *
 *  Exposes:  window.FX    - factory + helpers
 *            window.__FX  - internal namespace (core, shapes, ...)
 *
 *  Built: 2026-04-23 06:08:24
 *  Modules bundled (in load order):
 *    core, noise, palettes, geometry, pool, tracks, forces, shapes, border, emitter, presets, engine, devtools
 * ===================================================================== */

/* ==== core.js ==== */
/* ================================================================
   FX-ENGINE v2  —  core.js
   ----------------------------------------------------------------
   Foundational primitives used by every other module:
     • math helpers        (clamp, lerp, smoothstep, map, …)
     • seeded PRNG         (Mulberry32; deterministic via FX.setSeed)
     • easing library      (~30 curves + pulse / spike / breathe)
     • color system        (parse hex / rgb / hsl, HSL interp, hsla)
     • debug logger        (FX.log.level)

   Populates a private namespace (window.__FX) that other modules
   extend, plus exposes a few utilities on window.FX later via
   engine.js.  Load order: core.js → everything else.
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};

  // -----------------------------------------------------------------
  //  Constants
  // -----------------------------------------------------------------
  const PI  = Math.PI;
  const TAU = PI * 2;
  const HALF_PI = PI / 2;
  const DEG = PI / 180;
  const RAD = 180 / PI;
  const EPS = 1e-6;

  // -----------------------------------------------------------------
  //  Math helpers (all pure, no side-effects, no allocation)
  // -----------------------------------------------------------------
  const clamp  = (x, a, b) => x < a ? a : x > b ? b : x;
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const lerp   = (a, b, t) => a + (b - a) * t;
  const unlerp = (a, b, v) => (v - a) / (b - a);
  const smoothstep = t => t * t * (3 - 2 * t);
  const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);
  const map    = (v, a1, b1, a2, b2) => a2 + (v - a1) * (b2 - a2) / (b1 - a1);
  const mapClamped = (v, a1, b1, a2, b2) => clamp(map(v, a1, b1, a2, b2), Math.min(a2, b2), Math.max(a2, b2));
  const mix    = (a, b, t) => a * (1 - t) + b * t;
  const sign   = x => x < 0 ? -1 : x > 0 ? 1 : 0;
  const hypot  = (x, y) => Math.sqrt(x * x + y * y);
  const hypotSq = (x, y) => x * x + y * y;
  const approach = (cur, goal, step) => Math.abs(goal - cur) < step ? goal : cur + Math.sign(goal - cur) * step;
  const angleDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > PI) d -= TAU;
    if (d < -PI) d += TAU;
    return d;
  };
  const lerpAngle = (a, b, t) => a + angleDiff(a, b) * t;
  const wrap   = (x, max) => ((x % max) + max) % max;
  const ping   = t => 1 - Math.abs((t % 2) - 1);   // 0..1..0..1
  const step   = (edge, x) => x < edge ? 0 : 1;

  // -----------------------------------------------------------------
  //  Seeded PRNG (Mulberry32).  Deterministic when seeded, otherwise
  //  falls back to Math.random so authoring stays natural.
  // -----------------------------------------------------------------
  let _seed = 0;
  let _useSeed = false;
  function setSeed(n) {
    _seed = (n >>> 0) || 1;
    _useSeed = true;
  }
  function clearSeed() { _useSeed = false; }
  function _mulberry() {
    _seed = (_seed + 0x6D2B79F5) >>> 0;
    let t = _seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const random = () => _useSeed ? _mulberry() : Math.random();
  const rnd    = (a, b) => a + random() * (b - a);
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const rndSign = () => random() < 0.5 ? -1 : 1;
  const rndChance = p => random() < p;
  const rndPick  = arr => arr[(random() * arr.length) | 0];
  const rndGauss = () => {
    // Box-Muller, clipped to avoid huge outliers
    let u = 0, v = 0;
    while (u === 0) u = random();
    while (v === 0) v = random();
    const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    return clamp(g, -4, 4);
  };
  const rndOnCircle = (r) => {
    const a = random() * TAU;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  };
  const rndInCircle = (r) => {
    const a = random() * TAU;
    const d = Math.sqrt(random()) * r;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  };

  // -----------------------------------------------------------------
  //  Easing library.  Exposed on FX.ease for authoring; internally
  //  consumed by tracks, transforms, colour gradients, etc.
  // -----------------------------------------------------------------
  const EASE = Object.create(null);
  EASE.linear    = t => t;
  EASE.step      = t => t < 1 ? 0 : 1;

  const power = n => {
    EASE["in"    + n.name] = t => Math.pow(t, n.v);
    EASE["out"   + n.name] = t => 1 - Math.pow(1 - t, n.v);
    EASE["inOut" + n.name] = t => t < 0.5
      ? Math.pow(2 * t, n.v) / 2
      : 1 - Math.pow(-2 * t + 2, n.v) / 2;
  };
  power({ name: "Quad",  v: 2 });
  power({ name: "Cubic", v: 3 });
  power({ name: "Quart", v: 4 });
  power({ name: "Quint", v: 5 });

  EASE.inSine    = t => 1 - Math.cos(t * HALF_PI);
  EASE.outSine   = t => Math.sin(t * HALF_PI);
  EASE.inOutSine = t => -(Math.cos(PI * t) - 1) / 2;

  EASE.inExpo    = t => t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  EASE.outExpo   = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  EASE.inOutExpo = t => t === 0 ? 0 : t === 1 ? 1
    : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2
              : (2 - Math.pow(2, -20 * t + 10)) / 2;

  EASE.inCirc    = t => 1 - Math.sqrt(1 - t * t);
  EASE.outCirc   = t => Math.sqrt(1 - (t - 1) * (t - 1));
  EASE.inOutCirc = t => t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

  EASE.inBack    = t => { const c = 1.70158, c2 = c + 1; return c2 * t * t * t - c * t * t; };
  EASE.outBack   = t => { const c = 1.70158, c2 = c + 1; return 1 + c2 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  EASE.inOutBack = t => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (2 * t - 2) + c) + 2) / 2;
  };

  EASE.outBounce = t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d)       return n * t * t;
    if (t < 2 / d)       { t -= 1.5 / d; return n * t * t + 0.75; }
    if (t < 2.5 / d)     { t -= 2.25 / d; return n * t * t + 0.9375; }
    t -= 2.625 / d;      return n * t * t + 0.984375;
  };
  EASE.inBounce    = t => 1 - EASE.outBounce(1 - t);
  EASE.inOutBounce = t => t < 0.5
    ? (1 - EASE.outBounce(1 - 2 * t)) / 2
    : (1 + EASE.outBounce(2 * t - 1)) / 2;

  EASE.inElastic  = t => {
    if (t === 0 || t === 1) return t;
    const c = (TAU) / 3;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c);
  };
  EASE.outElastic = t => {
    if (t === 0 || t === 1) return t;
    const c = (TAU) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
  };
  EASE.inOutElastic = t => {
    if (t === 0 || t === 1) return t;
    const c = (TAU) / 4.5;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10)  * Math.sin((20 * t - 11.125) * c)) / 2
      :  (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c)) / 2 + 1;
  };

  // Life-curves (domain: [0,1] → [0,1], shaped)
  EASE.pulse   = t => Math.sin(t * PI);                 // 0→1→0
  EASE.spike   = t => Math.pow(Math.sin(t * PI), 4);    // sharp pulse
  EASE.breathe = t => 0.5 + 0.5 * Math.sin(t * TAU);    // cyclical
  EASE.triangle = t => 1 - Math.abs(t * 2 - 1);
  EASE.sawtooth = t => t - Math.floor(t);
  EASE.square   = t => t < 0.5 ? 0 : 1;
  EASE.flicker  = t => (Math.sin(t * PI * 24) * 0.5 + 0.5) * (1 - t);

  const getEase = e => typeof e === "function" ? e : (EASE[e] || EASE.linear);
  const bezier = (p1x, p1y, p2x, p2y) => {
    // Cubic bezier easing factory (control points, endpoints (0,0)→(1,1))
    return t => {
      // 8-iteration newton to invert x(t)
      let u = t;
      for (let i = 0; i < 8; i++) {
        const ix = 3 * (1 - u) * (1 - u) * u * p1x + 3 * (1 - u) * u * u * p2x + u * u * u;
        const dx = 3 * (1 - u) * (1 - u) * p1x + 6 * (1 - u) * u * (p2x - p1x) + 3 * u * u * (1 - p2x);
        if (Math.abs(dx) < EPS) break;
        u -= (ix - t) / dx;
      }
      return 3 * (1 - u) * (1 - u) * u * p1y + 3 * (1 - u) * u * u * p2y + u * u * u;
    };
  };

  // -----------------------------------------------------------------
  //  Colour system.  Internal canonical colour is an HSLA object
  //  { h:0..360, s:0..100, l:0..100, a:0..1 }.  parseColor accepts
  //  CSS-style strings as well as raw objects.
  // -----------------------------------------------------------------
  function parseColor(c) {
    if (c == null) return null;
    if (typeof c === "object" && "h" in c) {
      return { h: c.h, s: c.s ?? 100, l: c.l ?? 60, a: c.a ?? 1 };
    }
    if (typeof c !== "string") return null;
    c = c.trim().toLowerCase();
    if (c[0] === "#") {
      let h = c.slice(1);
      if (h.length === 3) h = h.split("").map(x => x + x).join("");
      if (h.length === 4) h = h.split("").map(x => x + x).join("");
      if (h.length === 6) h += "ff";
      if (h.length !== 8) return null;
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = parseInt(h.slice(6, 8), 16) / 255;
      return rgbToHSL(r, g, b, a);
    }
    let m = c.match(/hsla?\(\s*([-\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?(?:[,\s/]+([\d.]+))?\s*\)/);
    if (m) return { h: +m[1], s: +m[2], l: +m[3], a: m[4] != null ? +m[4] : 1 };
    m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/);
    if (m) return rgbToHSL(+m[1], +m[2], +m[3], m[4] != null ? +m[4] : 1);
    return null;
  }
  function rgbToHSL(r, g, b, a) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100, a: a ?? 1 };
  }
  function hslToRGB(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return {
      r: Math.round(f(0) * 255),
      g: Math.round(f(8) * 255),
      b: Math.round(f(4) * 255),
    };
  }
  function hsla(o, alphaMul) {
    const a = o.a * (alphaMul == null ? 1 : alphaMul);
    return "hsla(" + (o.h | 0) + "," + (o.s | 0) + "%," + (o.l | 0) + "%," + a.toFixed(3) + ")";
  }
  function hsl(h, s, l, a) {
    return "hsla(" + (h | 0) + "," + (s | 0) + "%," + (l | 0) + "%," + (a != null ? a : 1).toFixed(3) + ")";
  }
  function hex(r, g, b) {
    const h = (n) => n.toString(16).padStart(2, "0");
    return "#" + h(r) + h(g) + h(b);
  }
  function lerpHSL(a, b, t) {
    let dh = b.h - a.h;
    if (dh >  180) dh -= 360;
    if (dh < -180) dh += 360;
    return {
      h: ((a.h + dh * t) + 360) % 360,
      s: lerp(a.s, b.s, t),
      l: lerp(a.l, b.l, t),
      a: lerp(a.a, b.a, t),
    };
  }
  function shiftHue(c, deg) { return { h: (c.h + deg + 360) % 360, s: c.s, l: c.l, a: c.a }; }
  function tint(c, amt)     { return { h: c.h, s: c.s, l: clamp(c.l + amt, 0, 100), a: c.a }; }
  function saturate(c, amt) { return { h: c.h, s: clamp(c.s + amt, 0, 100), l: c.l, a: c.a }; }

  // -----------------------------------------------------------------
  //  Tiny logger so the engine can chirp at devs without spamming
  // -----------------------------------------------------------------
  const log = {
    level: 1, // 0=silent 1=warn 2=info 3=debug
    warn(...a)  { if (log.level >= 1) console.warn("[fx]", ...a); },
    info(...a)  { if (log.level >= 2) console.info("[fx]", ...a); },
    debug(...a) { if (log.level >= 3) console.debug("[fx]", ...a); },
  };

  // -----------------------------------------------------------------
  //  Publish to internal namespace
  // -----------------------------------------------------------------
  NS.core = {
    PI, TAU, HALF_PI, DEG, RAD, EPS,
    clamp, clamp01, lerp, unlerp, smoothstep, smootherstep, map, mapClamped,
    mix, sign, hypot, hypotSq, approach, angleDiff, lerpAngle, wrap, ping, step,
    setSeed, clearSeed,
    random, rnd, rndInt, rndSign, rndChance, rndPick, rndGauss, rndOnCircle, rndInCircle,
    EASE, getEase, bezier,
    parseColor, rgbToHSL, hslToRGB, hsla, hsl, hex, lerpHSL, shiftHue, tint, saturate,
    log,
  };
})();


/* ==== noise.js ==== */
/* ================================================================
   FX-ENGINE v2  —  noise.js
   ----------------------------------------------------------------
   Deterministic-ish 2D noise primitives used for organic motion,
   turbulence, and texture-like modulation of particle properties.

   Functions exposed on __FX.noise:
     value2D(x, y)              value noise in [-1, 1]
     fbm(x, y, oct, lac, gain)  fractal brownian motion
     ridge(x, y, oct)           ridged multifractal
     curl2D(x, y, eps)          curl-noise -> divergence-free vec2
     worley2D(x, y)             Worley/cellular F1 distance in ~[0, 1]
     simplexLike(x, y)          fast "simplex-ish" noise (value+rotation)
     warp(x, y, amount)         domain-warped fbm
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const core = NS.core; if (!core) { console.warn("[fx/noise] core.js not loaded"); return; }
  const { lerp, smoothstep } = core;

  // -----------------------------------------------------------------
  //  Permutation + random gradient tables.  Seeded once at load;
  //  call FX.noise.reseed(n) to regenerate deterministically.
  // -----------------------------------------------------------------
  const N = 256;
  const MASK = N - 1;
  const perm     = new Uint8Array(N * 2);
  const gridVals = new Float32Array(N * N);
  const gradX    = new Float32Array(N);
  const gradY    = new Float32Array(N);

  function reseed(seed) {
    // xorshift32
    let s = (seed >>> 0) || 1;
    const rng = () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) / 4294967296);
    };
    const p = new Uint8Array(N);
    for (let i = 0; i < N; i++) p[i] = i;
    for (let i = N - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < N * 2; i++) perm[i] = p[i & MASK];
    for (let i = 0; i < N * N; i++) gridVals[i] = rng() * 2 - 1;
    for (let i = 0; i < N; i++) {
      const a = rng() * Math.PI * 2;
      gradX[i] = Math.cos(a); gradY[i] = Math.sin(a);
    }
  }
  reseed(0xC0FFEE);

  // -----------------------------------------------------------------
  //  Value noise: bilinear interpolation of a random lattice.
  //  Cheap, smooth, and more than adequate for particle forces.
  // -----------------------------------------------------------------
  function value2D(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi,        yf = y - yi;
    const x0 = ((xi % N) + N) & MASK;
    const y0 = ((yi % N) + N) & MASK;
    const x1 = (x0 + 1) & MASK;
    const y1 = (y0 + 1) & MASK;
    const a  = gridVals[y0 * N + x0];
    const b  = gridVals[y0 * N + x1];
    const c  = gridVals[y1 * N + x0];
    const d  = gridVals[y1 * N + x1];
    const u  = smoothstep(xf);
    const v  = smoothstep(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  // -----------------------------------------------------------------
  //  Fractal Brownian Motion — layered value noise.
  // -----------------------------------------------------------------
  function fbm(x, y, octaves, lacunarity, gain) {
    octaves    = octaves    || 4;
    lacunarity = lacunarity || 2;
    gain       = gain       || 0.5;
    let v = 0, amp = 1, freq = 1, sum = 0;
    for (let i = 0; i < octaves; i++) {
      v   += value2D(x * freq, y * freq) * amp;
      sum += amp;
      amp  *= gain;
      freq *= lacunarity;
    }
    return v / sum;
  }

  // -----------------------------------------------------------------
  //  Ridged multifractal — sharp ridges, good for "lightning bones".
  // -----------------------------------------------------------------
  function ridge(x, y, octaves) {
    octaves = octaves || 4;
    let v = 0, amp = 0.5, freq = 1, total = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(value2D(x * freq, y * freq));
      v += n * n * amp;
      total += amp;
      amp *= 0.5; freq *= 2;
    }
    return v / total;
  }

  // -----------------------------------------------------------------
  //  Curl-noise: take the curl of a potential field → divergence-free
  //  2D vector field.  Gives gorgeous flowing motion for smoke/mist.
  // -----------------------------------------------------------------
  function curl2D(x, y, eps) {
    eps = eps || 0.0015;
    const dx = fbm(x, y + eps) - fbm(x, y - eps);
    const dy = fbm(x + eps, y) - fbm(x - eps, y);
    return { x:  dy / (2 * eps), y: -dx / (2 * eps) };
  }

  // -----------------------------------------------------------------
  //  Very fast "simplex-ish" noise — value noise over a rotated
  //  lattice.  Not true simplex, but the artefact pattern differs
  //  from value2D enough to layer interestingly with it.
  // -----------------------------------------------------------------
  const ROT = Math.cos(0.5), ROT2 = Math.sin(0.5);
  function simplexLike(x, y) {
    const rx =  x * ROT + y * ROT2;
    const ry = -x * ROT2 + y * ROT;
    return value2D(rx * 1.37, ry * 1.37);
  }

  // -----------------------------------------------------------------
  //  Worley / cellular F1 distance — for blob / crystal looks.
  //  Operates on a virtual 1-unit cellgrid with 1 feature/cell.
  // -----------------------------------------------------------------
  function worley2D(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let best = Infinity;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = xi + i, cy = yi + j;
        const h  = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
        const fx = cx + ((h        & MASK) / N);
        const fy = cy + (((h >> 8) & MASK) / N);
        const dx = x - fx, dy = y - fy;
        const d = dx * dx + dy * dy;
        if (d < best) best = d;
      }
    }
    return Math.min(1, Math.sqrt(best));
  }

  // -----------------------------------------------------------------
  //  Domain-warped fbm — feeds noise into its own lookup coordinates
  //  for organic, swirly patterns.
  // -----------------------------------------------------------------
  function warp(x, y, amount) {
    amount = amount == null ? 1 : amount;
    const wx = fbm(x,       y)       * amount;
    const wy = fbm(x + 5.2, y + 1.3) * amount;
    return fbm(x + wx, y + wy);
  }

  // -----------------------------------------------------------------
  //  Publish
  // -----------------------------------------------------------------
  NS.noise = {
    reseed, value2D, fbm, ridge, curl2D, simplexLike, worley2D, warp,
  };
})();


/* ==== palettes.js ==== */
/* ================================================================
   FX-ENGINE v2  —  palettes.js
   ----------------------------------------------------------------
   Named hue palettes and higher-level colour ramps.

   Two flavours of palette:
     HUES[name]   →  [h, h, …]                 (just hue numbers)
     RAMPS[name]  →  [{h,s,l,a}, …]            (full HSLA stops)

   Both can be referenced by name in effect configs via the
   `hue` / `palette` / `colorRamp` fields. They are composable,
   extensible, and mergeable.
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};

  // -----------------------------------------------------------------
  //  Hue palettes — used when an effect wants a random hue drawn
  //  from a themed set.  Order is irrelevant.
  // -----------------------------------------------------------------
  const HUES = {
    // Elemental
    fire:        [5, 15, 25, 35, 45],
    ember:       [10, 20, 30, 40, 50],
    lava:        [0, 10, 20, 30],
    ice:         [180, 190, 200, 210, 220],
    frost:       [195, 205, 215, 220],
    steam:       [200, 210, 220],
    water:       [190, 200, 210, 220, 230],
    ocean:       [180, 200, 220, 240],
    deepsea:     [200, 220, 240, 260],
    storm:       [200, 210, 220, 230],
    thunder:     [200, 210, 220, 60],
    lightning:   [195, 205, 215, 60, 40],

    // Botanical
    forest:      [90, 110, 130, 150],
    forestmist:  [120, 140, 160, 180],
    meadow:      [80, 100, 120],
    moss:        [70, 90, 110],
    bamboo:      [70, 85, 100],
    leaf:        [100, 120, 140],
    rose:        [340, 350, 0, 10, 20],
    sakura:      [320, 330, 340, 350],
    lavender:    [260, 270, 280, 290],
    sunflower:   [40, 50, 60],
    autumn:      [15, 25, 35, 45],

    // Cosmic / ethereal
    void:        [260, 275, 290, 305],
    nebula:      [260, 280, 300, 320, 340],
    galaxy:      [230, 260, 290, 320],
    plasma:      [270, 285, 300, 315],
    cosmos:      [200, 240, 280, 320],
    starfield:   [200, 210, 45, 55, 0],
    aurora:      [140, 180, 220, 280, 320],

    // Cultural / thematic
    gold:        [40, 45, 50, 55],
    silver:      [205, 210, 215],
    bronze:      [25, 30, 35],
    copper:      [15, 20, 25],
    holy:        [45, 50, 55, 60],
    shadow:      [260, 275, 290],
    blood:       [350, 0, 5, 10],
    venom:       [110, 120, 130, 140],
    toxic:       [90, 110, 130],
    poison:      [95, 110, 125],
    necro:       [110, 160, 270],
    arcane:      [270, 290, 310],
    rune:        [200, 260, 320],
    paladin:     [45, 50, 55, 200],

    // Retro / synthetic
    rainbow:     [0, 60, 120, 180, 240, 300],
    neon:        [320, 180, 60, 280],
    cyberpunk:   [320, 190, 60],
    arcade:      [0, 60, 120, 180, 240, 300],
    vaporwave:   [280, 320, 180, 200],
    hologram:    [180, 200, 280, 320],
    glitch:      [320, 180, 60],
    synth:       [300, 220, 180],
    bitpop:      [0, 45, 120, 200, 280],

    // Mood
    sunset:      [15, 30, 330, 345],
    sunrise:     [30, 40, 50, 340],
    dusk:        [260, 290, 320, 30],
    dawn:        [30, 45, 200],
    candlelight: [30, 35, 40],
    pastel:      [330, 45, 150, 210, 270],
    mono:        [0],
    muted:       [200, 30, 120],

    // Materials
    mercury:     [210, 220, 230],
    amber:       [35, 40, 45],
    jade:        [140, 150, 160],
    emerald:     [130, 145, 160],
    sapphire:    [210, 220, 230],
    ruby:        [350, 0, 10],
    obsidian:    [260, 270, 280],
    pearl:       [30, 45, 200],

    // Seasons
    spring:      [90, 100, 340, 50],
    summer:      [50, 100, 180, 40],
    autumnFall:  [15, 25, 35, 45, 300],
    winter:      [200, 210, 220, 230],
  };

  // Alias map (for readability / typo-resilience)
  const ALIASES = {
    emberglow: "ember",
    infernal:  "fire",
    chill:     "frost",
    snow:      "ice",
    abyss:     "void",
    royal:     "arcane",
    mage:      "arcane",
    demon:     "blood",
    undead:    "necro",
  };
  Object.keys(ALIASES).forEach(k => { HUES[k] = HUES[ALIASES[k]]; });

  // -----------------------------------------------------------------
  //  Full HSLA ramps — stops used for gradient colouring across
  //  particle life or across a track keyframe list.
  //
  //  Each ramp is an array of colour stops in timeline order.
  // -----------------------------------------------------------------
  const RAMPS = {
    inferno: [
      { h:  45, s: 100, l: 95, a: 1 },
      { h:  30, s: 100, l: 70, a: 1 },
      { h:  10, s: 100, l: 45, a: 0.9 },
      { h:   0, s:  80, l: 20, a: 0 },
    ],
    magma: [
      { h:  50, s: 100, l: 90, a: 1 },
      { h:  20, s: 100, l: 55, a: 1 },
      { h: 340, s:  90, l: 30, a: 0.7 },
      { h: 260, s:  50, l: 10, a: 0 },
    ],
    arcticbreath: [
      { h: 200, s: 100, l: 95, a: 1 },
      { h: 200, s: 100, l: 70, a: 0.9 },
      { h: 210, s:  80, l: 40, a: 0 },
    ],
    bioluminescent: [
      { h: 165, s: 100, l: 80, a: 1 },
      { h: 180, s: 100, l: 60, a: 0.9 },
      { h: 195, s:  90, l: 40, a: 0.5 },
      { h: 210, s:  70, l: 20, a: 0 },
    ],
    candyfloss: [
      { h: 330, s: 100, l: 85, a: 1 },
      { h: 300, s:  90, l: 70, a: 1 },
      { h: 200, s:  80, l: 75, a: 0.7 },
      { h: 180, s:  60, l: 80, a: 0 },
    ],
    holyray: [
      { h:  55, s: 100, l: 95, a: 1 },
      { h:  48, s: 100, l: 75, a: 1 },
      { h:  45, s:  80, l: 55, a: 0.5 },
      { h:  40, s:  60, l: 30, a: 0 },
    ],
    toxicooze: [
      { h: 110, s: 100, l: 70, a: 1 },
      { h: 100, s: 100, l: 50, a: 0.9 },
      { h:  90, s:  80, l: 30, a: 0.4 },
      { h:  80, s:  50, l: 10, a: 0 },
    ],
    neonpunk: [
      { h: 320, s: 100, l: 70, a: 1 },
      { h: 280, s: 100, l: 60, a: 1 },
      { h: 180, s: 100, l: 55, a: 0.8 },
      { h:  60, s: 100, l: 50, a: 0 },
    ],
    twilight: [
      { h: 260, s:  60, l: 35, a: 1 },
      { h: 320, s:  60, l: 55, a: 0.9 },
      { h:  30, s:  80, l: 70, a: 0.5 },
      { h:  45, s:  90, l: 85, a: 0 },
    ],
    galaxydrift: [
      { h: 230, s:  80, l: 20, a: 1 },
      { h: 270, s:  70, l: 45, a: 0.9 },
      { h: 310, s:  90, l: 65, a: 0.7 },
      { h:  55, s: 100, l: 90, a: 0 },
    ],
    ember2ash: [
      { h:  25, s: 100, l: 70, a: 1 },
      { h:  10, s:  80, l: 40, a: 0.8 },
      { h:   0, s:  10, l: 25, a: 0.3 },
      { h:   0, s:   0, l: 10, a: 0 },
    ],
    divine: [
      { h:  45, s: 100, l: 95, a: 1 },
      { h:  40, s: 100, l: 85, a: 1 },
      { h:   0, s:   0, l: 95, a: 0 },
    ],
  };

  // -----------------------------------------------------------------
  //  Resolve a "hue spec" into a hue-number generator function.
  //  A hue spec can be:
  //    number          → fixed hue
  //    "rainbow"       → random [0,360)
  //    palette name    → random pick from HUES[name]
  //    [lo, hi] pair   → random within range (if difference ≤ 360)
  //    array of nums   → random pick
  //    function        → called to produce a hue number
  // -----------------------------------------------------------------
  function resolveHue(spec, randomFn) {
    const rnd = randomFn || Math.random;
    if (spec == null) return () => 0;
    if (typeof spec === "function") return spec;
    if (typeof spec === "number")   return () => spec;
    if (typeof spec === "string") {
      if (spec === "rainbow")  return () => rnd() * 360;
      const P = HUES[spec];
      if (P) return () => P[(rnd() * P.length) | 0];
      return () => 0;
    }
    if (Array.isArray(spec)) {
      if (spec.length === 2 && typeof spec[0] === "number" && typeof spec[1] === "number" && Math.abs(spec[1] - spec[0]) <= 360) {
        return () => spec[0] + rnd() * (spec[1] - spec[0]);
      }
      return () => spec[(rnd() * spec.length) | 0];
    }
    return () => 0;
  }

  function addHues(name, list)   { HUES[name]  = list.slice(); }
  function addRamp(name, stops)  { RAMPS[name] = stops.map(s => Object.assign({ a: 1 }, s)); }

  NS.palettes = { HUES, RAMPS, resolveHue, addHues, addRamp };
})();


/* ==== geometry.js ==== */
/* ================================================================
   FX-ENGINE v2  —  geometry.js
   ----------------------------------------------------------------
   Perimeter geometry + emission weighting.

   Every emitter in v2 walks along a *perimeter curve* defined by
   `perimShape`.  Built-in curves:

     "rect"         straight rectangle (default)
     "roundrect"    rectangle with rounded corners (cornerRadius)
     "circle"       circle inscribed in the card
     "ellipse"      ellipse sized to card dimensions
     "diamond"      rotated square (rhombus)
     "star"         N-pointed star perimeter
     "polygon"      regular N-gon
     "superellipse" Lamé curve (blend between rect and circle)
     function(t,W,H,opts) → {x,y,a,tx,ty,nx,ny,side}

   Every curve returns a point sample record containing position
   (x,y), tangent angle `a`, tangent unit vector (tx,ty), inward
   normal unit vector (nx,ny), and a coarse side index (0..3 for
   rectangles, 0..N-1 for polygons, 0..3 for circles by quadrant).

   Emission-weighting functions (`mapEmission`) bias a uniform
   t ∈ [0,1] input toward sides / corners / custom distributions.
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const core = NS.core; if (!core) { console.warn("[fx/geometry] core.js not loaded"); return; }
  const { PI, TAU, HALF_PI, smoothstep } = core;

  // =================================================================
  //  1. Rect
  // =================================================================
  function perimRect(t, W, H, opts) {
    const inset = opts.inset ?? 2;
    const w = W - inset * 2, h = H - inset * 2;
    const P = (w + h) * 2;
    let d = t * P;
    if (d < w)           return pt(inset + d,       inset,         0,            0, 1, 0, 0, 1);
    d -= w;
    if (d < h)           return pt(inset + w,       inset + d,     HALF_PI,      1, 0, 1, -1, 0);
    d -= h;
    if (d < w)           return pt(inset + w - d,   inset + h,     PI,           2,-1, 0, 0,-1);
    d -= w;
    return pt(inset,     inset + h - d, -HALF_PI, 3, 0,-1, 1, 0);
  }
  function pt(x, y, a, side, tx, ty, nx, ny) {
    return { x, y, a, side, tx, ty, nx, ny };
  }

  // =================================================================
  //  2. Rounded rect
  // =================================================================
  function perimRoundRect(t, W, H, opts) {
    const inset = opts.inset ?? 2;
    const minSide = Math.min(W, H) / 2 - inset;
    const r = Math.max(0, Math.min(opts.cornerRadius ?? Math.min(W, H) * 0.14, minSide));
    const w = W - inset * 2, h = H - inset * 2;
    const sTop   = Math.max(0, w - 2 * r);
    const sSide  = Math.max(0, h - 2 * r);
    const arcLen = r * HALF_PI;
    const total  = (sTop + sSide) * 2 + arcLen * 4;
    let d = t * total;
    const ox = inset, oy = inset;
    let x, y, ang, side;
    // Top edge
    if (d < sTop) { x = ox + r + d; y = oy; ang = 0; side = 0; }
    // TR corner
    else if ((d -= sTop) < arcLen) {
      const a = d / r - HALF_PI;
      x = ox + w - r + Math.cos(a) * r;
      y = oy + r + Math.sin(a) * r;
      ang = a + HALF_PI; side = 0;
    }
    // Right edge
    else if ((d -= arcLen) < sSide) { x = ox + w; y = oy + r + d; ang = HALF_PI; side = 1; }
    // BR corner
    else if ((d -= sSide) < arcLen) {
      const a = d / r;
      x = ox + w - r + Math.cos(a) * r;
      y = oy + h - r + Math.sin(a) * r;
      ang = a + HALF_PI; side = 1;
    }
    // Bottom edge
    else if ((d -= arcLen) < sTop) { x = ox + w - r - d; y = oy + h; ang = PI; side = 2; }
    // BL corner
    else if ((d -= sTop) < arcLen) {
      const a = d / r + HALF_PI;
      x = ox + r + Math.cos(a) * r;
      y = oy + h - r + Math.sin(a) * r;
      ang = a + HALF_PI; side = 2;
    }
    // Left edge
    else if ((d -= arcLen) < sSide) { x = ox; y = oy + h - r - d; ang = -HALF_PI; side = 3; }
    // TL corner
    else {
      d -= sSide;
      const a = d / r + PI;
      x = ox + r + Math.cos(a) * r;
      y = oy + r + Math.sin(a) * r;
      ang = a + HALF_PI; side = 3;
    }
    const tx = Math.cos(ang), ty = Math.sin(ang);
    return pt(x, y, ang, side, tx, ty, -ty, tx);
  }

  // =================================================================
  //  3. Circle / Ellipse
  // =================================================================
  function perimCircleOrEllipse(t, W, H, opts) {
    const inset = opts.inset ?? 2;
    const cx = W / 2, cy = H / 2;
    const isEllipse = opts.shape === "ellipse";
    const rx = (isEllipse ? W / 2 : Math.min(W, H) / 2) - inset;
    const ry = (isEllipse ? H / 2 : Math.min(W, H) / 2) - inset;
    const ang = t * TAU - HALF_PI;
    const x = cx + Math.cos(ang) * rx;
    const y = cy + Math.sin(ang) * ry;
    const tx = -Math.sin(ang), ty = Math.cos(ang);
    return pt(x, y, Math.atan2(ty, tx), (t * 4) | 0, tx, ty, -ty, tx);
  }

  // =================================================================
  //  4. Polygon (regular N-gon) — arc-length parameterized
  // =================================================================
  function perimPolygon(t, W, H, opts) {
    const n = Math.max(3, opts.sides | 0 || 6);
    const inset = opts.inset ?? 2;
    const cx = W / 2, cy = H / 2;
    const r  = Math.min(W, H) / 2 - inset;
    const rotOff = (opts.rotate ?? -HALF_PI);
    const segT = 1 / n;
    const q = Math.floor(t * n);
    const f = t * n - q;
    const a0 = q * TAU / n + rotOff;
    const a1 = (q + 1) * TAU / n + rotOff;
    const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = dx / len, ty = dy / len;
    return pt(x, y, Math.atan2(ty, tx), q, tx, ty, -ty, tx);
  }

  // =================================================================
  //  5. Diamond (rhombus — 4 straight edges through axis midpoints)
  // =================================================================
  function perimDiamond(t, W, H, opts) {
    // 4 segments top→right→bottom→left around axis midpoints
    const inset = opts.inset ?? 2;
    const cx = W / 2, cy = H / 2;
    const rx = W / 2 - inset, ry = H / 2 - inset;
    const q = Math.floor(t * 4) & 3;
    const f = t * 4 - q;
    const verts = [
      { x: cx,       y: cy - ry },
      { x: cx + rx,  y: cy      },
      { x: cx,       y: cy + ry },
      { x: cx - rx,  y: cy      },
    ];
    const a = verts[q], b = verts[(q + 1) & 3];
    const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = dx / len, ty = dy / len;
    return pt(x, y, Math.atan2(ty, tx), q, tx, ty, -ty, tx);
  }

  // =================================================================
  //  6. Star perimeter — N-pointed star with outer & inner radii
  // =================================================================
  function perimStar(t, W, H, opts) {
    const n = Math.max(3, opts.points | 0 || 5);
    const inset = opts.inset ?? 2;
    const cx = W / 2, cy = H / 2;
    const ro = Math.min(W, H) / 2 - inset;
    const ri = ro * (opts.innerRatio ?? 0.5);
    const total = n * 2;
    const q = Math.floor(t * total);
    const f = t * total - q;
    const a0 = (q    ) * TAU / total - HALF_PI;
    const a1 = (q + 1) * TAU / total - HALF_PI;
    const r0 = (q & 1) ? ri : ro;
    const r1 = (q & 1) ? ro : ri;
    const x0 = cx + Math.cos(a0) * r0, y0 = cy + Math.sin(a0) * r0;
    const x1 = cx + Math.cos(a1) * r1, y1 = cy + Math.sin(a1) * r1;
    const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = dx / len, ty = dy / len;
    return pt(x, y, Math.atan2(ty, tx), q, tx, ty, -ty, tx);
  }

  // =================================================================
  //  7. Superellipse (Lamé curve) — morphable between rect & circle
  //     `n` exponent: 2 = ellipse, 4 = squircle, ∞ = rectangle
  // =================================================================
  function perimSuperellipse(t, W, H, opts) {
    const inset = opts.inset ?? 2;
    const cx = W / 2, cy = H / 2;
    const rx = W / 2 - inset, ry = H / 2 - inset;
    const n = opts.exponent ?? 4;
    const ang = t * TAU - HALF_PI;
    const c = Math.cos(ang), s = Math.sin(ang);
    const x = cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx;
    const y = cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry;
    // Approximate tangent numerically
    const eps = 0.001;
    const a2 = ang + eps;
    const c2 = Math.cos(a2), s2 = Math.sin(a2);
    const x2 = cx + Math.sign(c2) * Math.pow(Math.abs(c2), 2 / n) * rx;
    const y2 = cy + Math.sign(s2) * Math.pow(Math.abs(s2), 2 / n) * ry;
    const dx = x2 - x, dy = y2 - y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = dx / len, ty = dy / len;
    return pt(x, y, Math.atan2(ty, tx), (t * 4) | 0, tx, ty, -ty, tx);
  }

  // =================================================================
  //  8. Public dispatch
  // =================================================================
  function perim(t, W, H, opts) {
    t = ((t % 1) + 1) % 1;
    opts = opts || {};
    const s = opts.shape || "rect";
    if (typeof s === "function") return s(t, W, H, opts);
    switch (s) {
      case "rect":         return perimRect(t, W, H, opts);
      case "roundrect":    return perimRoundRect(t, W, H, opts);
      case "circle":       return perimCircleOrEllipse(t, W, H, opts);
      case "ellipse":      return perimCircleOrEllipse(t, W, H, opts);
      case "polygon":      return perimPolygon(t, W, H, opts);
      case "diamond":      return perimDiamond(t, W, H, opts);
      case "star":         return perimStar(t, W, H, opts);
      case "superellipse": return perimSuperellipse(t, W, H, opts);
      default:             return perimRect(t, W, H, opts);
    }
  }

  // =================================================================
  //  9. Emission weighting
  //     Remaps a uniform random u ∈ [0,1] to a biased t ∈ [0,1].
  // =================================================================
  function mapEmission(u, weighting, opts) {
    if (!weighting || weighting === "uniform") return u;
    opts = opts || {};

    if (weighting === "corners") {
      // Quantize to 4 corner regions, bell-bias within each quarter.
      const q = Math.floor(u * 4);
      const f = u * 4 - q;
      return (q + 0.5 + (f - 0.5) * (1 - Math.abs(f - 0.5) * 2) * 0.92) / 4;
    }
    if (weighting === "sides") {
      const q = Math.floor(u * 4);
      const f = u * 4 - q;
      return (q + 0.5 + (f - 0.5) * Math.abs(f - 0.5) * 2 * 0.85) / 4;
    }
    if (weighting === "top")    return u * 0.25;
    if (weighting === "right")  return 0.25 + u * 0.25;
    if (weighting === "bottom") return 0.5 + u * 0.25;
    if (weighting === "left")   return 0.75 + u * 0.25;

    if (weighting === "bezier") {
      return smoothstep(u);
    }

    if (Array.isArray(weighting)) {
      // Weighted zones: [{ range:[lo,hi], weight: 1 }, ...]
      const total = weighting.reduce((s, w) => s + (w.weight || 1), 0);
      let acc = 0;
      const pick = u * total;
      for (const w of weighting) {
        acc += w.weight || 1;
        if (pick <= acc) {
          const [lo, hi] = w.range;
          const inside = (pick - (acc - (w.weight || 1))) / (w.weight || 1);
          return lo + inside * (hi - lo);
        }
      }
      return u;
    }

    if (typeof weighting === "function") return weighting(u, opts);
    return u;
  }

  // =================================================================
  // 10. Spacing strategies for N markers (deterministic phase walkers)
  //     Useful for "N heads equally spaced around perimeter".
  // =================================================================
  function equallySpaced(n, offset) {
    const out = new Array(n);
    offset = offset || 0;
    for (let i = 0; i < n; i++) out[i] = (offset + i / n) % 1;
    return out;
  }

  // -----------------------------------------------------------------
  NS.geometry = { perim, mapEmission, equallySpaced };
})();


/* ==== pool.js ==== */
/* ================================================================
   FX-ENGINE v2  —  pool.js
   ----------------------------------------------------------------
   Zero-allocation particle pooling.

   The engine can churn through hundreds of particles per second;
   without pooling this creates significant GC pressure (especially
   on mid-range laptops and phones).  This module recycles particle
   objects so that hot-path allocation is eliminated after warmup.
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};

  const MAX_POOL = 8192;
  const pool = [];

  /**
   * Obtain an empty particle object.  All numeric fields are reset
   * so stale state from a previous life cannot leak through.
   */
  function obtain() {
    const p = pool.length ? pool.pop() : {};
    p.x = 0; p.y = 0; p.cx = 0; p.cy = 0;
    p.vx = 0; p.vy = 0; p.vr = 0;
    p.a = 0; p.side = 0;
    p.tx = 1; p.ty = 0; p.nx = 0; p.ny = 1;
    p.rot = 0; p.phase = 0;
    p.life = 1; p.maxLife = 1;
    p.size = 1; p.hue = 0;
    p.seed = 0; p.born = 0;
    p._a = 1; p._size = 1;
    p._cParsed = null; p._c0 = null; p._c1 = null; p._colEase = null;
    p.glyph = null; p.data = null;
    p._orbA = null; p._orbR = 0;
    return p;
  }

  function release(p) {
    if (pool.length >= MAX_POOL) return;
    // Null out refs that may retain large objects
    p._cParsed = null; p._c0 = null; p._c1 = null;
    p._colEase = null; p.data = null; p.glyph = null;
    pool.push(p);
  }

  function drain() { pool.length = 0; }

  function size() { return pool.length; }

  NS.pool = { obtain, release, drain, size, MAX_POOL };
})();


/* ==== tracks.js ==== */
/* ================================================================
   FX-ENGINE v2  —  tracks.js
   ----------------------------------------------------------------
   Keyframed animation tracks + life-modifier shorthand.

   A *track* is a timeline of values evaluated over a particle's
   lifetime (0 = birth, 1 = death).  Values may be numbers or HSLA
   colour objects.  Tracks support per-segment easing and wrap /
   clamp modes.

   Accepted forms (in order of preference):
     • Scalar:        `sizeTrack: 3`                    → constant
     • Function:      `sizeTrack: p => ...`             → dynamic
     • Keyframes:     `sizeTrack: [[0, 0, "outQuad"],
                                   [0.4, 3],
                                   [1, 0]]`            → piecewise
     • Named life-modifier string (via legacy shortcut):
                      `sizeMod: "pulse" | "fade" | "grow" | ...`

   Also included: the compact `sizeMod` and `alpha` life modifiers
   kept for author ergonomics and backwards compatibility.
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const core = NS.core; if (!core) { console.warn("[fx/tracks] core.js not loaded"); return; }
  const { lerp, lerpHSL, getEase, EASE, PI } = core;

  // ---- Is this an HSLA colour object? ----
  const isColour = v => v && typeof v === "object" && "h" in v;

  /**
   * Evaluate a keyframe track against a particle's lifetime.
   * Returns the interpolated value at the current lifetime.
   */
  function evalTrack(track, p, fallback) {
    if (track == null) return fallback;
    if (typeof track === "number") return track;
    if (typeof track === "string") return track;
    if (typeof track === "function") return track(p);
    if (!Array.isArray(track) || !track.length) return fallback;

    const t = 1 - p.life;   // birth = 0, death = 1
    if (t <= track[0][0]) return track[0][1];

    for (let i = 1; i < track.length; i++) {
      if (t <= track[i][0]) {
        const k0 = track[i - 1];
        const k1 = track[i];
        const span = Math.max(1e-6, k1[0] - k0[0]);
        const u = (t - k0[0]) / span;
        const e = k1[2] ? getEase(k1[2])(u) : u;
        return isColour(k0[1]) && isColour(k1[1])
          ? lerpHSL(k0[1], k1[1], e)
          : lerp(k0[1], k1[1], e);
      }
    }
    return track[track.length - 1][1];
  }

  /**
   * Evaluate a colour ramp (array of HSLA stops) against particle life.
   * Convenience wrapper that builds a uniformly-spaced track.
   */
  function evalRamp(stops, p, ease) {
    if (!stops || !stops.length) return null;
    const n = stops.length;
    const t = 1 - p.life;
    const f = t * (n - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(n - 1, i0 + 1);
    const u  = f - i0;
    const e  = ease ? getEase(ease)(u) : u;
    return lerpHSL(stops[i0], stops[i1], e);
  }

  // -----------------------------------------------------------------
  //  Life-modifier shortcuts.  A modifier maps life+phase to a
  //  scalar multiplier, used for size / alpha.  Keeps configs terse.
  // -----------------------------------------------------------------
  const SIZE_MODS = {
    const:   ()  => 1,
    fade:    (p) => p.life,
    grow:    (p) => 1 - p.life,
    pulse:   (p) => Math.sin(p.life * PI),
    twinkle: (p) => Math.abs(Math.sin(p.phase * 3)),
    breathe: (p) => 0.6 + 0.4 * Math.sin(p.phase),
    popout:  (p) => Math.pow(Math.sin(p.life * PI), 2),
    quake:   (p) => 1 + Math.sin(p.phase * 20) * 0.2 * p.life,
    shrink:  (p) => p.life * p.life,
    swell:   (p) => Math.pow(1 - p.life, 0.5),
  };
  function sizeModifier(mod, p) {
    if (mod == null || mod === "") return 1;
    if (typeof mod === "function") return mod(p);
    if (typeof mod === "number")   return mod;
    const fn = SIZE_MODS[mod] || (EASE[mod] ? (pp => EASE[mod](pp.life)) : null);
    return fn ? fn(p) : 1;
  }

  const ALPHA_MODS = {
    life:    (p) => p.life,
    const:   ()  => 1,
    pulse:   (p) => Math.sin(p.life * PI),
    twinkle: (p) => Math.abs(Math.sin(p.phase * 3)) * p.life,
    flicker: (p) => (Math.sin(p.phase * 12) * 0.5 + 0.5) * p.life,
    strobe:  (p) => ((p.phase * 3) | 0) % 2 ? p.life : 0,
    easeOut: (p) => 1 - Math.pow(1 - p.life, 3),
    easeIn:  (p) => Math.pow(p.life, 2),
  };
  function alphaModifier(mod, p) {
    if (mod == null || mod === "life") return p.life;
    if (typeof mod === "number")       return mod * p.life;
    if (typeof mod === "function")     return mod(p);
    const fn = ALPHA_MODS[mod] || (EASE[mod] ? (pp => EASE[mod](pp.life)) : null);
    return fn ? fn(p) : p.life;
  }

  NS.tracks = {
    evalTrack, evalRamp,
    sizeModifier, alphaModifier,
    SIZE_MODS, ALPHA_MODS,
  };
})();


/* ==== forces.js ==== */
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


/* ==== shapes.js ==== */
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


/* ==== border.js ==== */
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


/* ==== emitter.js ==== */
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


/* ==== presets.js ==== */
/* ================================================================
   FX-ENGINE v2  —  presets.js
   ----------------------------------------------------------------
   Composable effect recipes.

   Two kinds of presets:

     • Emitter presets  — merged into a single emitter config.
         cfg: { preset: "comet-warm", rate: 80 }
     • Mixins           — a list of emitter presets merged L→R.
         cfg: { mixin: ["warm-glow", "sparkle"] }

   Presets are *just* config objects: the FX factory merges them
   into the user config with the user config taking precedence
   over preset defaults.

   Naming convention:

     <family>-<variant>   e.g. "comet-warm", "aura-ice"

   Families:
     glow, streak, comet, aura, rain, snow, embers, sparks,
     bubbles, runes, lightning, petals, smoke, starfield,
     geometric, stardust, sigil, chrono, orbit, signature
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  const PRESETS = Object.create(null);

  function def(name, cfg) { PRESETS[name] = cfg; }

  // -----------------------------------------------------------------
  //  GLOW family
  // -----------------------------------------------------------------
  def("glow-warm",  { shape: "glow", hue: "fire",   alpha: "pulse", sizeMod: "pulse", count: 50 });
  def("glow-cool",  { shape: "glow", hue: "ice",    alpha: "pulse", sizeMod: "pulse", count: 50 });
  def("glow-royal", { shape: "glow", hue: "arcane", alpha: "pulse", sizeMod: "pulse", count: 45 });
  def("glow-toxic", { shape: "glow", hue: "toxic",  alpha: "pulse", sizeMod: "pulse", count: 50 });
  def("glow-void",  { shape: "glow", hue: "void",   alpha: "pulse", sizeMod: "pulse", count: 45, sat: 80, lit: 35 });

  // -----------------------------------------------------------------
  //  COMET family (head emitters)
  // -----------------------------------------------------------------
  def("comet-base",  { kind: "head", speed: 0.28, rate: 70, shape: "glow",
                       size: 3, life: [0.5, 0.9], headDotR: 6 });
  def("comet-warm",  { mixin: ["comet-base"], hue: "fire",   headDotColor: "#ffe8b0" });
  def("comet-cool",  { mixin: ["comet-base"], hue: "ice",    headDotColor: "#cde7ff" });
  def("comet-holy",  { mixin: ["comet-base"], hue: [45, 55], headDotColor: "#fff6c8" });
  def("comet-venom", { mixin: ["comet-base"], hue: "toxic",  headDotColor: "#b0ff90" });
  def("comet-demon", { mixin: ["comet-base"], hue: "blood",  headDotColor: "#ff8a7a" });

  // -----------------------------------------------------------------
  //  STREAK family
  // -----------------------------------------------------------------
  def("streak-rain",    { shape: "streak", len: 10, velInward: 1.4, count: 40, life: [0.4, 0.8], hue: [195, 215] });
  def("streak-neon",    { shape: "streak", len: 14, shadow: 8, count: 35, life: [0.5, 0.9], hue: "neon" });
  def("streak-speedline", { shape: "streak", len: 16, velTangent: 1.5, count: 40, life: [0.4, 0.7], hue: 45 });

  // -----------------------------------------------------------------
  //  SNOW / RAIN / DRIFT
  // -----------------------------------------------------------------
  def("snow-soft",   { shape: "dot",   count: 70, life: [1.6, 2.6], velInward: 0.4, sway: 0.4, sat: 30, lit: 90 });
  def("snow-flake",  { shape: "flake", count: 30, life: [1.8, 2.8], velInward: 0.3, sway: 0.5, hue: 200, lineWidth: 0.7 });
  def("rain-heavy",  { shape: "streak", count: 60, life: [0.3, 0.6], velInward: 2, len: 12, shadow: 0, hue: [190, 215] });
  def("mist",        { shape: "glow", count: 25, life: [2, 3], size: 8, alpha: 0.3, sway: 0.3, hue: 210, sat: 15, lit: 85 });

  // -----------------------------------------------------------------
  //  EMBERS / SPARKS
  // -----------------------------------------------------------------
  def("embers-rising",    { shape: "glow", hue: "ember", gravity: -0.05, spread: 0.4,
                            count: 70, life: [0.8, 1.4], alpha: "pulse" });
  def("sparks-pop",       { shape: "dot", hue: [30, 55], size: 1.2, life: [0.25, 0.5],
                            spread: 1.5, drag: 0.9, count: 60, alpha: "life" });
  def("flames-living",    { shape: "flame", hue: "fire", count: 70, life: [0.5, 0.9],
                            gravity: -0.1, spread: 0.5 });

  // -----------------------------------------------------------------
  //  LIGHTNING / THUNDER
  // -----------------------------------------------------------------
  def("lightning-arc", { shape: "lightning", hue: 200, count: 20, life: [0.2, 0.4],
                         segments: 5, shadow: 10, sizeVar: [1.2, 2.5] });
  def("thunderstrike", { kind: "burst", interval: 1.4, burstCount: 10, burstSpread: 0.1,
                         shape: "lightning", hue: 200, life: [0.15, 0.3], shadow: 14 });

  // -----------------------------------------------------------------
  //  BUBBLES / PETALS / DUST
  // -----------------------------------------------------------------
  def("bubbles",      { shape: "bubble", hue: [180, 220], count: 18, life: [1.6, 2.4],
                        gravity: -0.04, size: 5, lineWidth: 1 });
  def("petals-fall",  { shape: "petal",  hue: [320, 355], count: 25, life: [1.8, 2.8],
                        velInward: 0.4, sway: 0.4, gravity: 0.02, sizeVar: [0.9, 1.3] });
  def("dust-motes",   { shape: "dot",    hue: 45, sat: 50, lit: 85, count: 35,
                        life: [1.4, 2.4], spread: 0.2, alpha: "pulse" });

  // -----------------------------------------------------------------
  //  SPARKLE / STARDUST
  // -----------------------------------------------------------------
  def("sparkle-basic",  { shape: "sparkle", hue: [45, 55], count: 25, life: [0.6, 1.2],
                          sizeMod: "pulse", spin: 2, lineWidth: 1 });
  def("stardust",       { shape: "dot", hue: "starfield", count: 50, life: [1, 1.6],
                          sizeMod: "twinkle", alpha: "twinkle" });
  def("starlight",      { shape: "star", hue: [45, 50], count: 30, life: [1, 1.8],
                          points: 5, sizeMod: "pulse" });

  // -----------------------------------------------------------------
  //  SIGIL / ARCANE / RUNES
  // -----------------------------------------------------------------
  def("arcane-runes",   { shape: "rune", hue: "arcane", count: 15, life: [1.4, 2.2],
                          size: 14, glow: 10, bold: true });
  def("holy-seal",      { shape: "glyph", glyph: "✚", hue: [45, 55], count: 18,
                          life: [1.2, 1.8], size: 14, glow: 10, bold: true });
  def("necro-mark",     { shape: "glyph", glyph: "☠", hue: 110, count: 12,
                          life: [1.2, 2], size: 16, glow: 12, bold: true });

  // -----------------------------------------------------------------
  //  GEOMETRIC
  // -----------------------------------------------------------------
  def("hex-grid",       { shape: "hex",  hue: [180, 220], count: 30, life: [1.6, 2.4],
                          stroke: true, spin: 0, lineWidth: 1 });
  def("pixel-grid",     { shape: "pixel", hue: [120, 180, 300], count: 80,
                          size: 1.5, life: [1.2, 2.2] });
  def("tick-marks",     { shape: "tick", hue: 45, count: 40, life: [1, 1.6],
                          lineWidth: 1, size: 6 });
  def("equalizer",      { shape: "bar",  hue: [120, 200, 320], count: 40,
                          life: [0.5, 0.9], barLen: 8, barWidth: 2,
                          update: p => { p.size = (1 + Math.abs(Math.sin(p.phase * 4))) * 2.5; } });

  // -----------------------------------------------------------------
  //  SIGNATURE / CINEMATIC
  // -----------------------------------------------------------------
  def("signature-aurora", {
    emitters: [
      { shape: "glow", hue: "aurora", count: 60, life: [1.6, 2.4], alpha: 0.55, sizeMod: "pulse", size: 6 },
      { kind: "head", speed: 0.3, rate: 110, shape: "glow", hue: "rainbow", size: 5, life: [0.5, 0.9],
        headDotColor: "#ffffff", headDotR: 7 }
    ]
  });

  def("signature-inferno", {
    emitters: [
      { shape: "flame", hue: "fire", count: 80, life: [0.5, 0.9], gravity: -0.12, spread: 0.6 },
      { kind: "head", speed: 0.3, rate: 100, shape: "flame", hue: [10, 40], size: 6,
        life: [0.3, 0.6], headDotColor: "#ffcf80" }
    ]
  });

  def("signature-abyss", {
    emitters: [
      { shape: "ring", hue: "void", count: 55, life: [1.4, 2.2], lineWidth: 1, sizeMod: "grow", alpha: 0.4, size: 4 },
      { kind: "head", speed: 0.3, rate: 70, shape: "glow", hue: "plasma", size: 4, life: [0.6, 1] }
    ]
  });

  def("signature-divine", {
    emitters: [
      { shape: "glow", hue: "holy", count: 55, life: [1, 1.6], alpha: 0.65, sizeMod: "pulse", size: 5, velOutward: 0.06 },
      { kind: "head", speed: 0.3, rate: 18, shape: "glyph", glyph: "✚", hue: [45, 55],
        size: 14, life: [0.8, 1.3], glow: 12, bold: true }
    ]
  });

  // -----------------------------------------------------------------
  //  MOTION modifiers
  // -----------------------------------------------------------------
  def("motion-noise",  { forces: [{ type: "noise", scale: 0.02, strength: 0.3, flow: 0.2 }] });
  def("motion-curl",   { forces: [{ type: "curl",  scale: 0.01, strength: 0.5 }] });
  def("motion-orbit",  { orbit: { r: 4, w: 3, shrink: true } });
  def("motion-vortex", { forces: [{ type: "vortex", strength: 0.07 }] });

  // -----------------------------------------------------------------
  NS.presets = { PRESETS, def };
})();


/* ==== engine.js ==== */
/* ================================================================
   FX-ENGINE v2  —  engine.js
   ----------------------------------------------------------------
   The factory + public API.

   Given a config object, returns a `factory()` function that the
   `TRAIL` renderer can instantiate per DOM element:

       TRAIL.register(effectId, FX(cfg));
       TRAIL.attach(el, effectId);

   Accepted configuration shapes:

     1.  Flat (v1 compatible)
           FX({ shape:'glow', hue:'fire', count:50, life:[.6,1] })

     2.  Flat + head (v1 compatible)
           FX({ shape:'flame', head:{ shape:'glow', rate:80 } })

     3.  Multi-emitter (v2)
           FX({
             emitters: [
               { shape:'glow', count:60, hue:'aurora' },
               { kind:'head',  speed:0.3, shape:'glow' },
             ],
             global: { perimShape:'roundrect', cornerRadius:20 },
             trail:  { fade: 0.08 }
           })

     4.  Preset composition
           FX({ preset: 'signature-aurora' })
           FX({ mixin:['comet-warm','motion-curl'] })

   Public API exposed on window.FX:
     FX(cfg)                    factory
     FX.define(list)            bulk register effects
     FX.addShape(name,meta,fn)  register a new shape
     FX.addForce(name, fn)      register a new force
     FX.addPalette(name, hues)  register hue palette
     FX.addRamp(name, stops)    register colour ramp
     FX.preset(name, cfg)       register a preset
     FX.setSeed(n)              deterministic PRNG
     FX.ease                    easing library
     FX.palettes, FX.ramps      palette tables
     FX.shapes, FX.shapeMeta    shape registry
     FX.forces                  force registry
     FX.presets                 preset registry
     FX.quality                 { value, target, min }
     FX.time                    { scale, paused }
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  if (!window.TRAIL) { console.warn("[fx/engine] TRAIL missing"); return; }

  const { register }   = window.TRAIL;
  const core           = NS.core;
  const palettes       = NS.palettes;
  const shapesMod      = NS.shapes;
  const forcesMod      = NS.forces;
  const presetsMod     = NS.presets;
  const { makeEmitter } = NS.emitter;
  const noiseMod       = NS.noise;
  const poolMod        = NS.pool;
  if (!core || !palettes || !shapesMod || !forcesMod || !presetsMod || !makeEmitter) {
    console.warn("[fx/engine] missing FX dependencies"); return;
  }

  const { clamp } = core;
  const { PRESETS } = presetsMod;
  const { SHAPES, SHAPE_META, defShape } = shapesMod;
  const { HUES, RAMPS, addHues, addRamp } = palettes;

  // =================================================================
  //  Global runtime state — shared across all FX instances.
  //  These are mutable at runtime via FX.quality / FX.time.
  // =================================================================
  const QUALITY = { value: 1, min: 0.35, target: 50 };   // 50 fps target
  const TIME    = { scale: 1, paused: false };
  const _fps    = { acc: 0, frames: 0, ema: 60 };

  function _updateQuality(dt) {
    _fps.frames++; _fps.acc += dt;
    if (_fps.acc >= 0.5) {
      const fps = _fps.frames / _fps.acc;
      _fps.ema = core.lerp(_fps.ema, fps, 0.3);
      _fps.frames = 0; _fps.acc = 0;
      const t = QUALITY.target;
      if (fps < t - 5)      QUALITY.value = clamp(QUALITY.value - 0.08, QUALITY.min, 1);
      else if (fps > t + 8) QUALITY.value = clamp(QUALITY.value + 0.06, QUALITY.min, 1);
    }
  }

  // =================================================================
  //  Preset application — merges nested presets / mixins left→right
  //  with the user config winning.
  // =================================================================
  function applyPresets(cfg) {
    if (!cfg || typeof cfg !== "object") return cfg;
    let out = {};
    const apply = name => {
      const pre = PRESETS[name];
      if (!pre) { core.log.warn("Unknown preset '" + name + "'"); return; }
      // Presets themselves may compose — apply transitively.
      const resolved = applyPresets(pre);
      // Arrays (like "emitters") replace, everything else shallow-merges.
      for (const k in resolved) {
        out[k] = resolved[k];
      }
    };
    if (cfg.mixin)  (Array.isArray(cfg.mixin)  ? cfg.mixin  : [cfg.mixin ]).forEach(apply);
    if (cfg.preset) (Array.isArray(cfg.preset) ? cfg.preset : [cfg.preset]).forEach(apply);
    for (const k in cfg) {
      if (k === "mixin" || k === "preset") continue;
      out[k] = cfg[k];
    }
    return out;
  }

  // =================================================================
  //  Config validation — warn on typos/unknown keys.  Never throws.
  // =================================================================
  const EMITTER_KEYS = new Set([
    "kind", "heads", "headsOffset", "count", "rate", "speed", "inset",
    "life", "size", "sizeVar", "sizeMod", "sizeTrack",
    "alpha", "alphaTrack",
    "spin", "jitter", "velInward", "velOutward", "velTangent",
    "velTangentSign", "speedInit", "spread",
    "gravity", "wind", "drag", "phaseSpeed", "sway",
    "orbit", "forces", "subEmitter",
    "shape", "hue", "sat", "lit", "color", "colorRamp", "colorRampEase", "colorGradient",
    "lineWidth", "lineCap", "shadow", "blend", "symmetry",
    "points", "innerRatio", "sides", "stroke", "aspect", "thickness",
    "barLen", "barWidth", "arcLen", "len", "lenMod", "streakDir",
    "glyph", "glow", "bold", "italic", "font", "pointAlong", "rotate",
    "headDot", "headDotR", "headDotColor", "headDotHue",
    "perimShape", "perimSides", "perimPoints", "perimInnerRatio",
    "perimExponent", "perimRotate", "cornerRadius", "weighting", "side",
    "interval", "burstCount", "burstSpread", "burstAt",
    "glowScale", "glowMid", "lightningLen", "segments",
    "init", "update", "draw", "overlay", "onSpawn", "onUpdate", "onDeath", "onBurst",
    "shapes",
    // --- border.js stroke / glowFrame renderer keys ---
    "layers", "colorMode", "conicStops", "linearStops", "linearAxis",
    "rotateSpeed", "scrollSpeed", "cycleSpeed", "paletteSpeed", "hueSpeed",
    "dash", "dashSpeed", "pulseSize", "pulseAlpha", "pulseSpeed",
    "fill", "fillAlpha", "glowColor", "samples",
    "bands", "width", "intensity", "perim",
  ]);
  function validate(cfg, ctx) {
    for (const k in cfg) {
      if (!EMITTER_KEYS.has(k)) {
        core.log.warn("Unknown key '" + k + "' in " + (ctx || "config"));
      }
    }
  }

  // =================================================================
  //  FX factory — turns a config into a TRAIL-compatible factory.
  //  Returned factory produces { step, draw, dispose, inspect }.
  // =================================================================
  function FX(rawCfg) {
    const cfg = applyPresets(rawCfg);

    // Normalise to { emitters: [...] }
    let emitters;
    if (Array.isArray(cfg.emitters) && cfg.emitters.length) {
      emitters = cfg.emitters.map(e => applyPresets(e));
    } else {
      emitters = [cfg];
      if (cfg.head) {
        const h = Object.assign(
          { kind: "head", speed: 0.3, rate: 60, shape: "glow" },
          applyPresets(cfg.head)
        );
        emitters.push(h);
      }
    }
    emitters.forEach((e, i) => validate(e, "emitter#" + i));

    const globalOpts = Object.assign({
      perimShape: "rect",
      cornerRadius: null,
      perimSides: undefined,
      perimPoints: undefined,
      perimInnerRatio: undefined,
      perimExponent: undefined,
      perimRotate: undefined,
      weighting: "uniform",
    }, cfg.global || {});

    const trailCfg = cfg.trail || null;

    return function instantiate() {
      const state = { time: 0 };
      const emitterInsts = emitters.map(e => makeEmitter(e, Object.assign({}, globalOpts, state)));

      // Trail / afterimage is drawn directly on the main canvas using a
      // destination-out fade.  Signalling `clearsSelf: true` tells
      // trail.js NOT to clearRect at the top of each frame so the
      // previous pixels survive.  This removes an entire offscreen
      // canvas + drawImage per frame per trail effect.
      const trailFade = trailCfg && trailCfg.fade != null ? trailCfg.fade : 0;

      return {
        clearsSelf: trailFade > 0,
        step(dt, W, H) {
          if (TIME.paused) return;
          const scaled = dt * TIME.scale;
          state.time += scaled;
          _updateQuality(dt);
          for (const em of emitterInsts) em.update(scaled, W, H, state.time, QUALITY.value);
        },
        draw(ctx, W, H) {
          if (trailFade > 0) {
            // Fade the prior frame (in-place) before drawing new particles
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0,0,0," + trailFade + ")";
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
          for (const em of emitterInsts) em.draw(ctx, W, H);
        },
        dispose() {
          for (const em of emitterInsts) em.dispose && em.dispose();
        },
        inspect() {
          return {
            emitters: emitterInsts.length,
            particles: emitterInsts.reduce((s, e) => s + e.parts.length, 0),
            quality: QUALITY.value,
            fps: _fps.ema,
            time: state.time,
          };
        },
        state,
      };
    };
  }

  // =================================================================
  //  Bulk registration — used by fx-page-*.js files.
  //
  //    FX.define([
  //      { id: 151, name: "Comet Warm", preset: "comet-warm", hue: "fire" },
  //      { id: 152, name: "Custom Draw", kind:"head", ..., factory: fn },
  //    ]);
  //
  //  Populates window.FX_META and registers with TRAIL.
  // =================================================================
  function defineEffects(list) {
    window.FX_META = window.FX_META || {};
    for (const spec of list) {
      const { id, name, factory } = spec;
      const cfg = Object.assign({}, spec);
      delete cfg.id; delete cfg.name; delete cfg.factory;
      window.FX_META[id] = { name, cfg };
      if (factory) register(id, factory);
      else         register(id, FX(cfg));
    }
  }

  // =================================================================
  //  Public API
  // =================================================================
  window.FX = FX;
  window.FX.define      = defineEffects;

  // Seeded PRNG
  window.FX.setSeed     = core.setSeed;
  window.FX.clearSeed   = core.clearSeed;

  // Registries (read + write)
  window.FX.shapes      = SHAPES;
  window.FX.shapeMeta   = SHAPE_META;
  window.FX.forces      = forcesMod.FORCES;
  window.FX.presets     = PRESETS;
  window.FX.palettes    = HUES;
  window.FX.ramps       = RAMPS;

  // Extension points
  window.FX.addShape    = defShape;
  window.FX.addForce    = forcesMod.addForce;
  window.FX.addPalette  = addHues;
  window.FX.addRamp     = addRamp;
  window.FX.preset      = presetsMod.def;

  // Utilities
  window.FX.ease        = core.EASE;
  window.FX.color       = {
    parse:  core.parseColor,
    hsla:   core.hsla,
    hsl:    core.hsl,
    hex:    core.hex,
    lerp:   core.lerpHSL,
    shift:  core.shiftHue,
    tint:   core.tint,
    saturate: core.saturate,
  };
  window.FX.noise       = noiseMod;
  window.FX.pool        = poolMod;

  // Runtime controls
  window.FX.quality     = QUALITY;
  window.FX.time        = TIME;

  // Diagnostics
  window.FX.inspect = () => ({
    shapes: Object.keys(SHAPES).length,
    forces: Object.keys(forcesMod.FORCES).length,
    presets: Object.keys(PRESETS).length,
    palettes: Object.keys(HUES).length,
    ramps: Object.keys(RAMPS).length,
    quality: QUALITY.value,
    fps: _fps.ema,
  });

  core.log.info(
    "FX v2 ready — "
    + Object.keys(SHAPES).length  + " shapes, "
    + Object.keys(forcesMod.FORCES).length + " forces, "
    + Object.keys(PRESETS).length + " presets, "
    + Object.keys(HUES).length    + " palettes"
  );
})();


/* ==== devtools.js ==== */
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

