/* ============================================================
   TRAIL-RING.JS — 50 WHOLE-PERIMETER trail effects (101–150)
   ------------------------------------------------------------
   Unlike 51–100 (single traveling head), these effects are active
   along the ENTIRE border simultaneously — every point of the
   perimeter is continuously emitting. Particles spawn at random
   perimeter positions, giving a "sparkling all around the box at
   once" feel.
   ============================================================ */
(function () {
  "use strict";
  if (!window.TRAIL) { console.warn("trail-ring.js: window.TRAIL missing"); return; }
  const { register, perim, TAU, rnd } = window.TRAIL;

  // ---------- Generic perimeter-ring factory ----------
  // cfg:
  //   count:   target live particles
  //   life:    [min,max] seconds
  //   size:    base size
  //   inset:   perimeter inset (px)
  //   gravity, drag, blend, phaseSpeed
  //   velInward|velOutward|velTangent: initial velocity
  //   spread:  random velocity jitter
  //   hue:     number | () => number  (captured at spawn)
  //   init(p): optional per-particle setup
  //   draw(ctx,p)
  function ring(cfg) {
    return function () {
      const parts = [];
      return {
        step(dt, W, H) {
          const need = cfg.count || 60;
          while (parts.length < need) parts.push(spawn(W, H));
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.x += p.vx; p.y += p.vy;
            p.vy += cfg.gravity || 0;
            const drag = cfg.drag == null ? 0.99 : cfg.drag;
            p.vx *= drag; p.vy *= drag;
            p.rot += p.vr * dt;
            p.phase += cfg.phaseSpeed || 0.1;
            p.life -= dt / p.maxLife;
            if (p.life <= 0) parts.splice(i, 1);
          }
        },
        draw(ctx) {
          ctx.globalCompositeOperation = cfg.blend || "lighter";
          for (const p of parts) cfg.draw(ctx, p);
        },
      };
      function spawn(W, H) {
        const h = perim(Math.random(), W, H, cfg.inset == null ? 2 : cfg.inset);
        const tan = { x: Math.cos(h.a), y: Math.sin(h.a) };
        const nrm = { x: -tan.y, y: tan.x }; // inward
        const p = {
          x: h.x, y: h.y, a: h.a, side: h.side,
          vx: 0, vy: 0,
          life: 1,
          maxLife: rnd((cfg.life && cfg.life[0]) || 0.8, (cfg.life && cfg.life[1]) || 1.6),
          size: (cfg.size || 2) * rnd(0.6, 1.3),
          rot: Math.random() * TAU,
          vr: rnd(-2, 2),
          phase: Math.random() * TAU,
          hue: typeof cfg.hue === "function" ? cfg.hue() : cfg.hue,
          seed: Math.random(),
        };
        if (cfg.velInward)  { p.vx += nrm.x * cfg.velInward;  p.vy += nrm.y * cfg.velInward; }
        if (cfg.velOutward) { p.vx -= nrm.x * cfg.velOutward; p.vy -= nrm.y * cfg.velOutward; }
        if (cfg.velTangent) { const s = Math.random() < 0.5 ? -1 : 1; p.vx += tan.x * cfg.velTangent * s; p.vy += tan.y * cfg.velTangent * s; }
        if (cfg.spread) { p.vx += rnd(-cfg.spread, cfg.spread); p.vy += rnd(-cfg.spread, cfg.spread); }
        if (cfg.init) cfg.init(p);
        return p;
      }
    };
  }

  // ---------- Shared draw primitives ----------
  const D = {
    glow(ctx, x, y, r, col0, col1) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col0); g.addColorStop(1, col1);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    },
    dot(ctx, x, y, r, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    },
    cross(ctx, x, y, r, col, lw) {
      ctx.strokeStyle = col; ctx.lineWidth = lw || 1;
      ctx.beginPath();
      ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
      ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    },
    star(ctx, x, y, r, col, pts) {
      pts = pts || 5;
      ctx.fillStyle = col; ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const ang = (i / (pts * 2)) * TAU - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    },
    ringStroke(ctx, x, y, r, col, lw) {
      ctx.strokeStyle = col; ctx.lineWidth = lw || 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    },
    rectRot(ctx, p, w, h, col) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    },
    flake(ctx, x, y, r, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.stroke();
      }
    },
    glyph(ctx, x, y, ch, size, col) {
      ctx.fillStyle = col;
      ctx.font = size + "px serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ch, x, y);
    },
    flame(ctx, p, r, hue, life) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
      g.addColorStop(0, `hsla(${hue + 20},100%,80%,${life})`);
      g.addColorStop(0.5, `hsla(${hue},100%,60%,${life * 0.7})`);
      g.addColorStop(1, `hsla(${hue - 20},100%,40%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();
    },
  };

  // =========================================================
  //  101 Sparkle Ring — tiny sparkles twinkle around whole edge
  // =========================================================
  register(101, ring({
    count: 70, life: [0.6, 1.2], size: 2.8, inset: 2,
    hue: () => rnd(45, 60), drag: 0.98, spread: 0.25,
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI);
      const col = `hsla(${p.hue},100%,85%,${p.life})`;
      D.glow(ctx, p.x, p.y, r * 2.2, col, `hsla(${p.hue},100%,60%,0)`);
      D.cross(ctx, p.x, p.y, r * 1.6, col, 1);
    },
  }));

  /* 102 Ember Ring */
  register(102, ring({
    count: 80, life: [0.8, 1.5], size: 2, velInward: 0.1, spread: 0.3,
    hue: () => rnd(12, 38), drag: 0.96, gravity: -0.04,
    draw(ctx, p) {
      const r = p.size * p.life * 1.4;
      D.glow(ctx, p.x, p.y, r * 2, `hsla(${p.hue},100%,70%,${p.life})`,
        `hsla(${p.hue - 10},100%,40%,0)`);
    },
  }));

  /* 103 Fire Ring — flames licking around whole border */
  register(103, ring({
    count: 90, life: [0.5, 0.9], size: 3.5, velInward: 0.08, spread: 0.4,
    gravity: -0.12, drag: 0.94, hue: () => rnd(10, 40),
    draw(ctx, p) { D.flame(ctx, p, p.size * p.life, p.hue, p.life); },
  }));

  /* 104 Electric Halo — short zaps at random edge points */
  register(104, function () {
    const arcs = [];
    return {
      step(dt, W, H) {
        if (Math.random() < 0.35) {
          const h = perim(Math.random(), W, H, 3);
          const segs = [{ x: h.x, y: h.y }];
          for (let i = 0; i < 4; i++) segs.push({ x: h.x + rnd(-8, 8), y: h.y + rnd(-8, 8) });
          arcs.push({ segs, life: 1 });
        }
        for (let i = arcs.length - 1; i >= 0; i--) { arcs[i].life -= dt * 5; if (arcs[i].life <= 0) arcs.splice(i, 1); }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "#9cf"; ctx.shadowBlur = 6;
        for (const a of arcs) {
          ctx.strokeStyle = `rgba(200,230,255,${a.life})`;
          ctx.lineWidth = 1.3;
          ctx.beginPath(); a.segs.forEach((s, i) => i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y));
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      },
    };
  });

  /* 105 Snow Curtain — snow falls inward from every edge */
  register(105, ring({
    count: 90, life: [1.4, 2.4], size: 1.8, velInward: 0.5, spread: 0.15,
    hue: 210, drag: 0.995,
    init(p) { p.sway = Math.random() * TAU; },
    draw(ctx, p) {
      p.sway += 0.04;
      const ox = Math.sin(p.sway) * 0.4;
      D.dot(ctx, p.x + ox, p.y, p.size * 0.9, `rgba(240,250,255,${p.life * 0.9})`);
    },
  }));

  /* 106 Rain Curtain — rain from every edge */
  register(106, ring({
    count: 60, life: [0.4, 0.8], size: 0, velInward: 1.8,
    hue: 210, drag: 1, blend: "lighter",
    init(p) { const tan = { x: Math.cos(p.a), y: Math.sin(p.a) }; p.len = rnd(5, 11); p.tx = tan.x; p.ty = tan.y; },
    draw(ctx, p) {
      const nx = -p.ty, ny = p.tx;
      ctx.strokeStyle = `rgba(150,210,255,${p.life})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + nx * p.len, p.y + ny * p.len);
      ctx.stroke();
    },
  }));

  /* 107 Firefly Ring — fireflies hover along the whole border */
  register(107, ring({
    count: 30, life: [2, 3.5], size: 2.5, drag: 0.9,
    hue: () => rnd(55, 85), spread: 0.15,
    init(p) { p.home = { x: p.x, y: p.y }; p.freq = rnd(0.05, 0.12); },
    draw(ctx, p) {
      p.x += (p.home.x - p.x) * 0.02 + Math.cos(p.phase * p.freq) * 0.3;
      p.y += (p.home.y - p.y) * 0.02 + Math.sin(p.phase * p.freq) * 0.3;
      const b = 0.5 + Math.sin(p.phase * 3) * 0.5;
      D.glow(ctx, p.x, p.y, 7, `hsla(${p.hue},100%,75%,${b * p.life})`,
        `hsla(${p.hue},100%,50%,0)`);
    },
  }));

  /* 108 Dust Motes */
  register(108, ring({
    count: 55, life: [2, 4], size: 1.4, spread: 0.35, drag: 0.99,
    hue: 45,
    draw(ctx, p) {
      const a = Math.sin(p.phase) * 0.5 + 0.5;
      D.dot(ctx, p.x, p.y, p.size, `hsla(45,60%,85%,${a * p.life * 0.8})`);
    },
  }));

  /* 109 Plasma Sheath */
  register(109, ring({
    count: 55, life: [0.7, 1.3], size: 5, velInward: 0.05, spread: 0.25,
    hue: () => rnd(270, 320), drag: 0.97,
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI) * 1.5;
      D.glow(ctx, p.x, p.y, r * 2, `hsla(${p.hue},100%,75%,${p.life})`,
        `hsla(${p.hue - 30},100%,50%,0)`);
    },
  }));

  /* 110 Aurora Curtain — rippling aurora hugging the border */
  register(110, ring({
    count: 50, life: [1.4, 2.2], size: 6, velInward: 0.1, spread: 0.15,
    hue: () => rnd(140, 220), drag: 0.995,
    draw(ctx, p) {
      const r = p.size * p.life * 1.3;
      const off = Math.sin(p.phase) * 2;
      D.glow(ctx, p.x + off, p.y, r * 2, `hsla(${p.hue},90%,70%,${p.life * 0.7})`,
        `hsla(${p.hue + 30},90%,60%,0)`);
    },
  }));

  /* 111 Starfield Ring */
  register(111, ring({
    count: 70, life: [1.2, 2.2], size: 1.2, drag: 1,
    hue: () => [200, 210, 45, 0][Math.floor(Math.random() * 4)],
    draw(ctx, p) {
      const tw = Math.abs(Math.sin(p.phase * 2));
      D.dot(ctx, p.x, p.y, p.size * (0.6 + tw), `hsla(${p.hue},80%,95%,${tw * p.life})`);
    },
  }));

  /* 112 Glitter Storm */
  register(112, ring({
    count: 80, life: [0.5, 1.1], size: 2.4, spread: 0.6, drag: 0.94,
    hue: () => rnd(0, 360),
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      D.cross(ctx, 0, 0, p.size * p.life * 1.5, `hsla(${p.hue},100%,75%,${p.life})`, 1.2);
      ctx.restore();
    },
  }));

  /* 113 Bubble Field */
  register(113, ring({
    count: 35, life: [1.4, 2.2], size: 5, velInward: 0.25, spread: 0.1,
    hue: () => rnd(180, 220), drag: 0.99,
    draw(ctx, p) {
      const r = p.size * (0.7 + (1 - p.life) * 0.5);
      D.ringStroke(ctx, p.x, p.y, r, `hsla(${p.hue},90%,80%,${p.life})`, 1);
      D.dot(ctx, p.x - r * 0.35, p.y - r * 0.35, r * 0.2, `hsla(${p.hue},90%,95%,${p.life * 0.7})`);
    },
  }));

  /* 114 Ripple Field — expanding rings from random perimeter points */
  register(114, function () {
    const rings = [];
    return {
      step(dt, W, H) {
        if (Math.random() < 0.6) {
          const h = perim(Math.random(), W, H, 4);
          rings.push({ x: h.x, y: h.y, r: 1, life: 1 });
        }
        for (let i = rings.length - 1; i >= 0; i--) {
          rings[i].r += dt * 30; rings[i].life -= dt * 1.1;
          if (rings[i].life <= 0) rings.splice(i, 1);
        }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (const r of rings) {
          ctx.strokeStyle = `rgba(140,220,255,${r.life * 0.7})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
        }
      },
    };
  });

  /* 115 Frost Bloom — frost crystals forming everywhere */
  register(115, ring({
    count: 28, life: [1.8, 2.8], size: 4.5, drag: 1, spread: 0, hue: 200,
    draw(ctx, p) {
      const r = p.size * Math.min(1, (1 - p.life) * 3) * 1.2;
      D.flake(ctx, p.x, p.y, r, `hsla(200,80%,92%,${p.life})`);
    },
  }));

  /* 116 Solar Flare — flares bursting OUTWARD from edges */
  register(116, ring({
    count: 40, life: [0.6, 1.1], size: 4, velOutward: 0.15, spread: 0.2,
    hue: () => rnd(30, 55), drag: 0.95,
    draw(ctx, p) { D.flame(ctx, p, p.size * p.life * 1.4, p.hue, p.life); },
  }));

  /* 117 Lightning Cage — multiple concurrent bolts on all sides */
  register(117, function () {
    const bolts = [];
    return {
      step(dt, W, H) {
        if (Math.random() < 0.5) {
          const h = perim(Math.random(), W, H, 2);
          const tan = { x: Math.cos(h.a), y: Math.sin(h.a) };
          const segs = [{ x: h.x, y: h.y }];
          const L = rnd(14, 22);
          for (let i = 1; i <= 5; i++) {
            const t = (i / 5) * L;
            segs.push({ x: h.x + tan.x * t + rnd(-3, 3), y: h.y + tan.y * t + rnd(-3, 3) });
          }
          bolts.push({ segs, life: 1 });
        }
        for (let i = bolts.length - 1; i >= 0; i--) { bolts[i].life -= dt * 6; if (bolts[i].life <= 0) bolts.splice(i, 1); }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "#bef"; ctx.shadowBlur = 8;
        for (const b of bolts) {
          ctx.strokeStyle = `rgba(220,240,255,${b.life})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath(); b.segs.forEach((s, i) => i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y));
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      },
    };
  });

  /* 118 Rune Circle — glyphs floating around border */
  register(118, ring({
    count: 24, life: [2, 3.2], size: 11, velInward: 0.03, drag: 1,
    hue: () => rnd(260, 290),
    init(p) { const g = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ"; p.ch = g[Math.floor(Math.random() * g.length)]; },
    draw(ctx, p) {
      const col = `hsla(${p.hue},90%,80%,${p.life})`;
      ctx.shadowColor = `hsl(${p.hue},100%,70%)`; ctx.shadowBlur = 8;
      D.glyph(ctx, p.x, p.y, p.ch, p.size, col);
      ctx.shadowBlur = 0;
    },
  }));

  /* 119 Petal Cyclone */
  register(119, ring({
    count: 45, life: [1.6, 2.6], size: 4, velInward: 0.3, velTangent: 0.6, spread: 0.2,
    hue: () => rnd(320, 355), gravity: 0.01, drag: 0.99,
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.phase) * 0.4);
      ctx.fillStyle = `hsla(${p.hue},80%,75%,${p.life})`;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU); ctx.fill();
      ctx.restore();
    },
  }));

  /* 120 Confetti Rain */
  register(120, ring({
    count: 70, life: [1, 1.6], size: 3.5, velInward: 0.4, gravity: 0.08, spread: 0.5,
    hue: () => rnd(0, 360), drag: 0.99, blend: "source-over",
    draw(ctx, p) {
      D.rectRot(ctx, p, p.size * 1.8, p.size * 0.7, `hsla(${p.hue},90%,60%,${p.life})`);
    },
  }));

  /* 121 Ash Field */
  register(121, ring({
    count: 55, life: [1.6, 2.8], size: 1.6, velInward: 0.08, gravity: -0.02, spread: 0.3,
    drag: 0.99, hue: 30,
    draw(ctx, p) {
      D.dot(ctx, p.x, p.y, p.size, `hsla(30,8%,70%,${p.life * 0.5})`);
    },
  }));

  /* 122 Smoke Halo */
  register(122, ring({
    count: 28, life: [1.8, 2.8], size: 7, velInward: 0.05, gravity: -0.03, spread: 0.15,
    drag: 0.99, hue: 220,
    draw(ctx, p) {
      const r = p.size * (1.3 - p.life * 0.4) * 2;
      D.glow(ctx, p.x, p.y, r, `hsla(220,10%,70%,${0.22 * p.life})`,
        "hsla(220,10%,40%,0)");
    },
  }));

  /* 123 Ion Cloud */
  register(123, ring({
    count: 75, life: [0.5, 1], size: 1.2, spread: 1.5, drag: 0.9,
    hue: () => rnd(170, 210),
    draw(ctx, p) { D.dot(ctx, p.x, p.y, p.size, `hsla(${p.hue},100%,80%,${p.life})`); },
  }));

  /* 124 Nebula Veil */
  register(124, ring({
    count: 40, life: [1.8, 2.8], size: 8, velInward: 0.05, spread: 0.1,
    hue: () => rnd(230, 320), drag: 1,
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI) * 1.6;
      D.glow(ctx, p.x, p.y, r * 2, `hsla(${p.hue},80%,65%,${p.life * 0.6})`,
        `hsla(${p.hue + 40},80%,40%,0)`);
    },
  }));

  /* 125 Meteor Shower — streaks fall inward from all edges */
  register(125, ring({
    count: 28, life: [0.5, 0.9], size: 2.5, velInward: 1.1, spread: 0.1,
    hue: () => rnd(20, 45), drag: 1,
    init(p) { const tan = { x: Math.cos(p.a), y: Math.sin(p.a) }; p.tx = tan.x; p.ty = tan.y; },
    draw(ctx, p) {
      const nx = -p.ty, ny = p.tx;
      const tailLen = 12;
      const g = ctx.createLinearGradient(p.x, p.y, p.x - nx * tailLen, p.y - ny * tailLen);
      g.addColorStop(0, `hsla(${p.hue},100%,85%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue},100%,60%,0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - nx * tailLen, p.y - ny * tailLen);
      ctx.stroke();
    },
  }));

  /* 126 Gold Shimmer */
  register(126, ring({
    count: 65, life: [0.7, 1.3], size: 2, drag: 0.98, spread: 0.3,
    hue: 45,
    draw(ctx, p) {
      const tw = Math.abs(Math.sin(p.phase * 3));
      const col = `hsla(45,100%,${70 + tw * 20}%,${tw * p.life})`;
      D.glow(ctx, p.x, p.y, p.size * 2.5, col, "hsla(45,100%,50%,0)");
    },
  }));

  /* 127 Void Specks */
  register(127, ring({
    count: 45, life: [1.2, 2], size: 2.2, spread: 0.25, drag: 0.99,
    hue: 280,
    draw(ctx, p) {
      D.dot(ctx, p.x, p.y, p.size, `rgba(20,10,30,${p.life})`);
      D.ringStroke(ctx, p.x, p.y, p.size * 1.4, `hsla(280,100%,70%,${p.life * 0.6})`, 0.8);
    },
  }));

  /* 128 Magnetic Swarm — particles orbit perimeter tangentially */
  register(128, ring({
    count: 50, life: [1.4, 2.2], size: 1.6, drag: 1, velTangent: 1.0, spread: 0.1,
    hue: () => rnd(180, 220),
    draw(ctx, p) {
      D.dot(ctx, p.x, p.y, p.size, `hsla(${p.hue},100%,80%,${p.life})`);
    },
  }));

  /* 129 Holy Radiance */
  register(129, ring({
    count: 55, life: [1.2, 1.8], size: 3, velOutward: 0.08, velInward: 0, spread: 0.1,
    hue: 50, drag: 0.99,
    draw(ctx, p) {
      const r = p.size * p.life * 2.2;
      D.glow(ctx, p.x, p.y, r, `hsla(50,100%,90%,${p.life})`,
        "hsla(40,100%,60%,0)");
    },
  }));

  /* 130 Acid Mist */
  register(130, ring({
    count: 35, life: [1.6, 2.6], size: 6, velInward: 0.1, spread: 0.1, drag: 0.99,
    hue: () => rnd(90, 130),
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI) * 1.5;
      D.glow(ctx, p.x, p.y, r * 2, `hsla(${p.hue},90%,55%,${p.life * 0.5})`,
        `hsla(${p.hue},90%,30%,0)`);
    },
  }));

  /* 131 Blood Mist */
  register(131, ring({
    count: 35, life: [1.6, 2.6], size: 6, velInward: 0.1, spread: 0.1, drag: 0.99,
    hue: () => rnd(350, 10),
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI) * 1.5;
      D.glow(ctx, p.x, p.y, r * 2, `hsla(${p.hue},90%,45%,${p.life * 0.6})`,
        `hsla(${p.hue},90%,25%,0)`);
    },
  }));

  /* 132 Chromatic Storm — RGB triplets */
  register(132, ring({
    count: 60, life: [0.5, 0.9], size: 2.2, spread: 1, drag: 0.93,
    hue: () => [0, 180, 280][Math.floor(Math.random() * 3)],
    draw(ctx, p) {
      D.glow(ctx, p.x + 1, p.y, p.size * p.life * 1.6, `hsla(0,100%,70%,${p.life * 0.6})`, "hsla(0,100%,50%,0)");
      D.glow(ctx, p.x - 1, p.y, p.size * p.life * 1.6, `hsla(200,100%,70%,${p.life * 0.6})`, "hsla(200,100%,50%,0)");
      D.glow(ctx, p.x, p.y, p.size * p.life, `hsla(${p.hue},100%,85%,${p.life})`, "hsla(0,0%,0%,0)");
    },
  }));

  /* 133 Pixel Storm */
  register(133, ring({
    count: 70, life: [0.5, 1], size: 3, drag: 0.96, spread: 0.4,
    hue: () => [120, 300, 180, 45, 200][Math.floor(Math.random() * 5)],
    blend: "source-over",
    draw(ctx, p) {
      const s = Math.ceil(p.size * p.life);
      ctx.fillStyle = `hsla(${p.hue},100%,60%,${p.life})`;
      ctx.fillRect(Math.round(p.x) - s, Math.round(p.y) - s, s * 2, s * 2);
    },
  }));

  /* 134 Neon Rain */
  register(134, ring({
    count: 40, life: [0.5, 0.9], size: 0, velInward: 1.4,
    hue: () => [320, 190, 60, 280][Math.floor(Math.random() * 4)], drag: 1,
    init(p) { const tan = { x: Math.cos(p.a), y: Math.sin(p.a) }; p.tx = tan.x; p.ty = tan.y; p.len = rnd(6, 11); },
    draw(ctx, p) {
      const nx = -p.ty, ny = p.tx;
      const col = `hsla(${p.hue},100%,70%,${p.life})`;
      ctx.shadowColor = `hsl(${p.hue},100%,60%)`; ctx.shadowBlur = 6;
      ctx.strokeStyle = col; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + nx * p.len, p.y + ny * p.len); ctx.stroke();
      ctx.shadowBlur = 0;
    },
  }));

  /* 135 Star Cyclone — stars drifting tangentially with spin */
  register(135, ring({
    count: 30, life: [1.2, 2], size: 3, velTangent: 0.5, spread: 0.15, drag: 0.99,
    hue: () => rnd(45, 60),
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      D.star(ctx, 0, 0, p.size * p.life, `hsla(${p.hue},100%,80%,${p.life})`, 5);
      ctx.restore();
    },
  }));

  /* 136 Cosmic Dust */
  register(136, ring({
    count: 90, life: [1.4, 2.2], size: 1.1, spread: 0.35, drag: 0.99,
    hue: () => rnd(200, 320),
    draw(ctx, p) {
      D.dot(ctx, p.x, p.y, p.size, `hsla(${p.hue},80%,80%,${p.life * 0.8})`);
    },
  }));

  /* 137 Paint Drip — colorful drops at every edge */
  register(137, ring({
    count: 28, life: [1.5, 2.2], size: 3.5, gravity: 0.04, velInward: 0.15, spread: 0.05,
    hue: () => rnd(0, 360), drag: 0.99, blend: "source-over",
    draw(ctx, p) {
      const r = p.size * p.life;
      ctx.fillStyle = `hsla(${p.hue},85%,55%,${p.life})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.65, r, 0, 0, TAU); ctx.fill();
    },
  }));

  /* 138 Honey Drip */
  register(138, ring({
    count: 22, life: [1.8, 2.6], size: 4, gravity: 0.05, velInward: 0.1, drag: 0.99, hue: 40,
    draw(ctx, p) {
      const r = p.size * p.life;
      const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(255,230,140,${p.life})`);
      g.addColorStop(1, `rgba(200,140,40,${p.life})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.7, r, 0, 0, TAU); ctx.fill();
    },
  }));

  /* 139 Venom Cloud — green fog w/ sporadic bubbles */
  register(139, ring({
    count: 40, life: [1.4, 2.4], size: 5, velInward: 0.08, spread: 0.1, drag: 0.99,
    hue: () => rnd(90, 130),
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI) * 1.4;
      D.glow(ctx, p.x, p.y, r * 2, `hsla(${p.hue},90%,55%,${p.life * 0.6})`,
        `hsla(${p.hue},90%,30%,0)`);
      if (p.seed < 0.2) D.ringStroke(ctx, p.x, p.y, r * 0.5,
        `hsla(${p.hue},100%,85%,${p.life * 0.7})`, 0.6);
    },
  }));

  /* 140 Arctic Breeze */
  register(140, ring({
    count: 50, life: [1.4, 2.2], size: 1.2, velInward: 0.25, velTangent: 0.4,
    spread: 0.15, hue: 195, drag: 0.99,
    draw(ctx, p) {
      D.dot(ctx, p.x, p.y, p.size, `hsla(195,90%,92%,${p.life * 0.9})`);
    },
  }));

  /* 141 Sand Storm */
  register(141, ring({
    count: 85, life: [0.8, 1.4], size: 1.2, velInward: 0.2, velTangent: 1.2,
    spread: 0.4, hue: () => rnd(30, 45), drag: 0.96,
    draw(ctx, p) {
      D.dot(ctx, p.x, p.y, p.size, `hsla(${p.hue},60%,65%,${p.life * 0.85})`);
    },
  }));

  /* 142 Spark Curtain — sparks cascade inward */
  register(142, ring({
    count: 60, life: [0.5, 0.9], size: 1.2, velInward: 0.6, gravity: 0.05, spread: 0.3,
    hue: () => rnd(40, 55), drag: 0.95,
    draw(ctx, p) {
      D.glow(ctx, p.x, p.y, p.size * 3, `hsla(${p.hue},100%,85%,${p.life})`,
        `hsla(${p.hue - 10},100%,55%,0)`);
    },
  }));

  /* 143 Lantern Glow */
  register(143, ring({
    count: 18, life: [2.5, 4], size: 4, drag: 1, spread: 0.05, velInward: 0.03,
    hue: () => rnd(25, 45),
    draw(ctx, p) {
      const b = 0.75 + Math.sin(p.phase) * 0.25;
      D.glow(ctx, p.x, p.y, p.size * 3, `hsla(${p.hue},100%,75%,${b * p.life})`,
        `hsla(${p.hue - 10},100%,40%,0)`);
    },
  }));

  /* 144 Ghost Veil */
  register(144, ring({
    count: 30, life: [1.6, 2.6], size: 6, velInward: 0.1, spread: 0.08, drag: 1,
    hue: 180,
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI) * 1.6;
      D.glow(ctx, p.x + Math.sin(p.phase) * 3, p.y, r * 2,
        `hsla(180,40%,85%,${p.life * 0.5})`, "hsla(180,40%,50%,0)");
    },
  }));

  /* 145 Rainbow Mist */
  register(145, ring({
    count: 45, life: [1.4, 2.2], size: 5, velInward: 0.08, spread: 0.1, drag: 1,
    hue: () => rnd(0, 360),
    draw(ctx, p) {
      const r = p.size * Math.sin(p.life * Math.PI) * 1.5;
      D.glow(ctx, p.x, p.y, r * 2, `hsla(${p.hue},100%,75%,${p.life * 0.7})`,
        `hsla(${p.hue},100%,50%,0)`);
    },
  }));

  /* 146 Heart Storm */
  register(146, ring({
    count: 22, life: [1.4, 2.2], size: 10, velInward: 0.1, gravity: -0.04,
    hue: () => rnd(330, 355), drag: 0.99, blend: "lighter",
    draw(ctx, p) {
      D.glyph(ctx, p.x, p.y, "♥", p.size,
        `hsla(${p.hue},90%,65%,${p.life})`);
    },
  }));

  /* 147 Feather Rain */
  register(147, ring({
    count: 22, life: [2, 3], size: 8, velInward: 0.25, gravity: 0.02, spread: 0.08,
    hue: 210, drag: 0.995, blend: "source-over",
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.phase) * 0.3);
      ctx.strokeStyle = `hsla(210,20%,90%,${p.life * 0.9})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size); ctx.stroke();
      for (let i = -p.size + 1; i < p.size; i += 1.6) {
        const len = p.size - Math.abs(i);
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(len * 0.9, i - 1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(-len * 0.9, i - 1); ctx.stroke();
      }
      ctx.restore();
    },
  }));

  /* 148 Leaf Vortex */
  register(148, ring({
    count: 30, life: [1.8, 2.8], size: 5, velInward: 0.2, velTangent: 0.8,
    spread: 0.15, gravity: 0.01, hue: () => rnd(80, 140), drag: 0.99, blend: "source-over",
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.phase) * 0.4);
      ctx.fillStyle = `hsla(${p.hue},70%,45%,${p.life})`;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, TAU); ctx.fill();
      ctx.restore();
    },
  }));

  /* 149 Diamond Rain */
  register(149, ring({
    count: 35, life: [0.9, 1.5], size: 3.5, velInward: 0.6, gravity: 0.08, spread: 0.15,
    hue: 195, drag: 1,
    init(p) { p.spin = rnd(-4, 4); },
    draw(ctx, p) {
      p.rot += p.spin * 0.02;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const r = p.size * p.life;
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, `rgba(255,255,255,${p.life})`);
      g.addColorStop(0.5, `rgba(180,220,255,${p.life})`);
      g.addColorStop(1, `rgba(110,170,230,${p.life})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${p.life})`;
      ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    },
  }));

  /* 150 Dragon Scales — shimmering scales pulsing around the border */
  register(150, ring({
    count: 45, life: [1.6, 2.4], size: 5, velInward: 0, velOutward: 0, drag: 1,
    hue: () => rnd(140, 200),
    init(p) { p.scale = Math.random() < 0.5 ? 1 : -1; },
    draw(ctx, p) {
      const tw = 0.5 + Math.sin(p.phase * 2) * 0.5;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2);
      const r = p.size;
      const g = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
      g.addColorStop(0, `hsla(${p.hue},90%,${70 + tw * 20}%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue + 30},90%,40%,${p.life * 0.6})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `hsla(${p.hue},80%,85%,${p.life * tw})`;
      ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    },
  }));

})();
