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
