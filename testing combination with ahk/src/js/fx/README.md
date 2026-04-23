# FX-ENGINE v2

A declarative particle FX engine purpose-built for **animated borders** — but
flexible enough to render any 2D particle system along any closed path.

## Quick start

```js
window.FX.define([
  { id: 200, name: "Signature Aurora", preset: "signature-aurora" },

  { id: 201, name: "Frozen Comet",
    kind: "head",
    shape: "glow",
    hue: "ice",
    perimShape: "roundrect",
    cornerRadius: 22,
    forces: [{ type: "noise", scale: 0.02, strength: 0.25 }]
  },

  { id: 202, name: "Heartbeat",
    emitters: [
      { shape: "heart", hue: 340, count: 25, life: [1.2, 1.8], sizeMod: "pulse" },
      { kind: "head", shape: "glow", hue: 340, speed: 0.3, rate: 50 },
    ],
    trail: { fade: 0.08 },
  },
]);
```

## Load order (required)

```html
<script src="js/fx/core.js"></script>
<script src="js/fx/noise.js"></script>
<script src="js/fx/palettes.js"></script>
<script src="js/fx/geometry.js"></script>
<script src="js/fx/pool.js"></script>
<script src="js/fx/tracks.js"></script>
<script src="js/fx/forces.js"></script>
<script src="js/fx/shapes.js"></script>
<script src="js/fx/emitter.js"></script>
<script src="js/fx/presets.js"></script>
<script src="js/fx/engine.js"></script>
<script src="js/fx/devtools.js"></script>  <!-- optional -->
```

## Modules

| Module         | Purpose |
| -------------- | ------- |
| `core.js`      | Math, seeded PRNG, easing library (30+), colour system, logger |
| `noise.js`     | 2D value noise, fbm, ridge, curl, Worley, domain-warp |
| `palettes.js`  | 60+ hue palettes + 12 HSLA colour ramps |
| `geometry.js`  | Perimeter shapes: rect / roundrect / circle / ellipse / polygon / diamond / star / superellipse + custom; emission-weighting (uniform / sides / corners / ranges / fn) |
| `pool.js`      | Particle object pool (zero alloc after warmup) |
| `tracks.js`    | Keyframe tracks for size/alpha/colour + named life modifiers |
| `forces.js`    | 20 force fields: gravity · wind · drag · brake · jitter · cap · noise · curl · turbulence · attractor · repeller · vortex · magnetic · spring · seek · orbit · bounce · clamp · repelWalls · followEdge · swarm |
| `shapes.js`    | 30+ shape primitives across 6 categories |
| `emitter.js`   | Single-emitter simulation (spawn / update / draw) |
| `presets.js`   | 50+ ready-to-use recipes (`glow-warm`, `comet-holy`, `signature-aurora`, …) |
| `engine.js`    | `FX(cfg)` factory, preset merging, adaptive quality, multi-emitter composition, trail buffer |
| `devtools.js`  | Stats HUD, shape catalogue, benchmark helper |

## Emitter config reference

```js
{
  // ---- What kind of emitter ----
  kind:       "perimeter",   // perimeter | head | multi-head | burst | corners | side | radial
  heads:      1,             // multi-head: how many comets
  headsOffset: 0,            // multi-head: phase offset

  // ---- Perimeter geometry (shared via global) ----
  perimShape: "rect",        // rect | roundrect | circle | ellipse | polygon | diamond | star | superellipse | fn
  cornerRadius: null,        // roundrect
  perimSides: 6,             // polygon
  perimPoints: 5,            // star
  perimInnerRatio: 0.5,      // star
  perimExponent: 4,          // superellipse
  weighting:  "uniform",     // uniform | sides | corners | top/right/bottom/left | weighted-array | fn
  side:       null,          // 0..3 to restrict emission to one side

  // ---- Emission ----
  count:      50,            // perimeter ambient target
  rate:       70,            // head/burst per-second
  speed:      0.28,          // head walker speed (perim/sec)
  interval:   0.5,           // burst cadence (s)
  burstCount: 12,            // burst size
  burstSpread: 0,            // burst position jitter (0..1)
  jitter:     0,             // spawn position jitter (px)

  // ---- Per-particle birth ----
  life:       [0.8, 1.4],    // [min,max] seconds
  size:       2,
  sizeVar:    [0.7, 1.2],
  spin:       2,             // rad/s variance (0 = lock to edge tangent)
  velInward:  0,             // initial velocity toward interior
  velOutward: 0,
  velTangent: 0,
  speedInit:  0,             // random direction initial speed
  spread:     0,             // random xy velocity jitter

  // ---- Per-frame physics ----
  gravity:    0,
  wind:       0,
  drag:       0.99,
  sway:       0,             // sin-based x-wobble (px)
  phaseSpeed: 0.08,
  orbit:      null,          // { r, w, shrink }
  forces:     [/* see forces.js */],
  subEmitter: null,          // { count, life, size, spread, hue, … }

  // ---- Appearance ----
  shape:      "glow",        // see shapes.js
  hue:        50,            // number | [lo,hi] | "palette-name" | array | fn
  sat:        100,
  lit:        70,
  color:      null,          // raw CSS colour string (overrides hue)
  colorRamp:  null,          // array of HSLA stops, evaluated over life
  colorGradient: null,       // { from, to, ease } — per-particle birth→death

  alpha:      "life",        // "life" | "pulse" | "twinkle" | "flicker" | "strobe" | number | fn
  sizeMod:    null,          // "fade" | "grow" | "pulse" | "twinkle" | ... | fn
  sizeTrack:  null,          // keyframe track
  alphaTrack: null,          // keyframe track

  blend:      "lighter",     // canvas composite mode
  symmetry:   1,             // rotational symmetry draws
  shadow:     0,             // shadow blur (glow)
  lineWidth:  1,

  // ---- Shape-specific ----
  points:     5,             // star
  innerRatio: 0.5,           // star
  sides:      6,             // poly
  aspect:     1.6,           // rect
  barLen:     4, barWidth: 2,// bar
  arcLen:     Math.PI*1.2,   // arc
  len:        10,            // streak
  streakDir:  "normal",      // normal | tangent
  glyph:      "✦",           // glyph (string or fn(p)=>string)
  glow:       0,             // text glow
  bold:       false, italic: false, font: "serif",
  pointAlong: "tangent",     // arrow orientation

  // ---- Head accent ----
  headDot:      true,
  headDotR:     5,
  headDotColor: "#fff",
  headDotHue:   50,

  // ---- Hooks ----
  init:     p => {},
  update:   (p, dt) => {},
  onSpawn:  p => {},
  onUpdate: (p, dt) => {},
  onDeath:  p => {},
  onBurst:  t => {},
  overlay:  (ctx, W, H, parts) => {},
}
```

## Global runtime controls

```js
FX.quality.target = 60;     // auto-scale target fps
FX.quality.min    = 0.25;   // minimum scaling floor
FX.time.scale     = 0.5;    // slow motion
FX.time.paused    = true;   // pause all FX globally
FX.setSeed(42);             // deterministic PRNG
```

## Dev tools

```js
FX.dev.showStats();         // floating HUD
FX.dev.showCatalogue();     // preview every shape
FX.dev.benchmark(cfg, 1000) // fps benchmark for a config
FX.dev.describe(cfg)        // human-readable summary
```
