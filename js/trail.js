/* ============================================================
   TRAIL.JS — 50 mouse-trail-inspired border effects (51–100)
   ------------------------------------------------------------
   Each effect is a factory: (canvas) -> { step(dt, W, H), draw(ctx, W, H) }
   A shared rAF loop drives all active canvases; an IntersectionObserver
   pauses effects that are off-screen so the page stays smooth with all
   50 animating simultaneously.
   ============================================================ */
(function () {
  "use strict";

  // ---------- Perimeter helpers ----------
  function perim(t, W, H, inset) {
    inset = inset || 2;
    const w = W - inset * 2, h = H - inset * 2;
    const P = (w + h) * 2;
    let d = ((t % 1) + 1) % 1 * P;
    if (d < w) return { x: inset + d,         y: inset,         a: 0,         side: 0 };
    d -= w;
    if (d < h) return { x: inset + w,         y: inset + d,     a: Math.PI/2, side: 1 };
    d -= h;
    if (d < w) return { x: inset + w - d,     y: inset + h,     a: Math.PI,   side: 2 };
    d -= w;
    return     { x: inset,             y: inset + h - d, a: -Math.PI/2,side: 3 };
  }
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- Shared particle "head trail" factory ----------
  // cfg: { speed, rate, size, decay, drag, gravity, blend,
  //        hue (fn|num), jitter, spread, drawPart(ctx,p), drawHead?(ctx,h) }
  function headTrail(cfg) {
    return function () {
      const parts = [];
      let t = Math.random();
      let head = { x: 0, y: 0, a: 0 };
      return {
        step(dt, W, H) {
          t = (t + (cfg.speed || 0.25) * dt) % 1;
          head = perim(t, W, H, cfg.inset || 3);
          const rate = (cfg.rate || 40) * dt;
          let emit = Math.floor(rate) + (Math.random() < (rate % 1) ? 1 : 0);
          const tan = { x: Math.cos(head.a), y: Math.sin(head.a) };
          const nrm = { x: -tan.y, y: tan.x }; // outward normal is -nrm for inside-facing; we'll just use nrm toward center
          // Perimeter walks clockwise: tangent points along motion, normal (nrm) points toward inside
          for (let i = 0; i < emit; i++) {
            const jit = cfg.jitter || 2;
            const p = {
              x: head.x + (Math.random() - 0.5) * jit,
              y: head.y + (Math.random() - 0.5) * jit,
              vx: 0, vy: 0,
              life: 1, maxLife: rnd(cfg.life?.[0] ?? 0.7, cfg.life?.[1] ?? 1.2),
              size: (cfg.size || 2) * rnd(0.6, 1.2),
              rot: Math.random() * TAU,
              vr: rnd(-4, 4),
              hue: typeof cfg.hue === "function" ? cfg.hue() : cfg.hue,
              seed: Math.random(),
            };
            if (cfg.velTangent) { p.vx += tan.x * cfg.velTangent; p.vy += tan.y * cfg.velTangent; }
            if (cfg.velNormal)  { p.vx += nrm.x * cfg.velNormal;  p.vy += nrm.y * cfg.velNormal; }
            if (cfg.spread)     { p.vx += rnd(-cfg.spread, cfg.spread); p.vy += rnd(-cfg.spread, cfg.spread); }
            if (cfg.initPart) cfg.initPart(p, head);
            parts.push(p);
          }
          const drag = cfg.drag ?? 0.98;
          const g = cfg.gravity || 0;
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.x += p.vx; p.y += p.vy;
            p.vy += g; p.vx *= drag; p.vy *= drag;
            p.rot += p.vr * dt;
            p.life -= dt / p.maxLife;
            if (p.life <= 0) parts.splice(i, 1);
          }
        },
        draw(ctx) {
          ctx.globalCompositeOperation = cfg.blend || "lighter";
          for (const p of parts) cfg.drawPart(ctx, p);
          if (cfg.drawHead) { ctx.globalCompositeOperation = "lighter"; cfg.drawHead(ctx, head); }
        },
      };
    };
  }

  // ---------- Ambient perimeter field (snow, rain, fireflies) ----------
  function ambient(cfg) {
    return function () {
      const parts = [];
      return {
        step(dt, W, H) {
          const need = cfg.count || 40;
          while (parts.length < need) parts.push(cfg.spawn(W, H));
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            cfg.update(p, dt, W, H);
            if (p.dead) parts.splice(i, 1);
          }
        },
        draw(ctx, W, H) {
          ctx.globalCompositeOperation = cfg.blend || "lighter";
          for (const p of parts) cfg.draw(ctx, p, W, H);
        },
      };
    };
  }

  // ====================================================================
  //  EFFECT REGISTRY  (51 .. 100)
  // ====================================================================
  const E = {};

  /* 51 Comet Tail */
  E[51] = headTrail({
    speed: 0.28, rate: 80, size: 2.4, life: [0.5, 1.0], drag: 0.96,
    hue: () => rnd(190, 220),
    drawPart(ctx, p) {
      const r = p.size * p.life * 1.8;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      g.addColorStop(0, `hsla(${p.hue},100%,85%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue},100%,55%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, TAU); ctx.fill();
    },
    drawHead(ctx, h) {
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 10);
      g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(180,230,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 10, 0, TAU); ctx.fill();
    },
  });

  /* 52 Ribbon Trail — silk ribbon perimeter */
  E[52] = function () {
    const points = []; let t = Math.random();
    return {
      step(dt, W, H) {
        t = (t + 0.25 * dt) % 1;
        const h = perim(t, W, H, 4);
        points.push({ x: h.x, y: h.y });
        if (points.length > 60) points.shift();
      },
      draw(ctx) {
        if (points.length < 2) return;
        ctx.globalCompositeOperation = "lighter";
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i];
          const f = i / points.length;
          ctx.strokeStyle = `hsla(${300 + f * 80},100%,70%,${f})`;
          ctx.lineWidth = 1 + f * 6;
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      },
    };
  };

  /* 53 Sparkle Dust */
  E[53] = headTrail({
    speed: 0.22, rate: 35, size: 2, life: [0.5, 1.1], drag: 0.92, spread: 0.6,
    hue: () => rnd(40, 60),
    drawPart(ctx, p) {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const r = p.size * p.life * 2;
      ctx.strokeStyle = `hsla(${p.hue},100%,85%,${p.life})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
      ctx.moveTo(0, -r); ctx.lineTo(0, r);
      ctx.stroke();
      ctx.restore();
    },
  });

  /* 54 Fairy Dust */
  E[54] = headTrail({
    speed: 0.2, rate: 50, size: 1.6, life: [0.7, 1.4], drag: 0.95, gravity: 0.05,
    spread: 0.4, hue: () => rnd(50, 80),
    drawPart(ctx, p) {
      const r = p.size * p.life * 2.2;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `hsla(${p.hue},100%,85%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue},100%,60%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    },
  });

  /* 55 Ink Blot */
  E[55] = headTrail({
    speed: 0.12, rate: 14, size: 5, life: [1.2, 2.2], drag: 1, blend: "source-over",
    hue: 0,
    drawPart(ctx, p) {
      const r = p.size * (1.2 - p.life) * 3 + 2;
      ctx.fillStyle = `rgba(10,8,14,${Math.min(1, p.life * 1.2)})`;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU, rr = r * (0.7 + Math.sin(p.seed * 10 + i) * 0.3);
        const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    },
  });

  /* 56 Fire Trail */
  E[56] = headTrail({
    speed: 0.3, rate: 90, size: 3, life: [0.4, 0.9], drag: 0.93, gravity: -0.15,
    spread: 0.6, hue: () => rnd(10, 45),
    drawPart(ctx, p) {
      const r = p.size * p.life * 2;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
      g.addColorStop(0, `hsla(${p.hue},100%,70%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue - 20},100%,40%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.2, 0, TAU); ctx.fill();
    },
  });

  /* 57 Smoke Puff */
  E[57] = headTrail({
    speed: 0.18, rate: 20, size: 6, life: [1.5, 2.5], drag: 0.98, gravity: -0.05,
    spread: 0.3, hue: 220, blend: "lighter",
    drawPart(ctx, p) {
      const r = p.size * (1.4 - p.life) * 4 + 4;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `hsla(${p.hue},10%,70%,${0.25 * p.life})`);
      g.addColorStop(1, "hsla(220,10%,40%,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    },
  });

  /* 58 Bubble Pop */
  E[58] = headTrail({
    speed: 0.22, rate: 16, size: 5, life: [1.2, 1.8], drag: 0.99, gravity: -0.08,
    spread: 0.2, hue: () => rnd(180, 220),
    drawPart(ctx, p) {
      const r = p.size * (1.3 - p.life * 0.5) * 1.6;
      ctx.strokeStyle = `hsla(${p.hue},90%,80%,${p.life})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = `hsla(${p.hue},90%,90%,${p.life * 0.7})`;
      ctx.beginPath(); ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.25, 0, TAU); ctx.fill();
    },
  });

  /* 59 Confetti Burst */
  E[59] = headTrail({
    speed: 0.28, rate: 40, size: 4, life: [0.8, 1.4], drag: 0.97, gravity: 0.12,
    spread: 2, hue: () => rnd(0, 360),
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = `hsla(${p.hue},90%,60%,${p.life})`;
      ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
      ctx.restore();
    },
  });

  /* 60 Snow Flurry */
  E[60] = ambient({
    count: 50,
    spawn: (W, H) => {
      const t = Math.random();
      const p = perim(t, W, H, 2);
      return { x: p.x, y: p.y, vx: rnd(-0.3, 0.3), vy: rnd(0.2, 0.8), r: rnd(1, 2.2), phase: Math.random() * TAU, life: rnd(80, 200) };
    },
    update(p, dt, W, H) {
      p.x += p.vx + Math.sin(p.phase) * 0.3; p.y += p.vy;
      p.phase += 0.05;
      p.life--;
      if (p.life <= 0 || p.x < -4 || p.x > W + 4 || p.y > H + 4) p.dead = true;
    },
    draw(ctx, p) {
      ctx.fillStyle = `rgba(230,245,255,0.85)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    },
  });

  /* 61 Rain Drop */
  E[61] = ambient({
    count: 35,
    spawn: (W, H) => {
      const t = Math.random();
      const p = perim(t, W, H, 1);
      return { x: p.x, y: p.y, side: p.side, vx: 0, vy: 0, len: rnd(6, 14), life: 1 };
    },
    update(p, dt) {
      const s = p.side;
      if (s === 0)      p.y += 3;
      else if (s === 1) p.x -= 3;
      else if (s === 2) p.y -= 3;
      else              p.x += 3;
      p.life -= dt * 1.5;
      if (p.life <= 0) p.dead = true;
    },
    draw(ctx, p) {
      ctx.strokeStyle = `rgba(130,200,255,${p.life})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let dx = 0, dy = 0;
      if (p.side === 0) dy = -p.len; else if (p.side === 1) dx = p.len;
      else if (p.side === 2) dy = p.len; else dx = -p.len;
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + dx, p.y + dy); ctx.stroke();
    },
  });

  /* 62 Lightning Trail — zigzag bolts trail */
  E[62] = function () {
    let t = Math.random(), bolts = [];
    return {
      step(dt, W, H) {
        t = (t + 0.35 * dt) % 1;
        const h = perim(t, W, H, 3);
        if (Math.random() < 0.5) {
          const segs = [{ x: h.x, y: h.y }];
          for (let i = 0; i < 5; i++) segs.push({ x: h.x + rnd(-6, 6), y: h.y + rnd(-6, 6) });
          bolts.push({ segs, life: 1 });
        }
        for (let i = bolts.length - 1; i >= 0; i--) {
          bolts[i].life -= dt * 4;
          if (bolts[i].life <= 0) bolts.splice(i, 1);
        }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (const b of bolts) {
          ctx.strokeStyle = `rgba(180,230,255,${b.life})`;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#9ad6ff"; ctx.shadowBlur = 8;
          ctx.beginPath();
          b.segs.forEach((s, i) => i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y));
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      },
    };
  };

  /* 63 Neon Streak */
  E[63] = function () {
    const pts = []; let t = Math.random();
    return {
      step(dt, W, H) {
        t = (t + 0.33 * dt) % 1;
        const h = perim(t, W, H, 3);
        pts.push({ x: h.x, y: h.y, life: 1 });
        for (let i = pts.length - 1; i >= 0; i--) { pts[i].life -= dt * 1.1; if (pts[i].life <= 0) pts.splice(i, 1); }
        if (pts.length > 80) pts.length = 80;
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (let w = 10; w >= 2; w -= 4) {
          ctx.lineWidth = w; ctx.strokeStyle = `rgba(255,60,200,${0.12 + (6 - w) * 0.04})`;
          ctx.beginPath();
          pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.stroke();
        }
        ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(255,255,255,1)";
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      },
    };
  };

  /* 64 Rainbow Trail */
  E[64] = function () {
    const pts = []; let t = Math.random(), hueBase = 0;
    return {
      step(dt, W, H) {
        t = (t + 0.3 * dt) % 1; hueBase = (hueBase + dt * 60) % 360;
        const h = perim(t, W, H, 3);
        pts.push({ x: h.x, y: h.y, hue: hueBase });
        if (pts.length > 70) pts.shift();
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = 4; ctx.lineCap = "round";
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], f = i / pts.length;
          ctx.strokeStyle = `hsla(${b.hue},100%,60%,${f})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      },
    };
  };

  /* 65 Paint Splatter */
  E[65] = headTrail({
    speed: 0.18, rate: 8, size: 6, life: [2, 3.5], drag: 1, blend: "source-over",
    hue: () => rnd(0, 360),
    drawPart(ctx, p) {
      ctx.fillStyle = `hsla(${p.hue},80%,55%,${p.life * 0.8})`;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + p.seed * 10, d = p.size * (0.6 + Math.sin(i + p.seed) * 0.4);
        ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, p.size * (0.4 + Math.random() * 0.4), 0, TAU); ctx.fill();
      }
    },
  });

  /* 66 Pixel Trail */
  E[66] = headTrail({
    speed: 0.22, rate: 30, size: 3, life: [0.6, 1.1], drag: 0.96,
    hue: () => [120, 180, 300, 45][Math.floor(Math.random() * 4)],
    blend: "source-over",
    drawPart(ctx, p) {
      const s = Math.ceil(p.size * p.life);
      ctx.fillStyle = `hsla(${p.hue},100%,60%,${p.life})`;
      ctx.fillRect(Math.round(p.x / 2) * 2 - s, Math.round(p.y / 2) * 2 - s, s * 2, s * 2);
    },
  });

  /* 67 Star Shower */
  E[67] = headTrail({
    speed: 0.26, rate: 22, size: 4, life: [0.8, 1.4], drag: 0.97, gravity: 0.08,
    spread: 1.5, hue: () => rnd(45, 60),
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = `hsla(${p.hue},100%,75%,${p.life})`;
      const r = p.size * p.life;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  });

  /* 68 Heart Trail */
  E[68] = headTrail({
    speed: 0.22, rate: 14, size: 10, life: [1, 1.6], drag: 0.97, gravity: -0.08,
    spread: 0.3, hue: () => rnd(330, 355),
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = `hsla(${p.hue},90%,65%,${p.life})`;
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("♥", 0, 0);
      ctx.restore();
    },
  });

  /* 69 Water Ripple */
  E[69] = function () {
    const rings = []; let t = Math.random(), acc = 0;
    return {
      step(dt, W, H) {
        t = (t + 0.22 * dt) % 1; acc += dt;
        if (acc > 0.12) { acc = 0; const h = perim(t, W, H, 4); rings.push({ x: h.x, y: h.y, r: 1, life: 1 }); }
        for (let i = rings.length - 1; i >= 0; i--) {
          rings[i].r += dt * 20; rings[i].life -= dt * 1.2;
          if (rings[i].life <= 0) rings.splice(i, 1);
        }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (const r of rings) {
          ctx.strokeStyle = `rgba(140,220,255,${r.life * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
        }
      },
    };
  };

  /* 70 Firefly Swarm */
  E[70] = ambient({
    count: 22,
    spawn: (W, H) => {
      const p = perim(Math.random(), W, H, 3);
      return { tx: p.x, ty: p.y, x: p.x + rnd(-8, 8), y: p.y + rnd(-8, 8), vx: 0, vy: 0, phase: Math.random() * TAU, t: Math.random() };
    },
    update(p, dt, W, H) {
      p.t = (p.t + dt * 0.05) % 1;
      const tgt = perim(p.t, W, H, 3);
      p.vx += (tgt.x - p.x) * 0.02; p.vy += (tgt.y - p.y) * 0.02;
      p.vx *= 0.9; p.vy *= 0.9;
      p.x += p.vx; p.y += p.vy; p.phase += 0.1;
    },
    draw(ctx, p) {
      const b = 0.6 + Math.sin(p.phase) * 0.4;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
      g.addColorStop(0, `rgba(240,255,140,${b})`); g.addColorStop(1, "rgba(200,255,80,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
    },
  });

  /* 71 Electric Sparks */
  E[71] = headTrail({
    speed: 0.4, rate: 70, size: 2, life: [0.2, 0.5], drag: 0.86, spread: 3,
    hue: () => rnd(180, 210),
    drawPart(ctx, p) {
      ctx.strokeStyle = `hsla(${p.hue},100%,80%,${p.life})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + rnd(-4, 4), p.y + rnd(-4, 4));
      ctx.stroke();
    },
  });

  /* 72 Gravity Orbit */
  E[72] = headTrail({
    speed: 0.28, rate: 60, size: 1.8, life: [0.8, 1.3], drag: 1, spread: 0,
    hue: () => rnd(260, 300),
    initPart(p, h) {
      const a = Math.random() * TAU, r = rnd(2, 6);
      p.orbitA = a; p.orbitR = r; p.orbitW = rnd(3, 8); p.cx = h.x; p.cy = h.y;
    },
    drawPart(ctx, p) {
      p.orbitA += p.orbitW * 0.016;
      p.orbitR *= 0.985;
      const x = p.cx + Math.cos(p.orbitA) * p.orbitR;
      const y = p.cy + Math.sin(p.orbitA) * p.orbitR;
      ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life})`;
      ctx.beginPath(); ctx.arc(x, y, p.size * p.life, 0, TAU); ctx.fill();
    },
  });

  /* 73 Magnetic Pull */
  E[73] = function () {
    const parts = []; let t = Math.random();
    return {
      step(dt, W, H) {
        t = (t + 0.2 * dt) % 1;
        const h = perim(t, W, H, 4);
        if (parts.length < 40 && Math.random() < 0.5)
          parts.push({ x: rnd(0, W), y: rnd(0, H), life: 1 });
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          const dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy) || 1;
          p.x += dx / d * 1.8; p.y += dy / d * 1.8;
          p.life -= dt * 0.6;
          if (d < 4 || p.life <= 0) parts.splice(i, 1);
        }
        this._h = h;
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (const p of parts) {
          ctx.strokeStyle = `rgba(120,220,255,${p.life * 0.4})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(this._h.x, this._h.y); ctx.stroke();
          ctx.fillStyle = `rgba(180,240,255,${p.life})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, TAU); ctx.fill();
        }
      },
    };
  };

  /* 74 Lasso Rope — smooth bezier-like trail */
  E[74] = function () {
    const pts = []; let t = Math.random();
    return {
      step(dt, W, H) {
        t = (t + 0.26 * dt) % 1;
        const h = perim(t, W, H, 4);
        pts.push({ x: h.x, y: h.y });
        if (pts.length > 40) pts.shift();
      },
      draw(ctx) {
        if (pts.length < 3) return;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(200,160,90,0.9)";
        ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const cx = (pts[i].x + pts[i + 1].x) / 2, cy = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, cx, cy);
        }
        ctx.stroke();
      },
    };
  };

  /* 75 Chain Link */
  E[75] = function () {
    const links = []; let t = Math.random(), acc = 0;
    return {
      step(dt, W, H) {
        t = (t + 0.22 * dt) % 1; acc += dt;
        if (acc > 0.05) { acc = 0; const h = perim(t, W, H, 4); links.push({ x: h.x, y: h.y, a: h.a, life: 1 }); }
        for (let i = links.length - 1; i >= 0; i--) { links[i].life -= dt * 0.6; if (links[i].life <= 0) links.splice(i, 1); }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < links.length; i++) {
          const l = links[i];
          ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.a + (i % 2 ? Math.PI / 2 : 0));
          ctx.strokeStyle = `rgba(210,220,240,${l.life})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, TAU); ctx.stroke();
          ctx.restore();
        }
      },
    };
  };

  /* 76 Chrono Blur — motion blur ghosts */
  E[76] = headTrail({
    speed: 0.35, rate: 30, size: 4, life: [0.3, 0.6], drag: 1,
    hue: () => 200,
    drawPart(ctx, p) {
      ctx.fillStyle = `rgba(150,200,255,${p.life * 0.5})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life * 1.2, 0, TAU); ctx.fill();
    },
    drawHead(ctx, h) {
      ctx.fillStyle = "#e4f3ff";
      ctx.beginPath(); ctx.arc(h.x, h.y, 3, 0, TAU); ctx.fill();
    },
  });

  /* 77 Ghost Echo */
  E[77] = headTrail({
    speed: 0.2, rate: 8, size: 10, life: [1.2, 2], drag: 1, blend: "lighter",
    hue: 270,
    drawPart(ctx, p) {
      ctx.strokeStyle = `hsla(270,80%,80%,${p.life * 0.4})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    },
  });

  /* 78 Portal Wake */
  E[78] = headTrail({
    speed: 0.24, rate: 60, size: 2.5, life: [0.8, 1.4], drag: 0.97, spread: 0.8,
    hue: () => rnd(270, 310),
    initPart(p) { p.orbA = Math.random() * TAU; p.orbR = rnd(1, 5); p.orbW = rnd(-6, 6); },
    drawPart(ctx, p) {
      p.orbA += p.orbW * 0.02;
      const x = p.x + Math.cos(p.orbA) * p.orbR * (1 - p.life);
      const y = p.y + Math.sin(p.orbA) * p.orbR * (1 - p.life);
      const r = p.size * p.life * 1.5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      g.addColorStop(0, `hsla(${p.hue},100%,80%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
    },
  });

  /* 79 Sword Slash — arc streaks */
  E[79] = function () {
    const slashes = []; let t = Math.random(), acc = 0;
    return {
      step(dt, W, H) {
        t = (t + 0.35 * dt) % 1; acc += dt;
        if (acc > 0.25) { acc = 0; const h = perim(t, W, H, 4); slashes.push({ x: h.x, y: h.y, a: h.a, len: rnd(18, 30), life: 1 }); }
        for (let i = slashes.length - 1; i >= 0; i--) { slashes[i].life -= dt * 2.5; if (slashes[i].life <= 0) slashes.splice(i, 1); }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (const s of slashes) {
          const grd = ctx.createLinearGradient(
            s.x - Math.cos(s.a) * s.len / 2, s.y - Math.sin(s.a) * s.len / 2,
            s.x + Math.cos(s.a) * s.len / 2, s.y + Math.sin(s.a) * s.len / 2);
          grd.addColorStop(0, "rgba(255,255,255,0)");
          grd.addColorStop(0.5, `rgba(255,240,200,${s.life})`);
          grd.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = grd; ctx.lineWidth = 2.2 * s.life + 0.4; ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(s.x - Math.cos(s.a) * s.len / 2, s.y - Math.sin(s.a) * s.len / 2);
          ctx.lineTo(s.x + Math.cos(s.a) * s.len / 2, s.y + Math.sin(s.a) * s.len / 2);
          ctx.stroke();
        }
      },
    };
  };

  /* 80 Bullet Tracer */
  E[80] = function () {
    let t = Math.random(); const trail = [];
    return {
      step(dt, W, H) {
        t = (t + 0.55 * dt) % 1;
        const h = perim(t, W, H, 3);
        trail.push({ x: h.x, y: h.y, life: 1 });
        for (let i = trail.length - 1; i >= 0; i--) { trail[i].life -= dt * 3; if (trail[i].life <= 0) trail.splice(i, 1); }
        this._h = h;
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1], b = trail[i];
          ctx.strokeStyle = `rgba(255,220,140,${b.life})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        if (this._h) {
          const g = ctx.createRadialGradient(this._h.x, this._h.y, 0, this._h.x, this._h.y, 6);
          g.addColorStop(0, "#fff8c0"); g.addColorStop(1, "rgba(255,200,80,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this._h.x, this._h.y, 6, 0, TAU); ctx.fill();
        }
      },
    };
  };

  /* 81 Crystal Shard Burst */
  E[81] = headTrail({
    speed: 0.24, rate: 18, size: 5, life: [0.8, 1.3], drag: 0.96, spread: 1.2,
    hue: () => rnd(180, 220),
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = `hsla(${p.hue},80%,80%,${p.life})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.5, 0);
      ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.5, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  });

  /* 82 Leaf Flutter */
  E[82] = headTrail({
    speed: 0.18, rate: 10, size: 5, life: [1.4, 2.2], drag: 0.98, gravity: 0.05,
    spread: 0.6, hue: () => rnd(80, 140), blend: "source-over",
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.life * 4) * 0.4);
      ctx.fillStyle = `hsla(${p.hue},70%,45%,${p.life})`;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    },
  });

  /* 83 Feather Drift */
  E[83] = headTrail({
    speed: 0.14, rate: 8, size: 7, life: [2, 3.2], drag: 0.99, gravity: 0.02,
    spread: 0.2, hue: 210, blend: "source-over",
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.life * 2) * 0.3);
      ctx.strokeStyle = `hsla(${p.hue},20%,85%,${p.life * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size); ctx.stroke();
      for (let i = -p.size + 1; i < p.size; i += 1.5) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(Math.abs(i) < p.size ? p.size - Math.abs(i) : 0, i - 1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(-(Math.abs(i) < p.size ? p.size - Math.abs(i) : 0), i - 1); ctx.stroke();
      }
      ctx.restore();
    },
  });

  /* 84 Petal Fall */
  E[84] = headTrail({
    speed: 0.16, rate: 9, size: 4, life: [1.6, 2.4], drag: 0.98, gravity: 0.04,
    spread: 0.4, hue: () => rnd(320, 355), blend: "source-over",
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = `hsla(${p.hue},80%,75%,${p.life})`;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU); ctx.fill();
      ctx.restore();
    },
  });

  /* 85 Ember Rise */
  E[85] = headTrail({
    speed: 0.26, rate: 55, size: 1.8, life: [0.8, 1.4], drag: 0.96, gravity: -0.1,
    spread: 0.5, hue: () => rnd(15, 40),
    drawPart(ctx, p) {
      const r = p.size * p.life;
      ctx.fillStyle = `hsla(${p.hue},100%,${55 + p.life * 30}%,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    },
  });

  /* 86 Ash Stream */
  E[86] = headTrail({
    speed: 0.22, rate: 25, size: 2, life: [1.2, 2], drag: 0.97, gravity: -0.03,
    spread: 0.7, hue: 30,
    drawPart(ctx, p) {
      ctx.fillStyle = `hsla(30,10%,70%,${p.life * 0.5})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, TAU); ctx.fill();
    },
  });

  /* 87 Glass Shatter */
  E[87] = headTrail({
    speed: 0.28, rate: 22, size: 5, life: [0.8, 1.3], drag: 0.94, gravity: 0.15,
    spread: 2.5, hue: 200, blend: "source-over",
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.strokeStyle = `rgba(200,230,255,${p.life})`;
      ctx.fillStyle = `rgba(180,220,255,${p.life * 0.3})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size * 0.4);
      ctx.lineTo(p.size * 0.8, -p.size * 0.2);
      ctx.lineTo(p.size, p.size * 0.5);
      ctx.lineTo(-p.size * 0.3, p.size * 0.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
  });

  /* 88 Liquid Mercury */
  E[88] = headTrail({
    speed: 0.24, rate: 40, size: 4, life: [0.8, 1.3], drag: 0.96, spread: 0.4,
    hue: 210,
    drawPart(ctx, p) {
      const r = p.size * p.life * 1.3;
      const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(255,255,255,${p.life})`);
      g.addColorStop(0.4, `rgba(180,200,220,${p.life})`);
      g.addColorStop(1, `rgba(40,50,70,${p.life})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    },
  });

  /* 89 Plasma Ball */
  E[89] = function () {
    let t = Math.random(); const arcs = [];
    return {
      step(dt, W, H) {
        t = (t + 0.2 * dt) % 1;
        const h = perim(t, W, H, 5);
        this._h = h;
        if (Math.random() < 0.5) {
          arcs.push({ x: h.x, y: h.y, ex: h.x + rnd(-10, 10), ey: h.y + rnd(-10, 10), life: 1 });
        }
        for (let i = arcs.length - 1; i >= 0; i--) { arcs[i].life -= dt * 5; if (arcs[i].life <= 0) arcs.splice(i, 1); }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        if (this._h) {
          const g = ctx.createRadialGradient(this._h.x, this._h.y, 0, this._h.x, this._h.y, 14);
          g.addColorStop(0, "rgba(200,140,255,1)");
          g.addColorStop(1, "rgba(120,40,200,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this._h.x, this._h.y, 14, 0, TAU); ctx.fill();
        }
        for (const a of arcs) {
          ctx.strokeStyle = `rgba(220,180,255,${a.life})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          const mx = (a.x + a.ex) / 2 + rnd(-4, 4), my = (a.y + a.ey) / 2 + rnd(-4, 4);
          ctx.quadraticCurveTo(mx, my, a.ex, a.ey);
          ctx.stroke();
        }
      },
    };
  };

  /* 90 Laser Bolt */
  E[90] = function () {
    let t = Math.random(); const segs = [];
    return {
      step(dt, W, H) {
        t = (t + 0.6 * dt) % 1;
        const h = perim(t, W, H, 3);
        segs.push({ x: h.x, y: h.y, life: 1 });
        for (let i = segs.length - 1; i >= 0; i--) { segs[i].life -= dt * 4; if (segs[i].life <= 0) segs.splice(i, 1); }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (let i = 1; i < segs.length; i++) {
          const a = segs[i - 1], b = segs[i];
          for (let w = 5; w >= 1; w -= 2) {
            ctx.strokeStyle = `rgba(255,60,80,${b.life * (w === 1 ? 1 : 0.2)})`;
            ctx.lineWidth = w;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      },
    };
  };

  /* 91 Ion Storm */
  E[91] = headTrail({
    speed: 0.3, rate: 80, size: 1.4, life: [0.3, 0.7], drag: 0.88, spread: 2.5,
    hue: () => rnd(160, 200),
    drawPart(ctx, p) {
      ctx.fillStyle = `hsla(${p.hue},100%,75%,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    },
  });

  /* 92 Quantum Entangle — two heads connected */
  E[92] = function () {
    let t = Math.random();
    return {
      step(dt, W, H) {
        t = (t + 0.2 * dt) % 1;
        this._a = perim(t, W, H, 4);
        this._b = perim(t + 0.5, W, H, 4);
      },
      draw(ctx) {
        if (!this._a) return;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(140,255,220,0.45)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(this._a.x, this._a.y); ctx.lineTo(this._b.x, this._b.y); ctx.stroke();
        ctx.setLineDash([]);
        for (const h of [this._a, this._b]) {
          const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 8);
          g.addColorStop(0, "rgba(180,255,220,1)"); g.addColorStop(1, "rgba(80,255,180,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 8, 0, TAU); ctx.fill();
        }
      },
    };
  };

  /* 93 Nova Burst — pulses outward from head */
  E[93] = function () {
    let t = Math.random(), acc = 0; const bursts = [];
    return {
      step(dt, W, H) {
        t = (t + 0.18 * dt) % 1; acc += dt;
        if (acc > 0.5) { acc = 0; const h = perim(t, W, H, 5); bursts.push({ x: h.x, y: h.y, r: 1, life: 1 }); }
        for (let i = bursts.length - 1; i >= 0; i--) {
          bursts[i].r += dt * 40; bursts[i].life -= dt * 1.1;
          if (bursts[i].life <= 0) bursts.splice(i, 1);
        }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (const b of bursts) {
          const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.4, b.x, b.y, b.r);
          g.addColorStop(0, `rgba(255,220,120,${b.life})`);
          g.addColorStop(1, "rgba(255,100,40,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        }
      },
    };
  };

  /* 94 Astral Wake */
  E[94] = headTrail({
    speed: 0.22, rate: 45, size: 2, life: [1, 1.6], drag: 0.98, spread: 0.8,
    hue: () => rnd(220, 300),
    drawPart(ctx, p) {
      const r = p.size * p.life * 2;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
      g.addColorStop(0, `hsla(${p.hue},100%,85%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue + 40},100%,50%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();
    },
  });

  /* 95 Venom Drip */
  E[95] = headTrail({
    speed: 0.18, rate: 12, size: 3.5, life: [1.4, 2.2], drag: 1, gravity: 0.08,
    spread: 0.2, hue: () => rnd(90, 140),
    drawPart(ctx, p) {
      const r = p.size * p.life;
      ctx.fillStyle = `hsla(${p.hue},90%,55%,${p.life})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.6, r, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `hsla(${p.hue},100%,80%,${p.life * 0.5})`;
      ctx.beginPath(); ctx.arc(p.x - r * 0.2, p.y - r * 0.3, r * 0.25, 0, TAU); ctx.fill();
    },
  });

  /* 96 Frost Crystal */
  E[96] = headTrail({
    speed: 0.2, rate: 14, size: 5, life: [1.5, 2.2], drag: 1, spread: 0.1,
    hue: 200,
    drawPart(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.strokeStyle = `hsla(200,80%,90%,${p.life})`;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        ctx.rotate(TAU / 6);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -p.size * p.life);
        ctx.moveTo(0, -p.size * p.life * 0.5); ctx.lineTo(p.size * 0.3 * p.life, -p.size * p.life * 0.7);
        ctx.moveTo(0, -p.size * p.life * 0.5); ctx.lineTo(-p.size * 0.3 * p.life, -p.size * p.life * 0.7);
        ctx.stroke();
      }
      ctx.restore();
    },
  });

  /* 97 Pulse Wave — sine perpendicular to edge */
  E[97] = function () {
    const pts = []; let t = Math.random();
    return {
      step(dt, W, H) {
        t = (t + 0.3 * dt) % 1;
        const h = perim(t, W, H, 3);
        pts.push({ x: h.x, y: h.y, a: h.a, phase: Date.now() / 120 });
        if (pts.length > 50) pts.shift();
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(120,220,255,0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        pts.forEach((p, i) => {
          const off = Math.sin(i * 0.5 + p.phase) * 3;
          const x = p.x + Math.cos(p.a + Math.PI / 2) * off;
          const y = p.y + Math.sin(p.a + Math.PI / 2) * off;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      },
    };
  };

  /* 98 Shockwave Ring */
  E[98] = function () {
    const rings = []; let t = Math.random(), acc = 0;
    return {
      step(dt, W, H) {
        t = (t + 0.25 * dt) % 1; acc += dt;
        if (acc > 0.3) { acc = 0; const h = perim(t, W, H, 4); rings.push({ x: h.x, y: h.y, r: 0, life: 1 }); }
        for (let i = rings.length - 1; i >= 0; i--) {
          rings[i].r += dt * 60; rings[i].life -= dt * 1.4;
          if (rings[i].life <= 0) rings.splice(i, 1);
        }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = "lighter";
        for (const r of rings) {
          ctx.strokeStyle = `rgba(255,180,80,${r.life})`;
          ctx.lineWidth = 2 * r.life + 0.5;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
        }
      },
    };
  };

  /* 99 Meteor Storm */
  E[99] = headTrail({
    speed: 0.32, rate: 25, size: 2.5, life: [0.6, 1.1], drag: 0.95, gravity: 0.1,
    velTangent: 1.5, spread: 0.3, hue: () => rnd(20, 45),
    drawPart(ctx, p) {
      const r = p.size * p.life * 1.6;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
      g.addColorStop(0, `hsla(${p.hue},100%,80%,${p.life})`);
      g.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();
    },
  });

  /* 100 Cosmic Serpent — sinuous body of linked segments */
  E[100] = function () {
    const segs = []; let t = Math.random();
    return {
      step(dt, W, H) {
        t = (t + 0.22 * dt) % 1;
        const h = perim(t, W, H, 5);
        segs.unshift({ x: h.x, y: h.y });
        if (segs.length > 45) segs.pop();
      },
      draw(ctx) {
        if (segs.length < 2) return;
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < segs.length; i++) {
          const f = 1 - i / segs.length;
          const s = segs[i];
          const r = 1 + f * 4;
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2);
          g.addColorStop(0, `hsla(${(i * 8 + Date.now() / 30) % 360},100%,70%,${f})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r * 2, 0, TAU); ctx.fill();
        }
      },
    };
  };

  // ====================================================================
  //  ENGINE — attach one canvas per .trail element, run shared rAF
  // ====================================================================
  const active = []; // { el, canvas, ctx, fx, W, H, visible, dpr }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const rec = active.find((r) => r.el === e.target);
      if (rec) rec.visible = e.isIntersecting;
    });
  }, { rootMargin: "50px" });

  function resize(rec) {
    const r = rec.el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    rec.W = r.width; rec.H = r.height; rec.dpr = dpr;
    rec.canvas.width = r.width * dpr;
    rec.canvas.height = r.height * dpr;
    rec.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function attach(el, effectId) {
    if (el._fxAttached) return;
    const factory = E[effectId];
    if (!factory) return;
    const canvas = document.createElement("canvas");
    canvas.className = "trail-fx";
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const rec = { el, canvas, ctx, fx: factory(), visible: true, effectId };
    resize(rec);
    io.observe(el);
    const resizeHandler = () => resize(rec);
    rec._resizeHandler = resizeHandler;
    window.addEventListener("resize", resizeHandler);
    active.push(rec);
    el._fxAttached = true;
  }

  function detach(el) {
    const i = active.findIndex(r => r.el === el);
    if (i === -1) return;
    const rec = active[i];
    io.unobserve(el);
    window.removeEventListener("resize", rec._resizeHandler);
    if (rec.canvas && rec.canvas.parentNode) rec.canvas.parentNode.removeChild(rec.canvas);
    active.splice(i, 1);
    el._fxAttached = false;
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const rec of active) {
      if (!rec.visible) continue;
      rec.ctx.clearRect(0, 0, rec.W, rec.H);
      rec.fx.step(dt, rec.W, rec.H);
      rec.fx.draw(rec.ctx, rec.W, rec.H);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Expose for app.js and extension files (trail-ring.js etc.)
  window.TRAIL = {
    attach, detach,
    isAttached: (el) => !!el._fxAttached,
    register: (id, factory) => { E[id] = factory; },
    has: (id) => !!E[id],
    perim, headTrail, ambient, TAU, rnd,
  };
})();
