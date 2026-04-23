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
