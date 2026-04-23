/* =============================================================
   FX-EXPORT — Per-effect standalone code generator.
   -------------------------------------------------------------
   Given an effect name + its FX config, produces a self-contained
   JavaScript snippet that:

     1. Ships only the runtime code that THAT effect actually needs
        (one shape drawer, one perimeter sampler, one or two palettes —
        not the whole 138 KB engine).
     2. Defines a single top-level function named
        `Effect_Name_With_Underscores()` which, when called, attaches
        the effect to every element on the page with the class
        `fx-effect-name-with-dashes`.
     3. Auto-runs on paste.

   The user then just:

       <div class="fx-void-whisper"></div>
       <script>
         // paste the whole generated snippet here
       </script>

   Exposes:  window.FX_EXPORT.standalone(name, cfg) → string
   ============================================================= */
(function () {
  "use strict";

  // -----------------------------------------------------------------
  //  Name helpers
  // -----------------------------------------------------------------
  function toSlug(name) {
    return String(name).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function toFuncName(name) {
    // "Void Whisper" -> "Void_Whisper"
    return String(name).trim()
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^([0-9])/, "_$1");  // JS identifiers can't start with digit
  }

  // -----------------------------------------------------------------
  //  Palette library — only the palettes the config references are
  //  inlined into the output.  Numbers are H values in HSL space.
  // -----------------------------------------------------------------
  const PALETTES = {
    fire:      [0, 10, 20, 30, 45],
    ember:     [8, 18, 30, 42],
    frost:     [180, 190, 200, 210, 220],
    neon:      [180, 200, 290, 320, 120],
    pastel:    [200, 250, 300, 340, 40, 80, 160],
    rainbow:   [0, 40, 80, 140, 200, 260, 320],
    sakura:    [330, 340, 350, 10, 20],
    ocean:     [180, 195, 210, 225],
    plasma:    [280, 300, 320, 340, 20],
    void:      [260, 280, 300],
    cosmos:    [230, 260, 290, 320, 350],
    starfield: [45, 200, 220, 260],
    gold:      [40, 45, 50, 55],
    silver:    [210, 220, 0],      // sat usually low
    holy:      [45, 50, 55, 200],
    venom:     [80, 100, 120, 140],
    arcane:    [260, 280, 300, 200],
    // v2.1 extension palettes
    cyberpunk: [320, 290, 180, 50, 140],
    sunset:    [0, 20, 40, 60, 300, 330],
    midnight:  [220, 240, 260, 280, 260],
    emerald:   [130, 150, 170, 190, 150],
    abyss:     [200, 220, 240, 260, 250],
    "sakura-deep":[320, 340, 350, 10],
    neonpink:  [310, 320, 330, 340, 350],
    electric:  [180, 200, 220, 240, 200],
    infernal:  [0, 10, 20, 30, 15],
    blizzard:  [180, 190, 200, 210, 220, 200],
    solarflare:[25, 35, 45, 15, 5],
    spectral:  [120, 160, 200, 240, 280, 320, 360],
    prism:     [0, 60, 120, 200, 280, 340],
    twilight:  [15, 300, 240, 220],
    lava:      [50, 30, 10, 0],
    reef:      [180, 160, 210, 260],
    venomous:  [90, 110, 140, 170],
  };

  // -----------------------------------------------------------------
  //  Shape library — each entry returns the JS source for a
  //  `draw(ctx, p)` function body.  `p` has: x,y,size,life,age,hue,
  //  sat,lit,alpha,rot.
  // -----------------------------------------------------------------
  const SHAPES = {
    glow:      [
      "var a = 1 - p.age / p.life;",
      "var r = p.size * 6;",
      "var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);",
      "g.addColorStop(0, 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')');",
      "g.addColorStop(1, 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,0)');",
      "ctx.fillStyle = g;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();",
    ],
    dot:       [
      "var a = 1 - p.age / p.life;",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();",
    ],
    pixel:     [
      "var a = 1 - p.age / p.life;",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);",
    ],
    rect:      [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "var w = p.size * 2, h = p.size;",
      "ctx.fillRect(-w/2, -h/2, w, h); ctx.restore();",
    ],
    ring:      [
      "var a = 1 - p.age / p.life;",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.lineWidth = 1;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + p.age/p.life), 0, TAU); ctx.stroke();",
    ],
    ringpulse: [
      "var t = p.age / p.life;",
      "var a = (1 - t) * (1 - t);",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.lineWidth = 1.2;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + t * 2), 0, TAU); ctx.stroke();",
    ],
    star:      [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath();",
      "for (var i = 0; i < 10; i++) {",
      "  var r = i % 2 ? p.size * 0.5 : p.size;",
      "  var ang = i * Math.PI / 5;",
      "  ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);",
      "}",
      "ctx.closePath(); ctx.fill(); ctx.restore();",
    ],
    sparkle:   [
      "var a = 1 - p.age / p.life;",
      "var c = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.lineCap = 'round';",
      "ctx.beginPath();",
      "ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0);",
      "ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size);",
      "ctx.stroke(); ctx.restore();",
    ],
    streak:    [
      "var a = 1 - p.age / p.life;",
      "var len = (typeof CFG.len === 'number' ? CFG.len : p.size * 6);",
      "var dx = p.vx, dy = p.vy, m = Math.hypot(dx, dy);",
      "if (m < 0.001) { dx = p.tx || 0; dy = p.ty || 0; m = Math.hypot(dx, dy) || 1; }",
      "dx /= m; dy /= m;",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.lineWidth = p.size; ctx.lineCap = 'round';",
      "ctx.beginPath();",
      "ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - dx * len, p.y - dy * len);",
      "ctx.stroke();",
    ],
    flake:     [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.lineWidth = 0.7;",
      "for (var i = 0; i < 6; i++) {",
      "  ctx.rotate(Math.PI / 3);",
      "  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, p.size); ctx.stroke();",
      "}",
      "ctx.restore();",
    ],
    bubble:    [
      "var a = 1 - p.age / p.life;",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',90%,75%,' + a + ')';",
      "ctx.lineWidth = 1;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke();",
    ],
    petal:     [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath();",
      "ctx.ellipse(0, 0, p.size * 0.8, p.size * 1.4, 0, 0, TAU);",
      "ctx.fill(); ctx.restore();",
    ],
    flame:     [
      "var a = (1 - p.age / p.life) * 0.9;",
      "var r = p.size * (1 + p.age / p.life * 0.6);",
      "var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);",
      "g.addColorStop(0, 'hsla(' + p.hue + ',100%,70%,' + a + ')');",
      "g.addColorStop(0.6, 'hsla(' + ((p.hue + 20)) + ',100%,50%,' + (a * 0.5) + ')');",
      "g.addColorStop(1, 'hsla(' + p.hue + ',100%,30%,0)');",
      "ctx.fillStyle = g;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();",
    ],
    smoke:     [
      "var a = (1 - p.age / p.life) * 0.35;",
      "var r = p.size * (1 + p.age / p.life);",
      "var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);",
      "g.addColorStop(0, 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')');",
      "g.addColorStop(1, 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,0)');",
      "ctx.fillStyle = g;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();",
    ],
    heart:     [
      "var a = 1 - p.age / p.life;",
      "var s = p.size / 4;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath();",
      "ctx.moveTo(0, 2);",
      "ctx.bezierCurveTo(-4, -2, -4, -6, 0, -4);",
      "ctx.bezierCurveTo(4, -6, 4, -2, 0, 2);",
      "ctx.fill(); ctx.restore();",
    ],
    diamond:   [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.PI/4);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); ctx.restore();",
    ],
    triangle:  [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath();",
      "ctx.moveTo(0, -p.size);",
      "ctx.lineTo(p.size * 0.87, p.size * 0.5);",
      "ctx.lineTo(-p.size * 0.87, p.size * 0.5);",
      "ctx.closePath(); ctx.fill(); ctx.restore();",
    ],
    firefly:   [
      "var a = (1 - p.age / p.life) * (0.5 + 0.5 * Math.sin(p.age * 6));",
      "var r = p.size * 3;",
      "var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);",
      "g.addColorStop(0, 'hsla(' + p.hue + ',100%,80%,' + a + ')');",
      "g.addColorStop(1, 'hsla(' + p.hue + ',100%,50%,0)');",
      "ctx.fillStyle = g;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();",
    ],
    ember:     [
      "var a = 1 - p.age / p.life;",
      "var r = p.size * (1.2 - p.age / p.life * 0.6);",
      "var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);",
      "g.addColorStop(0, 'hsla(' + p.hue + ',100%,70%,' + a + ')');",
      "g.addColorStop(1, 'hsla(' + p.hue + ',100%,30%,0)');",
      "ctx.fillStyle = g;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();",
    ],
    halo:      [
      "var a = (1 - p.age / p.life) * 0.6;",
      "var g = ctx.createRadialGradient(p.x, p.y, p.size * 0.3, p.x, p.y, p.size * 2);",
      "g.addColorStop(0, 'hsla(' + p.hue + ',100%,80%,' + a + ')');",
      "g.addColorStop(1, 'hsla(' + p.hue + ',100%,60%,0)');",
      "ctx.fillStyle = g;",
      "ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, TAU); ctx.fill();",
    ],
    lightning: [
      "var a = 1 - p.age / p.life;",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',100%,80%,' + a + ')';",
      "ctx.lineWidth = p.size; ctx.lineCap = 'round';",
      "ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 6;",
      "ctx.beginPath();",
      "var len = p.size * 8;",
      "var x = p.x, y = p.y;",
      "ctx.moveTo(x, y);",
      "for (var i = 0; i < 3; i++) {",
      "  x += (Math.random() - 0.5) * len;",
      "  y += (Math.random() - 0.5) * len;",
      "  ctx.lineTo(x, y);",
      "}",
      "ctx.stroke();",
    ],
    leaf:      [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath();",
      "ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU);",
      "ctx.fill(); ctx.restore();",
    ],
    arrow:     [
      "var a = 1 - p.age / p.life;",
      "var dx = p.vx, dy = p.vy, m = Math.hypot(dx, dy);",
      "if (m < 0.001) { dx = p.tx || 1; dy = p.ty || 0; m = Math.hypot(dx,dy) || 1; }",
      "var ang = Math.atan2(dy, dx);",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath();",
      "ctx.moveTo(p.size, 0);",
      "ctx.lineTo(-p.size * 0.7, p.size * 0.7);",
      "ctx.lineTo(-p.size * 0.3, 0);",
      "ctx.lineTo(-p.size * 0.7, -p.size * 0.7);",
      "ctx.closePath(); ctx.fill(); ctx.restore();",
    ],
    bar:       [
      "var a = 1 - p.age / p.life;",
      "var barLen   = typeof CFG.barLen === 'number'   ? CFG.barLen   : 8;",
      "var barWidth = typeof CFG.barWidth === 'number' ? CFG.barWidth : 1.4;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.fillRect(-barLen / 2, -barWidth / 2, barLen, barWidth);",
      "ctx.restore();",
    ],
    bracket:   [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.lineWidth = Math.max(1, p.size * 0.3);",
      "ctx.lineCap = 'round'; ctx.lineJoin = 'round';",
      "var s = p.size;",
      "ctx.beginPath();",
      "ctx.moveTo(-s, -s * 0.6); ctx.lineTo(-s, -s); ctx.lineTo(-s * 0.4, -s);",
      "ctx.moveTo( s,  s * 0.6); ctx.lineTo( s,  s); ctx.lineTo( s * 0.4,  s);",
      "ctx.stroke(); ctx.restore();",
    ],
    cross:     [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.lineWidth = Math.max(1, p.size * 0.35);",
      "ctx.lineCap = 'round';",
      "ctx.beginPath();",
      "ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0);",
      "ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size);",
      "ctx.stroke(); ctx.restore();",
    ],
    glyph:     [
      "var a = 1 - p.age / p.life;",
      "var txt = typeof CFG.glyph === 'string' ? CFG.glyph : '*';",
      "var font = CFG.font || 'bold ' + Math.max(6, p.size * 2.4) + 'px ui-sans-serif, system-ui, sans-serif';",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.font = font.replace(/\\d+(\\.\\d+)?px/, Math.max(6, p.size * 2.4).toFixed(1) + 'px');",
      "ctx.textAlign = 'center'; ctx.textBaseline = 'middle';",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.fillText(txt, 0, 0);",
      "ctx.restore();",
    ],
    lensflare: [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "var r = p.size * 5;",
      "var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);",
      "g.addColorStop(0, 'hsla(' + p.hue + ',100%,85%,' + a + ')');",
      "g.addColorStop(0.3, 'hsla(' + p.hue + ',100%,60%,' + (a*0.6) + ')');",
      "g.addColorStop(1, 'hsla(' + p.hue + ',100%,50%,0)');",
      "ctx.fillStyle = g;",
      "ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',100%,85%,' + (a*0.9) + ')';",
      "ctx.lineWidth = 1; ctx.lineCap = 'round';",
      "ctx.beginPath();",
      "ctx.moveTo(-p.size * 4, 0); ctx.lineTo(p.size * 4, 0);",
      "ctx.moveTo(0, -p.size * 2.5); ctx.lineTo(0, p.size * 2.5);",
      "ctx.stroke(); ctx.restore();",
    ],
    poly:      [
      "var a = 1 - p.age / p.life;",
      "var sides = typeof CFG.sides === 'number' ? Math.max(3, CFG.sides|0) : 6;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.beginPath();",
      "for (var i = 0; i < sides; i++) {",
      "  var ang = (i / sides) * TAU - Math.PI / 2;",
      "  var x = Math.cos(ang) * p.size, y = Math.sin(ang) * p.size;",
      "  if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);",
      "}",
      "ctx.closePath(); ctx.fill(); ctx.restore();",
    ],
    rune:      [
      "var a = 1 - p.age / p.life;",
      "// A rune glyph \u2014 CFG.glyph preferred, else pseudo-random from ASCII.",
      "var pool = typeof CFG.glyph === 'string' ? CFG.glyph : '\u16A0\u16A2\u16A6\u16B1\u16B7\u16BE\u16C1\u16C7\u16CF\u16D2\u16D7\u16DE';",
      "var ch = p._rune || (p._rune = pool[Math.floor(Math.random() * pool.length)]);",
      "var sz = Math.max(8, p.size * 2);",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.font = 'bold ' + sz.toFixed(1) + 'px \"Cinzel\", \"Trajan Pro\", serif';",
      "ctx.textAlign = 'center'; ctx.textBaseline = 'middle';",
      "if (CFG.glow) { ctx.shadowBlur = CFG.glow; ctx.shadowColor = 'hsl(' + p.hue + ',100%,70%)'; }",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.fillText(ch, 0, 0);",
      "ctx.restore();",
    ],
    square:    [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);",
      "ctx.restore();",
    ],
    tick:      [
      "var a = 1 - p.age / p.life;",
      "ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);",
      "ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,' + a + ')';",
      "ctx.lineWidth = Math.max(1, p.size * 0.3);",
      "ctx.lineCap = 'round'; ctx.lineJoin = 'round';",
      "var s = p.size;",
      "ctx.beginPath();",
      "ctx.moveTo(-s * 0.7, 0);",
      "ctx.lineTo(-s * 0.1, s * 0.6);",
      "ctx.lineTo( s * 0.8, -s * 0.6);",
      "ctx.stroke(); ctx.restore();",
    ],
  };
  // -----------------------------------------------------------------
  //  Extension shapes (v2.1) — added to the export library so that
  //  standalone snippets can render page 9/10 effects faithfully.
  //  Each body matches the logic in fx-engine-ext.js but is inlined
  //  without any engine helper dependencies.
  // -----------------------------------------------------------------
  SHAPES.beam = [
    "var a = 1 - p.age / p.life;",
    "var len = " + JSON.stringify(0) + "; len = (CFG.beamLen || 14);",
    "var tx = p.tx || Math.cos(p.angle||0), ty = p.ty || Math.sin(p.angle||0);",
    "var x1 = p.x - tx*len*0.5, y1 = p.y - ty*len*0.5;",
    "var x2 = p.x + tx*len*0.5, y2 = p.y + ty*len*0.5;",
    "var g = ctx.createLinearGradient(x1,y1,x2,y2);",
    "g.addColorStop(0,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0)');",
    "g.addColorStop(0.5,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,'+a+')');",
    "g.addColorStop(1,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0)');",
    "ctx.strokeStyle = g; ctx.lineWidth = CFG.beamWidth || 2; ctx.lineCap='round';",
    "ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();",
  ];
  SHAPES.bokeh = [
    "var a = 1 - p.age / p.life;",
    "var r = p.size * 1.4;",
    "var g = ctx.createRadialGradient(p.x,p.y,r*0.6,p.x,p.y,r);",
    "g.addColorStop(0,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,'+(a*0.35)+')');",
    "g.addColorStop(0.9,'hsla('+p.hue+','+p.sat+'%,'+(Math.min(p.lit+10,90))+'%,'+(a*0.9)+')');",
    "g.addColorStop(1,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0)');",
    "ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.fill();",
  ];
  SHAPES.orb = [
    "var a = 1 - p.age / p.life;",
    "var r = p.size;",
    "var g = ctx.createRadialGradient(p.x-r*0.4,p.y-r*0.4,0,p.x,p.y,r);",
    "g.addColorStop(0,'hsla('+p.hue+','+p.sat+'%,95%,'+a+')');",
    "g.addColorStop(0.45,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,'+a+')');",
    "g.addColorStop(1,'hsla('+p.hue+','+p.sat+'%,'+Math.max(p.lit-30,10)+'%,'+(a*0.6)+')');",
    "ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.fill();",
  ];
  SHAPES.plasmoid = [
    "var a = 1 - p.age / p.life;",
    "var r = p.size * (0.8 + 0.2*Math.sin((p.phase||0)*6));",
    "var g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*1.8);",
    "g.addColorStop(0,'hsla('+p.hue+',100%,85%,'+a+')');",
    "g.addColorStop(0.5,'hsla('+p.hue+',100%,60%,'+(a*0.55)+')');",
    "g.addColorStop(1,'hsla('+p.hue+',100%,40%,0)');",
    "ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,r*1.8,0,TAU); ctx.fill();",
  ];
  SHAPES.nebula = [
    "var a = 1 - p.age / p.life;",
    "var r = p.size * 2.2;",
    "var g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);",
    "g.addColorStop(0,'hsla('+p.hue+',100%,75%,'+(a*0.7)+')');",
    "g.addColorStop(0.4,'hsla('+(p.hue+40)+',100%,55%,'+(a*0.4)+')');",
    "g.addColorStop(0.8,'hsla('+(p.hue-30)+',80%,35%,'+(a*0.2)+')');",
    "g.addColorStop(1,'hsla('+p.hue+',100%,70%,0)');",
    "ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.fill();",
  ];
  SHAPES.ripple3 = [
    "var a = 1 - p.age / p.life;",
    "var r = p.size;",
    "ctx.strokeStyle = 'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,'+a+')';",
    "ctx.lineWidth = CFG.lineWidth || 0.9;",
    "for (var i=0;i<3;i++){ var rr = r*(1-i*0.28); if (rr>0){ ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,TAU); ctx.stroke(); } }",
  ];
  SHAPES.gridcell = [
    "var a = 1 - p.age / p.life;",
    "var r = p.size;",
    "ctx.strokeStyle = 'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,'+a+')';",
    "ctx.lineWidth = CFG.lineWidth || 1;",
    "var s = Math.round(r*2); ctx.strokeRect(Math.round(p.x-r),Math.round(p.y-r),s,s);",
  ];
  SHAPES.comet = [
    "var a = 1 - p.age / p.life;",
    "var r = p.size;",
    "var len = r * (CFG.tailLen || 5);",
    "var tx = p.tx || Math.cos(p.angle||0), ty = p.ty || Math.sin(p.angle||0);",
    "var tailX = p.x - tx*len, tailY = p.y - ty*len;",
    "var g = ctx.createLinearGradient(p.x,p.y,tailX,tailY);",
    "g.addColorStop(0,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,'+a+')');",
    "g.addColorStop(1,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0)');",
    "ctx.strokeStyle = g; ctx.lineWidth = r*1.2; ctx.lineCap='round';",
    "ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tailX,tailY); ctx.stroke();",
    "ctx.fillStyle = 'hsla('+p.hue+',100%,90%,'+a+')';",
    "ctx.beginPath(); ctx.arc(p.x,p.y,r*0.7,0,TAU); ctx.fill();",
  ];

  const DEFAULT_SHAPE = "glow";

  // -----------------------------------------------------------------
  //  Perimeter sampler — returns the JS body for `perim(t, W, H)` based
  //  on the chosen `perimShape`.  Each samples the perimeter at t∈[0,1]
  //  and returns {x, y, nx, ny} where (nx,ny) is the outward normal.
  // -----------------------------------------------------------------
  const PERIM_SAMPLERS = {
    rect: [
      "var inset = CFG.inset != null ? CFG.inset : 2;",
      "var w = W - 2*inset, h = H - 2*inset;",
      "var P = 2 * (w + h);",
      "var d = t * P;",
      "if (d < w) return { x: inset + d, y: inset, nx: 0, ny: -1 };",
      "d -= w;",
      "if (d < h) return { x: inset + w, y: inset + d, nx: 1, ny: 0 };",
      "d -= h;",
      "if (d < w) return { x: inset + w - d, y: inset + h, nx: 0, ny: 1 };",
      "d -= w;",
      "return { x: inset, y: inset + h - d, nx: -1, ny: 0 };",
    ],
    roundrect: [
      "var inset = CFG.inset != null ? CFG.inset : 2;",
      "var r = Math.min(CFG.cornerRadius != null ? CFG.cornerRadius : Math.min(W,H)*0.14, Math.min(W,H)/2 - inset);",
      "var x = inset, y = inset, w = W - 2*inset, h = H - 2*inset;",
      "var straightX = w - 2*r, straightY = h - 2*r;",
      "var arc = Math.PI * r / 2;",
      "var P = 2*(straightX + straightY) + 4*arc;",
      "var d = t * P;",
      "// top edge",
      "if (d < straightX) return { x: x+r+d, y: y, nx: 0, ny: -1 };",
      "d -= straightX;",
      "if (d < arc) { var a = d/r - Math.PI/2; return { x: x+w-r + Math.cos(a)*r, y: y+r + Math.sin(a)*r, nx: Math.cos(a), ny: Math.sin(a) }; }",
      "d -= arc;",
      "if (d < straightY) return { x: x+w, y: y+r+d, nx: 1, ny: 0 };",
      "d -= straightY;",
      "if (d < arc) { var a = d/r; return { x: x+w-r + Math.cos(a)*r, y: y+h-r + Math.sin(a)*r, nx: Math.cos(a), ny: Math.sin(a) }; }",
      "d -= arc;",
      "if (d < straightX) return { x: x+w-r-d, y: y+h, nx: 0, ny: 1 };",
      "d -= straightX;",
      "if (d < arc) { var a = d/r + Math.PI/2; return { x: x+r + Math.cos(a)*r, y: y+h-r + Math.sin(a)*r, nx: Math.cos(a), ny: Math.sin(a) }; }",
      "d -= arc;",
      "if (d < straightY) return { x: x, y: y+h-r-d, nx: -1, ny: 0 };",
      "d -= straightY;",
      "var a = d/r + Math.PI; return { x: x+r + Math.cos(a)*r, y: y+r + Math.sin(a)*r, nx: Math.cos(a), ny: Math.sin(a) };",
    ],
    circle: [
      "var inset = CFG.inset != null ? CFG.inset : 2;",
      "var cx = W/2, cy = H/2, r = Math.min(W,H)/2 - inset;",
      "var a = t * TAU;",
      "var cs = Math.cos(a), sn = Math.sin(a);",
      "return { x: cx + cs*r, y: cy + sn*r, nx: cs, ny: sn };",
    ],
    ellipse: [
      "var inset = CFG.inset != null ? CFG.inset : 2;",
      "var cx = W/2, cy = H/2, rx = W/2 - inset, ry = H/2 - inset;",
      "var a = t * TAU;",
      "var cs = Math.cos(a), sn = Math.sin(a);",
      "return { x: cx + cs*rx, y: cy + sn*ry, nx: cs, ny: sn };",
    ],
  };

  // -----------------------------------------------------------------
  //  Feature detection — scan the config for what's actually used.
  // -----------------------------------------------------------------
  function detectFeatures(cfg) {
    const feat = {
      kind: cfg.kind || "perimeter",
      shape: SHAPES[cfg.shape] ? cfg.shape : DEFAULT_SHAPE,
      perimShape: PERIM_SAMPLERS[cfg.perimShape] ? cfg.perimShape : "rect",
      palettes: new Set(),
      colorMode: cfg.colorMode || null,
    };
    // Collect palette references from hue (primary) and nested configs.
    function walk(obj) {
      if (!obj || typeof obj !== "object") return;
      if (typeof obj.hue === "string" && PALETTES[obj.hue]) feat.palettes.add(obj.hue);
      for (const k in obj) {
        const v = obj[k];
        if (v && typeof v === "object") walk(v);
      }
    }
    walk(cfg);
    return feat;
  }

  // -----------------------------------------------------------------
  //  Code assembly
  // -----------------------------------------------------------------
  const INDENT = "  ";
  const I2 = INDENT + INDENT;
  const I3 = I2 + INDENT;

  function indent(lines, prefix) {
    return lines.map(l => l ? prefix + l : "").join("\n");
  }

  function generatePaletteBlock(names) {
    if (!names.size) return "";
    const lines = ["// Palette lookup (only the palettes this effect uses)",
                   "var HUES = {"];
    for (const n of names) {
      lines.push("  " + JSON.stringify(n) + ": " + JSON.stringify(PALETTES[n]) + ",");
    }
    lines.push("};");
    return indent(lines, INDENT);
  }

  function generateShapeBlock(shape) {
    const known = !!SHAPES[shape];
    const body = SHAPES[shape] || SHAPES[DEFAULT_SHAPE];
    const header = known
      ? "// Draw one particle (shape: " + shape + ")"
      : "// NOTE: shape \"" + shape + "\" not available in the standalone exporter;\n  //       falling back to \"" + DEFAULT_SHAPE + "\".  Edit drawShape below if needed.";
    return indent([
      header,
      "function drawShape(ctx, p) {",
      ...body.map(l => "  " + l),
      "}",
    ], INDENT);
  }

  function generatePerimBlock(perimShape) {
    const body = PERIM_SAMPLERS[perimShape] || PERIM_SAMPLERS.rect;
    return indent([
      "// Perimeter sampler (shape: " + perimShape + ")",
      "function perim(t, W, H) {",
      ...body.map(l => "  " + l),
      "}",
    ], INDENT);
  }

  // -----------------------------------------------------------------
  //  Main per-kind attach-loop templates
  // -----------------------------------------------------------------
  const PARTICLE_COMMON_PRE = [
    "function rnd(a, b) { return a + Math.random() * (b - a); }",
    "function lifeRange() {",
    "  return Array.isArray(CFG.life) ? [CFG.life[0], CFG.life[1]] : [CFG.life || 1, CFG.life || 1];",
    "}",
    "function sizeBase() { return typeof CFG.size === 'number' ? CFG.size : 3; }",
    "function resolveHue(spec) {",
    "  if (typeof spec === 'number') return spec;",
    "  if (Array.isArray(spec) && spec.length === 2 && typeof spec[0] === 'number' && typeof spec[1] === 'number') return rnd(spec[0], spec[1]);",
    "  if (Array.isArray(spec)) return spec[Math.floor(Math.random() * spec.length)];",
    "  if (typeof spec === 'string' && typeof HUES !== 'undefined' && HUES[spec]) { var P = HUES[spec]; return P[Math.floor(Math.random() * P.length)]; }",
    "  return 200;",
    "}",
    "// Shadow / alpha / size modifiers applied as a wrapper around the",
    "// per-shape drawer so shapes stay simple.",
    "function drawParticle(ctx, p) {",
    "  var aMul = 1;",
    "  if (CFG.alpha === 'twinkle')      aMul = 0.5 + 0.5 * Math.sin(p.age * 8 + p.seed);",
    "  else if (CFG.alpha === 'pulse')   aMul = 0.5 + 0.5 * Math.sin(p.age * 3);",
    "  else if (CFG.alpha === 'flicker') aMul = Math.random() > 0.3 ? 1 : 0.3;",
    "  else if (CFG.alpha === 'strobe')  aMul = Math.floor(p.age * 12) % 2 ? 1 : 0;",
    "  else if (CFG.alpha === 'breathe') aMul = 0.6 + 0.4 * Math.sin(p.age * 1.5);",
    "  else if (typeof CFG.alpha === 'number') aMul = CFG.alpha;",
    "  var origSize = p.size;",
    "  var f = p.age / p.life;",
    "  if (CFG.sizeMod === 'grow')         p.size = origSize * (1 + f);",
    "  else if (CFG.sizeMod === 'shrink')  p.size = origSize * (1 - f * 0.6);",
    "  else if (CFG.sizeMod === 'pulse')   p.size = origSize * (1 + 0.3 * Math.sin(p.age * 5));",
    "  else if (CFG.sizeMod === 'twinkle') p.size = origSize * (0.7 + 0.5 * Math.abs(Math.sin(p.age * 8 + p.seed)));",
    "  else if (CFG.sizeMod === 'breathe') p.size = origSize * (0.9 + 0.2 * Math.sin(p.age * 2));",
    "  else if (CFG.sizeMod === 'swell')   p.size = origSize * (1 + 0.5 * Math.sin(f * Math.PI));",
    "  ctx.save();",
    "  ctx.globalAlpha = aMul;",
    "  if (CFG.shadow) {",
    "    ctx.shadowBlur  = CFG.shadow;",
    "    ctx.shadowColor = 'hsl(' + p.hue + ',' + p.sat + '%,' + Math.min(80, p.lit + 10) + '%)';",
    "  }",
    "  drawShape(ctx, p);",
    "  ctx.restore();",
    "  p.size = origSize;",
    "}",
  ];

  const PARTICLE_UPDATE_LOOP = [
    "var blend = CFG.blend || 'lighter';",
    "ctx.globalCompositeOperation = blend;",
    "for (var i = parts.length - 1; i >= 0; i--) {",
    "  var p = parts[i];",
    "  p.age += dt;",
    "  if (p.age >= p.life) { parts.splice(i, 1); continue; }",
    "  if (CFG.gravity) p.vy += CFG.gravity * dt * 60;",
    "  if (CFG.drag != null) { p.vx *= Math.pow(CFG.drag, dt * 60); p.vy *= Math.pow(CFG.drag, dt * 60); }",
    "  if (CFG.sway) p.vx += Math.sin(p.age * 3 + p.seed) * CFG.sway * dt;",
    "  p.x += p.vx * dt * 60;",
    "  p.y += p.vy * dt * 60;",
    "  if (CFG.spin) p.rot += CFG.spin * dt;",
    "  drawParticle(ctx, p);",
    "}",
    "ctx.globalCompositeOperation = 'source-over';",
  ];

  const CANVAS_SETUP = [
    "if (host.__fxAttached) return; host.__fxAttached = true;",
    "var canvas = document.createElement('canvas');",
    "canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';",
    "var cs = getComputedStyle(host);",
    "if (cs.position === 'static') host.style.position = 'relative';",
    "host.appendChild(canvas);",
    "var ctx = canvas.getContext('2d');",
    "var W = 0, H = 0;",
    "var dpr = Math.min(window.devicePixelRatio || 1, 2);",
    "function resize() {",
    "  var r = canvas.getBoundingClientRect();",
    "  W = r.width; H = r.height;",
    "  canvas.width  = Math.max(1, Math.round(W * dpr));",
    "  canvas.height = Math.max(1, Math.round(H * dpr));",
    "  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);",
    "}",
    "resize();",
    "if (window.ResizeObserver) new ResizeObserver(resize).observe(host);",
    "else window.addEventListener('resize', resize);",
  ];

  // ---- kind: perimeter (random spawn) ----
  const ATTACH_PARTICLE = [
    "// Attach a live canvas to a single host element (kind: perimeter)",
    "function attach(host) {",
  ].concat(
    CANVAS_SETUP.map(l => "  " + l),
    ["", "  var parts = [];", "  var spawnAcc = 0;", "  var MAX_PARTS = 500;", ""],
    PARTICLE_COMMON_PRE.map(l => "  " + l),
    [
      "",
      "  function spawn() {",
      "    var t = Math.random();",
      "    var s = perim(t, W, H);",
      "    var L = lifeRange();",
      "    var sb = sizeBase();",
      "    var sv = CFG.sizeVar || [0.7, 1.3];",
      "    var vi = CFG.velInward || 0, vo = CFG.velOutward || 0, vt = CFG.velTangent || 0, sp = CFG.spread || 0;",
      "    var tx = -s.ny, ty = s.nx;",
      "    parts.push({",
      "      x: s.x + (CFG.jitter ? (Math.random()-0.5)*CFG.jitter*2 : 0),",
      "      y: s.y + (CFG.jitter ? (Math.random()-0.5)*CFG.jitter*2 : 0),",
      "      vx: -s.nx*vi + s.nx*vo + tx*vt*(Math.random()*2-1) + (Math.random()-0.5)*sp,",
      "      vy: -s.ny*vi + s.ny*vo + ty*vt*(Math.random()*2-1) + (Math.random()-0.5)*sp,",
      "      tx: tx, ty: ty,",
      "      age: 0, life: rnd(L[0], L[1]),",
      "      size: sb * rnd(sv[0], sv[1]),",
      "      hue: resolveHue(CFG.hue),",
      "      sat: CFG.sat != null ? CFG.sat : 100,",
      "      lit: CFG.lit != null ? CFG.lit : 60,",
      "      rot: Math.random() * TAU,",
      "      seed: Math.random() * TAU,",
      "    });",
      "  }",
      "",
      "  var last = performance.now();",
      "  function loop(now) {",
      "    var dt = Math.min(0.05, (now - last) / 1000);",
      "    last = now;",
      "    if (W > 0 && H > 0) {",
      "      ctx.clearRect(0, 0, W, H);",
      "      var rate = CFG.rate != null ? CFG.rate : (CFG.count != null ? CFG.count / Math.max(0.05, (lifeRange()[0]+lifeRange()[1])/2) : 40);",
      "      spawnAcc += dt * rate;",
      "      while (spawnAcc >= 1 && parts.length < MAX_PARTS) { spawn(); spawnAcc -= 1; }",
    ],
    PARTICLE_UPDATE_LOOP.map(l => "      " + l),
    [
      "    }",
      "    host.__fxRaf = requestAnimationFrame(loop);",
      "  }",
      "  host.__fxRaf = requestAnimationFrame(loop);",
      "}",
    ]
  );

  // ---- kind: head  (walker around perimeter, trails particles) ----
  const ATTACH_HEAD = [
    "// Attach a live canvas to a single host element (kind: head)",
    "function attach(host) {",
  ].concat(
    CANVAS_SETUP.map(l => "  " + l),
    [
      "",
      "  var parts = [];",
      "  var spawnAcc = 0;",
      "  var MAX_PARTS = 500;",
      "  var walker = { t: Math.random() };  // param position on perimeter [0,1)",
      "",
    ],
    PARTICLE_COMMON_PRE.map(l => "  " + l),
    [
      "",
      "  function spawn() {",
      "    var s = perim(walker.t, W, H);",
      "    var L = lifeRange();",
      "    var sb = sizeBase();",
      "    var sv = CFG.sizeVar || [0.7, 1.3];",
      "    var vt = CFG.velTangent || 0;",
      "    var vi = CFG.velInward || 0, vo = CFG.velOutward || 0, sp = CFG.spread || 0;",
      "    // Tangent is the walker's direction of motion on the perimeter.",
      "    var tx = -s.ny, ty = s.nx;",
      "    parts.push({",
      "      x: s.x + (CFG.jitter ? (Math.random()-0.5)*CFG.jitter*2 : 0),",
      "      y: s.y + (CFG.jitter ? (Math.random()-0.5)*CFG.jitter*2 : 0),",
      "      // Inherit walker tangent velocity so trails / streaks point along the path.",
      "      vx: tx * (1 + vt) + -s.nx*vi + s.nx*vo + (Math.random()-0.5)*sp,",
      "      vy: ty * (1 + vt) + -s.ny*vi + s.ny*vo + (Math.random()-0.5)*sp,",
      "      tx: tx, ty: ty,",
      "      age: 0, life: rnd(L[0], L[1]),",
      "      size: sb * rnd(sv[0], sv[1]),",
      "      hue: resolveHue(CFG.hue),",
      "      sat: CFG.sat != null ? CFG.sat : 100,",
      "      lit: CFG.lit != null ? CFG.lit : 60,",
      "      rot: Math.random() * TAU,",
      "      seed: Math.random() * TAU,",
      "    });",
      "  }",
      "",
      "  function drawHeadDot() {",
      "    if (!(CFG.headDotR || CFG.headDot || CFG.headDotColor)) return;",
      "    var hs = perim(walker.t, W, H);",
      "    var r = CFG.headDotR || 6;",
      "    var color = CFG.headDotColor;",
      "    if (!color) {",
      "      var h = CFG.headDotHue != null ? CFG.headDotHue : (typeof CFG.hue === 'number' ? CFG.hue : 45);",
      "      color = 'hsl(' + h + ',100%,75%)';",
      "    }",
      "    var g = ctx.createRadialGradient(hs.x, hs.y, 0, hs.x, hs.y, r);",
      "    g.addColorStop(0, color);",
      "    g.addColorStop(1, 'rgba(0,0,0,0)');",
      "    ctx.fillStyle = g;",
      "    ctx.beginPath(); ctx.arc(hs.x, hs.y, r, 0, TAU); ctx.fill();",
      "  }",
      "",
      "  var last = performance.now();",
      "  function loop(now) {",
      "    var dt = Math.min(0.05, (now - last) / 1000);",
      "    last = now;",
      "    if (W > 0 && H > 0) {",
      "      ctx.clearRect(0, 0, W, H);",
      "      // Advance walker along the perimeter.",
      "      var speed = CFG.speed != null ? CFG.speed : 0.3;",
      "      walker.t = (walker.t + speed * dt) % 1;",
      "      if (walker.t < 0) walker.t += 1;",
      "      // Emission rate: CFG.rate particles-per-second from the walker.",
      "      var rate = CFG.rate != null ? CFG.rate : 40;",
      "      spawnAcc += dt * rate;",
      "      while (spawnAcc >= 1 && parts.length < MAX_PARTS) { spawn(); spawnAcc -= 1; }",
    ],
    PARTICLE_UPDATE_LOOP.map(l => "      " + l),
    [
      "      drawHeadDot();",
      "    }",
      "    host.__fxRaf = requestAnimationFrame(loop);",
      "  }",
      "  host.__fxRaf = requestAnimationFrame(loop);",
      "}",
    ]
  );

  const ATTACH_STROKE = [
    "// Border-stroke renderer (no particles)",
    "function attach(host) {",
    "  if (host.__fxAttached) return; host.__fxAttached = true;",
    "  var canvas = document.createElement('canvas');",
    "  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';",
    "  var cs = getComputedStyle(host);",
    "  if (cs.position === 'static') host.style.position = 'relative';",
    "  host.appendChild(canvas);",
    "  var ctx = canvas.getContext('2d');",
    "  var W = 0, H = 0;",
    "  var dpr = Math.min(window.devicePixelRatio || 1, 2);",
    "",
    "  function resize() {",
    "    var r = canvas.getBoundingClientRect();",
    "    W = r.width; H = r.height;",
    "    canvas.width  = Math.max(1, Math.round(W * dpr));",
    "    canvas.height = Math.max(1, Math.round(H * dpr));",
    "    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);",
    "  }",
    "  resize();",
    "  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);",
    "  else window.addEventListener('resize', resize);",
    "",
    "  var time = 0, dashOffset = 0;",
    "",
    "  function tracePath() {",
    "    var inset = CFG.inset != null ? CFG.inset : 2;",
    "    if (CFG.perimShape === 'roundrect') {",
    "      var r = Math.min(CFG.cornerRadius != null ? CFG.cornerRadius : 14, Math.min(W,H)/2 - inset);",
    "      ctx.beginPath();",
    "      if (ctx.roundRect) ctx.roundRect(inset, inset, W-2*inset, H-2*inset, r);",
    "      else { ctx.rect(inset, inset, W-2*inset, H-2*inset); }",
    "    } else if (CFG.perimShape === 'circle' || CFG.perimShape === 'ellipse') {",
    "      var rx = (CFG.perimShape === 'ellipse' ? W/2 : Math.min(W,H)/2) - inset;",
    "      var ry = (CFG.perimShape === 'ellipse' ? H/2 : Math.min(W,H)/2) - inset;",
    "      ctx.beginPath(); ctx.ellipse(W/2, H/2, rx, ry, 0, 0, TAU);",
    "    } else {",
    "      ctx.beginPath(); ctx.rect(inset, inset, W-2*inset, H-2*inset);",
    "    }",
    "  }",
    "",
    "  var DEFAULT_CONIC = [[0,'#ff2d6e'],[0.16,'#ffcf3e'],[0.33,'#4cff9a'],[0.5,'#35e9ff'],[0.66,'#5a8bff'],[0.83,'#bd5bff'],[1,'#ff2d6e']];",
    "",
    "  function resolveStroke() {",
    "    if (CFG.colorMode === 'conic' && ctx.createConicGradient) {",
    "      var g = ctx.createConicGradient(time * (CFG.rotateSpeed || 0.5), W/2, H/2);",
    "      var stops = CFG.conicStops || DEFAULT_CONIC;",
    "      for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);",
    "      return g;",
    "    }",
    "    if (CFG.colorMode === 'linear') {",
    "      var g = ctx.createLinearGradient(0, 0, W, 0);",
    "      var phase = (time * (CFG.scrollSpeed || 0.25)) % 1;",
    "      var stops = CFG.linearStops || [[0,'rgba(0,255,240,0)'],[0.5,'rgba(0,255,240,1)'],[1,'rgba(0,255,240,0)']];",
    "      for (var i = 0; i < stops.length; i++) { var p = ((stops[i][0] + phase) % 1 + 1) % 1; g.addColorStop(p, stops[i][1]); }",
    "      return g;",
    "    }",
    "    if (CFG.colorMode === 'cycle') {",
    "      var hue = (time * (CFG.cycleSpeed || 60)) % 360;",
    "      return 'hsl(' + (hue|0) + ',' + (CFG.sat != null ? CFG.sat : 100) + '%,' + (CFG.lit != null ? CFG.lit : 60) + '%)';",
    "    }",
    "    if (typeof CFG.color === 'string') return CFG.color;",
    "    var hue = typeof CFG.hue === 'number' ? CFG.hue : 200;",
    "    if (Array.isArray(CFG.hue) && CFG.hue.length === 2) { var t = (Math.sin(time) + 1)/2; hue = CFG.hue[0] + (CFG.hue[1]-CFG.hue[0])*t; }",
    "    else if (typeof CFG.hue === 'string' && typeof HUES !== 'undefined' && HUES[CFG.hue]) { var P = HUES[CFG.hue]; hue = P[Math.floor(time * 0.5) % P.length]; }",
    "    return 'hsl(' + (hue|0) + ',100%,60%)';",
    "  }",
    "",
    "  var last = performance.now();",
    "  function loop(now) {",
    "    var dt = Math.min(0.05, (now - last) / 1000);",
    "    last = now; time += dt;",
    "    if (CFG.dashSpeed) dashOffset += CFG.dashSpeed * dt;",
    "    if (W > 0 && H > 0) {",
    "      ctx.clearRect(0, 0, W, H);",
    "      ctx.save();",
    "      var lw = CFG.lineWidth || 2;",
    "      if (CFG.pulseSize) lw *= (1 + Math.sin(time * (CFG.pulseSpeed || 3)) * (typeof CFG.pulseSize === 'number' ? CFG.pulseSize : 0.3));",
    "      ctx.lineWidth = lw;",
    "      ctx.lineCap = CFG.lineCap || 'butt';",
    "      ctx.lineJoin = CFG.lineJoin || 'round';",
    "      var alpha = CFG.alpha != null ? CFG.alpha : 1;",
    "      if (CFG.pulseAlpha) alpha = 0.5 + (typeof CFG.pulseAlpha === 'number' ? CFG.pulseAlpha : 0.5) * Math.sin(time * (CFG.pulseSpeed || 3));",
    "      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));",
    "      if (CFG.dash) { ctx.setLineDash(CFG.dash); ctx.lineDashOffset = -dashOffset; }",
    "      if (CFG.glow) { ctx.shadowBlur = CFG.glow; ctx.shadowColor = typeof CFG.glowColor === 'string' ? CFG.glowColor : 'hsl(' + (typeof CFG.hue === 'number' ? CFG.hue : 200) + ',100%,60%)'; }",
    "      tracePath();",
    "      ctx.strokeStyle = resolveStroke();",
    "      ctx.stroke();",
    "      ctx.restore();",
    "    }",
    "    host.__fxRaf = requestAnimationFrame(loop);",
    "  }",
    "  host.__fxRaf = requestAnimationFrame(loop);",
    "}",
  ];

  const ATTACH_GLOWFRAME = [
    "// Soft inset glow-frame renderer",
    "function attach(host) {",
    "  if (host.__fxAttached) return; host.__fxAttached = true;",
    "  var canvas = document.createElement('canvas');",
    "  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';",
    "  var cs = getComputedStyle(host);",
    "  if (cs.position === 'static') host.style.position = 'relative';",
    "  host.appendChild(canvas);",
    "  var ctx = canvas.getContext('2d');",
    "  var W = 0, H = 0;",
    "  var dpr = Math.min(window.devicePixelRatio || 1, 2);",
    "",
    "  function resize() {",
    "    var r = canvas.getBoundingClientRect();",
    "    W = r.width; H = r.height;",
    "    canvas.width  = Math.max(1, Math.round(W * dpr));",
    "    canvas.height = Math.max(1, Math.round(H * dpr));",
    "    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);",
    "  }",
    "  resize();",
    "  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);",
    "  else window.addEventListener('resize', resize);",
    "",
    "  var time = 0;",
    "",
    "  function tracePath(inset) {",
    "    if (CFG.perimShape === 'roundrect') {",
    "      var r = Math.min(CFG.cornerRadius != null ? CFG.cornerRadius : 14, Math.min(W,H)/2 - inset);",
    "      ctx.beginPath();",
    "      if (ctx.roundRect) ctx.roundRect(inset, inset, W-2*inset, H-2*inset, r);",
    "      else ctx.rect(inset, inset, W-2*inset, H-2*inset);",
    "    } else if (CFG.perimShape === 'circle' || CFG.perimShape === 'ellipse') {",
    "      var rx = (CFG.perimShape === 'ellipse' ? W/2 : Math.min(W,H)/2) - inset;",
    "      var ry = (CFG.perimShape === 'ellipse' ? H/2 : Math.min(W,H)/2) - inset;",
    "      ctx.beginPath(); ctx.ellipse(W/2, H/2, rx, ry, 0, 0, TAU);",
    "    } else {",
    "      ctx.beginPath(); ctx.rect(inset, inset, W-2*inset, H-2*inset);",
    "    }",
    "  }",
    "",
    "  var last = performance.now();",
    "  function loop(now) {",
    "    var dt = Math.min(0.05, (now - last) / 1000);",
    "    last = now; time += dt;",
    "    if (W > 0 && H > 0) {",
    "      ctx.clearRect(0, 0, W, H);",
    "      var bands = CFG.bands || 6;",
    "      var baseW = CFG.width || 14;",
    "      var intensity = CFG.intensity != null ? CFG.intensity : 0.6;",
    "      var pulse = CFG.pulseSpeed ? (0.5 + 0.5 * Math.sin(time * CFG.pulseSpeed)) : 1;",
    "      var color;",
    "      if (typeof CFG.glowColor === 'string') color = CFG.glowColor;",
    "      else if (typeof CFG.color === 'string') color = CFG.color;",
    "      else { var h = typeof CFG.hue === 'number' ? CFG.hue : 200; if (Array.isArray(CFG.hue) && CFG.hue.length === 2 && typeof CFG.hue[0] === 'number') { h = CFG.hue[0] + (CFG.hue[1]-CFG.hue[0]) * (Math.sin(time)+1)/2; } else if (typeof CFG.hue === 'string' && typeof HUES !== 'undefined' && HUES[CFG.hue]) { var P = HUES[CFG.hue]; h = P[Math.floor(time*0.5) % P.length]; } color = 'hsl(' + (h|0) + ',100%,60%)'; }",
    "      ctx.save();",
    "      ctx.globalCompositeOperation = CFG.blend || 'lighter';",
    "      for (var i = 0; i < bands; i++) {",
    "        var t = i / (bands - 1);",
    "        var w = baseW * (0.4 + t * 1.6);",
    "        var a = intensity * (1 - t) * pulse;",
    "        if (a <= 0) continue;",
    "        ctx.globalAlpha = a;",
    "        ctx.lineWidth = w;",
    "        ctx.strokeStyle = color;",
    "        tracePath((CFG.inset || 2) + w * 0.4);",
    "        ctx.stroke();",
    "      }",
    "      ctx.restore();",
    "    }",
    "    host.__fxRaf = requestAnimationFrame(loop);",
    "  }",
    "  host.__fxRaf = requestAnimationFrame(loop);",
    "}",
  ];

  // -----------------------------------------------------------------
  //  JSON pretty-printer for inlined CFG
  // -----------------------------------------------------------------
  function inlineCfg(cfg) {
    return JSON.stringify(cfg, null, 2).split("\n").map(l => "  " + l).join("\n");
  }

  // -----------------------------------------------------------------
  //  Public: generate the whole standalone JS file.
  // -----------------------------------------------------------------
  function standalone(name, cfg) {
    const slug    = toSlug(name);
    const fn      = toFuncName(name);
    const feat    = detectFeatures(cfg);

    let attachBlock, shapeBlock;
    if (feat.kind === "stroke")        { attachBlock = ATTACH_STROKE;    shapeBlock = ""; }
    else if (feat.kind === "glowFrame"){ attachBlock = ATTACH_GLOWFRAME; shapeBlock = ""; }
    else if (feat.kind === "head" || feat.kind === "multi-head") {
      attachBlock = ATTACH_HEAD;
      shapeBlock  = generateShapeBlock(feat.shape);
    }
    else {
      attachBlock = ATTACH_PARTICLE;
      shapeBlock  = generateShapeBlock(feat.shape);
    }

    const perimBlock = (feat.kind === "stroke" || feat.kind === "glowFrame")
      ? "" : generatePerimBlock(feat.perimShape);
    const paletteBlock = generatePaletteBlock(feat.palettes);

    // Header / usage
    const header = [
      "/* ============================================================",
      " *  " + name,
      " *  ---------------------------------------------------------",
      " *  USAGE:",
      " *    1. Add class=\"fx-" + slug + "\" to any element:",
      " *         <div class=\"fx-" + slug + "\" style=\"background:black;width:200px;height:200px\"></div>",
      " *    2. Paste this entire snippet once (anywhere on the page).",
      " *",
      " *  The effect auto-attaches to every matching element present",
      " *  at paste-time AND to elements added later (MutationObserver).",
      " *",
      " *  Self-contained: no external dependencies.  Strip safe.",
      " * ============================================================ */",
    ].join("\n");

    const body = [
      "function " + fn + "() {",
      INDENT + "\"use strict\";",
      INDENT + "var CLASS = \"fx-" + slug + "\";",
      INDENT + "var TAU = Math.PI * 2;",
      "",
      INDENT + "// -------- Effect configuration (exported from editor) --------",
      INDENT + "var CFG = " + inlineCfg(cfg).trim() + ";",
      "",
      paletteBlock ? paletteBlock + "\n" : "",
      perimBlock   ? perimBlock   + "\n" : "",
      shapeBlock   ? shapeBlock   + "\n" : "",
      indent(attachBlock, INDENT),
      "",
      INDENT + "// -------- Bootstrap --------",
      INDENT + "function attachAll(root) {",
      INDENT + "  var els = (root || document).querySelectorAll('.' + CLASS);",
      INDENT + "  for (var i = 0; i < els.length; i++) attach(els[i]);",
      INDENT + "}",
      INDENT + "if (document.readyState === 'loading') {",
      INDENT + "  document.addEventListener('DOMContentLoaded', function(){ attachAll(); });",
      INDENT + "} else {",
      INDENT + "  attachAll();",
      INDENT + "}",
      INDENT + "// Watch for elements added later:",
      INDENT + "if (window.MutationObserver) {",
      INDENT + "  new MutationObserver(function(muts){",
      INDENT + "    for (var i = 0; i < muts.length; i++) {",
      INDENT + "      var added = muts[i].addedNodes;",
      INDENT + "      for (var j = 0; j < added.length; j++) {",
      INDENT + "        var n = added[j];",
      INDENT + "        if (n.nodeType !== 1) continue;",
      INDENT + "        if (n.classList && n.classList.contains(CLASS)) attach(n);",
      INDENT + "        if (n.querySelectorAll) attachAll(n);",
      INDENT + "      }",
      INDENT + "    }",
      INDENT + "  }).observe(document.documentElement, { childList: true, subtree: true });",
      INDENT + "}",
      "}",
      fn + "();",
    ].filter(Boolean).join("\n");

    return header + "\n" + body + "\n";
  }

  // -----------------------------------------------------------------
  //  CSS-effect exporter (ids 1-50) — copies the `.bNN` + `.bNN .inner`
  //  rules from the currently-loaded stylesheets, renaming the selector
  //  to `.fx-<slug>`.  Also inlines the universal filter/transform
  //  adjustments the user set via the modal sliders.
  // -----------------------------------------------------------------
  function standaloneCss(name, id, adjustments) {
    const slug = toSlug(name);
    const pad  = String(id).padStart(2, "0");
    const selPrefix = ".b" + pad;
    const rules = [];
    const keyframes = [];

    // Scan every same-origin stylesheet for rules whose selector starts
    // with `.bNN` (possibly with pseudo / nested combinators) and rename.
    // Use index-based iteration on CSSRuleList + per-sheet try/catch so
    // one hostile sheet can't wreck the rest.
    const sheets = document.styleSheets;
    for (let si = 0; si < sheets.length; si++) {
      let cssRules;
      try { cssRules = sheets[si].cssRules; } catch (_) { continue; }
      if (!cssRules) continue;
      for (let ri = 0; ri < cssRules.length; ri++) {
        collectRule(cssRules[ri], rules, keyframes, selPrefix, slug, pad);
      }
    }

    // Fallback: when running from file:// every linked CSS is treated as a
    // foreign origin and `.cssRules` throws.  Parse the pre-baked CSS
    // database (js/fx-css-db.js) instead.
    if (!rules.length && !keyframes.length && window.FX_CSS_DB && Array.isArray(window.FX_CSS_DB.texts)) {
      for (const text of window.FX_CSS_DB.texts) {
        collectFromText(text, rules, keyframes, selPrefix, slug, pad);
      }
    }

    const header = [
      "/* ============================================================",
      " *  " + name,
      " *  ---------------------------------------------------------",
      " *  USAGE:",
      " *    1. Add class=\"fx-" + slug + "\" to any element:",
      " *         <div class=\"fx-" + slug + "\" style=\"width:200px;height:200px\">",
      " *           <div class=\"inner\"></div>",
      " *         </div>",
      " *    2. Paste this entire <style> block anywhere in your page.",
      " *",
      " *  Pure CSS — no JS required.",
      " * ============================================================ */",
    ].join("\n");

    const adjust = adjustments || {};
    const filter =
      "hue-rotate(" + (adjust.hueRotate || 0) + "deg) " +
      "saturate("   + (adjust.saturate  != null ? adjust.saturate  : 1) + ") " +
      "brightness(" + (adjust.brightness!= null ? adjust.brightness: 1) + ") " +
      "contrast("   + (adjust.contrast  != null ? adjust.contrast  : 1) + ") " +
      "blur("       + (adjust.blur      || 0) + "px) " +
      "invert("     + (adjust.invert    || 0) + ") " +
      "opacity("    + (adjust.opacity   != null ? adjust.opacity   : 1) + ")";
    const transform =
      "scale(" + (adjust.scale != null ? adjust.scale : 1) + ") " +
      "rotate(" + (adjust.rotate || 0) + "deg)";
    const hasAdjust = filter !== "hue-rotate(0deg) saturate(1) brightness(1) contrast(1) blur(0px) invert(0) opacity(1)" || transform !== "scale(1) rotate(0deg)";

    // Also rewrite any `animation: bNN ...` references inside the copied
    // rules so they point at the renamed @keyframes.
    const animName = "b" + pad;
    const newAnim  = "fx_" + slug.replace(/-/g, "_");
    const body = rules.concat(keyframes).map(r => r.replace(
      new RegExp("\\b" + animName + "\\b", "g"), newAnim
    )).join("\n\n");

    const wrap = [
      "<style>",
      "/* Author your element like: <div class=\"fx-" + slug + "\"><div class=\"inner\"></div></div> */",
      ".fx-" + slug + " {",
      "  position: relative;",
      "  width: 100%; height: 100%;",
      hasAdjust
        ? "  filter: "    + filter    + ";\n  transform: " + transform + ";"
        : "  /* no user adjustments */",
      "}",
      "",
      body || "/* NOTE: no .b" + pad + " rules found in stylesheets (are they loaded?). */",
      "</style>",
    ].join("\n");

    return header + "\n" + wrap + "\n";
  }

  // -----------------------------------------------------------------
  //  Recursive rule walker used by standaloneCss().  Collects:
  //    • style rules whose selector references `.bNN`
  //    • @keyframes whose name matches `bNN`
  //  Grouping rules (@media / @supports / @layer) are recursed into
  //  and re-wrapped around any matched inner rules.
  // -----------------------------------------------------------------
  function collectRule(rule, out, keyframes, selPrefix, slug, pad) {
    // @keyframes — capture when the animation name matches.
    if (rule.type === 7 /* KEYFRAMES_RULE */ || rule.keyText !== undefined && rule.name !== undefined) {
      if (rule.name === "b" + pad) keyframes.push(rule.cssText);
      return;
    }
    // Grouping rules: @media / @supports / @layer / @container
    if (rule.cssRules && rule.selectorText === undefined && rule.name === undefined) {
      const inner = [];
      const innerKf = [];
      for (let i = 0; i < rule.cssRules.length; i++) {
        collectRule(rule.cssRules[i], inner, innerKf, selPrefix, slug, pad);
      }
      if (inner.length) {
        const head = rule.cssText.split("{")[0].trim();
        out.push(head + " {\n" + inner.join("\n\n") + "\n}");
      }
      for (const kf of innerKf) keyframes.push(kf);
      return;
    }
    if (!rule.selectorText) return;

    const sels = rule.selectorText.split(",").map(s => s.trim());
    const matched = [];
    for (const s of sels) {
      if (matchesSelector(s, selPrefix)) matched.push(s);
    }
    if (!matched.length) return;

    const renamed = matched.map(s => renameSelector(s, selPrefix, ".fx-" + slug));
    const body    = rule.style && rule.style.cssText ? rule.style.cssText : "";
    out.push(renamed.join(",\n") + " {\n  " + body.replace(/;\s*/g, ";\n  ").trim() + "\n}");
  }

  // Does `selector` reference the `.bNN` token anywhere?  Uses a word-
  // boundary check so `.b01` matches `.b01`, `.b01:hover`, `.card .b01`,
  // `.b01.inner`, `.b01::before`, `.b01[data-x]`, etc. — but NOT `.b010`.
  function matchesSelector(selector, selPrefix) {
    const idx = selector.indexOf(selPrefix);
    if (idx === -1) return false;
    // Character after the prefix must not continue the class name.
    const after = selector[idx + selPrefix.length];
    if (after && /[A-Za-z0-9_-]/.test(after)) return false;
    return true;
  }

  // -----------------------------------------------------------------
  //  Text-based CSS parser — used when `sheet.cssRules` is blocked
  //  (e.g. page opened via file://).  Walks the raw text top-level-
  //  brace by top-level-brace, collecting `.bNN` rules and `@keyframes
  //  bNN` blocks.  Comments and string literals are honoured so `{`/`}`
  //  inside them don't confuse the depth counter.
  // -----------------------------------------------------------------
  function collectFromText(css, rules, keyframes, selPrefix, slug, pad) {
    const blocks = parseTopLevelBlocks(css);
    const animName = "b" + pad;
    for (const b of blocks) {
      const head = b.head.trim();
      // @keyframes bNN (or vendor prefix)
      const kfMatch = /^@(?:-[a-z]+-)?keyframes\s+([^\s{]+)/i.exec(head);
      if (kfMatch) {
        if (kfMatch[1] === animName) keyframes.push(b.full);
        continue;
      }
      if (head.startsWith("@")) continue; // skip other at-rules for now
      // Style rule: filter selectors list for `.bNN` token matches.
      const sels = head.split(",").map(s => s.trim()).filter(Boolean);
      const matched = sels.filter(s => matchesSelector(s, selPrefix));
      if (!matched.length) continue;
      const renamed = matched.map(s => renameSelector(s, selPrefix, ".fx-" + slug));
      rules.push(renamed.join(",\n") + " {" + b.body + "}");
    }
  }

  // Brace-balanced top-level parser that respects /* … */ comments and
  // 'single' / "double" strings.  Returns [{ head, body, full }].
  function parseTopLevelBlocks(css) {
    const out = [];
    let i = 0, n = css.length;
    while (i < n) {
      // Skip whitespace
      while (i < n && /\s/.test(css[i])) i++;
      // Skip block comment
      if (i < n - 1 && css[i] === "/" && css[i + 1] === "*") {
        const end = css.indexOf("*/", i + 2);
        i = end < 0 ? n : end + 2;
        continue;
      }
      if (i >= n) break;
      // Head: read until unquoted/uncommented '{'
      const headStart = i;
      while (i < n && css[i] !== "{") {
        if (css[i] === "/" && css[i + 1] === "*") {
          const end = css.indexOf("*/", i + 2);
          i = end < 0 ? n : end + 2; continue;
        }
        if (css[i] === '"' || css[i] === "'") {
          const q = css[i++]; while (i < n && css[i] !== q) { if (css[i] === "\\") i++; i++; } i++; continue;
        }
        i++;
      }
      if (i >= n) break;
      const head = css.slice(headStart, i);
      i++; // consume '{'
      const bodyStart = i;
      let depth = 1;
      while (i < n && depth > 0) {
        if (css[i] === "/" && css[i + 1] === "*") {
          const end = css.indexOf("*/", i + 2);
          i = end < 0 ? n : end + 2; continue;
        }
        if (css[i] === '"' || css[i] === "'") {
          const q = css[i++]; while (i < n && css[i] !== q) { if (css[i] === "\\") i++; i++; } i++; continue;
        }
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
        i++;
      }
      const body = css.slice(bodyStart, i - 1);
      out.push({ head, body, full: css.slice(headStart, i) });
    }
    return out;
  }

  function renameSelector(selector, selPrefix, replacement) {
    // Replace every standalone occurrence of `selPrefix` with `replacement`.
    const re = new RegExp(
      selPrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "(?![A-Za-z0-9_-])",
      "g"
    );
    return selector.replace(re, replacement);
  }

  // -----------------------------------------------------------------
  //  Public surface
  // -----------------------------------------------------------------
  window.FX_EXPORT = {
    standalone,
    standaloneCss,
    toSlug,
    toFuncName,
    // Exposed for potential unit tests / debugging
    _PALETTES: PALETTES,
    _SHAPES: SHAPES,
    _PERIM_SAMPLERS: PERIM_SAMPLERS,
  };
})();
