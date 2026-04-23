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
