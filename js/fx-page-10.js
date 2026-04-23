/* ================================================================
   PAGE 10 — Effects 526-625 — TECH / INDUSTRIAL CANVAS BORDERS
   ----------------------------------------------------------------
   100 new canvas effects using the v2.1 engine extensions with a
   cyber / mecha / scientific visual vocabulary:
     • `beam`, `scanbar`, `gridcell`, `bolt`, `plasmoid` for
       hard-edged tech looks
     • `comet`, `ripple3`, `orb`, `chakra` for reactor / radar
     • `tornado`, `blob`, `bokeh` for engineered atmospherics
     • forces `wind`, `pulseOut`, `compass`, `spiral` for motion
   ================================================================ */
(function () {
  "use strict";
  const define = window.FX && window.FX.define;
  if (!define) { console.warn("page-10: FX engine missing"); return; }

  define([
    { id: 526, name: "HUD Scanline",         perimShape: "roundrect", cornerRadius: 10, kind: "head", speed: 0.4, rate: 22, shape: "scanbar", hue: 180, size: 2, life: [0.5, 0.8], barLen: 26, barWidth: 2 },
    { id: 527, name: "Radar Sweep",          perimShape: "circle", kind: "head", speed: 0.3, rate: 12, shape: "beam", hue: 120, size: 2, life: [0.6, 1], beamLen: 30 },
    { id: 528, name: "Reactor Core",         perimShape: "circle", shape: "plasmoid", hue: "electric", count: 20, size: 4, life: [1, 1.5] },
    { id: 529, name: "Data Stream",          perimShape: "roundrect", cornerRadius: 8, shape: "digit", hue: 120, count: 30, size: 10, life: [0.6, 1.1], font: "monospace", alpha: "life" },
    { id: 530, name: "Circuit Pulse",        perimShape: "roundrect", cornerRadius: 6, shape: "gridcell", hue: 180, count: 30, size: 3, life: [1, 1.6], alpha: "pulse" },

    { id: 531, name: "Shield Matrix",        perimShape: "roundrect", cornerRadius: 14, shape: "ripple3", hue: [180, 200], count: 8, size: 9, life: [1.6, 2.2], lineWidth: 1 },
    { id: 532, name: "Cyber Lattice",        perimShape: "roundrect", cornerRadius: 8, shape: "gridcell", hue: "cyberpunk", count: 34, size: 3, life: [1.2, 1.8] },
    { id: 533, name: "Ion Stream",           perimShape: "roundrect", cornerRadius: 16, shape: "beam", hue: 190, count: 22, size: 1.8, life: [0.8, 1.2], beamLen: 18 },
    { id: 534, name: "Mecha Pulse",          perimShape: "polygon", perimSides: 6, shape: "plasmoid", hue: 0, count: 18, size: 4, life: [1, 1.5] },
    { id: 535, name: "Chrono Gear",          perimShape: "circle", shape: "chakra", hue: [45, 200], count: 6, size: 16, life: [2, 3], spokes: 14, alpha: "pulse" },

    { id: 536, name: "Signal Wave",          perimShape: "roundrect", cornerRadius: 10, shape: "wavelet", hue: 180, count: 22, size: 4, life: [1.2, 1.8] },
    { id: 537, name: "Node Net",             perimShape: "roundrect", cornerRadius: 14, shape: "dot", hue: 180, count: 40, size: 1.4, life: [1.4, 2], alpha: "pulse" },
    { id: 538, name: "Energy Conduit",       perimShape: "roundrect", cornerRadius: 8, kind: "multi-head", heads: 4, speed: 0.3, rate: 30, shape: "beam", hue: 190, size: 1.8, life: [0.5, 0.8], beamLen: 14 },
    { id: 539, name: "Nebula Engine",        perimShape: "circle", shape: "nebula", hue: "electric", count: 14, size: 6, life: [2, 3], alpha: 0.45 },
    { id: 540, name: "Techno Matrix",        perimShape: "roundrect", cornerRadius: 6, shape: "gridcell", hue: 120, count: 40, size: 2, life: [1, 1.5], alpha: "pulse" },

    { id: 541, name: "Warp Conduit",         perimShape: "roundrect", cornerRadius: 20, shape: "beam", hue: "neonpink", count: 22, size: 2, life: [0.8, 1.2], beamLen: 20, forces: [{ type: "compass", angle: 0, strength: 0.08 }] },
    { id: 542, name: "Heat Sink",            perimShape: "roundrect", cornerRadius: 6, shape: "bar", hue: [15, 25], count: 30, size: 3, life: [1, 1.5], barLen: 3 },
    { id: 543, name: "Plasma Conduit",       perimShape: "roundrect", cornerRadius: 16, shape: "plasmoid", hue: "plasma", count: 20, size: 4, life: [1, 1.5] },
    { id: 544, name: "Logic Pulse",          perimShape: "roundrect", cornerRadius: 4, shape: "gridcell", hue: 50, count: 30, size: 3, life: [0.8, 1.4], alpha: "strobe" },
    { id: 545, name: "Quantum Loom",         perimShape: "roundrect", cornerRadius: 14, shape: "dna", hue: "cyberpunk", count: 22, size: 3, life: [1.4, 2], helixFreq: 5 },

    { id: 546, name: "Energy Cage",          perimShape: "roundrect", cornerRadius: 12, shape: "bolt", hue: 200, count: 14, size: 3, life: [0.3, 0.5], segments: 4 },
    { id: 547, name: "Sentinel Ring",        perimShape: "circle", shape: "bracket", hue: 50, count: 12, size: 8, life: [1.2, 1.8], lineWidth: 1.4, weighting: "corners", alpha: "pulse" },
    { id: 548, name: "Firewall",             perimShape: "roundrect", cornerRadius: 6, shape: "gridcell", hue: 15, count: 32, size: 3, life: [0.8, 1.2], alpha: "flicker" },
    { id: 549, name: "Data Helix",           perimShape: "circle", shape: "dna", hue: 190, count: 26, size: 3, life: [1.6, 2.4] },
    { id: 550, name: "Alarm Ring",           perimShape: "circle", shape: "beam", hue: 0, count: 12, size: 2, life: [0.6, 1], beamLen: 20, alpha: "strobe" },

    { id: 551, name: "Frequency Comb",       perimShape: "roundrect", cornerRadius: 8, shape: "bar", hue: 180, count: 36, size: 3, life: [1, 1.4], barLen: 4, barWidth: 1.4 },
    { id: 552, name: "Ghost Protocol",       perimShape: "roundrect", cornerRadius: 14, shape: "bokeh", hue: 200, sat: 30, lit: 80, count: 22, size: 4, life: [1.4, 2], alpha: 0.45 },
    { id: 553, name: "Chrono Dust",          shape: "dot", hue: "electric", count: 60, size: 1, life: [1, 1.6], alpha: "twinkle", forces: [{ type: "wind", angle: 0.2, strength: 0.06 }] },
    { id: 554, name: "Ion Ripple",           perimShape: "circle", shape: "ripple3", hue: 190, count: 8, size: 9, life: [1.4, 2], lineWidth: 0.9 },
    { id: 555, name: "Blueprint Grid",       perimShape: "roundrect", cornerRadius: 4, shape: "gridcell", hue: 200, count: 36, size: 3, life: [1.4, 2] },

    { id: 556, name: "Power Rail",           perimShape: "roundrect", cornerRadius: 8, shape: "beam", hue: 45, count: 22, size: 2, life: [0.8, 1.2], beamLen: 16, forces: [{ type: "compass", angle: 0, strength: 0.07 }] },
    { id: 557, name: "Quantum Jitter",       shape: "dot", hue: "cyberpunk", count: 50, size: 1.2, life: [0.6, 1], alpha: "flicker", jitter: 1 },
    { id: 558, name: "Pulse Fence",          perimShape: "roundrect", cornerRadius: 6, shape: "bar", hue: 180, count: 24, size: 3, life: [1, 1.4], barLen: 4, barWidth: 1.6, alpha: "strobe" },
    { id: 559, name: "Lightning Cage",       perimShape: "roundrect", cornerRadius: 14, shape: "bolt", hue: [200, 220], count: 12, size: 3, life: [0.3, 0.5], segments: 4 },
    { id: 560, name: "Overclock",            perimShape: "roundrect", cornerRadius: 10, shape: "plasmoid", hue: 0, count: 22, size: 4, life: [0.8, 1.2] },

    { id: 561, name: "Vector Compass",       perimShape: "roundrect", cornerRadius: 8, shape: "scanbar", hue: 180, count: 16, size: 2, life: [0.8, 1.2], barLen: 18 },
    { id: 562, name: "Tokamak",              perimShape: "circle", shape: "beam", hue: "plasma", count: 20, size: 2, life: [0.8, 1.2], beamLen: 20, forces: [{ type: "spiral", out: 0, swirl: 0.5 }] },
    { id: 563, name: "Mainframe",            perimShape: "roundrect", cornerRadius: 4, shape: "digit", hue: 120, count: 34, size: 9, life: [0.6, 1], font: "monospace" },
    { id: 564, name: "Capacitor Bank",       perimShape: "roundrect", cornerRadius: 6, shape: "bar", hue: 200, count: 22, size: 3, life: [0.8, 1.4], barLen: 6, alpha: "pulse" },
    { id: 565, name: "Sensor Array",         perimShape: "circle", shape: "gridcell", hue: 180, count: 24, size: 3, life: [1.2, 1.8], alpha: "pulse" },

    { id: 566, name: "Force Field",          perimShape: "roundrect", cornerRadius: 16, shape: "ripple3", hue: 180, count: 6, size: 10, life: [1.4, 2], lineWidth: 1 },
    { id: 567, name: "Plasma Vent",          perimShape: "roundrect", cornerRadius: 10, shape: "tornado", hue: "infernal", count: 16, size: 5, life: [0.8, 1.3], spin: 3 },
    { id: 568, name: "Orbital Debris",       perimShape: "circle", shape: "shard", hue: 30, sat: 20, lit: 60, count: 22, size: 3, life: [1.2, 1.8], forces: [{ type: "spiral", out: 0, swirl: 0.4 }] },
    { id: 569, name: "Signal Noise",         perimShape: "roundrect", cornerRadius: 6, shape: "pixel", hue: "cyberpunk", count: 40, size: 2, life: [0.4, 0.8], alpha: "flicker" },
    { id: 570, name: "Control Rod",          perimShape: "roundrect", cornerRadius: 4, shape: "bar", hue: 200, count: 22, size: 3, life: [1, 1.4], barLen: 5, barWidth: 1.6 },

    { id: 571, name: "Quantum Entangle",     perimShape: "circle", shape: "dna", hue: [200, 280], count: 24, size: 3, life: [1.4, 2], helixFreq: 6 },
    { id: 572, name: "Echo Locator",         perimShape: "circle", shape: "ripple3", hue: 120, count: 6, size: 10, life: [1.6, 2.4], lineWidth: 0.8 },
    { id: 573, name: "Defense Matrix",       perimShape: "roundrect", cornerRadius: 8, shape: "gridcell", hue: 200, count: 28, size: 3, life: [1.4, 2], alpha: "pulse" },
    { id: 574, name: "Beacon Array",         perimShape: "polygon", perimSides: 8, shape: "orb", hue: 50, count: 16, size: 5, life: [1.4, 2] },
    { id: 575, name: "Gamma Burst",          perimShape: "roundrect", cornerRadius: 10, shape: "bolt", hue: 120, count: 10, size: 4, life: [0.25, 0.4], segments: 3 },

    { id: 576, name: "Turbine Swirl",        perimShape: "circle", shape: "scanbar", hue: 180, count: 20, size: 2, life: [0.8, 1.2], barLen: 16, forces: [{ type: "spiral", out: 0, swirl: 0.5 }] },
    { id: 577, name: "Data Flux",            perimShape: "roundrect", cornerRadius: 8, shape: "digit", hue: 200, count: 34, size: 9, life: [0.5, 1], font: "monospace" },
    { id: 578, name: "Transistor Glow",      perimShape: "roundrect", cornerRadius: 6, shape: "gridcell", hue: "electric", count: 36, size: 2, life: [1, 1.5], alpha: "twinkle" },
    { id: 579, name: "Ion Trail",            perimShape: "roundrect", cornerRadius: 14, kind: "head", speed: 0.32, rate: 45, shape: "comet", hue: 200, size: 3, life: [0.4, 0.7], tailLen: 6 },
    { id: 580, name: "Matrix Cascade",       perimShape: "roundrect", cornerRadius: 6, shape: "digit", hue: 120, count: 40, size: 10, life: [0.6, 1.1], font: "monospace", alpha: "life", forces: [{ type: "compass", angle: 1.5708, strength: 0.04 }] },

    { id: 581, name: "Lattice Pulse",        perimShape: "roundrect", cornerRadius: 8, shape: "gridcell", hue: 280, count: 32, size: 3, life: [1.2, 1.8], alpha: "pulse" },
    { id: 582, name: "Power Surge",          perimShape: "roundrect", cornerRadius: 14, shape: "plasmoid", hue: "electric", count: 24, size: 4, life: [0.8, 1.3] },
    { id: 583, name: "Servo Pulse",          perimShape: "roundrect", cornerRadius: 8, shape: "tick", hue: 45, count: 36, size: 4, life: [1, 1.4], lineWidth: 1.4, alpha: "pulse" },
    { id: 584, name: "Neo Grid",             perimShape: "roundrect", cornerRadius: 10, shape: "gridcell", hue: "cyberpunk", count: 40, size: 2.5, life: [1, 1.5], alpha: "flicker" },
    { id: 585, name: "Hex Sentinel",         perimShape: "polygon", perimSides: 6, shape: "hex", hue: 180, count: 22, size: 4, life: [1.4, 2], alpha: "pulse" },

    { id: 586, name: "Antimatter Ring",      perimShape: "circle", shape: "plasmoid", hue: 300, count: 18, size: 4, life: [1, 1.5] },
    { id: 587, name: "Parallax Bars",        perimShape: "roundrect", cornerRadius: 6, shape: "bar", hue: "electric", count: 28, size: 3, life: [1, 1.5], barLen: 5, barWidth: 1.2 },
    { id: 588, name: "Telemetry",            perimShape: "roundrect", cornerRadius: 8, shape: "digit", hue: 45, count: 30, size: 8, life: [0.6, 1], font: "monospace" },
    { id: 589, name: "Resonator",            perimShape: "circle", shape: "ripple3", hue: "electric", count: 8, size: 8, life: [1.4, 2], lineWidth: 0.8 },
    { id: 590, name: "Neural Net",           perimShape: "roundrect", cornerRadius: 14, shape: "dot", hue: 200, count: 50, size: 1.4, life: [1.2, 1.8], alpha: "pulse" },

    { id: 591, name: "Mecha Pulse II",       perimShape: "polygon", perimSides: 8, shape: "scanbar", hue: 0, count: 16, size: 2, life: [0.8, 1.2], barLen: 18 },
    { id: 592, name: "Xeno Signature",       perimShape: "roundrect", cornerRadius: 12, shape: "rune", hue: 120, count: 14, size: 13, life: [1.6, 2.4], bold: true, alpha: "pulse" },
    { id: 593, name: "Quantum Bus",          perimShape: "roundrect", cornerRadius: 6, kind: "multi-head", heads: 3, speed: 0.35, rate: 50, shape: "beam", hue: 50, size: 1.6, life: [0.5, 0.8], beamLen: 14 },
    { id: 594, name: "Plasma Gate",          perimShape: "roundrect", cornerRadius: 18, shape: "nebula", hue: "neonpink", count: 14, size: 6, life: [2, 3], alpha: 0.4 },
    { id: 595, name: "Ion Disruption",       perimShape: "roundrect", cornerRadius: 10, shape: "bolt", hue: "cyberpunk", count: 14, size: 3, life: [0.3, 0.5], segments: 4 },

    { id: 596, name: "Data Scrubber",        perimShape: "roundrect", cornerRadius: 6, shape: "gridcell", hue: 180, count: 34, size: 2.5, life: [0.8, 1.2], alpha: "flicker" },
    { id: 597, name: "Cryo Seal",            perimShape: "roundrect", cornerRadius: 14, shape: "shard", hue: "blizzard", count: 20, size: 4, life: [1.2, 1.8] },
    { id: 598, name: "Subspace Hum",         shape: "bokeh", hue: "midnight", count: 22, size: 5, life: [2, 3], alpha: 0.35 },
    { id: 599, name: "Flux Capacitor",       perimShape: "roundrect", cornerRadius: 8, emitters: [
      { shape: "bolt", hue: 200, count: 8, size: 3, life: [0.3, 0.5], segments: 3 },
      { shape: "plasmoid", hue: 200, count: 6, size: 5, life: [1, 1.5] },
    ] },
    { id: 600, name: "Core Reactor",         perimShape: "circle", emitters: [
      { shape: "chakra", hue: 40, count: 2, size: 24, life: [3, 4], spokes: 14, alpha: "pulse" },
      { shape: "plasmoid", hue: "solarflare", count: 16, size: 4, life: [1, 1.5] },
      { shape: "dot", hue: 45, count: 20, size: 1.2, life: [0.8, 1.3], alpha: "twinkle" },
    ] },

    { id: 601, name: "Kill Switch",          perimShape: "roundrect", cornerRadius: 6, shape: "beam", hue: 0, count: 12, size: 2.2, life: [0.5, 0.8], beamLen: 20, alpha: "strobe" },
    { id: 602, name: "Nav Computer",         perimShape: "roundrect", cornerRadius: 10, shape: "digit", hue: 50, count: 26, size: 8, life: [0.6, 1], font: "monospace" },
    { id: 603, name: "Hive Mind",            shape: "bokeh", hue: 120, count: 24, size: 4, life: [1.6, 2.4], alpha: "pulse", forces: [{ type: "wave", freq: 0.012, strength: 0.15 }] },
    { id: 604, name: "Containment Field",    perimShape: "roundrect", cornerRadius: 16, shape: "ripple3", hue: 0, count: 6, size: 10, life: [1.6, 2.2], lineWidth: 1.1 },
    { id: 605, name: "Temporal Flux",        perimShape: "circle", shape: "dna", hue: "cyberpunk", count: 24, size: 3, life: [1.4, 2], helixFreq: 7 },

    { id: 606, name: "Shockwave",            perimShape: "circle", shape: "ripple3", hue: 50, count: 6, size: 12, life: [1.2, 1.8], lineWidth: 1.2, forces: [{ type: "pulseOut", period: 1.4, strength: 0.3 }] },
    { id: 607, name: "Thruster",             perimShape: "roundrect", cornerRadius: 8, kind: "head", speed: 0.34, rate: 60, shape: "comet", hue: 200, size: 3, life: [0.4, 0.7], tailLen: 5 },
    { id: 608, name: "Beam Emitter",         perimShape: "roundrect", cornerRadius: 6, shape: "beam", hue: 60, count: 18, size: 2, life: [0.8, 1.2], beamLen: 22 },
    { id: 609, name: "Gravity Well",         perimShape: "circle", shape: "bokeh", hue: 260, count: 20, size: 5, life: [1.4, 2], alpha: 0.45, forces: [{ type: "spiral", out: -0.05, swirl: 0.3 }] },
    { id: 610, name: "Phase Shift",          perimShape: "roundrect", cornerRadius: 12, shape: "plasmoid", hue: "cyberpunk", count: 20, size: 4, life: [1, 1.5] },

    { id: 611, name: "Turret Scan",          perimShape: "roundrect", cornerRadius: 6, kind: "head", speed: 0.36, rate: 14, shape: "beam", hue: 0, size: 2.2, life: [0.5, 0.8], beamLen: 28 },
    { id: 612, name: "Atmospheric Wash",     shape: "bokeh", hue: 200, sat: 20, lit: 85, count: 26, size: 5, life: [2, 3], alpha: 0.35 },
    { id: 613, name: "Cable Trace",          perimShape: "roundrect", cornerRadius: 6, shape: "beam", hue: "cyberpunk", count: 22, size: 1.6, life: [1, 1.4], beamLen: 14, forces: [{ type: "compass", angle: 0, strength: 0.08 }] },
    { id: 614, name: "Stellar Cartographer", perimShape: "roundrect", cornerRadius: 16, shape: "dot", hue: [180, 260, 45], count: 60, size: 1.2, life: [1, 1.6], alpha: "twinkle" },
    { id: 615, name: "Hydra Head",           perimShape: "circle", kind: "multi-head", heads: 6, speed: 0.3, rate: 30, shape: "comet", hue: 130, size: 3, life: [0.5, 0.8], tailLen: 5 },

    { id: 616, name: "Void Drive",           perimShape: "roundrect", cornerRadius: 20, shape: "nebula", hue: "void", count: 14, size: 6, life: [2.2, 3.2], alpha: 0.4 },
    { id: 617, name: "Sentry Net",           perimShape: "roundrect", cornerRadius: 8, shape: "gridcell", hue: 15, count: 30, size: 3, life: [1, 1.5], alpha: "pulse" },
    { id: 618, name: "Nav Beacon",           perimShape: "circle", shape: "plasmoid", hue: 120, count: 10, size: 5, life: [1.2, 1.8] },
    { id: 619, name: "Terraform",            perimShape: "roundrect", cornerRadius: 16, emitters: [
      { shape: "nebula", hue: 30, count: 10, size: 5, life: [2, 3], alpha: 0.4 },
      { shape: "dot", hue: 130, count: 30, size: 1.2, life: [1, 1.5], alpha: "twinkle" },
    ] },
    { id: 620, name: "Auto Turret",          perimShape: "roundrect", cornerRadius: 6, shape: "bolt", hue: 50, count: 10, size: 3, life: [0.25, 0.4], segments: 3 },

    { id: 621, name: "Rail Cannon",          perimShape: "roundrect", cornerRadius: 4, kind: "head", speed: 0.4, rate: 10, shape: "beam", hue: 200, size: 3, life: [0.4, 0.7], beamLen: 30, beamWidth: 2.5 },
    { id: 622, name: "Emergency Alarm",      perimShape: "roundrect", cornerRadius: 8, shape: "gridcell", hue: 0, count: 28, size: 3, life: [0.6, 1], alpha: "strobe" },
    { id: 623, name: "Stealth Field",        perimShape: "roundrect", cornerRadius: 18, shape: "bokeh", hue: 220, sat: 15, lit: 75, count: 22, size: 5, life: [2, 3], alpha: 0.25 },
    { id: 624, name: "Command Node",         perimShape: "circle", emitters: [
      { shape: "chakra", hue: 180, count: 2, size: 20, life: [3, 4], spokes: 12, alpha: "pulse" },
      { shape: "bolt", hue: 200, count: 8, size: 3, life: [0.3, 0.5], segments: 3 },
    ] },
    { id: 625, name: "Genesis Protocol",     perimShape: "roundrect", cornerRadius: 20, emitters: [
      { shape: "nebula", hue: "prism", count: 12, size: 6, life: [2.4, 3.4], alpha: 0.4 },
      { shape: "dna", hue: "cyberpunk", count: 20, size: 3, life: [1.4, 2], helixFreq: 5 },
      { shape: "plasmoid", hue: "electric", count: 14, size: 4, life: [1, 1.5] },
    ] },
  ]);
})();
