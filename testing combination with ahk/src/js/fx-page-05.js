/* ================================================================
   PAGE 5 — Effects 201–250 — GEOMETRIC / PATTERN BORDERS
   ----------------------------------------------------------------
   Shapes, glyphs, and grids marching around the whole perimeter.
   All effects authored declaratively through the FX engine.
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-05: FX engine missing"); return; }

  // Small glyph palettes reused across effects
  const G_MATH   = "+−×÷=±∞∑∏√∫";
  const G_ARROW  = "←↑→↓↖↗↘↙";
  const G_STAR   = "★☆✦✧✪✫✬";
  const G_SYMBOL = "♠♣♥♦♪♫☀☁☂☃";
  const G_RUNE   = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁ";
  const pickFrom = s => () => s[(Math.random() * s.length) | 0];

  define([
    { id: 201, name: "Hex Grid",
      kind: "perimeter", count: 30, shape: "poly", sides: 6, size: 4, life: [1.6, 2.4],
      hue: [180, 220], stroke: true, lineWidth: 1, spin: 0, sizeMod: "pulse" },

    { id: 202, name: "Triangle Mesh",
      kind: "perimeter", count: 45, shape: "triangle", size: 4, life: [1.2, 1.8],
      hue: [140, 180], sizeMod: "fade", spin: 1.5 },

    { id: 203, name: "Binary Stream",
      kind: "perimeter", count: 45, shape: "glyph", size: 10, life: [1, 1.6],
      hue: 140, sat: 100, lit: 65, velInward: 0.2, glow: 4, bold: true,
      init: (p) => { p.glyph = Math.random() < 0.5 ? "0" : "1"; },
      glyph: (p) => p.glyph },

    { id: 204, name: "Circuit Lines",
      kind: "perimeter", count: 50, shape: "bar", size: 2, life: [0.9, 1.4],
      hue: 160, sat: 100, lit: 60, barLen: 6, barWidth: 1.2, sizeMod: "pulse" },

    { id: 205, name: "Barcode",
      kind: "perimeter", count: 40, shape: "bar", size: 2.5, life: [0.8, 1.3],
      hue: 0, sat: 0, lit: 95, barLen: 8, barWidth: 1.5, sizeMod: "fade" },

    { id: 206, name: "Polygon Pulse",
      kind: "perimeter", count: 28, shape: "poly", sides: 5, size: 5, life: [1.2, 1.8],
      hue: [280, 320], stroke: true, lineWidth: 1.2, sizeMod: "pulse", spin: 1 },

    { id: 207, name: "Dot Matrix",
      kind: "perimeter", count: 100, shape: "square", size: 1.2, life: [0.8, 1.4],
      hue: [200, 220, 45, 0], sizeMod: "twinkle" },

    { id: 208, name: "Line Weaver",
      kind: "perimeter", count: 35, shape: "bar", size: 2, life: [0.8, 1.2],
      hue: [200, 320], barLen: 10, barWidth: 1, sizeMod: "pulse" },

    { id: 209, name: "QR Flicker",
      kind: "perimeter", count: 90, shape: "square", size: 2, life: [0.4, 0.8],
      hue: 0, sat: 0, lit: 95, blend: "source-over", alpha: "const" },

    { id: 210, name: "Cube Rain",
      kind: "perimeter", count: 40, shape: "square", size: 2.5, life: [1, 1.5],
      hue: [180, 210], velInward: 0.5, gravity: 0.05, blend: "source-over" },

    { id: 211, name: "Arrow Stream",
      kind: "perimeter", count: 45, shape: "arrow", size: 4, life: [1, 1.5],
      hue: [40, 60], pointAlong: "tangent", velTangent: 0.6, sizeMod: "fade" },

    { id: 212, name: "Square Spiral",
      kind: "perimeter", count: 40, shape: "square", size: 1.8, life: [1.4, 2],
      hue: "rainbow", velInward: 0.2, velTangent: 0.6, drag: 0.99 },

    { id: 213, name: "Diamond Grid",
      kind: "perimeter", count: 35, shape: "diamond", size: 3, life: [1.2, 1.8],
      hue: 195, stroke: false },

    { id: 214, name: "Cross Pattern",
      kind: "perimeter", count: 40, shape: "cross", size: 4, life: [0.9, 1.4],
      hue: [320, 45, 180], lineWidth: 1.3, sizeMod: "pulse" },

    { id: 215, name: "Plus Signs",
      kind: "perimeter", count: 35, shape: "glyph", glyph: "+", size: 11, life: [0.9, 1.4],
      hue: 45, sat: 100, lit: 80, glow: 6, bold: true, spin: 0 },

    { id: 216, name: "Pentagon Ring",
      kind: "perimeter", count: 25, shape: "poly", sides: 5, size: 5, life: [1.4, 2],
      hue: 40, stroke: true, lineWidth: 1, spin: 0 },

    { id: 217, name: "Octagon Beat",
      kind: "perimeter", count: 25, shape: "poly", sides: 8, size: 5, life: [1.2, 1.8],
      hue: [180, 200], stroke: true, lineWidth: 1.2, sizeMod: "pulse" },

    { id: 218, name: "Star Chain",
      kind: "perimeter", count: 30, shape: "star", size: 4, life: [1.2, 1.8],
      hue: [45, 55], points: 5, sizeMod: "fade" },

    { id: 219, name: "Halftone",
      kind: "perimeter", count: 70, shape: "dot", size: 2, life: [1, 1.6],
      hue: 0, sat: 0, lit: 90, sizeMod: "twinkle" },

    { id: 220, name: "Checkerboard Wave",
      kind: "perimeter", count: 55, shape: "square", size: 3, life: [0.8, 1.3],
      hue: 0, sat: 0, lit: 95, blend: "source-over", alpha: "pulse",
      init: (p) => { if ((Math.round(p.x / 6) + Math.round(p.y / 6)) & 1) p.maxLife *= 0.6; } },

    { id: 221, name: "Stripe Pulse",
      kind: "perimeter", count: 45, shape: "bar", size: 2, life: [0.9, 1.4],
      hue: [300, 330], barLen: 12, barWidth: 1.5, sizeMod: "pulse" },

    { id: 222, name: "Zigzag Wave",
      kind: "perimeter", count: 55, shape: "triangle", size: 3, life: [0.9, 1.4],
      hue: [180, 210], sizeMod: "pulse",
      update: (p, dt) => { p.rot = Math.sin(p.phase * 2) * 1.2; } },

    { id: 223, name: "Wave Train",
      kind: "perimeter", count: 60, shape: "dot", size: 2, life: [1, 1.4],
      hue: [190, 210], sway: 2, phaseSpeed: 0.15, sizeMod: "pulse" },

    { id: 224, name: "Tick Marks",
      kind: "perimeter", count: 50, shape: "bar", size: 2, life: [1.2, 1.8],
      hue: 45, sat: 80, lit: 80, barLen: 6, barWidth: 1 },

    { id: 225, name: "Morse Code",
      kind: "perimeter", count: 45, shape: "bar", size: 2, life: [0.9, 1.4],
      hue: 50, sat: 100, lit: 80, barLen: 4, barWidth: 1.4,
      init: (p) => { if (Math.random() < 0.4) p.size *= 2.2; } },

    { id: 226, name: "Dashes Run",
      kind: "perimeter", count: 50, shape: "bar", size: 1.8, life: [0.7, 1.1],
      hue: 200, barLen: 8, barWidth: 1.2, velTangent: 1 },

    { id: 227, name: "Dots and Dashes",
      kind: "perimeter", count: 60, shape: "bar", size: 1.6, life: [0.8, 1.2],
      hue: 180, barLen: 4, barWidth: 1.4,
      init: (p) => { p.size *= Math.random() < 0.5 ? 0.4 : 1.4; } },

    { id: 228, name: "Radial Lines",
      kind: "perimeter", count: 40, shape: "bar", size: 2, life: [0.8, 1.2],
      hue: [30, 50], barLen: 10, barWidth: 0.9, sizeMod: "fade" },

    { id: 229, name: "Fibonacci Spiral",
      kind: "perimeter", count: 60, shape: "dot", size: 1.4, life: [1.2, 2],
      hue: "rainbow", velTangent: 0.5, velInward: 0.15 },

    { id: 230, name: "Gear Teeth",
      kind: "perimeter", count: 30, shape: "rect", size: 3, life: [1.4, 2],
      hue: [30, 45], aspect: 0.8, spin: 0,
      update: (p) => { p.rot = p.a + Math.PI / 2; } },

    { id: 231, name: "Sawtooth Wave",
      kind: "perimeter", count: 55, shape: "triangle", size: 3, life: [0.8, 1.2],
      hue: [320, 0], sizeMod: "fade",
      update: (p) => { p.rot = p.a; } },

    { id: 232, name: "Triangle Wave",
      kind: "perimeter", count: 50, shape: "triangle", size: 3, life: [0.9, 1.4],
      hue: [180, 220], sizeMod: "pulse" },

    { id: 233, name: "Square Wave",
      kind: "perimeter", count: 50, shape: "square", size: 2.2, life: [0.8, 1.2],
      hue: [140, 180], sizeMod: "pulse", blend: "source-over" },

    { id: 234, name: "Concentric Rings",
      kind: "perimeter", count: 22, shape: "ring", size: 6, life: [1.4, 2],
      hue: [200, 280], lineWidth: 1, sizeMod: "grow" },

    { id: 235, name: "Cross Hatch",
      kind: "perimeter", count: 55, shape: "cross", size: 3, life: [0.9, 1.4],
      hue: 40, sat: 60, lit: 70, lineWidth: 0.8 },

    { id: 236, name: "Scanner Line",
      kind: "perimeter", count: 40, shape: "bar", size: 2, life: [0.5, 0.9],
      hue: 150, sat: 100, lit: 70, barLen: 10, barWidth: 1.2, velTangent: 2 },

    { id: 237, name: "Grid Flicker",
      kind: "perimeter", count: 70, shape: "square", size: 1.4, life: [0.4, 0.8],
      hue: [180, 220], alpha: "twinkle" },

    { id: 238, name: "Math Symbols",
      kind: "perimeter", count: 30, shape: "glyph", size: 11, life: [1.2, 1.8],
      hue: 200, glow: 4, bold: true,
      init: (p) => { p.glyph = G_MATH[(Math.random() * G_MATH.length) | 0]; },
      glyph: (p) => p.glyph },

    { id: 239, name: "Asterisk Storm",
      kind: "perimeter", count: 45, shape: "glyph", glyph: "✱", size: 12, life: [0.8, 1.3],
      hue: 50, glow: 6, sizeMod: "pulse", bold: true },

    { id: 240, name: "Diamond Chain",
      kind: "perimeter", count: 30, shape: "diamond", size: 3.5, life: [1.4, 2],
      hue: 195, velTangent: 0.8 },

    { id: 241, name: "Honeycomb",
      kind: "perimeter", count: 30, shape: "poly", sides: 6, size: 5, life: [1.4, 2.2],
      hue: 45, stroke: true, lineWidth: 1.2, spin: 0 },

    { id: 242, name: "Pixel Frame",
      kind: "perimeter", count: 80, shape: "square", size: 1.6, life: [1.5, 2.5],
      hue: [120, 180, 300, 45], blend: "source-over" },

    { id: 243, name: "Ticker Tape",
      kind: "perimeter", count: 35, shape: "glyph", size: 10, life: [1, 1.5],
      hue: 60, glow: 3, bold: true, velTangent: 0.6,
      init: (p) => {
        const s = "AAA-STUDIO-";
        p.glyph = s[((Math.random() * s.length) | 0)];
      },
      glyph: (p) => p.glyph },

    { id: 244, name: "Equalizer",
      kind: "perimeter", count: 50, shape: "bar", size: 3, life: [0.5, 0.9],
      hue: [100, 200, 320], barLen: 8, barWidth: 2, sizeMod: "pulse",
      update: (p) => { p.size = (1 + Math.abs(Math.sin(p.phase * 4))) * 2.5; } },

    { id: 245, name: "DNA Helix",
      kind: "perimeter", count: 60, shape: "dot", size: 1.6, life: [1, 1.6],
      hue: [300, 180], sway: 3, phaseSpeed: 0.2 },

    { id: 246, name: "Gear Spin",
      kind: "perimeter", count: 20, shape: "poly", sides: 12, size: 5, life: [2, 2.8],
      hue: [40, 50], stroke: true, lineWidth: 1, spin: 2 },

    { id: 247, name: "Checker Edge",
      kind: "perimeter", count: 45, shape: "square", size: 2.5, life: [1.2, 1.8],
      hue: 0, sat: 0, lit: 95, blend: "source-over",
      init: (p) => { if (Math.random() < 0.5) p.hue = 0, p.sat = 0, p.lit = 10; } },

    { id: 248, name: "Lattice",
      kind: "perimeter", count: 40, shape: "cross", size: 2.5, life: [1.4, 2],
      hue: [180, 200], lineWidth: 0.8 },

    { id: 249, name: "Spike Edge",
      kind: "perimeter", count: 40, shape: "triangle", size: 4, life: [1, 1.5],
      hue: [0, 30], velInward: 0.3, sizeMod: "fade",
      update: (p) => { p.rot = p.a + Math.PI / 2; } },

    { id: 250, name: "Arrow Compass",
      kind: "perimeter", count: 30, shape: "arrow", size: 4, life: [1.2, 1.8],
      hue: 50, pointAlong: "inward", velInward: 0.15 }
  ]);
})();
