/* ================================================================
   PAGE 7 — Effects 301–325 — FX-ENGINE v2 SHOWCASE
   ----------------------------------------------------------------
   Each of these 25 effects is hand-picked to spotlight one or more
   v2 features that were not possible (or were awkward) in v1:

     • Multi-emitter composition        (`emitters: [...]`)
     • Perimeter shapes beyond rect     (`perimShape`, roundrect /
                                          circle / polygon / star /
                                          superellipse / diamond)
     • Emission weighting                (`weighting`)
     • Keyframe tracks over life         (`sizeTrack`, `alphaTrack`)
     • Birth→death colour gradients      (`colorGradient`)
     • HSLA colour ramps                 (`colorRamp`)
     • Force fields                      (noise / curl / vortex /
                                          attractor / spring / orbit /
                                          swarm / repelWalls)
     • Trail buffer (motion blur)        (`trail: { fade }`)
     • Symmetry kaleidoscope             (`symmetry`)
     • Multi-head comets                 (`kind:"multi-head"`, `heads`)
     • Sub-emitters on death             (`subEmitter`)
     • Preset composition                (`preset`, `mixin`)
     • New shapes                        (halo, firefly, crystal,
                                          heart, petal, bubble,
                                          lightning, chevron,
                                          bracket, composite, …)
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-07: FX engine missing"); return; }

  define([

    // 301 ─ AURORA BOREALIS
    //   Colour-ramp over life + noise-wandered glow on a roundrect path.
    { id: 301, name: "Aurora Borealis",
      perimShape: "roundrect", cornerRadius: 24,
      emitters: [
        { shape: "glow", count: 42, size: 7,
          life: [1.8, 2.8], sizeMod: "pulse", alpha: 0.55,
          colorRamp: [
            { h: 160, s: 100, l: 70, a: 1 },
            { h: 200, s: 100, l: 65, a: 1 },
            { h: 280, s:  90, l: 60, a: 0.8 },
            { h: 320, s:  90, l: 55, a: 0 },
          ],
          forces: [{ type: "noise", scale: 0.012, strength: 0.18, flow: 0.15 }] },
        { kind: "head", speed: 0.25, rate: 45, shape: "glow",
          hue: [160, 320], size: 4, life: [0.6, 1],
          headDotColor: "#d0f0ff", headDotR: 7 },
      ],
      trail: { fade: 0.08 },
    },

    // 302 ─ QUANTUM ORBIT
    //   3 synchronised comets on a circular perimeter.
    { id: 302, name: "Quantum Orbit",
      perimShape: "circle",
      emitters: [
        { shape: "dot", count: 40, hue: [200, 260], size: 1.4,
          life: [1.2, 1.8], sizeMod: "twinkle", alpha: "twinkle" },
        { kind: "multi-head", heads: 3, speed: 0.32, rate: 40,
          shape: "glow", hue: "plasma", size: 5, life: [0.5, 0.9],
          headDotColor: "#c0a0ff", headDotR: 8 },
      ],
    },

    // 303 ─ MERCURY BEADS
    //   Lightweight metallic dots twinkling along the perimeter.
    //   Uses only cheap primitives — no sub-emitters, no gradients,
    //   no forces, no trail.
    { id: 303, name: "Mercury Beads",
      shape: "dot", hue: "silver", sat: 30, lit: 85,
      count: 30, size: 1.6, life: [1, 1.6],
      sizeMod: "twinkle", alpha: "twinkle",
    },

    // 304 ─ LIVING LIGHTNING
    //   Ridged lightning bolts + curl-noise wander, persistent motion blur.
    { id: 304, name: "Living Lightning",
      perimShape: "roundrect", cornerRadius: 18,
      emitters: [
        { shape: "lightning", hue: [190, 220], count: 12,
          size: 3, life: [0.25, 0.45], segments: 4,
          shadow: 5, lineWidth: 1.3,
          forces: [{ type: "curl", scale: 0.02, strength: 0.5 }] },
      ],
      trail: { fade: 0.2 },
    },

    // 305 ─ VORTEX STORM
    //   Streaks sucked into a central vortex; uses streaks + vortex + attractor.
    { id: 305, name: "Vortex Storm",
      perimShape: "circle",
      shape: "streak", hue: [190, 240], count: 36,
      size: 1.6, life: [0.6, 1.1], len: 12, shadow: 3,
      forces: [
        { type: "vortex", strength: 0.08, swirl: 1.2 },
        { type: "attractor", strength: 0.035, falloff: 0.8 },
      ],
    },

    // 306 ─ HEART BLOOM
    //   Hearts with a pink→gold per-particle colour gradient. Corner-weighted.
    { id: 306, name: "Heart Bloom",
      perimShape: "roundrect", cornerRadius: 20,
      weighting: "corners",
      shape: "heart", count: 22, size: 9,
      life: [1.4, 2.2], sizeMod: "pulse", gravity: -0.02,
      colorGradient: { from: "#ff5ca7", to: "#ffd47a", ease: "outCubic" },
    },

    // 307 ─ BUBBLES RISING
    //   Circle-path bubbles drifting upward against gravity.
    { id: 307, name: "Bubbles Rising",
      perimShape: "circle",
      emitters: [
        { shape: "bubble", hue: [180, 220], count: 18,
          size: 6, life: [1.8, 2.8], lineWidth: 1,
          gravity: -0.04, sway: 0.4,
          forces: [{ type: "noise", scale: 0.02, strength: 0.1, flow: 0.1 }] },
      ],
    },

    // 308 ─ CHRONOGRAM
    //   Star-shaped perimeter walked by a clock-like head emitting runes.
    { id: 308, name: "Chronogram",
      perimShape: "star", perimPoints: 8, perimInnerRatio: 0.55,
      emitters: [
        { shape: "tick", hue: 45, count: 36, size: 4,
          life: [1, 1.6], lineWidth: 1.2, alpha: "pulse" },
        { kind: "head", speed: 0.22, rate: 12, shape: "rune",
          hue: [40, 55], size: 13, life: [0.8, 1.2],
          glow: 8, bold: true,
          headDotColor: "#ffecb0", headDotR: 6 },
      ],
    },

    // 309 ─ SIGIL CIRCLE
    //   Runes + central attractor pulling sparks toward the middle.
    { id: 309, name: "Sigil Circle",
      perimShape: "circle",
      emitters: [
        { shape: "rune", hue: "arcane", count: 12, size: 14,
          life: [1.6, 2.4], glow: 6, bold: true, alpha: "pulse" },
        { shape: "dot", hue: [270, 310], count: 32, size: 1.4,
          life: [0.9, 1.3],
          forces: [{ type: "attractor", strength: 0.04, falloff: 0.9 }] },
      ],
      trail: { fade: 0.12 },
    },

    // 310 ─ EMBER DANCE
    //   Warm embers pushed by domain-warp turbulence. Alpha flicker for life.
    { id: 310, name: "Ember Dance",
      shape: "ember", hue: "emberglow", count: 35,
      size: 2.4, life: [0.8, 1.4], gravity: -0.06, alpha: "flicker",
      forces: [{ type: "turbulence", scale: 0.03, strength: 0.35 }],
    },

    // 311 ─ POLAR BEACON
    //   Lensflare head on a squircle (superellipse). Tight colour ramp.
    { id: 311, name: "Polar Beacon",
      perimShape: "superellipse", perimExponent: 4.5,
      emitters: [
        { shape: "glow", hue: 200, count: 40, size: 5,
          life: [1.2, 1.8], alpha: 0.4 },
        { kind: "head", speed: 0.2, rate: 18, shape: "lensflare",
          hue: [45, 200], size: 10, life: [0.5, 0.9],
          lineWidth: 1.2 },
      ],
    },

    // 312 ─ WHISPERING PETALS
    //   Petals swirling via curl noise, gently tumbling inward.
    { id: 312, name: "Whispering Petals",
      perimShape: "roundrect", cornerRadius: 16,
      shape: "petal", hue: "sakura", count: 32,
      size: 5, life: [1.8, 2.8], velInward: 0.2, sway: 0.5,
      spin: 3, alpha: "life",
      forces: [{ type: "curl", scale: 0.015, strength: 0.3 }],
    },

    // 313 ─ GALACTIC PORTAL
    //   4-fold kaleidoscope of vortexed nebula-palette glow.
    { id: 313, name: "Galactic Portal",
      perimShape: "circle",
      shape: "glow", hue: "nebula", count: 22, size: 5,
      life: [1.2, 1.8], alpha: 0.55, symmetry: 4,
      forces: [{ type: "vortex", strength: 0.06 }],
      trail: { fade: 0.1 },
    },

    // 314 ─ FIREFLY GARDEN
    //   Firefly shape (pulsing blink) + noise wander (swarm removed, O(n²) cost).
    { id: 314, name: "Firefly Garden",
      shape: "firefly", hue: [65, 95], count: 22,
      size: 3, life: [2, 3], phaseSpeed: 0.18,
      forces: [
        { type: "noise", scale: 0.018, strength: 0.22, flow: 0.12 },
      ],
    },

    // 315 ─ NEON GRID
    //   Pixels marching around a hexagon perimeter with jitter.
    { id: 315, name: "Neon Grid",
      perimShape: "polygon", perimSides: 6,
      shape: "pixel", count: 90, size: 2.2,
      life: [0.8, 1.4], jitter: 1,
      hue: [320, 180, 60, 280], sizeMod: "twinkle",
    },

    // 316 ─ PLASMA SPRING
    //   Spring-bound sparks oscillating around their spawn point.
    { id: 316, name: "Plasma Spring",
      shape: "glow", hue: "plasma", count: 50, size: 4,
      life: [1.4, 2.2], jitter: 2, alpha: 0.6,
      colorGradient: { from: "#ff80ff", to: "#6040ff", ease: "outQuad" },
      forces: [
        { type: "spring", k: 0.06, damp: 0.88 },
        { type: "jitter", strength: 0.25 },
      ],
    },

    // 317 ─ CORNER SENTINELS
    //   Brackets at each corner only — perfect for game HUD frames.
    { id: 317, name: "Corner Sentinels",
      perimShape: "rect",
      emitters: [
        { shape: "bracket", hue: [45, 55], count: 10,
          size: 8, life: [1.2, 1.8], lineWidth: 1.4,
          weighting: "corners",
          alpha: "pulse" },
        { shape: "dot", hue: 45, count: 24, size: 1.2,
          life: [0.6, 1], weighting: "sides", alpha: "life" },
      ],
    },

    // 318 ─ SPARKLINE
    //   Keyframed sparkle: pop in large, shrink to zero.
    { id: 318, name: "Sparkline",
      shape: "sparkle", hue: [45, 55], count: 22,
      life: [0.8, 1.3], spin: 4, lineWidth: 1,
      sizeTrack: [[0, 0, "outBack"], [0.3, 6], [1, 0, "inCubic"]],
      alphaTrack: [[0, 0], [0.15, 1, "outQuad"], [1, 0, "inQuad"]],
    },

    // 319 ─ RUNE CHANT
    //   Slow, shimmering runes drifting inward with pulse alpha.
    { id: 319, name: "Rune Chant",
      perimShape: "roundrect", cornerRadius: 14,
      shape: "rune", hue: "arcane", count: 14, size: 15,
      life: [1.8, 2.6], velInward: 0.12,
      glow: 12, bold: true, alpha: "pulse",
    },

    // 320 ─ CYBER CURRENT
    //   Streaks following the tangent with a neonpunk colour ramp.
    { id: 320, name: "Cyber Current",
      perimShape: "roundrect", cornerRadius: 20,
      shape: "streak", count: 45, size: 1.6, len: 12, shadow: 8,
      life: [0.6, 1],
      colorRamp: [
        { h: 320, s: 100, l: 65, a: 1 },
        { h: 280, s: 100, l: 60, a: 1 },
        { h: 180, s: 100, l: 55, a: 0.8 },
        { h:  60, s: 100, l: 60, a: 0 },
      ],
      forces: [{ type: "followEdge", strength: 0.06 }],
    },

    // 321 ─ DRAGON COIL
    //   3 heads on a 5-pointed star, fire palette.
    { id: 321, name: "Dragon Coil",
      perimShape: "star", perimPoints: 5, perimInnerRatio: 0.6,
      emitters: [
        { shape: "flame", hue: "fire", count: 45,
          size: 3, life: [0.5, 0.9], gravity: -0.12, spread: 0.5 },
        { kind: "multi-head", heads: 3, speed: 0.28, rate: 45,
          shape: "flame", hue: [10, 40], size: 5, life: [0.35, 0.6],
          headDotColor: "#ffd088", headDotR: 7 },
      ],
      trail: { fade: 0.07 },
    },

    // 322 ─ BLOSSOM RAIN
    //   Petals falling from the top side with drift and gentle rotation.
    { id: 322, name: "Blossom Rain",
      side: 0, weighting: "top",            // emit from top only
      shape: "petal", hue: "sakura", count: 35,
      size: 5, life: [1.4, 2.2], gravity: 0.04,
      sway: 0.8, phaseSpeed: 0.14, spin: 2.5,
      forces: [{ type: "noise", scale: 0.02, strength: 0.15 }],
    },

    // 323 ─ STARFIELD HALO
    //   Halos sparsely dotted across a circle, gentle twinkle.
    { id: 323, name: "Starfield Halo",
      perimShape: "circle",
      shape: "halo", hue: "starfield", count: 24,
      size: 6, life: [1.6, 2.4], alpha: "twinkle", sizeMod: "breathe",
    },

    // 324 ─ OBSIDIAN PULSE
    //   Dark violet perimeter with a slow pulsing alpha — cheap
    //   single-emitter replacement for the old Void Whisper.
    { id: 324, name: "Obsidian Pulse",
      perimShape: "roundrect", cornerRadius: 22,
      shape: "dot", hue: "void", sat: 70, lit: 55,
      count: 32, size: 2, life: [1.4, 2.2],
      sizeMod: "pulse", alpha: "pulse",
    },

    // 325 ─ PRISM RIBBON
    //   Single-emitter finale — showcases keyframe tracks + colour
    //   ramp + roundrect perim without the cost of multi-emitter
    //   layering, trail buffer, or sub-emitters.
    { id: 325, name: "Prism Ribbon",
      perimShape: "roundrect", cornerRadius: 22,
      shape: "glow", count: 38, size: 6,
      life: [1.2, 1.8],
      sizeTrack:  [[0, 0, "outBack"], [0.3, 6], [1, 0, "inQuad"]],
      alphaTrack: [[0, 0], [0.2, 0.7, "outQuad"], [1, 0, "inCubic"]],
      colorRamp: [
        { h:  45, s: 100, l: 80, a: 1 },
        { h: 200, s: 100, l: 70, a: 0.9 },
        { h: 290, s: 100, l: 65, a: 0.8 },
        { h: 330, s: 100, l: 60, a: 0 },
      ],
    },

  ]);
})();
