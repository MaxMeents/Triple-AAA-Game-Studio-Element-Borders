/* ================================================================
   FX-ENGINE v2  —  engine.js
   ----------------------------------------------------------------
   The factory + public API.

   Given a config object, returns a `factory()` function that the
   `TRAIL` renderer can instantiate per DOM element:

       TRAIL.register(effectId, FX(cfg));
       TRAIL.attach(el, effectId);

   Accepted configuration shapes:

     1.  Flat (v1 compatible)
           FX({ shape:'glow', hue:'fire', count:50, life:[.6,1] })

     2.  Flat + head (v1 compatible)
           FX({ shape:'flame', head:{ shape:'glow', rate:80 } })

     3.  Multi-emitter (v2)
           FX({
             emitters: [
               { shape:'glow', count:60, hue:'aurora' },
               { kind:'head',  speed:0.3, shape:'glow' },
             ],
             global: { perimShape:'roundrect', cornerRadius:20 },
             trail:  { fade: 0.08 }
           })

     4.  Preset composition
           FX({ preset: 'signature-aurora' })
           FX({ mixin:['comet-warm','motion-curl'] })

   Public API exposed on window.FX:
     FX(cfg)                    factory
     FX.define(list)            bulk register effects
     FX.addShape(name,meta,fn)  register a new shape
     FX.addForce(name, fn)      register a new force
     FX.addPalette(name, hues)  register hue palette
     FX.addRamp(name, stops)    register colour ramp
     FX.preset(name, cfg)       register a preset
     FX.setSeed(n)              deterministic PRNG
     FX.ease                    easing library
     FX.palettes, FX.ramps      palette tables
     FX.shapes, FX.shapeMeta    shape registry
     FX.forces                  force registry
     FX.presets                 preset registry
     FX.quality                 { value, target, min }
     FX.time                    { scale, paused }
   ================================================================ */
