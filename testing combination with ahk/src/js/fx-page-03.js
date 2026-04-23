/* ================================================================
   PAGE 3 — Effects 101–150 — WHOLE-PERIMETER AMBIENT
   ----------------------------------------------------------------
   Every full-border ambient effect re-authored as an FX engine
   `kind:"perimeter"` emitter.  Replaces the hand-built factories
   that previously lived in trail-ring.js.
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-03: FX engine missing"); return; }

  define([
    { id:101, name: "Sparkle Ring",     shape: "sparkle", hue: [45, 55], count: 22, size: 3, life: [0.9, 1.4], lineWidth: 1, spin: 3 },
    { id:102, name: "Ember Ring",       shape: "ember", hue: "ember", count: 35, size: 2.4, life: [0.8, 1.3], gravity: -0.05 },
    { id:103, name: "Fire Ring",        shape: "flame", hue: "fire", count: 55, size: 3, life: [0.5, 0.9], gravity: -0.1, spread: 0.4 },
    { id:104, name: "Electric Halo",    shape: "dot", hue: [195, 215], count: 45, size: 1.4, life: [0.45, 0.8], spread: 1.2, drag: 0.92 },
    { id:105, name: "Snow Curtain",     shape: "flake", hue: 200, count: 26, size: 4, life: [1.4, 2.2], velInward: 0.3, sway: 0.5, lineWidth: 0.7 },
    { id:106, name: "Rain Curtain",     shape: "streak", hue: [195, 215], count: 40, size: 1.4, life: [0.4, 0.7], velInward: 1.6, len: 10 },
    { id:107, name: "Firefly Ring",     shape: "firefly", hue: [55, 90], count: 22, size: 3, life: [1.6, 2.4], phaseSpeed: 0.18 },
    { id:108, name: "Dust Motes",       shape: "dot", hue: 45, sat: 40, lit: 85, count: 32, size: 1.5, life: [1.4, 2.2], sizeMod: "twinkle", alpha: "twinkle" },
    { id:109, name: "Plasma Sheath",    shape: "glow", hue: "plasma", count: 34, size: 5, life: [1, 1.5], alpha: 0.55, sizeMod: "pulse" },
    { id:110, name: "Aurora Curtain",   shape: "glow", count: 30, size: 6, life: [1.6, 2.4], alpha: 0.5, colorRamp: [{h:160,s:100,l:70,a:1},{h:220,s:100,l:65,a:0.9},{h:290,s:90,l:60,a:0}] },
    { id:111, name: "Starfield Ring",   shape: "star", hue: "starfield", count: 26, size: 3, life: [1, 1.6], points: 5, sizeMod: "twinkle" },
    { id:112, name: "Glitter Storm",    shape: "sparkle", hue: "rainbow", count: 26, size: 2.5, life: [0.7, 1.2], lineWidth: 1, spin: 3 },
    { id:113, name: "Bubble Field",     shape: "bubble", hue: [180, 220], count: 20, size: 5, life: [1.4, 2.2], gravity: -0.04 },
    { id:114, name: "Ripple Field",     shape: "ring", hue: 200, count: 22, size: 4, life: [1, 1.6], lineWidth: 0.9, sizeMod: "grow" },
    { id:115, name: "Frost Bloom",      shape: "flake", hue: [195, 215], count: 22, size: 4, life: [1.4, 2.2], lineWidth: 0.7 },
    { id:116, name: "Solar Flare",      shape: "flame", hue: [30, 55], count: 45, size: 3.5, life: [0.6, 1], gravity: -0.1, velOutward: 0.08 },
    { id:117, name: "Lightning Cage",   shape: "lightning", hue: [200, 215], count: 8, size: 3, life: [0.2, 0.4], segments: 3, shadow: 5, lineWidth: 1.3 },
    { id:118, name: "Rune Circle",      shape: "rune", hue: "arcane", count: 14, size: 13, life: [1.4, 2.2], glow: 6, bold: true, alpha: "pulse" },
    { id:119, name: "Petal Cyclone",    shape: "petal", hue: "sakura", count: 28, size: 4, life: [1.4, 2.2], velTangent: 0.6, spin: 3 },
    { id:120, name: "Confetti Rain",    shape: "rect", hue: "rainbow", count: 35, size: 3, life: [1, 1.6], aspect: 2, blend: "source-over", gravity: 0.03, sway: 0.4 },
    { id:121, name: "Ash Field",        shape: "dot", hue: 30, sat: 10, lit: 60, count: 40, size: 1.4, life: [1.2, 1.8], alpha: 0.45 },
    { id:122, name: "Smoke Halo",       shape: "smoke", hue: 0, sat: 0, lit: 55, count: 18, size: 7, life: [1.8, 2.6] },
    { id:123, name: "Ion Cloud",        shape: "glow", hue: "plasma", count: 30, size: 5, life: [1.2, 1.8], alpha: 0.45, sway: 0.6 },
    { id:124, name: "Nebula Veil",      shape: "glow", count: 26, size: 6, life: [1.6, 2.4], alpha: 0.45, colorRamp: [{h:260,s:100,l:65,a:1},{h:300,s:100,l:60,a:0.9},{h:340,s:90,l:55,a:0}] },
    { id:125, name: "Meteor Shower",    shape: "streak", hue: [20, 45], count: 28, size: 1.8, life: [0.45, 0.8], len: 14, velInward: 1, shadow: 4 },
    { id:126, name: "Gold Shimmer",     shape: "glow", hue: "gold", count: 32, size: 3, life: [1, 1.6], alpha: "twinkle", sizeMod: "twinkle" },
    { id:127, name: "Void Specks",      shape: "dot", hue: "void", sat: 80, lit: 40, count: 40, size: 1.4, life: [1.2, 1.8], alpha: 0.55 },
    { id:128, name: "Magnetic Swarm",   shape: "dot", hue: [190, 230], count: 40, size: 1.5, life: [1, 1.5], velTangent: 0.8 },
    { id:129, name: "Holy Radiance",    shape: "glow", hue: "holy", count: 28, size: 5, life: [1.2, 1.8], alpha: 0.6, sizeMod: "pulse" },
    { id:130, name: "Acid Mist",        shape: "smoke", hue: 100, sat: 70, lit: 55, count: 18, size: 7, life: [1.8, 2.6] },
    { id:131, name: "Blood Mist",       shape: "smoke", hue: 350, sat: 90, lit: 40, count: 18, size: 7, life: [1.8, 2.6] },
    { id:132, name: "Chromatic Storm",  shape: "glow", hue: "rainbow", count: 34, size: 4, life: [0.8, 1.3], alpha: 0.55 },
    { id:133, name: "Pixel Storm",      shape: "pixel", hue: [120, 180, 300, 45], count: 55, size: 1.8, life: [0.7, 1.2] },
    { id:134, name: "Neon Rain",        shape: "streak", hue: "neon", count: 30, size: 1.4, life: [0.4, 0.7], velInward: 1.5, len: 12, shadow: 4 },
    { id:135, name: "Star Cyclone",     shape: "star", hue: [45, 200], count: 28, size: 3, life: [1, 1.5], points: 5, velTangent: 0.6 },
    { id:136, name: "Cosmic Dust",      shape: "dot", hue: "cosmos", count: 45, size: 1.4, life: [1.4, 2.2], sizeMod: "twinkle", alpha: "twinkle" },
    { id:137, name: "Paint Drip",       shape: "dot", hue: [0, 280], count: 24, size: 2.5, life: [1, 1.5], gravity: 0.05, blend: "source-over" },
    { id:138, name: "Honey Drip",       shape: "dot", hue: [40, 50], count: 22, size: 2.2, life: [1, 1.5], gravity: 0.04 },
    { id:139, name: "Venom Cloud",      shape: "smoke", hue: "venom", count: 18, size: 6, life: [1.6, 2.4] },
    { id:140, name: "Arctic Breeze",    shape: "streak", hue: "frost", count: 24, size: 1.4, life: [0.7, 1.1], len: 10, velTangent: 0.8 },
    { id:141, name: "Sand Storm",       shape: "dot", hue: [30, 45], count: 50, size: 1.4, life: [0.7, 1.2], velTangent: 1, spread: 0.4, drag: 0.96 },
    { id:142, name: "Spark Curtain",    shape: "dot", hue: [45, 55], count: 42, size: 1.3, life: [0.5, 0.9], spread: 0.8, drag: 0.93 },
    { id:143, name: "Lantern Glow",     shape: "halo", hue: [35, 45], count: 18, size: 7, life: [1.6, 2.4], alpha: "breathe" },
    { id:144, name: "Ghost Veil",       shape: "smoke", hue: 180, sat: 20, lit: 80, count: 18, size: 7, life: [1.8, 2.6] },
    { id:145, name: "Rainbow Mist",     shape: "smoke", hue: "rainbow", count: 22, size: 6, life: [1.6, 2.4] },
    { id:146, name: "Heart Storm",      shape: "heart", hue: [330, 350], count: 18, size: 6, life: [1.2, 1.8], sizeMod: "pulse" },
    { id:147, name: "Feather Rain",     shape: "petal", hue: 30, sat: 40, lit: 85, count: 25, size: 5, life: [1.4, 2.2], gravity: 0.02, sway: 0.5 },
    { id:148, name: "Leaf Vortex",      shape: "leaf", hue: [90, 130], count: 24, size: 4, life: [1.2, 1.8], velTangent: 0.8, spin: 3 },
    { id:149, name: "Diamond Rain",     shape: "diamond", hue: 195, count: 26, size: 3.5, life: [1.2, 1.8], gravity: 0.04 },
    { id:150, name: "Dragon Scales",    shape: "triangle", hue: [10, 35], count: 28, size: 3.5, life: [1.2, 1.8], spin: 0 },
  ]);
})();
