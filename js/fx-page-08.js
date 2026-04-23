/* ================================================================
   PAGE 8 — Effects 326-425 — CSS-ONLY BORDER GALLERY
   ----------------------------------------------------------------
   These 100 effects are drawn entirely by CSS (.b326..b425 rules
   in css/borders-326-425.css).  No canvas, no particles, no
   runtime cost beyond GPU compositing.

   This file only registers NAMES so the grid can label the cards;
   the CSS classes do the actual rendering.  The `_css: true` flag
   is a hint to the app that these ids are not canvas-driven.
   ================================================================ */
(function () {
  "use strict";
  window.FX_META = window.FX_META || {};

  const names = [
    "Aurora Curtain","Magma Flow","Glacial Veins","Sunfire Halo","Tron Wall",
    "Obsidian Blade","Phosphor CRT","Hexgrid Hum","Venom Drip","Royal Sigil",
    "Arc Reactor","Lava Crack","Spider Web","Bamboo Bound","Mercury Mirror",
    "Lunar Ring","Tide Wash","Warp Lines","Sandstorm","Nebula Haze",
    "Runestone","Glass Pane","Gridlock","Stealth Pulse","Inferno Rim",
    "Frost Web","Holo Glitch","Static Noise","Sand Etch","Plasma Sheet",
    "Quantum Dots","Energy Field","Rainbow Hum","Prism Crack","Crown of Thorns",
    "Solar Wind","Yin Yang Spin","Mystic Runes","Bioluminescent","Copper Patina",
    "Scorched Edge","Frozen Lightning","Golden Stitch","Carbon Mesh","Laser Grid",
    "Ember Smoulder","Royal Velvet","Deep Sea Glow","Binary Rain","Sun Spot",
    "Forest Moss","Emerald Shard","Void Pit","Sunset Strip","Moonlit Path",
    "Toxic Bubble","Rune of Healing","Dark Matter","Techno Pulse","Dragon Scale",
    "Brass Fitting","Blood Orchid","Noxious Mist","Chrome Polish","Acid Spill",
    "Starburst Halo","Voltage Arc","Silk Ribbon","Plasma Cocoon","Cybernetic Pulse",
    "Light Leak","Spectral Tear","Gear Teeth","Fairy Ring","Prism Tilt",
    "Sapphire Glow","Ruby Frame","Onyx Pulse","Error Frame","Pixel Marquee",
    "Foggy Halo","Shrine Gate","Obsidian Mirror","Cherry Blossom","Thunder Crack",
    "Iron Rivet","Galaxy Swirl","Ice Ring Dash","Toxic Dash","Dragon Breath",
    "Divine Light","Siren Pulse","Stained Glass","Techno Ribbon","Bone Frame",
    "Time Rift","Confetti Line","Lotus Bloom","Sonar Ping","Quantum Shift",
  ];

  for (let i = 0; i < names.length; i++) {
    const id = 326 + i;
    window.FX_META[id] = { name: names[i], cfg: { _css: true } };
  }
})();
