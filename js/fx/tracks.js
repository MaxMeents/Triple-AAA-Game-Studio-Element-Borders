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
