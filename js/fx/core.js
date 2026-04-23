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