(function () {
  "use strict";
  const NS = window.__FX = window.__FX || {};
  if (!window.TRAIL) { console.warn("[fx/engine] TRAIL missing"); return; }

  const { register }   = window.TRAIL;
  const core           = NS.core;
  const palettes       = NS.palettes;
  const shapesMod      = NS.shapes;
  const forcesMod      = NS.forces;
  const presetsMod     = NS.presets;
  const { makeEmitter } = NS.emitter;
  const noiseMod       = NS.noise;
  const poolMod        = NS.pool;
  if (!core || !palettes || !shapesMod || !forcesMod || !presetsMod || !makeEmitter) {
    console.warn("[fx/engine] missing FX dependencies"); return;
  }

  const { clamp } = core;
  const { PRESETS } = presetsMod;
  const { SHAPES, SHAPE_META, defShape } = shapesMod;
  const { HUES, RAMPS, addHues, addRamp } = palettes;

  // =================================================================
  //  Global runtime state — shared across all FX instances.
  //  These are mutable at runtime via FX.quality / FX.time.
  // =================================================================
  const QUALITY = { value: 1, min: 0.35, target: 50 };   // 50 fps target
  const TIME    = { scale: 1, paused: false };
  const _fps    = { acc: 0, frames: 0, ema: 60 };

  function _updateQuality(dt) {
    _fps.frames++; _fps.acc += dt;
    if (_fps.acc >= 0.5) {
      const fps = _fps.frames / _fps.acc;
      _fps.ema = core.lerp(_fps.ema, fps, 0.3);
      _fps.frames = 0; _fps.acc = 0;
      const t = QUALITY.target;
      if (fps < t - 5)      QUALITY.value = clamp(QUALITY.value - 0.08, QUALITY.min, 1);
      else if (fps > t + 8) QUALITY.value = clamp(QUALITY.value + 0.06, QUALITY.min, 1);
    }
  }

  // =================================================================
  //  Preset application — merges nested presets / mixins left→right
  //  with the user config winning.
  // =================================================================
  function applyPresets(cfg) {
    if (!cfg || typeof cfg !== "object") return cfg;
    let out = {};
    const apply = name => {
      const pre = PRESETS[name];
      if (!pre) { core.log.warn("Unknown preset '" + name + "'"); return; }
      // Presets themselves may compose — apply transitively.
      const resolved = applyPresets(pre);
      // Arrays (like "emitters") replace, everything else shallow-merges.
      for (const k in resolved) {
        out[k] = resolved[k];
      }
    };
    if (cfg.mixin)  (Array.isArray(cfg.mixin)  ? cfg.mixin  : [cfg.mixin ]).forEach(apply);
    if (cfg.preset) (Array.isArray(cfg.preset) ? cfg.preset : [cfg.preset]).forEach(apply);
    for (const k in cfg) {
      if (k === "mixin" || k === "preset") continue;
      out[k] = cfg[k];
    }
    return out;
  }

  // =================================================================
  //  Config validation — warn on typos/unknown keys.  Never throws.
  // =================================================================
  const EMITTER_KEYS = new Set([
    "kind", "heads", "headsOffset", "count", "rate", "speed", "inset",
    "life", "size", "sizeVar", "sizeMod", "sizeTrack",
    "alpha", "alphaTrack",
    "spin", "jitter", "velInward", "velOutward", "velTangent",
    "velTangentSign", "speedInit", "spread",
    "gravity", "wind", "drag", "phaseSpeed", "sway",
    "orbit", "forces", "subEmitter",
    "shape", "hue", "sat", "lit", "color", "colorRamp", "colorRampEase", "colorGradient",
    "lineWidth", "lineCap", "shadow", "blend", "symmetry",
    "points", "innerRatio", "sides", "stroke", "aspect", "thickness",
    "barLen", "barWidth", "arcLen", "len", "lenMod", "streakDir",
    "glyph", "glow", "bold", "italic", "font", "pointAlong", "rotate",
    "headDot", "headDotR", "headDotColor", "headDotHue",
    "perimShape", "perimSides", "perimPoints", "perimInnerRatio",
    "perimExponent", "perimRotate", "cornerRadius", "weighting", "side",
    "interval", "burstCount", "burstSpread", "burstAt",
    "glowScale", "glowMid", "lightningLen", "segments",
    "init", "update", "draw", "overlay", "onSpawn", "onUpdate", "onDeath", "onBurst",
    "shapes",
    // --- border.js stroke / glowFrame renderer keys ---
    "layers", "colorMode", "conicStops", "linearStops", "linearAxis",
    "rotateSpeed", "scrollSpeed", "cycleSpeed", "paletteSpeed", "hueSpeed",
    "dash", "dashSpeed", "pulseSize", "pulseAlpha", "pulseSpeed",
    "fill", "fillAlpha", "glowColor", "samples",
    "bands", "width", "intensity", "perim",
  ]);
  function validate(cfg, ctx) {
    for (const k in cfg) {
      if (!EMITTER_KEYS.has(k)) {
        core.log.warn("Unknown key '" + k + "' in " + (ctx || "config"));
      }
    }
  }

  // =================================================================
  //  FX factory — turns a config into a TRAIL-compatible factory.
  //  Returned factory produces { step, draw, dispose, inspect }.
  // =================================================================
  function FX(rawCfg) {
    const cfg = applyPresets(rawCfg);

    // Normalise to { emitters: [...] }
    let emitters;
    if (Array.isArray(cfg.emitters) && cfg.emitters.length) {
      emitters = cfg.emitters.map(e => applyPresets(e));
    } else {
      emitters = [cfg];
      if (cfg.head) {
        const h = Object.assign(
          { kind: "head", speed: 0.3, rate: 60, shape: "glow" },
          applyPresets(cfg.head)
        );
        emitters.push(h);
      }
    }
    emitters.forEach((e, i) => validate(e, "emitter#" + i));

    const globalOpts = Object.assign({
      perimShape: "rect",
      cornerRadius: null,
      perimSides: undefined,
      perimPoints: undefined,
      perimInnerRatio: undefined,
      perimExponent: undefined,
      perimRotate: undefined,
      weighting: "uniform",
    }, cfg.global || {});

    const trailCfg = cfg.trail || null;

    return function instantiate() {
      const state = { time: 0 };
      const emitterInsts = emitters.map(e => makeEmitter(e, Object.assign({}, globalOpts, state)));

      // Trail / afterimage is drawn directly on the main canvas using a
      // destination-out fade.  Signalling `clearsSelf: true` tells
      // trail.js NOT to clearRect at the top of each frame so the
      // previous pixels survive.  This removes an entire offscreen
      // canvas + drawImage per frame per trail effect.
      const trailFade = trailCfg && trailCfg.fade != null ? trailCfg.fade : 0;

      return {
        clearsSelf: trailFade > 0,
        step(dt, W, H) {
          if (TIME.paused) return;
          const scaled = dt * TIME.scale;
          state.time += scaled;
          _updateQuality(dt);
          for (const em of emitterInsts) em.update(scaled, W, H, state.time, QUALITY.value);
        },
        draw(ctx, W, H) {
          if (trailFade > 0) {
            // Fade the prior frame (in-place) before drawing new particles
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0,0,0," + trailFade + ")";
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
          for (const em of emitterInsts) em.draw(ctx, W, H);
        },
        dispose() {
          for (const em of emitterInsts) em.dispose && em.dispose();
        },
        inspect() {
          return {
            emitters: emitterInsts.length,
            particles: emitterInsts.reduce((s, e) => s + e.parts.length, 0),
            quality: QUALITY.value,
            fps: _fps.ema,
            time: state.time,
          };
        },
        state,
      };
    };
  }

  // =================================================================
  //  Bulk registration — used by fx-page-*.js files.
  //
  //    FX.define([
  //      { id: 151, name: "Comet Warm", preset: "comet-warm", hue: "fire" },
  //      { id: 152, name: "Custom Draw", kind:"head", ..., factory: fn },
  //    ]);
  //
  //  Populates window.FX_META and registers with TRAIL.
  // =================================================================
  function defineEffects(list) {
    window.FX_META = window.FX_META || {};
    for (const spec of list) {
      const { id, name, factory } = spec;
      const cfg = Object.assign({}, spec);
      delete cfg.id; delete cfg.name; delete cfg.factory;
      window.FX_META[id] = { name, cfg };
      if (factory) register(id, factory);
      else         register(id, FX(cfg));
    }
  }

  // =================================================================
  //  Public API
  // =================================================================
  window.FX = FX;
  window.FX.define      = defineEffects;

  // Seeded PRNG
  window.FX.setSeed     = core.setSeed;
  window.FX.clearSeed   = core.clearSeed;

  // Registries (read + write)
  window.FX.shapes      = SHAPES;
  window.FX.shapeMeta   = SHAPE_META;
  window.FX.forces      = forcesMod.FORCES;
  window.FX.presets     = PRESETS;
  window.FX.palettes    = HUES;
  window.FX.ramps       = RAMPS;

  // Extension points
  window.FX.addShape    = defShape;
  window.FX.addForce    = forcesMod.addForce;
  window.FX.addPalette  = addHues;
  window.FX.addRamp     = addRamp;
  window.FX.preset      = presetsMod.def;

  // Utilities
  window.FX.ease        = core.EASE;
  window.FX.color       = {
    parse:  core.parseColor,
    hsla:   core.hsla,
    hsl:    core.hsl,
    hex:    core.hex,
    lerp:   core.lerpHSL,
    shift:  core.shiftHue,
    tint:   core.tint,
    saturate: core.saturate,
  };
  window.FX.noise       = noiseMod;
  window.FX.pool        = poolMod;

  // Runtime controls
  window.FX.quality     = QUALITY;
  window.FX.time        = TIME;

  // Diagnostics
  window.FX.inspect = () => ({
    shapes: Object.keys(SHAPES).length,
    forces: Object.keys(forcesMod.FORCES).length,
    presets: Object.keys(PRESETS).length,
    palettes: Object.keys(HUES).length,
    ramps: Object.keys(RAMPS).length,
    quality: QUALITY.value,
    fps: _fps.ema,
  });

  core.log.info(
    "FX v2 ready — "
    + Object.keys(SHAPES).length  + " shapes, "
    + Object.keys(forcesMod.FORCES).length + " forces, "
    + Object.keys(PRESETS).length + " presets, "
    + Object.keys(HUES).length    + " palettes"
  );
})();
