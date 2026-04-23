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
