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
