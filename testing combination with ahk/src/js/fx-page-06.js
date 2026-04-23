/* ================================================================
   PAGE 6 — Effects 251–300 — LEGENDARY / SIGNATURE MULTI-LAYER
   ----------------------------------------------------------------
   The "ultimate" tier: rich, multi-source effects fit for cinematic
   UI (boss HP frames, legendary item tooltips, main menu highlights).
   Most combine an ambient field + a traveling head + special accents.
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-06: FX engine missing"); return; }

  define([
    { id: 251, name: "Dragon's Breath",
      kind: "perimeter", count: 90, shape: "flame", size: 3.5, life: [0.4, 0.8],
      hue: "fire", gravity: -0.12, spread: 0.5, phaseSpeed: 0.12,
      head: { shape: "flame", rate: 110, size: 6, life: [0.3, 0.6], hue: 10, spread: 0.7, headDotColor: "#ffd080", headDotR: 7 } },

    { id: 252, name: "Phoenix Rebirth",
      kind: "perimeter", count: 70, shape: "flame", size: 3, life: [0.6, 1],
      hue: [30, 50], gravity: -0.15,
      head: { shape: "glow", rate: 80, size: 6, life: [0.5, 0.9], hue: 40, headDotColor: "#fff5c0", headDotR: 9 } },

    { id: 253, name: "Divine Judgement",
      kind: "perimeter", count: 55, shape: "glow", size: 4, life: [1, 1.5],
      hue: [45, 55], velOutward: 0.08, alpha: 0.7,
      head: { shape: "glyph", glyph: "✚", rate: 12, size: 14, life: [0.8, 1.3], hue: 50, glow: 14, bold: true } },

    { id: 254, name: "Abyssal Rift",
      kind: "perimeter", count: 60, shape: "ring", size: 4, life: [1.4, 2],
      hue: [260, 290], lineWidth: 0.9, sizeMod: "grow", alpha: 0.4,
      head: { shape: "glow", rate: 80, size: 4, life: [0.6, 1], hue: 275, headDotColor: "#d49cff", headDotR: 7 } },

    { id: 255, name: "Celestial Throne",
      kind: "perimeter", count: 60, shape: "star", size: 2.4, life: [1, 1.8],
      hue: [45, 60, 200], points: 5, sizeMod: "twinkle",
      head: { shape: "star", rate: 20, size: 7, life: [0.8, 1.2], hue: 50, points: 6, headDotColor: "#fff6c0" } },

    { id: 256, name: "Shadow Realm Gate",
      kind: "perimeter", count: 55, shape: "glow", size: 5, life: [1.2, 2],
      hue: 270, sat: 80, lit: 30, alpha: 0.6,
      head: { shape: "streak", rate: 50, len: 22, size: 2, life: [0.5, 0.9], hue: 280, shadow: 10 } },

    { id: 257, name: "Demon Pact",
      kind: "perimeter", count: 70, shape: "flame", size: 3, life: [0.5, 0.9],
      hue: [350, 10], gravity: -0.1, spread: 0.5,
      head: { shape: "glyph", glyph: "⛧", rate: 10, size: 16, life: [0.8, 1.4], hue: 0, glow: 14, bold: true } },

    { id: 258, name: "Angel Wings",
      kind: "perimeter", count: 40, shape: "glow", size: 5, life: [1.4, 2.2],
      hue: [45, 55], velOutward: 0.06, alpha: 0.7,
      head: { shape: "glow", rate: 70, size: 5, life: [0.6, 1], hue: 50, headDotColor: "#fffef0", headDotR: 10 } },

    { id: 259, name: "Time Fracture",
      kind: "perimeter", count: 70, shape: "ring", size: 3, life: [1.2, 1.8],
      hue: [200, 45], lineWidth: 0.7, sizeMod: "grow", alpha: 0.5,
      head: { shape: "glow", rate: 80, size: 3, life: [0.3, 0.7], hue: 200, speed: 0.45 } },

    { id: 260, name: "Gravitational Well",
      kind: "perimeter", count: 70, shape: "dot", size: 1.4, life: [1.2, 1.8],
      hue: [240, 290], velInward: 0.3, velTangent: 0.6, drag: 0.99,
      head: { shape: "glow", rate: 70, size: 5, life: [0.5, 0.9], hue: 270 } },

    { id: 261, name: "Wormhole",
      kind: "perimeter", count: 55, shape: "ring", size: 4, life: [1.2, 1.8],
      hue: [260, 320], lineWidth: 1, sizeMod: "grow",
      head: { shape: "glow", rate: 90, size: 3.5, life: [0.4, 0.8], hue: 290, speed: 0.4 } },

    { id: 262, name: "Supernova",
      kind: "perimeter", count: 55, shape: "flame", size: 4, life: [0.6, 1.1],
      hue: [30, 55], velOutward: 0.15, spread: 0.4,
      head: { shape: "glow", rate: 50, size: 7, life: [0.7, 1.1], hue: 40, headDotR: 9 } },

    { id: 263, name: "Black Hole",
      kind: "perimeter", count: 70, shape: "dot", size: 1.6, life: [1, 1.6],
      hue: 280, sat: 100, lit: 30, velInward: 0.5, velTangent: 0.8, drag: 0.99,
      head: { shape: "ring", rate: 30, size: 10, life: [0.8, 1.2], hue: 280, lineWidth: 1.2, sizeMod: "grow" } },

    { id: 264, name: "White Hole",
      kind: "perimeter", count: 60, shape: "glow", size: 4, life: [1, 1.6],
      hue: 0, sat: 0, lit: 95, velOutward: 0.25, alpha: 0.7,
      head: { shape: "glow", rate: 60, size: 7, life: [0.6, 1], hue: 0, sat: 0, lit: 95, headDotColor: "#ffffff", headDotR: 10 } },

    { id: 265, name: "Hyperdrive",
      kind: "perimeter", count: 45, shape: "streak", size: 1.4, life: [0.4, 0.8],
      hue: [190, 230], velInward: 1.5, len: 14, shadow: 4,
      head: { shape: "streak", rate: 40, len: 22, size: 3, life: [0.3, 0.6], hue: 200, shadow: 10, speed: 0.5 } },

    { id: 266, name: "Mind Flayer",
      kind: "perimeter", count: 55, shape: "glow", size: 5, life: [1.2, 1.8],
      hue: [280, 320], alpha: 0.55, sway: 1.5, phaseSpeed: 0.16,
      head: { shape: "glow", rate: 60, size: 5, life: [0.6, 1], hue: 300, headDotColor: "#ff9cff", headDotR: 7 } },

    { id: 267, name: "Crystal Throne",
      kind: "perimeter", count: 30, shape: "diamond", size: 4, life: [1.2, 1.8],
      hue: [180, 220],
      head: { shape: "diamond", rate: 20, size: 6, life: [0.7, 1.2], hue: 200 } },

    { id: 268, name: "Chaos Storm",
      kind: "perimeter", count: 65, shape: "cross", size: 3, life: [0.5, 0.9],
      hue: "rainbow", lineWidth: 1.2, spread: 1.2, drag: 0.95,
      head: { shape: "glow", rate: 100, size: 4, life: [0.4, 0.7], hue: "rainbow" } },

    { id: 269, name: "Order Seal",
      kind: "perimeter", count: 28, shape: "poly", sides: 8, size: 6, life: [1.6, 2.4],
      hue: [45, 55], stroke: true, lineWidth: 1, spin: 0,
      head: { shape: "star", rate: 14, size: 7, life: [0.8, 1.3], hue: 50, points: 8, innerRatio: 0.55 } },

    { id: 270, name: "Life Bloom",
      kind: "perimeter", count: 40, shape: "rect", size: 4, life: [1.6, 2.4],
      hue: [100, 150], aspect: 2, velOutward: 0.08, blend: "source-over",
      head: { shape: "glyph", glyph: "✿", rate: 12, size: 14, life: [1, 1.5], hue: 120, glow: 8, bold: true, blend: "source-over" } },

    { id: 271, name: "Death Mark",
      kind: "perimeter", count: 45, shape: "dot", size: 1.8, life: [1.3, 2],
      hue: 0, sat: 100, lit: 40, alpha: 0.7,
      head: { shape: "glyph", glyph: "✝", rate: 10, size: 16, life: [1, 1.5], hue: 0, glow: 10, bold: true } },

    { id: 272, name: "Necromancer",
      kind: "perimeter", count: 55, shape: "glow", size: 4, life: [1.2, 1.8],
      hue: [110, 270], alpha: 0.55,
      head: { shape: "glyph", glyph: "☠", rate: 8, size: 16, life: [1.2, 1.8], hue: 110, glow: 12, bold: true } },

    { id: 273, name: "Paladin Aura",
      kind: "perimeter", count: 50, shape: "glow", size: 4, life: [1.2, 1.8],
      hue: [45, 55], alpha: 0.6, sizeMod: "pulse",
      head: { shape: "star", rate: 25, size: 6, life: [0.7, 1.1], hue: 50, points: 4 } },

    { id: 274, name: "Assassin Cloak",
      kind: "perimeter", count: 60, shape: "dot", size: 1.4, life: [1, 1.6],
      hue: 0, sat: 0, lit: 60, alpha: 0.45,
      head: { shape: "streak", rate: 55, len: 14, size: 1.8, life: [0.4, 0.8], hue: 0, sat: 0, lit: 95, shadow: 4, headDotColor: "#ffffff" } },

    { id: 275, name: "Berserker Rage",
      kind: "perimeter", count: 80, shape: "flame", size: 3.5, life: [0.4, 0.7],
      hue: [0, 15], gravity: -0.12, spread: 0.7,
      head: { shape: "flame", rate: 110, size: 5, life: [0.3, 0.6], hue: 5, spread: 0.9 } },

    { id: 276, name: "Mage Circle",
      kind: "perimeter", count: 30, shape: "glyph", size: 12, life: [1.4, 2],
      hue: [260, 290], glow: 10, bold: true,
      init: (p) => { const g = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁ"; p.glyph = g[(Math.random() * g.length) | 0]; },
      glyph: (p) => p.glyph,
      head: { shape: "glow", rate: 50, size: 5, life: [0.6, 1], hue: 275 } },

    { id: 277, name: "Warlock Pact",
      kind: "perimeter", count: 60, shape: "glow", size: 5, life: [1, 1.6],
      hue: [290, 330], alpha: 0.55,
      head: { shape: "streak", rate: 40, len: 18, size: 2, life: [0.5, 0.9], hue: 310, shadow: 8 } },

    { id: 278, name: "Druid Bloom",
      kind: "perimeter", count: 35, shape: "rect", size: 4, life: [1.8, 2.6],
      hue: [80, 140], aspect: 2, blend: "source-over", velOutward: 0.06,
      head: { shape: "glow", rate: 40, size: 5, life: [0.8, 1.2], hue: 110, alpha: 0.7 } },

    { id: 279, name: "Ranger Shot",
      kind: "perimeter", count: 40, shape: "dot", size: 1.3, life: [0.8, 1.3],
      hue: [100, 130],
      head: { shape: "arrow", rate: 12, size: 7, life: [0.5, 0.9], hue: 110, pointAlong: "tangent" } },

    { id: 280, name: "Monk Chi",
      kind: "perimeter", count: 45, shape: "ring", size: 4, life: [1.4, 2],
      hue: [45, 55], lineWidth: 0.8, sizeMod: "grow", alpha: 0.5,
      head: { shape: "glow", rate: 45, size: 5, life: [0.8, 1.2], hue: 50 } },

    { id: 281, name: "Archon Sigil",
      kind: "perimeter", count: 28, shape: "poly", sides: 12, size: 6, life: [1.6, 2.4],
      hue: [40, 50], stroke: true, lineWidth: 1, spin: 0,
      head: { shape: "glow", rate: 40, size: 6, life: [0.7, 1.2], hue: 45 } },

    { id: 282, name: "Lich King",
      kind: "perimeter", count: 50, shape: "glow", size: 4, life: [1.2, 1.8],
      hue: [180, 210], sat: 80, alpha: 0.55,
      head: { shape: "glyph", glyph: "♛", rate: 8, size: 16, life: [1, 1.5], hue: 190, glow: 12, bold: true } },

    { id: 283, name: "Oracle Vision",
      kind: "perimeter", count: 50, shape: "dot", size: 1.5, life: [1.4, 2],
      hue: [280, 320], sizeMod: "twinkle",
      head: { shape: "glyph", glyph: "◉", rate: 18, size: 14, life: [0.8, 1.2], hue: 300, glow: 10 } },

    { id: 284, name: "Titan Armor",
      kind: "perimeter", count: 40, shape: "rect", size: 4, life: [1.4, 2],
      hue: [30, 45], aspect: 2, blend: "source-over",
      head: { shape: "glow", rate: 40, size: 6, life: [0.6, 1], hue: 40 } },

    { id: 285, name: "Kraken Grasp",
      kind: "perimeter", count: 55, shape: "glow", size: 5, life: [1.2, 1.8],
      hue: [200, 240], alpha: 0.55, sway: 2,
      head: { shape: "glow", rate: 70, size: 4, life: [0.6, 1], hue: 220 } },

    { id: 286, name: "Wyvern Flight",
      kind: "perimeter", count: 55, shape: "flame", size: 3, life: [0.5, 0.9],
      hue: [20, 40],
      head: { shape: "flame", rate: 60, size: 6, life: [0.4, 0.8], hue: 30, headDotColor: "#ffd590" } },

    { id: 287, name: "Ifrit Fire",
      kind: "perimeter", count: 90, shape: "flame", size: 3.5, life: [0.4, 0.7],
      hue: [0, 20], spread: 0.6, gravity: -0.12,
      head: { shape: "flame", rate: 120, size: 6, life: [0.3, 0.5], hue: 10, spread: 0.8 } },

    { id: 288, name: "Leviathan Depth",
      kind: "perimeter", count: 50, shape: "glow", size: 5, life: [1.4, 2],
      hue: [220, 250], alpha: 0.55, sway: 1.5,
      head: { shape: "glow", rate: 60, size: 5, life: [0.6, 1], hue: 230 } },

    { id: 289, name: "Bahamut Wings",
      kind: "perimeter", count: 45, shape: "glow", size: 5, life: [1.2, 1.8],
      hue: [45, 55], velOutward: 0.08, alpha: 0.65,
      head: { shape: "glow", rate: 70, size: 6, life: [0.6, 1], hue: 50, headDotR: 9 } },

    { id: 290, name: "Yggdrasil Root",
      kind: "perimeter", count: 55, shape: "flame", size: 3, life: [0.7, 1.1],
      hue: [80, 120], gravity: -0.04,
      head: { shape: "glow", rate: 50, size: 5, life: [0.7, 1.1], hue: 100 } },

    { id: 291, name: "Midgard Coil",
      kind: "perimeter", count: 60, shape: "dot", size: 1.6, life: [1.2, 1.8],
      hue: [30, 50], velTangent: 1,
      head: { shape: "glow", rate: 80, size: 4, life: [0.5, 0.9], hue: 40, speed: 0.45 } },

    { id: 292, name: "Valhalla Gate",
      kind: "perimeter", count: 40, shape: "glow", size: 5, life: [1.2, 1.8],
      hue: [45, 55], alpha: 0.65,
      head: { shape: "glyph", glyph: "ᛟ", rate: 15, size: 16, life: [0.9, 1.4], hue: 50, glow: 10, bold: true } },

    { id: 293, name: "Elysium Light",
      kind: "perimeter", count: 55, shape: "glow", size: 4, life: [1.4, 2],
      hue: [45, 55], alpha: 0.6, sizeMod: "pulse",
      head: { shape: "glow", rate: 65, size: 5, life: [0.6, 1], hue: 50, headDotColor: "#fffdd0", headDotR: 8 } },

    { id: 294, name: "Tartarus Void",
      kind: "perimeter", count: 55, shape: "ring", size: 4, life: [1.4, 2],
      hue: [260, 290], lineWidth: 1, sizeMod: "grow", alpha: 0.4,
      head: { shape: "glow", rate: 65, size: 4, life: [0.6, 1], hue: 275, headDotColor: "#b080ff" } },

    { id: 295, name: "Eden Bloom",
      kind: "perimeter", count: 45, shape: "rect", size: 4, life: [1.8, 2.6],
      hue: [90, 130, 330, 355], aspect: 2, blend: "source-over", velOutward: 0.05,
      head: { shape: "glyph", glyph: "❀", rate: 10, size: 16, life: [1, 1.5], hue: 110, glow: 10, bold: true, blend: "source-over" } },

    { id: 296, name: "Prometheus Flame",
      kind: "perimeter", count: 75, shape: "flame", size: 3.5, life: [0.5, 0.9],
      hue: [30, 55], gravity: -0.12, spread: 0.4,
      head: { shape: "flame", rate: 80, size: 6, life: [0.5, 0.9], hue: 40, headDotColor: "#fff0b0" } },

    { id: 297, name: "Pandora Chaos",
      kind: "perimeter", count: 70, shape: "dot", size: 1.6, life: [0.6, 1.2],
      hue: "rainbow", spread: 1.5, drag: 0.93,
      head: { shape: "glow", rate: 100, size: 4, life: [0.4, 0.8], hue: "rainbow", spread: 1, drag: 0.9 } },

    { id: 298, name: "Chronos Wheel",
      kind: "perimeter", count: 30, shape: "poly", sides: 12, size: 6, life: [1.6, 2.4],
      hue: [40, 200], stroke: true, lineWidth: 1, spin: 3,
      head: { shape: "glow", rate: 40, size: 5, life: [0.7, 1.1], hue: 50 } },

    { id: 299, name: "Cosmos Threads",
      kind: "perimeter", count: 80, shape: "dot", size: 1.2, life: [1.4, 2.2],
      hue: [200, 280, 320], velTangent: 0.6,
      head: { shape: "streak", rate: 45, len: 20, size: 2, life: [0.5, 0.9], hue: 240, shadow: 6 } },

    { id: 300, name: "Eternal Legend",
      kind: "perimeter", count: 70, shape: "glow", size: 6, life: [1.6, 2.4],
      hue: "rainbow", alpha: 0.55, sizeMod: "pulse", phaseSpeed: 0.12,
      head: { shape: "star", rate: 24, size: 8, life: [0.8, 1.3], hue: "rainbow", points: 6, headDotColor: "#ffffff", headDotR: 10 } }
  ]);
})();
