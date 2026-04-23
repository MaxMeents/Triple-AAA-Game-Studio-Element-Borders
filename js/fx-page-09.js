/* ================================================================
   PAGE 9 — Effects 426-525 — COSMIC / MYSTICAL CANVAS BORDERS
   ----------------------------------------------------------------
   100 new canvas-based effects showcasing the v2.1 engine
   extensions.  Every effect uses at least one feature that was
   unavailable in the base engine: new shapes (beam, ripple3,
   bokeh, dna, tornado, orb, nebula, shard, gridcell, scanbar,
   wavelet, plasmoid, blob, bolt, comet, chakra), new forces
   (wave, wind, pulseOut, pendulum, braid, spiral, compass), and
   the new palettes/ramps from fx-engine-ext.js.
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-09: FX engine missing"); return; }

  define([
    { id: 426, name: "Nebula Drift",        perimShape: "roundrect", cornerRadius: 18, shape: "nebula", hue: "cosmos", count: 18, size: 6, life: [2, 3], alpha: 0.55, forces: [{ type: "wave", freq: 0.008, strength: 0.15 }] },
    { id: 427, name: "Star Forge",          perimShape: "circle", shape: "plasmoid", hue: "sunset", count: 22, size: 4, life: [1.2, 1.8] },
    { id: 428, name: "Aurora Ribbon",       perimShape: "roundrect", cornerRadius: 22, shape: "beam", count: 28, size: 2, life: [1, 1.6], beamLen: 20, hue: "rainbow" },
    { id: 429, name: "Twilight Veil",       shape: "bokeh", hue: "twilight", count: 20, size: 5, life: [2, 3], alpha: "twinkle", sizeMod: "breathe" },
    { id: 430, name: "Galaxy Spiral",       perimShape: "circle", shape: "orb", hue: "midnight", count: 26, size: 3, life: [1.6, 2.4], forces: [{ type: "spiral", out: -0.08, swirl: 0.5 }] },
    { id: 431, name: "Comet Weave",         perimShape: "roundrect", cornerRadius: 16, kind: "multi-head", heads: 3, speed: 0.28, rate: 50, shape: "comet", hue: "starfield", size: 4, life: [0.5, 0.9], tailLen: 6 },
    { id: 432, name: "Moonlight Pool",      perimShape: "circle", shape: "orb", hue: 220, sat: 30, lit: 80, count: 18, size: 5, life: [2, 3], alpha: "pulse" },
    { id: 433, name: "Astral Runes",        shape: "rune", hue: "arcane", count: 14, size: 14, life: [1.6, 2.4], alpha: "pulse", bold: true, forces: [{ type: "pendulum", k: 0.04, damp: 0.95 }] },
    { id: 434, name: "Void Whispers",       perimShape: "roundrect", cornerRadius: 20, shape: "nebula", hue: "void", count: 14, size: 6, life: [2.2, 3.4], alpha: 0.4, forces: [{ type: "wave", freq: 0.005, strength: 0.12 }] },
    { id: 435, name: "Solar Bloom",         perimShape: "circle", shape: "plasmoid", hue: "solarflare", count: 22, size: 4, life: [1, 1.6], sizeMod: "pulse" },

    { id: 436, name: "Nova Ripple",         perimShape: "roundrect", cornerRadius: 14, shape: "ripple3", hue: 45, count: 10, size: 8, life: [1.4, 2], lineWidth: 1 },
    { id: 437, name: "Prism Helix",         perimShape: "circle", shape: "dna", hue: "rainbow", count: 22, size: 3, life: [1.6, 2.4], helixFreq: 5 },
    { id: 438, name: "Celestial Bolt",      perimShape: "roundrect", cornerRadius: 16, shape: "bolt", hue: [200, 260], count: 12, size: 3, life: [0.3, 0.5], segments: 4, shadow: 0 },
    { id: 439, name: "Cosmic Shards",       perimShape: "star", perimPoints: 5, perimInnerRatio: 0.55, shape: "shard", hue: "cosmos", count: 20, size: 5, life: [1, 1.5] },
    { id: 440, name: "Oracle's Eye",        perimShape: "circle", shape: "chakra", hue: "arcane", count: 6, size: 18, life: [2, 3], alpha: "pulse", spokes: 8 },

    { id: 441, name: "Stardust Breeze",     shape: "dot", hue: "starfield", count: 50, size: 1.2, life: [1.2, 1.8], alpha: "twinkle", forces: [{ type: "wind", angle: 0.3, strength: 0.08, gust: 0.4 }] },
    { id: 442, name: "Midnight Petals",     perimShape: "roundrect", cornerRadius: 18, shape: "petal", hue: "sakura-deep", count: 20, size: 5, life: [1.6, 2.4], spin: 2, forces: [{ type: "braid", amp: 0.3 }] },
    { id: 443, name: "Eclipse Crown",       perimShape: "circle", shape: "beam", hue: [40, 50], count: 24, size: 2, life: [1, 1.5], beamLen: 14, beamWidth: 1.6 },
    { id: 444, name: "Dragon Pulse",        perimShape: "roundrect", cornerRadius: 20, shape: "plasmoid", hue: "infernal", count: 18, size: 5, life: [1, 1.6] },
    { id: 445, name: "Ether Mist",          shape: "bokeh", hue: "abyss", count: 18, size: 6, life: [2.4, 3.4], alpha: 0.35 },

    { id: 446, name: "Wandering Orb",       perimShape: "circle", kind: "head", speed: 0.22, rate: 30, shape: "orb", hue: [260, 320], size: 6, life: [0.8, 1.3] },
    { id: 447, name: "Sigil Ring",          perimShape: "circle", shape: "rune", hue: "arcane", count: 10, size: 16, life: [2, 3], glow: 6, bold: true, alpha: "pulse" },
    { id: 448, name: "Zodiac Wheel",        perimShape: "polygon", perimSides: 12, shape: "glyph", glyph: "✦", hue: [45, 55], count: 24, size: 10, life: [1.4, 2] },
    { id: 449, name: "Tidal Vortex",        perimShape: "roundrect", cornerRadius: 14, shape: "glow", hue: "reef", count: 28, size: 3, life: [1, 1.6], forces: [{ type: "spiral", out: 0, swirl: 0.6 }] },
    { id: 450, name: "Mystic Lantern",      perimShape: "circle", shape: "orb", hue: 45, count: 12, size: 6, life: [1.4, 2], alpha: "breathe" },

    { id: 451, name: "Comet Choir",         perimShape: "roundrect", cornerRadius: 16, kind: "multi-head", heads: 5, speed: 0.24, rate: 40, shape: "comet", hue: "prism", size: 3, life: [0.5, 0.8], tailLen: 5 },
    { id: 452, name: "Abyss Bloom",         perimShape: "circle", shape: "nebula", hue: "abyss", count: 14, size: 7, life: [2, 3], alpha: 0.4 },
    { id: 453, name: "Spirit Wisps",        shape: "bokeh", hue: [180, 220], count: 24, size: 4, life: [1.6, 2.4], alpha: "twinkle", forces: [{ type: "wave", freq: 0.01, strength: 0.18 }] },
    { id: 454, name: "Phoenix Ember",       perimShape: "star", perimPoints: 6, perimInnerRatio: 0.6, shape: "shard", hue: "infernal", count: 18, size: 4, life: [0.8, 1.4], spin: 2 },
    { id: 455, name: "Solar Halo",          perimShape: "circle", shape: "chakra", hue: 45, count: 4, size: 20, life: [2.4, 3.2], alpha: "pulse" },

    { id: 456, name: "Moth Dance",          shape: "firefly", hue: [40, 60], count: 18, size: 3, life: [1.8, 2.8], forces: [{ type: "pendulum", k: 0.03, damp: 0.94 }] },
    { id: 457, name: "Starfall Arc",        perimShape: "roundrect", cornerRadius: 18, shape: "comet", hue: "starfield", count: 16, size: 3, life: [0.6, 1], tailLen: 6 },
    { id: 458, name: "Portal Lattice",      perimShape: "circle", shape: "gridcell", hue: "electric", count: 22, size: 4, life: [1.4, 2], alpha: "pulse" },
    { id: 459, name: "Dreamweave",          shape: "wavelet", hue: "pastel", count: 22, size: 4, life: [1.6, 2.4], forces: [{ type: "wave", freq: 0.015, strength: 0.12 }] },
    { id: 460, name: "Celestial Gear",      perimShape: "circle", shape: "chakra", hue: [45, 200], count: 8, size: 14, life: [2, 3], spokes: 12, spin: 0.6 },

    { id: 461, name: "Astral Tides",        perimShape: "roundrect", cornerRadius: 22, shape: "beam", hue: "midnight", count: 22, size: 1.8, life: [1.2, 1.8], beamLen: 18, forces: [{ type: "braid", amp: 0.35 }] },
    { id: 462, name: "Ember Circles",       shape: "ripple3", hue: "ember", count: 8, size: 8, life: [1.2, 1.8], lineWidth: 0.9 },
    { id: 463, name: "Zephyr Vines",        perimShape: "roundrect", cornerRadius: 16, shape: "leaf", hue: 130, count: 20, size: 4, life: [1.6, 2.4], spin: 1.4, forces: [{ type: "wind", angle: 0.5, strength: 0.1, gust: 0.5 }] },
    { id: 464, name: "Astral Bloom",        perimShape: "circle", shape: "blob", hue: "twilight", count: 14, size: 5, life: [1.6, 2.4], alpha: 0.7 },
    { id: 465, name: "Heavenly Sparks",     shape: "plasmoid", hue: 55, sat: 100, lit: 80, count: 22, size: 3, life: [1, 1.5] },

    { id: 466, name: "Void Tendril",        perimShape: "roundrect", cornerRadius: 20, kind: "head", speed: 0.22, rate: 40, shape: "beam", hue: 280, size: 1.8, life: [0.6, 1], beamLen: 18 },
    { id: 467, name: "Solstice Glow",       perimShape: "circle", shape: "orb", hue: "sunset", count: 20, size: 5, life: [1.6, 2.4], alpha: "breathe" },
    { id: 468, name: "Rift Echo",           perimShape: "roundrect", cornerRadius: 16, shape: "ripple3", hue: 280, count: 8, size: 7, life: [1.4, 2], lineWidth: 1.1 },
    { id: 469, name: "Phantom Flock",       shape: "bokeh", hue: [180, 260], count: 22, size: 4, life: [1.6, 2.4], forces: [{ type: "wind", angle: 1.2, strength: 0.07, gust: 0.3 }] },
    { id: 470, name: "Ritual Circle",       perimShape: "circle", shape: "rune", hue: [260, 320], count: 16, size: 13, life: [1.8, 2.6], bold: true, alpha: "pulse" },

    { id: 471, name: "Celestium",           perimShape: "star", perimPoints: 4, shape: "orb", hue: "arcane", count: 16, size: 5, life: [1.4, 2] },
    { id: 472, name: "Moonbeam Braid",      perimShape: "roundrect", cornerRadius: 18, shape: "beam", hue: [200, 260], count: 20, size: 1.6, life: [1, 1.6], beamLen: 16, forces: [{ type: "braid", amp: 0.5, freq: 3 }] },
    { id: 473, name: "Wraith Lantern",      shape: "firefly", hue: [180, 220], count: 18, size: 4, life: [1.8, 2.6], phaseSpeed: 0.18 },
    { id: 474, name: "Oracle Mist",         perimShape: "circle", shape: "nebula", hue: "neonpink", count: 14, size: 6, life: [2, 3], alpha: 0.45 },
    { id: 475, name: "Stargate",            perimShape: "circle", emitters: [
      { shape: "chakra", hue: [40, 60], count: 2, size: 22, life: [3, 4], spokes: 16, alpha: "pulse" },
      { shape: "plasmoid", hue: "sunset", count: 18, size: 3, life: [1, 1.5] },
    ] },

    { id: 476, name: "Celestial Tide",      perimShape: "circle", shape: "beam", hue: "reef", count: 24, size: 1.6, life: [1, 1.5], beamLen: 16 },
    { id: 477, name: "Phoenix Spiral",      perimShape: "roundrect", cornerRadius: 14, shape: "shard", hue: "infernal", count: 22, size: 4, life: [0.8, 1.4], forces: [{ type: "spiral", out: 0.04, swirl: 0.3 }] },
    { id: 478, name: "Crystalline Haze",    shape: "shard", hue: 200, count: 20, size: 3, life: [1.4, 2], alpha: 0.8, forces: [{ type: "pendulum", k: 0.04 }] },
    { id: 479, name: "Ghost Dance",         shape: "bokeh", hue: 200, sat: 25, lit: 85, count: 20, size: 5, life: [2, 3], alpha: 0.5, forces: [{ type: "wave", freq: 0.008, strength: 0.12 }] },
    { id: 480, name: "Astral Weave",        perimShape: "roundrect", cornerRadius: 18, shape: "dna", hue: "prism", count: 20, size: 3, life: [1.4, 2], helixFreq: 4 },

    { id: 481, name: "Empyrean Glow",       perimShape: "superellipse", perimExponent: 4, shape: "orb", hue: [45, 55], count: 20, size: 5, life: [1.6, 2.4], alpha: "pulse" },
    { id: 482, name: "Shadow Veil",         shape: "nebula", hue: 260, sat: 80, lit: 25, count: 14, size: 6, life: [2.4, 3.4], alpha: 0.5 },
    { id: 483, name: "Hermes Wings",        perimShape: "roundrect", cornerRadius: 16, shape: "beam", hue: 45, count: 18, size: 1.8, life: [0.8, 1.2], beamLen: 20, forces: [{ type: "compass", angle: 0, strength: 0.05 }] },
    { id: 484, name: "Lotus Core",          perimShape: "circle", shape: "chakra", hue: "sakura-deep", count: 5, size: 18, life: [2, 3], spokes: 10, alpha: "pulse" },
    { id: 485, name: "Aether Pulse",        shape: "plasmoid", hue: "spectral", count: 20, size: 4, life: [1.2, 1.8], alpha: 0.8 },

    { id: 486, name: "Mist of Worlds",      perimShape: "roundrect", cornerRadius: 22, shape: "bokeh", hue: "spectral", count: 22, size: 5, life: [2, 3], alpha: 0.4 },
    { id: 487, name: "Starlight Mantle",    perimShape: "circle", shape: "dot", hue: "starfield", count: 50, size: 1.4, life: [1, 1.6], alpha: "twinkle" },
    { id: 488, name: "Zodiac Hum",          perimShape: "star", perimPoints: 12, perimInnerRatio: 0.75, shape: "glyph", glyph: "✦", hue: 45, count: 24, size: 9, life: [1.6, 2.4], alpha: "pulse" },
    { id: 489, name: "Dragonspire",         perimShape: "polygon", perimSides: 5, shape: "shard", hue: "infernal", count: 20, size: 5, life: [1, 1.5] },
    { id: 490, name: "Vestibule",           perimShape: "roundrect", cornerRadius: 16, shape: "gridcell", hue: 45, count: 24, size: 3, life: [1.4, 2], alpha: "pulse" },

    { id: 491, name: "Silverflame",         shape: "bokeh", hue: 200, sat: 10, lit: 90, count: 24, size: 4, life: [1.4, 2], alpha: "twinkle" },
    { id: 492, name: "Arcane Lattice",      perimShape: "roundrect", cornerRadius: 20, shape: "dna", hue: "arcane", count: 18, size: 3, life: [1.6, 2.4] },
    { id: 493, name: "Sunwheel",            perimShape: "circle", shape: "chakra", hue: 45, count: 3, size: 22, life: [2.4, 3.2], spokes: 12, alpha: "pulse" },
    { id: 494, name: "Prophetic Whisper",   shape: "wavelet", hue: "arcane", count: 18, size: 4, life: [1.6, 2.4] },
    { id: 495, name: "Nebular Eye",         perimShape: "circle", emitters: [
      { shape: "nebula", hue: "cosmos", count: 12, size: 6, life: [2.4, 3.4], alpha: 0.45 },
      { shape: "dot", hue: [45, 55], count: 18, size: 1.2, life: [1, 1.5], alpha: "twinkle" },
    ] },

    { id: 496, name: "Lunar Arc",           perimShape: "circle", shape: "beam", hue: [210, 230], count: 18, size: 1.6, life: [1, 1.5], beamLen: 20 },
    { id: 497, name: "Crystal Bloom",       shape: "shard", hue: "blizzard", count: 20, size: 4, life: [1.2, 1.8], spin: 1.4 },
    { id: 498, name: "Ethereal Loom",       perimShape: "roundrect", cornerRadius: 18, shape: "dna", hue: [180, 260], count: 22, size: 3, life: [1.6, 2.4] },
    { id: 499, name: "Solar Flare Ring",    perimShape: "circle", shape: "comet", hue: "solarflare", count: 20, size: 3, life: [0.6, 1], tailLen: 8 },
    { id: 500, name: "Eternity Pulse",      perimShape: "roundrect", cornerRadius: 22, shape: "ripple3", hue: 45, count: 6, size: 10, life: [1.8, 2.6], lineWidth: 1 },

    { id: 501, name: "Astral Tendons",      perimShape: "roundrect", cornerRadius: 18, kind: "head", speed: 0.24, rate: 30, shape: "beam", hue: "prism", size: 2, life: [0.6, 1], beamLen: 16 },
    { id: 502, name: "Nebula Hearts",       shape: "heart", hue: "neonpink", count: 14, size: 7, life: [1.4, 2.2], forces: [{ type: "wave", freq: 0.012, strength: 0.15 }] },
    { id: 503, name: "Whirling Dervish",    perimShape: "circle", shape: "shard", hue: "sunset", count: 18, size: 4, life: [1, 1.6], forces: [{ type: "spiral", out: 0, swirl: 0.7 }] },
    { id: 504, name: "Spirit Bells",        perimShape: "circle", shape: "glyph", glyph: "✦", hue: [40, 60], count: 14, size: 12, life: [1.4, 2.2], alpha: "pulse" },
    { id: 505, name: "Stellar Quilt",       perimShape: "roundrect", cornerRadius: 16, shape: "gridcell", hue: "electric", count: 28, size: 3, life: [1.4, 2] },

    { id: 506, name: "Deep Sky Aurora",     perimShape: "roundrect", cornerRadius: 24, shape: "nebula", hue: "abyss", count: 18, size: 6, life: [2.4, 3.4], alpha: 0.45 },
    { id: 507, name: "Sigil of Dawn",       perimShape: "star", perimPoints: 5, perimInnerRatio: 0.6, shape: "rune", hue: 45, count: 14, size: 13, life: [1.6, 2.4], bold: true, alpha: "pulse" },
    { id: 508, name: "Ember Orbit",         perimShape: "circle", shape: "orb", hue: "ember", count: 18, size: 4, life: [1.4, 2], forces: [{ type: "spiral", out: 0, swirl: 0.4 }] },
    { id: 509, name: "Moon Dust",           shape: "dot", hue: 220, sat: 20, lit: 85, count: 60, size: 1, life: [1, 1.6], alpha: "twinkle", forces: [{ type: "wind", angle: -0.2, strength: 0.05 }] },
    { id: 510, name: "Cosmic Tapestry",     perimShape: "roundrect", cornerRadius: 20, shape: "wavelet", hue: "spectral", count: 22, size: 3, life: [1.4, 2] },

    { id: 511, name: "Hallowed Gate",       perimShape: "roundrect", cornerRadius: 22, shape: "beam", hue: "starfield", count: 18, size: 2, life: [0.8, 1.3], beamLen: 20 },
    { id: 512, name: "Ancient Chant",       perimShape: "circle", shape: "rune", hue: "cosmos", count: 12, size: 14, life: [2, 2.8], bold: true, alpha: "pulse" },
    { id: 513, name: "Seraph Light",        perimShape: "roundrect", cornerRadius: 18, shape: "plasmoid", hue: [45, 55], count: 18, size: 4, life: [1, 1.6] },
    { id: 514, name: "Chaos Weave",         shape: "bolt", hue: "cyberpunk", count: 10, size: 3, life: [0.3, 0.5], segments: 3 },
    { id: 515, name: "Ocean Crown",         perimShape: "roundrect", cornerRadius: 22, shape: "ripple3", hue: "reef", count: 6, size: 10, life: [1.6, 2.4], lineWidth: 0.8 },

    { id: 516, name: "Twin Suns",           perimShape: "circle", kind: "multi-head", heads: 2, speed: 0.22, rate: 30, shape: "orb", hue: 40, size: 6, life: [0.8, 1.3] },
    { id: 517, name: "Astral Serpent",      perimShape: "roundrect", cornerRadius: 16, shape: "dna", hue: "midnight", count: 24, size: 3, life: [1.4, 2], helixFreq: 6 },
    { id: 518, name: "Phantom Coils",       perimShape: "circle", shape: "beam", hue: 260, count: 22, size: 1.6, life: [1, 1.5], beamLen: 14, forces: [{ type: "braid", amp: 0.4 }] },
    { id: 519, name: "Solar Mandala",       perimShape: "circle", shape: "chakra", hue: 45, count: 6, size: 16, life: [2, 3], spokes: 16, alpha: "pulse" },
    { id: 520, name: "Mother of Pearls",    shape: "bokeh", hue: [280, 320, 60], count: 26, size: 4, life: [1.6, 2.4], alpha: 0.55 },

    { id: 521, name: "Meteor Fountain",     perimShape: "roundrect", cornerRadius: 18, shape: "comet", hue: "ember", count: 22, size: 3, life: [0.5, 0.9], tailLen: 5 },
    { id: 522, name: "Lightfall",           perimShape: "circle", shape: "beam", hue: 45, count: 24, size: 1.8, life: [0.8, 1.2], beamLen: 22, forces: [{ type: "compass", angle: 1.5708, strength: 0.06 }] },
    { id: 523, name: "Twilight Petals",     perimShape: "roundrect", cornerRadius: 20, shape: "petal", hue: "twilight", count: 20, size: 5, life: [1.4, 2.2], spin: 2, forces: [{ type: "wind", angle: 0.3, strength: 0.05, gust: 0.4 }] },
    { id: 524, name: "Fate's Loom",         perimShape: "roundrect", cornerRadius: 14, shape: "dna", hue: "neonpink", count: 20, size: 3, life: [1.6, 2.4], helixFreq: 5 },
    { id: 525, name: "Starfall Finale",     perimShape: "roundrect", cornerRadius: 22, emitters: [
      { shape: "nebula", hue: "prism", count: 12, size: 5, life: [2, 3], alpha: 0.4 },
      { shape: "comet", hue: "starfield", count: 14, size: 3, life: [0.6, 1], tailLen: 5 },
      { shape: "dot", hue: [45, 55], count: 40, size: 1, life: [1, 1.5], alpha: "twinkle" },
    ] },
  ]);
})();
