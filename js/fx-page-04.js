/* ================================================================
   PAGE 4 — Effects 151–200 — DUAL-LAYER COMBOS
   ----------------------------------------------------------------
   Each effect combines a whole-perimeter ambient field with a
   traveling head trail (via the FX engine's nested `head:` config).
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-04: FX engine missing"); return; }

  define([
    { id: 151, name: "Comet Through Sparkles",
      kind: "perimeter", count: 55, shape: "cross", size: 2.4, life: [0.6, 1.1],
      hue: [45, 60], sizeMod: "pulse", lineWidth: 1,
      head: { shape: "glow", rate: 70, size: 3, life: [0.5, 1], hue: 200, velTangent: 0 }
    },
    { id: 152, name: "Phoenix Flight",
      kind: "perimeter", count: 70, shape: "flame", size: 3, life: [0.5, 0.9],
      hue: "fire", gravity: -0.1, spread: 0.4,
      head: { shape: "flame", rate: 60, size: 5, life: [0.4, 0.8], hue: 30, gravity: -0.08, headDotHue: 40 }
    },
    { id: 153, name: "Thunderdome",
      kind: "perimeter", count: 60, shape: "dot", size: 1.3, life: [0.3, 0.6],
      hue: [190, 210], spread: 1.5, drag: 0.9,
      head: { shape: "streak", rate: 40, len: 14, size: 2, life: [0.4, 0.7], hue: 200, shadow: 8, velTangent: 0 }
    },
    { id: 154, name: "Frozen Aurora",
      kind: "perimeter", count: 45, shape: "glow", size: 6, life: [1.4, 2.2],
      hue: [140, 220], velInward: 0.05, sizeMod: "pulse",
      head: { shape: "flake", rate: 15, size: 5, life: [1, 1.6], hue: 200, lineWidth: 0.8 }
    },
    { id: 155, name: "Solar Wind",
      kind: "perimeter", count: 60, shape: "flame", size: 3.5, life: [0.6, 1],
      hue: [30, 55], velOutward: 0.1, gravity: -0.05,
      head: { shape: "glow", rate: 50, size: 5, life: [0.6, 1], hue: 40, headDotR: 7 }
    },
    { id: 156, name: "Dragon Breath",
      kind: "perimeter", count: 80, shape: "flame", size: 3, life: [0.4, 0.8],
      hue: [5, 35], spread: 0.5, gravity: -0.1,
      head: { shape: "flame", rate: 80, size: 6, life: [0.3, 0.6], hue: 15, velTangent: 1, headDotColor: "#ffe0a8" }
    },
    { id: 157, name: "Starfall Express",
      kind: "perimeter", count: 50, shape: "dot", size: 1.4, life: [1, 1.8],
      hue: [200, 45, 0], sizeMod: "twinkle",
      head: { shape: "star", rate: 20, size: 5, life: [0.6, 1], hue: 50, points: 5 }
    },
    { id: 158, name: "Void Walker",
      kind: "perimeter", count: 50, shape: "ring", size: 3, life: [1, 1.6],
      hue: [260, 290], lineWidth: 0.8, sizeMod: "grow", alpha: 0.5,
      head: { shape: "glow", rate: 60, size: 4, life: [0.7, 1.1], hue: 275, headDotColor: "#d4a0ff" }
    },
    { id: 159, name: "Galaxy Swirl",
      kind: "perimeter", count: 70, shape: "dot", size: 1.2, life: [1.4, 2.2],
      hue: "royal", velTangent: 0.5, spread: 0.2,
      head: { shape: "glow", rate: 50, size: 4, life: [0.8, 1.3], hue: 280, velTangent: 1 }
    },
    { id: 160, name: "Spirit Flame",
      kind: "perimeter", count: 50, shape: "glow", size: 5, life: [1, 1.8],
      hue: [170, 200], sizeMod: "pulse", alpha: 0.6,
      head: { shape: "flame", rate: 55, size: 4, life: [0.6, 1], hue: 180 }
    },
    { id: 161, name: "Celestial Wake",
      kind: "perimeter", count: 40, shape: "glow", size: 6, life: [1.5, 2.2],
      hue: [230, 310], alpha: 0.5,
      head: { shape: "glow", rate: 80, size: 3, life: [0.5, 0.9], hue: 200 }
    },
    { id: 162, name: "Plasma Runner",
      kind: "perimeter", count: 55, shape: "glow", size: 5, life: [0.8, 1.4],
      hue: [270, 320], sizeMod: "pulse",
      head: { shape: "glow", rate: 90, size: 4, life: [0.4, 0.7], hue: 295, spread: 0.5 }
    },
    { id: 163, name: "Rainbow Comet",
      kind: "perimeter", count: 45, shape: "glow", size: 4, life: [1.2, 1.8],
      hue: "rainbow", alpha: 0.6,
      head: { shape: "glow", rate: 70, size: 4, life: [0.5, 0.9], hue: "rainbow", headDotHue: 300 }
    },
    { id: 164, name: "Divine Messenger",
      kind: "perimeter", count: 55, shape: "glow", size: 3, life: [1, 1.6],
      hue: [45, 55], velOutward: 0.05, alpha: 0.7,
      head: { shape: "star", rate: 18, size: 6, life: [0.7, 1.2], hue: 50, points: 6, headDotColor: "#ffffff" }
    },
    { id: 165, name: "Shadow Hunter",
      kind: "perimeter", count: 50, shape: "dot", size: 2, life: [1, 1.6],
      hue: [270, 290], sat: 80, lit: 30, alpha: 0.8,
      head: { shape: "glow", rate: 70, size: 3, life: [0.4, 0.8], hue: 280 }
    },
    { id: 166, name: "Ember Courier",
      kind: "perimeter", count: 70, shape: "glow", size: 2, life: [0.8, 1.3],
      hue: "ember", gravity: -0.04,
      head: { shape: "flame", rate: 65, size: 5, life: [0.4, 0.8], hue: 25 }
    },
    { id: 167, name: "Crystal Comet",
      kind: "perimeter", count: 30, shape: "flake", size: 4, life: [1.4, 2.2],
      hue: 200, lineWidth: 0.7,
      head: { shape: "diamond", rate: 35, size: 5, life: [0.7, 1.2], hue: 195, headDotColor: "#dff0ff" }
    },
    { id: 168, name: "Venom Runner",
      kind: "perimeter", count: 40, shape: "glow", size: 5, life: [1.3, 2],
      hue: "toxic", sizeMod: "pulse", alpha: 0.55,
      head: { shape: "glow", rate: 60, size: 4, life: [0.6, 1], hue: 110 }
    },
    { id: 169, name: "Chrono Wake",
      kind: "perimeter", count: 45, shape: "ring", size: 4, life: [1.2, 1.8],
      hue: 200, lineWidth: 0.7, sizeMod: "grow", alpha: 0.5,
      head: { shape: "glow", rate: 80, size: 3, life: [0.3, 0.6], hue: 200 }
    },
    { id: 170, name: "Kinetic Arc",
      kind: "perimeter", count: 55, shape: "dot", size: 1.3, life: [0.4, 0.8],
      hue: [40, 60], spread: 1.2, drag: 0.9,
      head: { shape: "streak", rate: 45, len: 12, size: 2, life: [0.4, 0.7], hue: 50, shadow: 6 }
    },
    { id: 171, name: "Aether Weaver",
      kind: "perimeter", count: 35, shape: "glow", size: 5, life: [1.4, 2],
      hue: [280, 340], alpha: 0.5,
      head: { shape: "streak", rate: 30, len: 20, size: 2, life: [0.6, 1], hue: 320, shadow: 4 }
    },
    { id: 172, name: "Blood Comet",
      kind: "perimeter", count: 50, shape: "glow", size: 5, life: [1.2, 1.8],
      hue: "blood", sizeMod: "pulse", alpha: 0.55,
      head: { shape: "glow", rate: 70, size: 5, life: [0.5, 0.9], hue: 0, headDotColor: "#ff5060" }
    },
    { id: 173, name: "Golden Courier",
      kind: "perimeter", count: 60, shape: "dot", size: 2, life: [0.8, 1.4],
      hue: 45, sat: 100, lit: 80, sizeMod: "twinkle",
      head: { shape: "glow", rate: 55, size: 5, life: [0.6, 1], hue: 45, headDotColor: "#fff0c0" }
    },
    { id: 174, name: "Astral Dancer",
      kind: "perimeter", count: 40, shape: "star", size: 2.2, life: [1, 1.6],
      hue: [45, 50, 0], points: 5, sizeMod: "fade",
      head: { shape: "star", rate: 25, size: 5, life: [0.6, 1.1], hue: 50, points: 6 }
    },
    { id: 175, name: "Magnet Runner",
      kind: "perimeter", count: 55, shape: "dot", size: 1.4, life: [1, 1.6],
      hue: [180, 220], velTangent: 0.8,
      head: { shape: "glow", rate: 70, size: 4, life: [0.5, 0.9], hue: 200 }
    },
    { id: 176, name: "Phantom Wake",
      kind: "perimeter", count: 40, shape: "glow", size: 6, life: [1.4, 2.2],
      hue: 180, alpha: 0.4, sway: 1,
      head: { shape: "glow", rate: 55, size: 4, life: [0.5, 0.9], hue: 185, alpha: 0.6 }
    },
    { id: 177, name: "Neon Racer",
      kind: "perimeter", count: 40, shape: "streak", size: 1.4, life: [0.5, 0.9],
      hue: [320, 190, 60, 280], velInward: 1.4, len: 8, shadow: 5,
      head: { shape: "streak", rate: 35, len: 16, size: 2.4, life: [0.4, 0.7], hue: 320, shadow: 8, velTangent: 0 }
    },
    { id: 178, name: "Fire Dancer",
      kind: "perimeter", count: 55, shape: "flame", size: 3, life: [0.5, 0.9],
      hue: "fire", velTangent: 0.4, gravity: -0.08,
      head: { shape: "flame", rate: 45, size: 5, life: [0.5, 0.9], hue: 20 }
    },
    { id: 179, name: "Toxic Runner",
      kind: "perimeter", count: 35, shape: "glow", size: 5, life: [1.4, 2.2],
      hue: "toxic", alpha: 0.5,
      head: { shape: "glow", rate: 50, size: 4, life: [0.5, 1], hue: 100 }
    },
    { id: 180, name: "Electric Serpent",
      kind: "perimeter", count: 50, shape: "dot", size: 1.2, life: [0.4, 0.8],
      hue: [180, 210], spread: 1.5, drag: 0.9,
      head: { shape: "glow", rate: 90, size: 3, life: [0.3, 0.6], hue: 190, spread: 1.5, drag: 0.9, speed: 0.42 }
    },
    { id: 181, name: "Bubble Runner",
      kind: "perimeter", count: 25, shape: "ring", size: 4, life: [1.4, 2],
      hue: [180, 220], lineWidth: 1, sizeMod: "grow",
      head: { shape: "ring", rate: 20, size: 6, life: [0.8, 1.2], hue: 200, lineWidth: 1.2 }
    },
    { id: 182, name: "Frostbite Runner",
      kind: "perimeter", count: 25, shape: "flake", size: 4, life: [1.6, 2.4],
      hue: 200, lineWidth: 0.7,
      head: { shape: "flake", rate: 20, size: 5, life: [0.8, 1.2], hue: 195, lineWidth: 0.8 }
    },
    { id: 183, name: "Infernal Arc",
      kind: "perimeter", count: 65, shape: "flame", size: 3, life: [0.5, 0.8],
      hue: [0, 25], velInward: 0.1, gravity: -0.1,
      head: { shape: "flame", rate: 90, size: 6, life: [0.4, 0.7], hue: 10, spread: 0.6, headDotColor: "#ffb070" }
    },
    { id: 184, name: "Nova Runner",
      kind: "perimeter", count: 40, shape: "glow", size: 5, life: [1.2, 1.8],
      hue: [45, 30], sizeMod: "pulse", alpha: 0.6,
      head: { shape: "glow", rate: 40, size: 6, life: [0.6, 1.1], hue: 40, headDotR: 6 }
    },
    { id: 185, name: "Mist Runner",
      kind: "perimeter", count: 30, shape: "glow", size: 7, life: [1.8, 2.6],
      hue: 210, sat: 30, lit: 80, alpha: 0.35,
      head: { shape: "glow", rate: 50, size: 5, life: [0.6, 1], hue: 210, alpha: 0.6 }
    },
    { id: 186, name: "Stardust Sweeper",
      kind: "perimeter", count: 70, shape: "dot", size: 1.4, life: [0.8, 1.4],
      hue: [200, 210, 0, 45], sizeMod: "twinkle",
      head: { shape: "glow", rate: 100, size: 2.5, life: [0.4, 0.7], hue: 50 }
    },
    { id: 187, name: "Comet Cluster",
      kind: "perimeter", count: 40, shape: "glow", size: 3, life: [0.8, 1.3],
      hue: [200, 220], alpha: 0.5,
      head: { shape: "glow", rate: 100, size: 3, life: [0.4, 0.8], hue: 210, speed: 0.5 }
    },
    { id: 188, name: "Firefly Parade",
      kind: "perimeter", count: 22, shape: "glow", size: 3, life: [2, 3.2],
      hue: [55, 85], alpha: "twinkle", phaseSpeed: 0.15,
      head: { shape: "glow", rate: 40, size: 4, life: [0.7, 1.1], hue: 65 }
    },
    { id: 189, name: "Ash Phoenix",
      kind: "perimeter", count: 60, shape: "dot", size: 1.6, life: [1.4, 2.2],
      hue: 30, sat: 10, lit: 70, alpha: 0.45, gravity: -0.02,
      head: { shape: "flame", rate: 50, size: 5, life: [0.5, 0.9], hue: 20, headDotColor: "#ffcc80" }
    },
    { id: 190, name: "Cosmic Conductor",
      kind: "perimeter", count: 70, shape: "dot", size: 1.1, life: [1.2, 2],
      hue: [200, 320],
      head: { shape: "streak", rate: 40, len: 12, size: 2, life: [0.4, 0.7], hue: 210, shadow: 6 }
    },
    { id: 191, name: "Petal Dancer",
      kind: "perimeter", count: 35, shape: "rect", size: 4, life: [1.6, 2.4],
      hue: [320, 355], aspect: 2, velInward: 0.2, velTangent: 0.4, blend: "source-over",
      head: { shape: "rect", rate: 15, size: 5, life: [0.8, 1.3], hue: 335, aspect: 2 }
    },
    { id: 192, name: "Sandstorm Runner",
      kind: "perimeter", count: 85, shape: "dot", size: 1.2, life: [0.8, 1.4],
      hue: [30, 45], velTangent: 1.2, spread: 0.4, drag: 0.96,
      head: { shape: "glow", rate: 80, size: 4, life: [0.5, 0.9], hue: 38, velTangent: 1.5 }
    },
    { id: 193, name: "Gold Rush",
      kind: "perimeter", count: 50, shape: "glow", size: 2.4, life: [0.8, 1.3],
      hue: 45, sizeMod: "twinkle", alpha: "twinkle",
      head: { shape: "glow", rate: 70, size: 5, life: [0.5, 0.9], hue: 45, headDotColor: "#ffec9a" }
    },
    { id: 194, name: "Holy Courier",
      kind: "perimeter", count: 45, shape: "glow", size: 3, life: [1, 1.6],
      hue: 50, alpha: 0.7,
      head: { shape: "glyph", glyph: "✚", rate: 14, size: 10, life: [0.8, 1.2], hue: 50, glow: 8, bold: true }
    },
    { id: 195, name: "Plasma Eel",
      kind: "perimeter", count: 50, shape: "glow", size: 4, life: [0.8, 1.3],
      hue: [270, 310], alpha: 0.55,
      head: { shape: "glow", rate: 120, size: 3, life: [0.4, 0.7], hue: 290, speed: 0.45 }
    },
    { id: 196, name: "Meteor Hunter",
      kind: "perimeter", count: 25, shape: "streak", size: 2, life: [0.5, 0.9],
      hue: [20, 45], velInward: 1.1, len: 12,
      head: { shape: "glow", rate: 30, size: 5, life: [0.4, 0.8], hue: 30, headDotColor: "#ffe0a0" }
    },
    { id: 197, name: "Ink Runner",
      kind: "perimeter", count: 25, shape: "dot", size: 3, life: [1.6, 2.4],
      hue: 260, sat: 40, lit: 20, alpha: 0.7, blend: "source-over",
      head: { shape: "dot", rate: 18, size: 4, life: [1, 1.5], hue: 260, sat: 50, lit: 15, alpha: 0.8, blend: "source-over" }
    },
    { id: 198, name: "Thunder Comet",
      kind: "perimeter", count: 55, shape: "dot", size: 1.2, life: [0.3, 0.6],
      hue: [190, 210], spread: 1.8, drag: 0.88,
      head: { shape: "glow", rate: 80, size: 4, life: [0.4, 0.8], hue: 200, headDotColor: "#e6f3ff" }
    },
    { id: 199, name: "Crystal Shower",
      kind: "perimeter", count: 35, shape: "diamond", size: 3, life: [1, 1.6],
      hue: 195, velInward: 0.4, gravity: 0.06,
      head: { shape: "diamond", rate: 18, size: 5, life: [0.8, 1.2], hue: 200 }
    },
    { id: 200, name: "Signature Aurora Hero",
      kind: "perimeter", count: 60, shape: "glow", size: 6, life: [1.6, 2.4],
      hue: "rainbow", alpha: 0.55, sizeMod: "pulse",
      head: { shape: "glow", rate: 110, size: 5, life: [0.5, 0.9], hue: "rainbow", headDotR: 7, headDotColor: "#ffffff" }
    }
  ]);
})();
