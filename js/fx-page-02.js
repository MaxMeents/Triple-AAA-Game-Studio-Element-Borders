/* ================================================================
   PAGE 2 — Effects 51–100 — MOUSE-TRAIL INSPIRED
   ----------------------------------------------------------------
   Every trail-style effect now runs through the FX engine as a
   `kind:"head"` emitter (single walker leaving particles behind).
   Supersedes the hard-coded factories that used to live in trail.js.
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-02: FX engine missing"); return; }

  define([
    { id: 51, name: "Comet Tail",        kind: "head", speed: 0.3, rate: 70, shape: "glow", hue: [45, 60], size: 4, life: [0.5, 0.9], headDotColor: "#ffe8b0", headDotR: 7 },
    { id: 52, name: "Ribbon Trail",      kind: "head", speed: 0.3, rate: 50, shape: "streak", hue: "rainbow", size: 1.8, life: [0.5, 0.9], len: 18, shadow: 4 },
    { id: 53, name: "Sparkle Dust",      kind: "head", speed: 0.28, rate: 55, shape: "sparkle", hue: [45, 55], size: 3, life: [0.6, 1], lineWidth: 1, spin: 3 },
    { id: 54, name: "Fairy Dust",        kind: "head", speed: 0.28, rate: 65, shape: "glow", hue: "pastel", size: 3, life: [0.7, 1.1], alpha: "twinkle", sizeMod: "twinkle" },
    { id: 55, name: "Ink Blot",          kind: "head", speed: 0.25, rate: 40, shape: "dot", hue: 260, sat: 40, lit: 15, size: 3, life: [0.8, 1.3], alpha: 0.7, blend: "source-over" },
    { id: 56, name: "Fire Trail",        kind: "head", speed: 0.3, rate: 70, shape: "flame", hue: "fire", size: 4, life: [0.4, 0.8], gravity: -0.06 },
    { id: 57, name: "Smoke Puff",        kind: "head", speed: 0.26, rate: 35, shape: "smoke", hue: 0, sat: 0, lit: 60, size: 6, life: [1, 1.6] },
    { id: 58, name: "Bubble Pop",        kind: "head", speed: 0.28, rate: 25, shape: "bubble", hue: [180, 220], size: 5, life: [1, 1.5], lineWidth: 1 },
    { id: 59, name: "Confetti Burst",    kind: "head", speed: 0.3, rate: 50, shape: "rect", hue: "rainbow", size: 3, life: [0.6, 1], aspect: 2, blend: "source-over", spread: 0.6 },
    { id: 60, name: "Snow Flurry",       kind: "head", speed: 0.26, rate: 30, shape: "flake", hue: 200, size: 4, life: [1, 1.5], lineWidth: 0.7 },
    { id: 61, name: "Rain Drop",         kind: "head", speed: 0.32, rate: 55, shape: "streak", hue: [195, 215], size: 1.4, life: [0.4, 0.7], len: 10 },
    { id: 62, name: "Lightning Trail",   kind: "head", speed: 0.3, rate: 45, shape: "lightning", hue: [200, 215], size: 2.5, life: [0.2, 0.35], segments: 3, shadow: 4 },
    { id: 63, name: "Neon Streak",       kind: "head", speed: 0.32, rate: 45, shape: "streak", hue: "neon", size: 2, life: [0.45, 0.8], len: 14, shadow: 6 },
    { id: 64, name: "Rainbow Trail",     kind: "head", speed: 0.3, rate: 65, shape: "glow", hue: "rainbow", size: 4, life: [0.6, 1] },
    { id: 65, name: "Paint Splatter",    kind: "head", speed: 0.26, rate: 60, shape: "dot", hue: [0, 280], size: 2.5, life: [0.6, 1.1], spread: 0.8, blend: "source-over" },
    { id: 66, name: "Pixel Trail",       kind: "head", speed: 0.28, rate: 50, shape: "pixel", hue: [120, 180, 300], size: 2, life: [0.5, 0.9] },
    { id: 67, name: "Star Shower",       kind: "head", speed: 0.3, rate: 35, shape: "star", hue: [45, 55], size: 3, life: [0.7, 1.2], points: 5 },
    { id: 68, name: "Heart Trail",       kind: "head", speed: 0.28, rate: 22, shape: "heart", hue: [330, 350], size: 6, life: [0.8, 1.3] },
    { id: 69, name: "Water Ripple",      kind: "head", speed: 0.26, rate: 25, shape: "ring", hue: 200, size: 5, life: [0.8, 1.3], lineWidth: 0.9, sizeMod: "grow" },
    { id: 70, name: "Firefly Swarm",     kind: "head", speed: 0.24, rate: 30, shape: "firefly", hue: [55, 90], size: 3, life: [1, 1.5] },
    { id: 71, name: "Electric Sparks",   kind: "head", speed: 0.3, rate: 80, shape: "dot", hue: [190, 220], size: 1.2, life: [0.25, 0.5], spread: 1.5, drag: 0.9 },
    { id: 72, name: "Gravity Orbit",     kind: "head", speed: 0.3, rate: 50, shape: "dot", hue: [200, 260], size: 1.6, life: [0.8, 1.3], orbit: { r: 6, w: 3, shrink: true } },
    { id: 73, name: "Magnetic Pull",     kind: "head", speed: 0.28, rate: 55, shape: "glow", hue: [190, 220], size: 3, life: [0.7, 1.1], forces: [{ type: "attractor", strength: 0.03, falloff: 0.8 }] },
    { id: 74, name: "Lasso Rope",        kind: "head", speed: 0.3, rate: 45, shape: "streak", hue: 40, size: 1.8, life: [0.6, 1], len: 14, velTangent: 0.6 },
    { id: 75, name: "Chain Link",        kind: "head", speed: 0.3, rate: 18, shape: "ring", hue: 45, size: 5, life: [0.8, 1.2], lineWidth: 1.2 },
    { id: 76, name: "Chrono Blur",       kind: "head", speed: 0.32, rate: 60, shape: "streak", hue: [45, 200], size: 1.6, life: [0.45, 0.8], len: 16, shadow: 3 },
    { id: 77, name: "Ghost Echo",        kind: "head", speed: 0.28, rate: 40, shape: "glow", hue: 180, size: 5, life: [0.8, 1.3], alpha: 0.4, sway: 1 },
    { id: 78, name: "Portal Wake",       kind: "head", speed: 0.3, rate: 35, shape: "ring", hue: "plasma", size: 4, life: [0.7, 1.1], lineWidth: 1, sizeMod: "grow" },
    { id: 79, name: "Sword Slash",       kind: "head", speed: 0.36, rate: 70, shape: "streak", hue: [195, 210], size: 2, life: [0.35, 0.6], len: 18, shadow: 8 },
    { id: 80, name: "Bullet Tracer",     kind: "head", speed: 0.35, rate: 80, shape: "streak", hue: [40, 55], size: 1.6, life: [0.3, 0.5], len: 16, shadow: 6 },
    { id: 81, name: "Crystal Shard Burst", kind: "head", speed: 0.28, rate: 45, shape: "diamond", hue: [195, 220], size: 3, life: [0.6, 1] },
    { id: 82, name: "Leaf Flutter",      kind: "head", speed: 0.24, rate: 30, shape: "leaf", hue: [90, 130], size: 4, life: [1, 1.5], spin: 3 },
    { id: 83, name: "Feather Drift",     kind: "head", speed: 0.22, rate: 28, shape: "petal", hue: 30, sat: 40, lit: 85, size: 5, life: [1.2, 1.8], sway: 0.5 },
    { id: 84, name: "Petal Fall",        kind: "head", speed: 0.24, rate: 30, shape: "petal", hue: "sakura", size: 5, life: [1, 1.6], gravity: 0.03, sway: 0.4 },
    { id: 85, name: "Ember Rise",        kind: "head", speed: 0.28, rate: 60, shape: "ember", hue: "ember", size: 2.4, life: [0.7, 1.2], gravity: -0.08 },
    { id: 86, name: "Ash Stream",        kind: "head", speed: 0.28, rate: 55, shape: "dot", hue: 30, sat: 10, lit: 60, size: 1.6, life: [1, 1.5], alpha: 0.45 },
    { id: 87, name: "Glass Shatter",     kind: "head", speed: 0.3, rate: 50, shape: "triangle", hue: [180, 220], size: 3, life: [0.5, 0.9], spread: 1.2, drag: 0.93 },
    { id: 88, name: "Liquid Mercury",    kind: "head", speed: 0.28, rate: 55, shape: "dot", hue: "silver", sat: 20, lit: 85, size: 2.2, life: [0.8, 1.3] },
    { id: 89, name: "Plasma Ball",       kind: "head", speed: 0.3, rate: 55, shape: "glow", hue: "plasma", size: 5, life: [0.6, 1] },
    { id: 90, name: "Laser Bolt",        kind: "head", speed: 0.36, rate: 50, shape: "streak", hue: 0, sat: 100, lit: 60, size: 2, life: [0.3, 0.5], len: 20, shadow: 8 },
    { id: 91, name: "Ion Storm",         kind: "head", speed: 0.3, rate: 70, shape: "dot", hue: [190, 220], size: 1.4, life: [0.35, 0.65], spread: 1.4, drag: 0.92 },
    { id: 92, name: "Quantum Entangle",  kind: "head", speed: 0.3, rate: 55, shape: "glow", hue: [260, 320], size: 3, life: [0.7, 1.1], orbit: { r: 4, w: 5, shrink: true } },
    { id: 93, name: "Nova Burst",        kind: "head", speed: 0.3, rate: 45, shape: "glow", hue: [30, 55], size: 5, life: [0.5, 0.9], sizeMod: "pulse" },
    { id: 94, name: "Astral Wake",       kind: "head", speed: 0.28, rate: 55, shape: "glow", hue: [230, 310], size: 4, life: [0.8, 1.3], alpha: 0.55 },
    { id: 95, name: "Venom Drip",        kind: "head", speed: 0.26, rate: 40, shape: "dot", hue: "venom", size: 2, life: [0.8, 1.3], gravity: 0.04 },
    { id: 96, name: "Frost Crystal",     kind: "head", speed: 0.26, rate: 25, shape: "flake", hue: 200, size: 4, life: [1, 1.5], lineWidth: 0.7 },
    { id: 97, name: "Pulse Wave",        kind: "head", speed: 0.3, rate: 18, shape: "ringpulse", hue: [180, 210], size: 6, life: [0.8, 1.3] },
    { id: 98, name: "Shockwave Ring",    kind: "head", speed: 0.32, rate: 12, shape: "ring", hue: [45, 55], size: 7, life: [0.7, 1.1], lineWidth: 1.2, sizeMod: "grow" },
    { id: 99, name: "Meteor Storm",      kind: "head", speed: 0.3, rate: 35, shape: "streak", hue: [20, 45], size: 2, life: [0.45, 0.8], len: 14, velInward: 1, shadow: 5 },
    { id:100, name: "Cosmic Serpent",    kind: "head", speed: 0.32, rate: 70, shape: "glow", hue: "cosmos", size: 3, life: [0.55, 0.9] },
  ]);
})();
