// Everything you see: the city, the cars, effects, and the HUD.
const Render = (() => {
  const C = CONFIG;
  const W = World;
  const TAU = Math.PI * 2;
  const FONT = "'Nunito', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const DISPLAY = "'Fredoka', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  const inView = (v, x, y, w, h) => x + w > v.x0 && x < v.x1 && y + h > v.y0 && y < v.y1;
  const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

  // Lighten (amt > 0) or darken (amt < 0) a #rrggbb color.
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }
  function lin(x0, y0, x1, y1, stops) {
    const g = ctxRef.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  function rad(x, y, r0, r1, stops) {
    const g = ctxRef.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  let ctxRef = null;
  let dusk = 0; // 0 in the day, 1 at the very end of the shift

  // ---------- textures (made once, then repeated across the city) ----------
  const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  function makeTexture(size, seed, paint) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    paint(c.getContext('2d'), size, seeded(seed));
    return c;
  }
  const TEX = {
    asphalt: makeTexture(128, 11, (p, n, r) => {
      p.fillStyle = '#3b3e45';
      p.fillRect(0, 0, n, n);
      for (let i = 0; i < 1100; i++) {
        p.fillStyle = r() < 0.55 ? `rgba(0,0,0,${0.06 + r() * 0.12})` : `rgba(255,255,255,${0.025 + r() * 0.05})`;
        p.fillRect(r() * n, r() * n, 1 + r() * 1.6, 1 + r() * 1.6);
      }
    }),
    sidewalk: makeTexture(32, 12, (p, n, r) => {
      p.fillStyle = '#b6b1a7';
      p.fillRect(0, 0, n, n);
      for (let i = 0; i < 50; i++) { p.fillStyle = `rgba(0,0,0,${r() * 0.07})`; p.fillRect(r() * n, r() * n, 1, 1); }
      p.fillStyle = 'rgba(0,0,0,0.09)';
      p.fillRect(0, 0, n, 1);
      p.fillRect(0, 0, 1, n);
    }),
    grass: makeTexture(64, 13, (p, n, r) => {
      p.fillStyle = '#5a9944';
      p.fillRect(0, 0, n, n);
      for (let i = 0; i < 600; i++) {
        p.fillStyle = r() < 0.5 ? `rgba(30,85,25,${0.15 + r() * 0.2})` : `rgba(175,225,115,${0.08 + r() * 0.15})`;
        p.fillRect(r() * n, r() * n, 1, 2 + r() * 2);
      }
    }),
    gravel: makeTexture(48, 14, (p, n, r) => {
      p.fillStyle = '#8e8a84';
      p.fillRect(0, 0, n, n);
      for (let i = 0; i < 500; i++) { p.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'; p.fillRect(r() * n, r() * n, 1.5, 1.5); }
    }),
    concrete: makeTexture(64, 15, (p, n, r) => {
      p.fillStyle = '#9a9da3';
      p.fillRect(0, 0, n, n);
      for (let i = 0; i < 300; i++) { p.fillStyle = `rgba(0,0,0,${r() * 0.08})`; p.fillRect(r() * n, r() * n, 2, 2); }
      p.fillStyle = 'rgba(0,0,0,0.12)';
      p.fillRect(0, 0, n, 1);
      p.fillRect(0, 0, 1, n);
    }),
  };
  let patterns = null;
  const pat = (ctx, name) => {
    if (!patterns) patterns = {};
    if (!patterns[name]) patterns[name] = ctx.createPattern(TEX[name], 'repeat');
    return patterns[name];
  };

  // ---------- tree sprites (drawn once, then stamped, so a forest is cheap to draw) ----------
  const TREE_PAL = [
    ['#6fbf4f', '#3f8f35', '#2a6624'],
    ['#5aa845', '#2f7a2c', '#1d531c'],
    ['#9ccc4a', '#5f9a2c', '#3d6a1c'],
    ['#e0a43a', '#b8662a', '#7a3d1c'], // a few autumn trees
  ];
  const treeCache = new Map();
  function treeSprite(r, v) {
    const R = Math.max(6, Math.round(r / 2) * 2);
    const key = R * 10 + v;
    let c = treeCache.get(key);
    if (c) return c;
    const pad = Math.ceil(R * 0.6) + 2, size = R * 2 + pad * 2;
    c = document.createElement('canvas');
    c.width = c.height = size;
    const p = c.getContext('2d');
    const x = size / 2 - R * 0.15, y = size / 2 - R * 0.15;
    p.fillStyle = 'rgba(0,0,0,0.25)';
    p.beginPath(); p.arc(x + R * 0.35, y + R * 0.35, R, 0, TAU); p.fill();
    const pal = TREE_PAL[v % TREE_PAL.length];
    const blobs = [[0, 0, 1], [-0.45, -0.2, 0.62], [0.42, -0.28, 0.58], [0.1, 0.42, 0.6], [-0.3, 0.35, 0.5]];
    for (const [bx, by, br] of blobs) {
      const gx = x + bx * R - br * R * 0.35, gy = y + by * R - br * R * 0.35;
      const g = p.createRadialGradient(gx, gy, 1, gx, gy, br * R * 1.1);
      g.addColorStop(0, pal[0]); g.addColorStop(0.6, pal[1]); g.addColorStop(1, pal[2]);
      p.fillStyle = g;
      p.beginPath(); p.arc(x + bx * R, y + by * R, br * R, 0, TAU); p.fill();
    }
    // a few leafy speckles
    for (let k = 0; k < R; k++) {
      const a = k * 2.4, d = (k / R) * R * 0.8;
      p.fillStyle = k % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
      p.beginPath(); p.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6, 0, TAU); p.fill();
    }
    c.off = size / 2 - R * 0.15;
    treeCache.set(key, c);
    return c;
  }
  function treeS(ctx, x, y, r, v = 0) {
    const s = treeSprite(r, v);
    ctx.drawImage(s, x - s.off, y - s.off);
  }

  // ---------- the countryside around the city ----------
  function depotRect(co) {
    const n = W.nodePos({ i: co.home[0], j: co.home[1] });
    const out = W.HALF + 30, dw = 150, dd = 120;
    if (co.home[0] === 0) return { x: n.x - out - dd, y: n.y - dw / 2, w: dd, h: dw };
    if (co.home[0] === W.N) return { x: n.x + out, y: n.y - dw / 2, w: dd, h: dw };
    if (co.home[1] === 0) return { x: n.x - dw / 2, y: n.y - out - dd, w: dw, h: dd };
    return { x: n.x - dw / 2, y: n.y + out, w: dw, h: dd };
  }
  const CROPS = ['#c9b458', '#8fbf4a', '#a2774a', '#d9c26a', '#6fae46'];
  const DECOR = (() => {
    const r = seeded(4242);
    const lo = -W.HALF, hi = W.SIZE + W.HALF, STEP = 240, RING = 1500;
    const d = { trees: [], fields: [], houses: [], ponds: [] };
    const depots = C.rivals.map(depotRect);
    const nearDepot = (x, y, w, h, m) => depots.some((q) => x < q.x + q.w + m && x + w > q.x - m && y < q.y + q.h + m && y + h > q.y - m);
    for (let gx = lo - RING; gx < hi + RING; gx += STEP) {
      for (let gy = lo - RING; gy < hi + RING; gy += STEP) {
        if (gx + STEP > lo - 60 && gx < hi + 60 && gy + STEP > lo - 60 && gy < hi + 60) continue;
        if (nearDepot(gx, gy, STEP, STEP, 60)) continue;
        const n = Math.sin(gx * 0.0021 + 1.7) + Math.cos(gy * 0.0017 - 0.4) + (r() - 0.5) * 0.8;
        if (n > 0.7) {
          for (let k = 0, m = 5 + Math.floor(r() * 5); k < m; k++) d.trees.push({ x: gx + 20 + r() * (STEP - 40), y: gy + 20 + r() * (STEP - 40), r: 18 + r() * 16, v: r() < 0.12 ? 3 : Math.floor(r() * 3) });
        } else if (n < -0.5) {
          d.fields.push({ x: gx + 12, y: gy + 12, w: STEP - 24, h: STEP - 24, c: CROPS[Math.floor(r() * CROPS.length)], vert: r() < 0.5 });
        } else if (r() < 0.3) {
          const w = 70 + r() * 40, h = 56 + r() * 30;
          d.houses.push({ x: gx + 40 + r() * (STEP - w - 80), y: gy + 40 + r() * (STEP - h - 80), w, h, roof: ['#b5523b', '#6a7fa0', '#8c5a3c', '#5e7a52', '#a0634e'][Math.floor(r() * 5)], vert: r() < 0.5 });
          d.trees.push({ x: gx + 30 + r() * 40, y: gy + STEP - 40, r: 14 + r() * 8, v: Math.floor(r() * 3) });
        } else if (r() < 0.2) {
          d.ponds.push({ x: gx + STEP / 2, y: gy + STEP / 2, rx: 50 + r() * 40, ry: 36 + r() * 30 });
        } else {
          for (let k = 0, m = 1 + Math.floor(r() * 3); k < m; k++) d.trees.push({ x: gx + 20 + r() * (STEP - 40), y: gy + 20 + r() * (STEP - 40), r: 16 + r() * 12, v: Math.floor(r() * 4) });
        }
      }
    }
    // a neat row of trees along the city edge
    for (let s = lo + 40; s < hi - 40; s += 95) {
      for (const [x, y] of [[s, lo - 150], [s, hi + 150], [lo - 150, s], [hi + 150, s]]) {
        if (!nearDepot(x - 30, y - 30, 60, 60, 40)) d.trees.push({ x: x + (r() - 0.5) * 20, y: y + (r() - 0.5) * 20, r: 20 + r() * 6, v: Math.floor(r() * 2) });
      }
    }
    return d;
  })();

  function drawCountryside(ctx, v) {
    const D = DECOR;
    for (const p of D.ponds) {
      if (!inView(v, p.x - p.rx - 10, p.y - p.ry - 10, p.rx * 2 + 20, p.ry * 2 + 20)) continue;
      ctx.fillStyle = '#c9b98a';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx + 7, p.ry + 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rad(p.x - p.rx * 0.3, p.y - p.ry * 0.3, 2, p.rx * 1.3, [[0, '#7fcbec'], [1, '#2f7fae']]);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x - p.rx * 0.35, p.y - p.ry * 0.4, p.rx * 0.3, p.ry * 0.1, -0.3, 0, TAU); ctx.fill();
    }
    for (const f of D.fields) {
      if (!inView(v, f.x, f.y, f.w, f.h)) continue;
      ctx.fillStyle = f.c;
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      for (let k = 6; k < (f.vert ? f.w : f.h); k += 14) {
        if (f.vert) ctx.fillRect(f.x + k, f.y + 4, 5, f.h - 8);
        else ctx.fillRect(f.x + 4, f.y + k, f.w - 8, 5);
      }
      ctx.strokeStyle = '#8a6a48';
      ctx.lineWidth = 3;
      ctx.strokeRect(f.x + 1.5, f.y + 1.5, f.w - 3, f.h - 3);
    }
    for (const h of D.houses) {
      if (!inView(v, h.x - 20, h.y - 20, h.w + 60, h.h + 60)) continue;
      ctx.fillStyle = '#b6b1a7';
      ctx.fillRect(h.x + h.w / 2 - 10, h.y + h.h, 20, 46); // driveway
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(h.x + 8, h.y + 8, h.w, h.h);
      ctx.fillStyle = shade(h.roof, -30);
      ctx.fillRect(h.x, h.y, h.w, h.h);
      // a gable roof: two slopes, one in the light, one in shade
      if (h.vert) {
        ctx.fillStyle = shade(h.roof, 25); ctx.fillRect(h.x + 3, h.y + 3, h.w / 2 - 3, h.h - 6);
        ctx.fillStyle = h.roof; ctx.fillRect(h.x + h.w / 2, h.y + 3, h.w / 2 - 3, h.h - 6);
      } else {
        ctx.fillStyle = shade(h.roof, 25); ctx.fillRect(h.x + 3, h.y + 3, h.w - 6, h.h / 2 - 3);
        ctx.fillStyle = h.roof; ctx.fillRect(h.x + 3, h.y + h.h / 2, h.w - 6, h.h / 2 - 3);
      }
      ctx.fillStyle = '#6b4a36';
      ctx.fillRect(h.x + h.w * 0.72, h.y + h.h * 0.15, 9, 9); // chimney
    }
    for (const t of D.trees) if (t.x + 40 > v.x0 && t.x - 40 < v.x1 && t.y + 40 > v.y0 && t.y - 40 < v.y1) treeS(ctx, t.x, t.y, t.r, t.v);
  }

  // ---------- city ----------
  function drawGround(ctx, v) {
    ctx.fillStyle = pat(ctx, 'grass');
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const lo = -W.HALF, hi = W.SIZE + W.HALF;
    drawCountryside(ctx, v);
    // a curb and a grass verge around the edge of the city
    ctx.fillStyle = '#b6b1a7';
    ctx.fillRect(lo - 18, lo - 18, hi - lo + 36, hi - lo + 36);
    ctx.fillStyle = pat(ctx, 'asphalt');
    ctx.fillRect(lo, lo, hi - lo, hi - lo);
    ctx.strokeStyle = '#d9d4c8';
    ctx.lineWidth = 3;
    ctx.strokeRect(lo - 1.5, lo - 1.5, hi - lo + 3, hi - lo + 3);
    // guard rail posts
    ctx.fillStyle = '#e8e8e8';
    for (let s = lo; s < hi; s += 40) {
      ctx.fillRect(s, lo - 14, 4, 8); ctx.fillRect(s, hi + 6, 4, 8);
      ctx.fillRect(lo - 14, s, 8, 4); ctx.fillRect(hi + 6, s, 8, 4);
    }
  }

  // Rival company garages sit just outside the city edge.
  function drawDepots(ctx, v) {
    for (const co of C.rivals) {
      const { x, y, w, h } = depotRect(co);
      if (!inView(v, x, y, w, h)) continue;
      // driveway out to the road
      const n = W.nodePos({ i: co.home[0], j: co.home[1] });
      ctx.fillStyle = pat(ctx, 'asphalt');
      if (w < h) ctx.fillRect(Math.min(x, n.x), n.y - 40, Math.abs(n.x - x) + (x < n.x ? 0 : w), 80);
      else ctx.fillRect(n.x - 40, Math.min(y, n.y), 80, Math.abs(n.y - y) + (y < n.y ? 0 : h));
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 8, y + 8, w, h);
      ctx.fillStyle = lin(x, y, x + w, y + h, [[0, shade(co.color, 25)], [1, shade(co.color, -25)]]);
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 10, y + 12 + k * ((h - 24) / 4), w - 20, 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      rr(ctx, x + w / 2 - 66, y + h / 2 - 14, 132, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(co.name.toUpperCase(), x + w / 2, y + h / 2);
    }
  }

  function roadSegment(ctx, x, y, len, vertical) {
    const H = W.HALF;
    ctx.save();
    ctx.translate(x, y);
    if (vertical) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#e8c547';
    ctx.fillRect(28, -4.5, len - 56, 3);
    ctx.fillRect(28, 1.5, len - 56, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(28, -H + 13, len - 56, 2);
    ctx.fillRect(28, H - 15, len - 56, 2);
    ctx.fillStyle = 'rgba(240,240,240,0.75)';
    for (let s = -H + 8; s < H - 12; s += 14) {
      ctx.fillRect(4, s, 18, 7);
      ctx.fillRect(len - 22, s, 18, 7);
    }
    ctx.fillRect(len - 27, 3, 3, H - 16);
    ctx.fillRect(24, -H + 13, 3, H - 16);
    ctx.restore();
  }

  function drawMarkings(ctx, v) {
    const H = W.HALF, CELL = W.CELL, len = CELL - C.road;
    for (let a = 0; a <= W.N; a++) {
      for (let b = 0; b < W.N; b++) {
        const s = b * CELL + H, road = a * CELL;
        if (inView(v, s, road - H, len, H * 2)) roadSegment(ctx, s, road, len, false);
        if (inView(v, road - H, s, H * 2, len)) roadSegment(ctx, road, s, len, true);
      }
    }
  }

  // Buildings are drawn with a little 3D tilt: the roof sits up a bit and you can see the front wall
  // with its windows underneath. Collisions still use the building's footprint on the ground.
  const wallDepth = (s) => Math.min(14, 5 + s.height * 6);

  function drawBuildings(ctx, b) {
    for (const s of b.buildings) {
      const off = 6 + s.height * 8;
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.fillRect(s.x + off, s.y + off * 0.6, s.w, s.h);
    }
    for (const s of b.buildings) drawBuilding(ctx, s);
  }

  function drawBuilding(ctx, s) {
    const d = wallDepth(s);
    const wallY = s.y + s.h - d;
    // front wall with rows of windows
    ctx.fillStyle = lin(0, wallY, 0, wallY + d, [[0, shade(s.color, -40)], [1, shade(s.color, -70)]]);
    ctx.fillRect(s.x, wallY, s.w, d);
    for (let x = s.x + 5; x < s.x + s.w - 8; x += 11) {
      const lit = dusk > 0.3 && Math.floor(x * 13 + s.y * 7) % 5 < 3;
      ctx.fillStyle = lit ? `rgba(255,214,120,${0.5 + dusk * 0.45})` : 'rgba(170,215,255,0.55)';
      ctx.fillRect(x, wallY + 3, 6, Math.max(2, d - 6));
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x, wallY + 3, 2, Math.max(2, d - 6));
    }
    // roof
    const rx = s.x, ry = s.y - d, rw = s.w, rh = s.h;
    ctx.fillStyle = lin(rx, ry, rx + rw, ry + rh, [[0, shade(s.color, 22)], [0.6, s.color], [1, shade(s.color, -14)]]);
    ctx.fillRect(rx, ry, rw, rh);
    // parapet around the roof edge
    ctx.strokeStyle = shade(s.color, 38);
    ctx.lineWidth = 4;
    ctx.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 6, ry + 6, rw - 12, rh - 12);
    // what's on the roof
    const pick = Math.floor(s.x * 7 + s.y * 3) % 3;
    if (s.kind === 'ac') {
      for (const u of s.units) acUnit(ctx, rx + u.x * rw, ry + u.y * rh);
      if (pick === 0 && rw > 120) waterTower(ctx, rx + rw - 34, ry + 30);
    } else if (s.kind === 'garden') {
      ctx.fillStyle = pat(ctx, 'grass');
      ctx.fillRect(rx + rw * 0.15, ry + rh * 0.15, rw * 0.7, rh * 0.7);
      ctx.strokeStyle = '#8a6a48';
      ctx.lineWidth = 4;
      ctx.strokeRect(rx + rw * 0.15, ry + rh * 0.15, rw * 0.7, rh * 0.7);
      treeS(ctx, rx + rw * 0.35, ry + rh * 0.4, Math.min(rw, rh) * 0.12, 1);
      treeS(ctx, rx + rw * 0.65, ry + rh * 0.62, Math.min(rw, rh) * 0.09, 2);
    } else if (s.kind === 'pool') {
      ctx.fillStyle = '#e8e0cf';
      ctx.fillRect(rx + rw * 0.18, ry + rh * 0.2, rw * 0.64, rh * 0.6);
      const px = rx + rw * 0.25, py = ry + rh * 0.28, pw = rw * 0.5, ph = rh * 0.44;
      ctx.fillStyle = lin(px, py, px, py + ph, [[0, '#7fd6f5'], [1, '#2f93c9']]);
      rr(ctx, px, py, pw, ph, 6);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(px + 8, py + (ph * k) / 4); ctx.quadraticCurveTo(px + pw / 2, py + (ph * k) / 4 - 4, px + pw - 8, py + (ph * k) / 4); ctx.stroke(); }
      for (let k = 0; k < 2; k++) { ctx.fillStyle = k ? '#ff7a59' : '#4fa3f0'; ctx.fillRect(px + pw + 6, py + 8 + k * 22, 8, 16); }
    } else if (s.kind === 'pad') {
      const cx = rx + rw / 2, cy = ry + rh / 2, r = Math.min(rw, rh) * 0.3;
      ctx.fillStyle = '#4a4d55';
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#f2f2f2';
      ctx.font = `bold ${Math.round(r)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', cx, cy + 2);
    } else if (pick === 0) {
      // solar panels
      for (let y = ry + 14; y < ry + rh - 26; y += 22) for (let x = rx + 14; x < rx + rw - 30; x += 30) {
        ctx.fillStyle = lin(x, y, x + 26, y + 18, [[0, '#3d6fb8'], [1, '#1d3c70']]);
        ctx.fillRect(x, y, 26, 18);
        ctx.strokeStyle = 'rgba(200,225,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, 25, 17);
        ctx.beginPath(); ctx.moveTo(x + 13, y); ctx.lineTo(x + 13, y + 18); ctx.moveTo(x, y + 9); ctx.lineTo(x + 26, y + 9); ctx.stroke();
      }
    } else {
      // gravel roof with skylights
      ctx.fillStyle = pat(ctx, 'gravel');
      ctx.fillRect(rx + 8, ry + 8, rw - 16, rh - 16);
      for (const [fx, fy] of [[0.3, 0.35], [0.65, 0.6]]) {
        const x = rx + rw * fx, y = ry + rh * fy;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x - 12, y - 9, 28, 22);
        ctx.fillStyle = lin(x - 14, y - 11, x + 14, y + 11, [[0, '#cfe9f7'], [1, '#6aa7cc']]);
        ctx.fillRect(x - 14, y - 11, 28, 22);
      }
    }
  }

  function acUnit(ctx, x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 4, y + 4, 24, 18);
    ctx.fillStyle = lin(x, y, x, y + 18, [[0, '#e3e6ea'], [1, '#a9afb8']]);
    ctx.fillRect(x, y, 24, 18);
    ctx.fillStyle = '#5d636c';
    ctx.beginPath(); ctx.arc(x + 12, y + 9, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9ced5';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const a = (k * TAU) / 3; ctx.beginPath(); ctx.moveTo(x + 12, y + 9); ctx.lineTo(x + 12 + Math.cos(a) * 5.5, y + 9 + Math.sin(a) * 5.5); ctx.stroke(); }
  }

  function waterTower(ctx, x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.arc(x + 7, y + 7, 18, 0, TAU); ctx.fill();
    ctx.fillStyle = rad(x - 5, y - 5, 2, 20, [[0, '#c98b5a'], [1, '#7a4a2a']]);
    ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#5a3520';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
  }

  // A round, leafy tree seen from above.
  function tree(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.35, r, 0, TAU); ctx.fill();
    const blobs = [[0, 0, 1], [-0.45, -0.2, 0.62], [0.42, -0.28, 0.58], [0.1, 0.42, 0.6], [-0.3, 0.35, 0.5]];
    for (const [bx, by, br] of blobs) {
      ctx.fillStyle = rad(x + bx * r - br * r * 0.35, y + by * r - br * r * 0.35, 1, br * r * 1.1, [[0, '#6fbf4f'], [0.6, '#3f8f35'], [1, '#2a6624']]);
      ctx.beginPath(); ctx.arc(x + bx * r, y + by * r, br * r, 0, TAU); ctx.fill();
    }
  }

  function streetLamp(ctx, x, y) {
    ctx.fillStyle = 'rgba(255,240,190,0.12)';
    ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2e3138';
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e9e4d0';
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
  }

  function drawPark(ctx, b) {
    ctx.fillStyle = pat(ctx, 'grass');
    ctx.fillRect(b.x + 12, b.y + 12, b.w - 24, b.h - 24);
    // paths
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#a8996f';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(b.x + b.w / 2, b.y + 12); ctx.lineTo(b.x + b.w / 2, b.y + b.h - 12);
    ctx.moveTo(b.x + 12, b.y + b.h / 2); ctx.lineTo(b.x + b.w - 12, b.y + b.h / 2);
    ctx.stroke();
    ctx.strokeStyle = '#d8c99a';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.lineCap = 'butt';
    // flower bed in the middle
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 22, 0, TAU); ctx.fill();
    for (let k = 0; k < 10; k++) {
      const a = (k * TAU) / 10;
      ctx.fillStyle = ['#ff6b8a', '#ffd23f', '#ffffff', '#b28dff'][k % 4];
      ctx.beginPath(); ctx.arc(b.x + b.w / 2 + Math.cos(a) * 13, b.y + b.h / 2 + Math.sin(a) * 13, 4, 0, TAU); ctx.fill();
    }
    if (b.pond) {
      const p = b.pond;
      ctx.fillStyle = '#c9b98a';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.2 + 6, p.r + 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rad(p.x - p.r * 0.3, p.y - p.r * 0.3, 2, p.r * 1.3, [[0, '#7fcbec'], [1, '#2f7fae']]);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.2, p.r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.4, p.y - p.r * 0.4, p.r * 0.35, p.r * 0.1, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4f9a3a';
      for (const [lx, ly] of [[0.4, 0.3], [-0.2, 0.45], [0.55, -0.1]]) { ctx.beginPath(); ctx.arc(p.x + lx * p.r, p.y + ly * p.r, 5, 0.3, TAU); ctx.lineTo(p.x + lx * p.r, p.y + ly * p.r); ctx.fill(); }
    }
    // benches along the path
    ctx.fillStyle = '#8a5a34';
    for (const [bx, by] of [[0.5, 0.25], [0.5, 0.75]]) ctx.fillRect(b.x + b.w * bx + 14, b.y + b.h * by - 9, 8, 18);
    for (const t of b.trees) treeS(ctx, t.x, t.y, t.r, Math.floor(t.x + t.y) % 3);
  }

  function drawYard(ctx, b, g) {
    const towing = g.job && g.job.state === 'towing';
    ctx.fillStyle = pat(ctx, 'concrete');
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const z = b.zone;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let x = z.x; x <= z.x + z.w + 1; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, z.y + z.h - 70);
      ctx.lineTo(x, z.y + z.h);
      ctx.stroke();
    }
    // drop zone
    const pulse = 0.5 + 0.5 * Math.sin(g.clock * 5);
    ctx.fillStyle = towing ? `rgba(94,224,122,${0.15 + pulse * 0.2})` : 'rgba(255,210,63,0.08)';
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = towing ? '#5ee07a' : 'rgba(255,210,63,0.6)';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]);
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.setLineDash([]);
    ctx.fillStyle = towing ? '#5ee07a' : 'rgba(255,210,63,0.7)';
    ctx.font = `bold 26px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(towing ? 'DROP OFF HERE' : 'YOUR TOW YARD', z.x + z.w / 2, z.y + 40);

    // impounded cars you've hauled in
    g.yardCars.slice(-16).forEach((color, k) => {
      const col = k % 8, row = Math.floor(k / 8);
      drawCar(ctx, { x: z.x + 20 + col * 40, y: z.y + z.h - 35 - row * 52, angle: -Math.PI / 2, len: 44, wid: 22, color }, {});
    });

    // fence, gate, office
    for (const w of b.walls) {
      ctx.fillStyle = '#4b4f57';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#6a6f78';
      const vert = w.h > w.w;
      for (let p = 0; p < (vert ? w.h : w.w); p += 30) {
        if (vert) ctx.fillRect(w.x, w.y + p, w.w, 4);
        else ctx.fillRect(w.x + p, w.y, 4, w.h);
      }
    }
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = k % 2 ? '#222' : '#ffd23f';
      ctx.fillRect(b.gate.x + k * (b.gate.w / 8), b.gate.y, b.gate.w / 8, 6);
    }
    const o = b.office;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(o.x + 7, o.y + 7, o.w, o.h);
    // little office: front wall with a door and window, yellow roof with a sign on it
    ctx.fillStyle = '#9c7a00';
    ctx.fillRect(o.x, o.y + o.h - 12, o.w, 12);
    ctx.fillStyle = '#cfe9f7';
    ctx.fillRect(o.x + 8, o.y + o.h - 9, 18, 6);
    ctx.fillStyle = '#5a3d1c';
    ctx.fillRect(o.x + o.w - 22, o.y + o.h - 10, 10, 10);
    ctx.fillStyle = lin(o.x, o.y, o.x + o.w, o.y + o.h, [[0, '#ffd84a'], [1, '#e0ad00']]);
    ctx.fillRect(o.x, o.y, o.w, o.h - 12);
    ctx.strokeStyle = '#fff1a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 16);
    ctx.fillStyle = '#1d1f24';
    rr(ctx, o.x + 8, o.y + 12, o.w - 16, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.font = `bold 12px ${DISPLAY}`;
    ctx.fillText('TOW RUSH', o.x + o.w / 2, o.y + 24);
  }

  function drawStation(ctx, b, g) {
    const x = b.x + 16, y = b.y + 16, w = b.w - 32, h = b.h - 32;
    const bh = h * 0.52;
    // parking lot with parked cruisers
    ctx.fillStyle = '#4a4d55';
    ctx.fillRect(x, y + bh + 10, w, h - bh - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 0; k <= 6; k++) ctx.fillRect(x + 20 + k * 50, y + bh + 20, 3, 70);
    for (let k = 0; k < 3; k++) {
      drawPolice(ctx, { x: x + 45 + k * 100, y: y + bh + 58, angle: -Math.PI / 2, len: 48, wid: 23 }, false, g.clock);
    }
    // the station building
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 12, y + 12, w, bh);
    ctx.fillStyle = '#2f5597';
    ctx.fillRect(x, y, w, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, 7);
    ctx.fillRect(x, y, 7, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, y + bh - 7, w, 7);
    ctx.fillStyle = '#f4c20d';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 11 : 26, a = -Math.PI / 2 + (k * Math.PI) / 5;
      ctx.lineTo(x + 50 + Math.cos(a) * r, y + bh / 2 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 40px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POLICE', x + w / 2 + 30, y + bh / 2);
    // jail bars on the roof while you're locked up
    if (g.jail > 0) {
      ctx.fillStyle = '#1b1d22';
      ctx.fillRect(x + w - 90, y + 14, 76, 40);
      ctx.fillStyle = '#9aa0aa';
      for (let k = 0; k < 6; k++) ctx.fillRect(x + w - 86 + k * 13, y + 14, 4, 40);
    }
  }

  function drawBlock(ctx, b, g) {
    // curb shadow on the road, sidewalk, then a light curb edge
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x - 2, b.y - 1, b.w + 5, b.h + 5);
    ctx.fillStyle = pat(ctx, 'sidewalk');
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#d9d4c8';
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
    for (const [cx, cy] of [[b.x + 8, b.y + 8], [b.x + b.w - 8, b.y + 8], [b.x + 8, b.y + b.h - 8], [b.x + b.w - 8, b.y + b.h - 8]]) streetLamp(ctx, cx, cy);
    if (b.kind === 'city') drawBuildings(ctx, b);
    else if (b.kind === 'park') drawPark(ctx, b);
    else if (b.kind === 'police') drawStation(ctx, b, g);
    else drawYard(ctx, b, g);
  }

  // ---------- traffic lights ----------
  const LIGHT = { red: '#ff3b30', yellow: '#ffcc00', green: '#34d058' };
  const LIGHT_DIM = { red: '#4a1512', yellow: '#4a3d0a', green: '#123d1c' };

  function drawLights(ctx, v, g) {
    const H = W.HALF;
    for (let j = 0; j <= W.N; j++) {
      for (let i = 0; i <= W.N; i++) {
        const n = { i, j };
        if (!W.hasLight(n)) continue;
        const p = W.nodePos(n);
        if (!inView(v, p.x - H - 80, p.y - H - 80, H * 2 + 160, H * 2 + 160)) continue;
        for (let d = 0; d < 4; d++) {
          // Traffic heading in direction d comes from the opposite side; skip sides with no road.
          const from = W.step(n, (d + 2) % 4);
          if (!W.inBounds(from.i, from.j)) continue;
          const state = W.lightState(n, d % 2, g.clock);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((d * Math.PI) / 2);
          // glowing stop line across the lane that has to obey this light
          ctx.fillStyle = LIGHT[state];
          ctx.globalAlpha = 0.9;
          ctx.fillRect(-H - 30, 3, 6, H - 16);
          ctx.globalAlpha = 1;
          // the signal on the corner
          const sx = -H - 10, sy = H + 10;
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          rr(ctx, sx - 5, sy - 15, 14, 36, 4);
          ctx.fill();
          ctx.fillStyle = '#16181c';
          rr(ctx, sx - 7, sy - 18, 14, 36, 4);
          ctx.fill();
          ['red', 'yellow', 'green'].forEach((c, k) => {
            ctx.fillStyle = c === state ? LIGHT[c] : LIGHT_DIM[c];
            ctx.beginPath();
            ctx.arc(sx, sy - 10 + k * 10, 4, 0, TAU);
            ctx.fill();
          });
          ctx.fillStyle = LIGHT[state];
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(sx, sy - 10 + ['red', 'yellow', 'green'].indexOf(state) * 10, 11, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  // ---------- vehicles ----------
  // A window shaped like a trapezoid: x0..x1 along the car, w0/w1 wide at each end.
  function glass(ctx, x0, x1, w0, w1) {
    ctx.fillStyle = lin(x0, 0, x1, 0, [[0, '#1b2735'], [0.5, '#34506d'], [1, '#1b2735']]);
    ctx.beginPath();
    ctx.moveTo(x0, -w0 / 2); ctx.lineTo(x1, -w1 / 2); ctx.lineTo(x1, w1 / 2); ctx.lineTo(x0, w0 / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * 0.25, -w0 / 2 + 1); ctx.lineTo(x0 + (x1 - x0) * 0.45, -w0 / 2 + 1); ctx.lineTo(x0 + (x1 - x0) * 0.2, w0 / 2 - 1); ctx.lineTo(x0, w0 / 2 - 1);
    ctx.closePath();
    ctx.fill();
  }

  // Shiny car body: darker at the sides, bright along the roof line.
  function carBody(ctx, L, Wd, color, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(ctx, -L / 2 + 2, -Wd / 2 + 3, L + 2, Wd + 2, r + 1);
    ctx.fill();
    ctx.fillStyle = '#111';
    for (const wx of [L * 0.3, -L * 0.3]) for (const sy of [-1, 1]) { rr(ctx, wx - 5, sy * (Wd / 2) - 2.5, 10, 5, 2); ctx.fill(); }
    ctx.fillStyle = lin(0, -Wd / 2, 0, Wd / 2, [[0, shade(color, -45)], [0.22, shade(color, 5)], [0.5, shade(color, 30)], [0.78, shade(color, 5)], [1, shade(color, -45)]]);
    rr(ctx, -L / 2, -Wd / 2, L, Wd, r);
    ctx.fill();
  }

  function lights(ctx, L, Wd, braking) {
    ctx.fillStyle = '#fff8d8';
    rr(ctx, L / 2 - 4, -Wd / 2 + 2.5, 3.5, 5, 1.5); ctx.fill();
    rr(ctx, L / 2 - 4, Wd / 2 - 7.5, 3.5, 5, 1.5); ctx.fill();
    ctx.fillStyle = braking ? '#ff3b30' : '#b3302a';
    rr(ctx, -L / 2 + 0.5, -Wd / 2 + 2.5, 3, 5, 1.5); ctx.fill();
    rr(ctx, -L / 2 + 0.5, Wd / 2 - 7.5, 3, 5, 1.5); ctx.fill();
    if (braking) {
      ctx.fillStyle = 'rgba(255,40,30,0.3)';
      ctx.beginPath(); ctx.arc(-L / 2 - 2, -Wd / 2 + 5, 6, 0, TAU); ctx.arc(-L / 2 - 2, Wd / 2 - 5, 6, 0, TAU); ctx.fill();
    }
  }

  function drawCar(ctx, c, opts) {
    const L = c.len, Wd = c.wid;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    if (c.alpha !== undefined && c.alpha < 1) ctx.globalAlpha = Math.max(0, c.alpha);
    carBody(ctx, L, Wd, c.color, c.bus ? 5 : Wd * 0.38);
    ctx.fillStyle = '#1d2733';
    if (c.bus) {
      // school bus: windshield, a row of windows down each side, black stripes
      rr(ctx, L / 2 - 9, -Wd / 2 + 3, 6, Wd - 6, 2);
      ctx.fill();
      for (let k = 0; k < 7; k++) {
        ctx.fillRect(-L / 2 + 8 + k * 9.5, -Wd / 2 + 1, 6.5, 3);
        ctx.fillRect(-L / 2 + 8 + k * 9.5, Wd / 2 - 4, 6.5, 3);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-L / 2 + 4, -2, L - 16, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(-L / 2 + 6, -Wd / 2 + 6, L - 18, Wd - 12);
    } else if (c.van) {
      glass(ctx, L * 0.2, L * 0.34, Wd - 8, Wd - 5);
      ctx.fillStyle = shade(c.color, 18);
      rr(ctx, -L / 2 + 4, -Wd / 2 + 3, L * 0.66, Wd - 6, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-L / 2 + 4 + k * L * 0.165, -Wd / 2 + 4); ctx.lineTo(-L / 2 + 4 + k * L * 0.165, Wd / 2 - 4); ctx.stroke(); }
    } else if (c.pickup) {
      // pickup truck: cab up front, open bed at the back
      glass(ctx, L * 0.12, L * 0.28, Wd - 8, Wd - 5);
      ctx.fillStyle = shade(c.color, 20);
      rr(ctx, -L * 0.06, -Wd / 2 + 3, L * 0.18, Wd - 6, 3);
      ctx.fill();
      ctx.fillStyle = '#2b2f36';
      rr(ctx, -L / 2 + 3, -Wd / 2 + 3, L * 0.4, Wd - 6, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-L / 2 + 3, -Wd / 2 + 3 + k * (Wd - 6) / 4); ctx.lineTo(-L / 2 + 3 + L * 0.4, -Wd / 2 + 3 + k * (Wd - 6) / 4); ctx.stroke(); }
    } else {
      glass(ctx, L * 0.05, L * 0.25, Wd - 8, Wd - 4);
      glass(ctx, -L * 0.37, -L * 0.24, Wd - 5, Wd - 8);
      ctx.fillStyle = lin(0, -Wd / 2, 0, Wd / 2, [[0, shade(c.color, -10)], [0.5, shade(c.color, 40)], [1, shade(c.color, -10)]]);
      rr(ctx, -L * 0.24, -Wd / 2 + 3.5, L * 0.29, Wd - 7, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(30,40,55,0.6)';
      ctx.fillRect(-L * 0.22, -Wd / 2 + 2, L * 0.26, 1.6);
      ctx.fillRect(-L * 0.22, Wd / 2 - 3.6, L * 0.26, 1.6);
    }
    // side mirrors
    ctx.fillStyle = shade(c.color, -30);
    ctx.beginPath(); ctx.ellipse(L * 0.16, -Wd / 2 - 1.5, 2.5, 1.8, 0, 0, TAU); ctx.ellipse(L * 0.16, Wd / 2 + 1.5, 2.5, 1.8, 0, 0, TAU); ctx.fill();
    lights(ctx, L, Wd, c.braking);
    if (c.taxi) {
      // roof sign with a checker strip
      ctx.fillStyle = '#1d1f24';
      rr(ctx, -L * 0.13, -5, 9, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#fff6c8';
      rr(ctx, -L * 0.13 + 1.5, -3.5, 6, 7, 1.5);
      ctx.fill();
      ctx.fillStyle = '#1d1f24';
      for (let k = 0; k < 6; k++) ctx.fillRect(-L / 2 + 3 + k * 5, (k % 2 ? -Wd / 2 + 1 : Wd / 2 - 3), 2.5, 2);
    }
    if (c.vip) {
      // gold racing stripes and a little sparkle
      ctx.fillStyle = '#e8b931';
      ctx.fillRect(-L / 2 + 2, -3.5, L - 4, 2.5);
      ctx.fillRect(-L / 2 + 2, 1, L - 4, 2.5);
      const tw = (Date.now() / 300) % 1;
      ctx.fillStyle = `rgba(255,236,150,${1 - tw})`;
      ctx.beginPath();
      ctx.arc(L * 0.25, -Wd * 0.3, 2 + tw * 4, 0, TAU);
      ctx.fill();
    }
    if (c.wreck) {
      // crumpled and scorched
      ctx.fillStyle = 'rgba(20,20,20,0.55)';
      ctx.beginPath();
      ctx.ellipse(L * 0.3, 0, L * 0.25, Wd * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(L * 0.1, -Wd / 2); ctx.lineTo(L * 0.2, -2); ctx.lineTo(L * 0.12, Wd / 2);
      ctx.stroke();
    }
    if (opts.hazard) {
      ctx.fillStyle = '#ffae00';
      for (const [hx, hy] of [[L / 2 - 4, -Wd / 2], [L / 2 - 4, Wd / 2 - 4], [-L / 2, -Wd / 2], [-L / 2, Wd / 2 - 4]]) {
        ctx.fillRect(hx, hy, 4, 4);
      }
      ctx.fillStyle = 'rgba(255,174,0,0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, L * 0.75, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTruck(ctx, t, color, lightsOn, clock) {
    const L = t.len, Wd = t.wid;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    if (t.alpha !== undefined && t.alpha < 1) ctx.globalAlpha = Math.max(0, t.alpha);
    // a quick squash when you hit something
    if (t.bump > 0) ctx.scale(1 - 0.07 * t.bump, 1 + 0.08 * t.bump);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    rr(ctx, -L / 2 + 2, -Wd / 2 + 3, L + 3, Wd + 2, 6);
    ctx.fill();
    ctx.fillStyle = "#111";
    for (const wx of [-L * 0.18, -L * 0.36]) for (const sy of [-1, 1]) { rr(ctx, wx - 5, sy * (Wd / 2) - 2.5, 10, 5, 2); ctx.fill(); }
    // the front wheels turn with the steering
    for (const sy of [-1, 1]) {
      ctx.save();
      ctx.translate(L * 0.32, sy * (Wd / 2));
      ctx.rotate((t.steer || 0) * 0.5);
      rr(ctx, -5, -2.5, 10, 5, 2);
      ctx.fill();
      ctx.restore();
    }
    // flatbed with diamond-plate steel
    ctx.fillStyle = lin(0, -Wd / 2, 0, Wd / 2, [[0, '#3a3f47'], [0.5, '#6b727d'], [1, '#3a3f47']]);
    rr(ctx, -L / 2, -Wd / 2, L * 0.62, Wd, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let k = -L / 2 + 4; k < L * 0.1; k += 5) { ctx.beginPath(); ctx.moveTo(k, -Wd / 2 + 4); ctx.lineTo(k + 3, Wd / 2 - 4); ctx.stroke(); }
    ctx.fillStyle = shade(color, -20);
    ctx.fillRect(-L / 2 + 1, -Wd / 2 + 1, L * 0.6, 2.5);
    ctx.fillRect(-L / 2 + 1, Wd / 2 - 3.5, L * 0.6, 2.5);
    // tow boom with its hydraulic arm and hook
    ctx.strokeStyle = '#22252a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-L / 2 - 2, 0); ctx.stroke();
    ctx.strokeStyle = '#9aa3ae';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(-L / 2, -1); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#c9a227';
    ctx.beginPath(); ctx.arc(-L / 2 - 4, 0, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#22252a';
    ctx.beginPath(); ctx.arc(-L / 2 - 4, 0, 2, 0, TAU); ctx.fill();
    // cab
    ctx.fillStyle = lin(0, -Wd / 2, 0, Wd / 2, [[0, shade(color, -45)], [0.25, shade(color, 5)], [0.5, shade(color, 35)], [0.75, shade(color, 5)], [1, shade(color, -45)]]);
    rr(ctx, L * 0.1, -Wd / 2, L * 0.4, Wd, 6);
    ctx.fill();
    glass(ctx, L * 0.3, L * 0.43, Wd - 8, Wd - 5);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(L * 0.13, -Wd / 2 + 3, L * 0.15, 2);
    // chrome bumper and exhaust stacks
    ctx.fillStyle = lin(0, -Wd / 2, 0, Wd / 2, [[0, '#9aa3ae'], [0.5, '#f2f4f7'], [1, '#9aa3ae']]);
    rr(ctx, L / 2 - 2, -Wd / 2 + 1, 3, Wd - 2, 1.5);
    ctx.fill();
    for (const sy of [-1, 1]) { ctx.fillStyle = '#c8ced6'; ctx.beginPath(); ctx.arc(L * 0.11, sy * (Wd / 2 - 3), 2.2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = shade(color, -30);
    ctx.beginPath(); ctx.ellipse(L * 0.36, -Wd / 2 - 1.8, 2.6, 2, 0, 0, TAU); ctx.ellipse(L * 0.36, Wd / 2 + 1.8, 2.6, 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff8d8';
    rr(ctx, L / 2 - 4, -Wd / 2 + 2.5, 3.5, 5, 1.5); ctx.fill();
    rr(ctx, L / 2 - 4, Wd / 2 - 7.5, 3.5, 5, 1.5); ctx.fill();
    // tail lights, bright when braking
    ctx.fillStyle = t.braking ? "#ff3b30" : "#9c2a24";
    rr(ctx, -L / 2, -Wd / 2 + 1, 3, 4, 1); ctx.fill();
    rr(ctx, -L / 2, Wd / 2 - 5, 3, 4, 1); ctx.fill();
    if (t.braking) {
      ctx.fillStyle = "rgba(255,40,30,0.3)";
      ctx.beginPath(); ctx.arc(-L / 2 - 2, -Wd / 2 + 3, 7, 0, TAU); ctx.arc(-L / 2 - 2, Wd / 2 - 3, 7, 0, TAU); ctx.fill();
    }
    // light bar
    const blink = Math.floor(clock * 6) % 2 === 0;
    ctx.fillStyle = '#333';
    ctx.fillRect(L * 0.14, -Wd / 2 + 1, 5, Wd - 2);
    if (lightsOn) {
      ctx.fillStyle = blink ? '#ffb000' : '#5a4100';
      ctx.fillRect(L * 0.14, -Wd / 2 + 1, 5, Wd / 2 - 1);
      ctx.fillStyle = blink ? '#5a4100' : '#ffb000';
      ctx.fillRect(L * 0.14, 0, 5, Wd / 2 - 1);
      ctx.fillStyle = 'rgba(255,176,0,0.18)';
      ctx.beginPath();
      ctx.arc(L * 0.16, blink ? -8 : 8, 26, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPolice(ctx, p, chasing, clock) {
    const L = p.len, Wd = p.wid;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (p.alpha !== undefined && p.alpha < 1) ctx.globalAlpha = Math.max(0, p.alpha);
    carBody(ctx, L, Wd, '#f4f6f8', Wd * 0.38);
    // black hood and trunk, like a real cruiser
    ctx.fillStyle = lin(0, -Wd / 2, 0, Wd / 2, [[0, '#0d1018'], [0.5, '#2e3546'], [1, '#0d1018']]);
    rr(ctx, L / 2 - 12, -Wd / 2, 12, Wd, Wd * 0.38);
    ctx.fill();
    rr(ctx, -L / 2, -Wd / 2, 10, Wd, Wd * 0.38);
    ctx.fill();
    glass(ctx, L * 0.08, L * 0.26, Wd - 8, Wd - 4);
    glass(ctx, -L * 0.36, -L * 0.24, Wd - 5, Wd - 8);
    lights(ctx, L, Wd, false);
    // light bar: red and blue, flashing during a chase
    const flip = Math.floor(clock * 8) % 2 === 0;
    ctx.fillStyle = chasing ? (flip ? '#ff2d2d' : '#5a1111') : '#7a2a2a';
    ctx.fillRect(-4, -Wd / 2 + 2, 6, Wd / 2 - 2);
    ctx.fillStyle = chasing ? (flip ? '#1f2a5a' : '#2d6bff') : '#2a3f7a';
    ctx.fillRect(-4, 0, 6, Wd / 2 - 2);
    if (chasing) {
      ctx.fillStyle = flip ? 'rgba(255,45,45,0.3)' : 'rgba(45,107,255,0.3)';
      ctx.beginPath();
      ctx.arc(-1, flip ? -6 : 6, 30, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(L / 2 - 3, -Wd / 2 + 2, 3, 5);
    ctx.fillRect(L / 2 - 3, Wd / 2 - 7, 3, 5);
    ctx.restore();
  }

  function drawNoParking(ctx, x, y) {
    ctx.fillStyle = '#555';
    ctx.fillRect(x - 2, y - 2, 4, 14);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y - 10, 13, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d6332a';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = '#1d5fbf';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', x, y - 9);
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 18);
    ctx.lineTo(x + 8, y - 2);
    ctx.stroke();
  }

  // Orange cones around a crash.
  function drawCones(ctx, c) {
    const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    for (const [a, s] of [[-70, -30], [-40, -34], [120, -30], [150, -26]]) {
      const x = c.x + fx * a - fy * s, y = c.y + fy * a + fx * s;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, TAU);
      ctx.fill();
    }
  }

  // The angry owner of an illegally parked car, coming to get it back.
  function drawOwner(ctx, o, clock) {
    drawCar(ctx, o, {});
    if (o.leaving) return;
    const bob = Math.sin(clock * 8) * 3;
    ctx.fillStyle = '#ff503c';
    ctx.beginPath();
    ctx.arc(o.x, o.y - 38 + bob, 13, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', o.x, o.y - 37 + bob);
  }

  // ---------- street pickups ----------
  function pickupIcon(ctx, kind, s) {
    // drawn centred on 0,0 inside a disc of radius s
    ctx.lineJoin = 'round';
    if (kind === 'cash') {
      ctx.fillStyle = '#3f9a52';
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.2); ctx.quadraticCurveTo(-s * 0.7, s * 0.7, 0, s * 0.68); ctx.quadraticCurveTo(s * 0.7, s * 0.7, s * 0.55, -s * 0.2);
      ctx.quadraticCurveTo(0, -s * 0.45, -s * 0.55, -s * 0.2);
      ctx.fill();
      ctx.fillStyle = '#2d7a3e';
      ctx.fillRect(-s * 0.25, -s * 0.58, s * 0.5, s * 0.3);
      ctx.fillStyle = '#e9ffe9';
      ctx.font = `900 ${Math.round(s * 0.8)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, s * 0.22);
    } else if (kind === 'nitro') {
      ctx.fillStyle = lin(-s * 0.4, 0, s * 0.4, 0, [[0, '#1d6fd1'], [0.45, '#6fd0ff'], [1, '#1d6fd1']]);
      rr(ctx, -s * 0.38, -s * 0.5, s * 0.76, s * 1.15, s * 0.3);
      ctx.fill();
      ctx.fillStyle = '#c9ced8';
      ctx.fillRect(-s * 0.16, -s * 0.72, s * 0.32, s * 0.24);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(s * 0.08, -s * 0.32); ctx.lineTo(-s * 0.2, s * 0.12); ctx.lineTo(0, s * 0.12); ctx.lineTo(-s * 0.08, s * 0.5); ctx.lineTo(s * 0.22, 0); ctx.lineTo(0, 0);
      ctx.closePath(); ctx.fill();
    } else if (kind === 'shield') {
      ctx.fillStyle = lin(0, -s * 0.7, 0, s * 0.7, [[0, '#e6f6ff'], [1, '#5aa9e6']]);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.7); ctx.lineTo(s * 0.6, -s * 0.45); ctx.lineTo(s * 0.55, s * 0.1); ctx.quadraticCurveTo(s * 0.4, s * 0.55, 0, s * 0.75);
      ctx.quadraticCurveTo(-s * 0.4, s * 0.55, -s * 0.55, s * 0.1); ctx.lineTo(-s * 0.6, -s * 0.45); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2a6fb0'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-s * 0.08, -s * 0.45, s * 0.16, s * 0.8);
      ctx.fillRect(-s * 0.35, -s * 0.12, s * 0.7, s * 0.16);
    } else if (kind === 'jammer') {
      ctx.fillStyle = '#4a2d7a';
      rr(ctx, -s * 0.45, -s * 0.2, s * 0.9, s * 0.75, s * 0.15); ctx.fill();
      ctx.fillStyle = '#c69bff';
      ctx.beginPath(); ctx.arc(-s * 0.12, s * 0.17, s * 0.18, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(s * 0.15, 0, s * 0.18, s * 0.1); ctx.fillRect(s * 0.15, s * 0.2, s * 0.18, s * 0.1);
      ctx.strokeStyle = '#e8d9ff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.2); ctx.lineTo(s * 0.45, -s * 0.62); ctx.stroke();
      for (const r of [0.22, 0.42]) { ctx.beginPath(); ctx.arc(s * 0.45, -s * 0.62, s * r, -2.4, -0.7); ctx.stroke(); }
      ctx.lineCap = 'butt';
    } else {
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath(); ctx.arc(0, s * 0.08, s * 0.58, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c98a00'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#c98a00'; ctx.fillRect(-s * 0.12, -s * 0.72, s * 0.24, s * 0.2);
      ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, s * 0.08); ctx.lineTo(0, -s * 0.3); ctx.moveTo(0, s * 0.08); ctx.lineTo(s * 0.26, s * 0.2); ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  function drawPickups(ctx, g, v) {
    for (const p of g.pickups) {
      if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1) continue;
      const col = Extras.PICK_COLOR[p.kind];
      const bob = Math.sin(p.t * 3) * 4, sc = p.born * (1 + 0.06 * Math.sin(p.t * 6));
      // shadow on the road
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 10, 17 * sc, 7 * sc, 0, 0, TAU); ctx.fill();
      // glowing beacon ring
      const pulse = (p.t * 0.9) % 1;
      ctx.strokeStyle = col;
      ctx.globalAlpha = (1 - pulse) * 0.7 * p.born;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 22 + pulse * 26, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(p.x, p.y - 6 + bob);
      ctx.scale(sc, sc);
      ctx.fillStyle = rad(-6, -6, 2, 26, [[0, '#ffffff'], [0.25, col], [1, shade(col, -70)]]);
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(15,18,24,0.55)';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
      pickupIcon(ctx, p.kind, 15);
      ctx.restore();
    }
  }

  // Shield bubble and jammer waves around your truck.
  function drawTruckFx(ctx, g) {
    const t = g.truck;
    if (t.shield) {
      const a = g.clock * 2;
      ctx.fillStyle = rad(t.x, t.y, 20, 46, [[0, 'rgba(159,216,255,0)'], [0.75, 'rgba(159,216,255,0.12)'], [1, 'rgba(159,216,255,0.45)']]);
      ctx.beginPath(); ctx.arc(t.x, t.y, 46, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(t.x, t.y, 45, a, a + 1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(t.x, t.y, 45, a + Math.PI, a + Math.PI + 0.7); ctx.stroke();
    }
    if (g.jammer > 0) {
      const k = (g.clock * 1.5) % 1;
      for (const off of [0, 0.5]) {
        const q = (k + off) % 1;
        ctx.strokeStyle = `rgba(198,155,255,${(1 - q) * 0.6})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(t.x, t.y, 30 + q * 50, 0, TAU); ctx.stroke();
      }
    }
  }

  // Headlights and lamp glow once the sun goes down. Drawn with additive blending.
  function drawNightLights(ctx, g, v) {
    if (dusk <= 0.05) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = (c, len, a) => {
      if (c.x < v.x0 - 100 || c.x > v.x1 + 100 || c.y < v.y0 - 100 || c.y > v.y1 + 100) return;
      if (c.alpha !== undefined && c.alpha < 0.5) return;
      const fx = Math.cos(c.angle), fy = Math.sin(c.angle), sx = -fy, sy = fx;
      const x0 = c.x + fx * c.len * 0.45, y0 = c.y + fy * c.len * 0.45;
      const g2 = ctx.createRadialGradient(x0, y0, 4, x0, y0, len);
      g2.addColorStop(0, `rgba(255,236,170,${0.5 * a})`);
      g2.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(x0 + sx * 8, y0 + sy * 8);
      ctx.lineTo(x0 + fx * len + sx * len * 0.45, y0 + fy * len + sy * len * 0.45);
      ctx.lineTo(x0 + fx * len - sx * len * 0.45, y0 + fy * len - sy * len * 0.45);
      ctx.lineTo(x0 - sx * 8, y0 - sy * 8);
      ctx.closePath();
      ctx.fill();
    };
    for (const f of g.traffic) beam(f, 110, dusk);
    for (const r of g.rivals) beam(r, 120, dusk);
    for (const p of g.police) beam(p, 120, dusk);
    if (!(g.jail > 0)) beam(g.truck, 170, dusk);
    ctx.restore();
  }

  // ---------- effects ----------
  function drawSkids(ctx, g) {
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    for (const s of g.skids) {
      ctx.strokeStyle = `rgba(20,20,22,${0.35 * Math.min(1, s.life / 3)})`;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function drawParticles(ctx, g) {
    for (const p of g.parts) {
      const k = p.life / p.max;
      if (p.type === 'spark') {
        ctx.strokeStyle = `rgba(255,${180 + Math.floor(k * 60)},60,${k})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color || '#5ee07a';
        ctx.globalAlpha = k;
        ctx.lineWidth = 6 * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 30 + (1 - k) * 90, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.type === 'coin') {
        ctx.globalAlpha = Math.min(1, k * 2);
        const sx = Math.abs(Math.cos(p.rot || 0));
        ctx.fillStyle = '#b8860b';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 1.5, 7 * sx + 1, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 7 * sx + 1, 7, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.type === 'flame') {
        ctx.fillStyle = `rgba(255,${Math.floor(90 + k * 150)},${Math.floor(40 + k * 60)},${k})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.7), 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${p.shade},${p.shade},${p.shade},${k * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawGps(ctx, g) {
    if (!g.gps || g.gps.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,210,63,0.28)';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.setLineDash([22, 22]);
    ctx.lineDashOffset = -g.clock * 80;
    ctx.beginPath();
    g.gps.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }

  function drawGoalMarker(ctx, g) {
    const j = g.job;
    if (j.state !== 'call') return;
    const c = j.car;
    const pulse = (g.clock * 1.2) % 1;
    ctx.strokeStyle = `rgba(255,80,60,${1 - pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 30 + pulse * 60, 0, TAU);
    ctx.stroke();
    const bob = Math.sin(g.clock * 6) * 6;
    ctx.fillStyle = '#ff503c';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 34 + bob);
    ctx.lineTo(c.x - 14, c.y - 58 + bob);
    ctx.lineTo(c.x + 14, c.y - 58 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(money(j.reward), c.x, c.y - 62 + bob);
  }

  function drawFloaters(ctx, g) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of g.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.font = `bold 24px ${DISPLAY}`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- HUD ----------
  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = lin(0, y, 0, y + h, [[0, 'rgba(34,38,48,0.86)'], [1, 'rgba(14,16,22,0.86)']]);
    rr(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
    ctx.font = size >= 22 ? `600 ${size}px ${DISPLAY}` : `${weight === 'bold' ? 800 : 600} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  function drawMinimap(ctx, g, sw, sh) {
    const m = Math.round(Math.max(110, Math.min(200, sw * 0.24, Math.min(sw, sh) * 0.26)));
    const x0 = sw - m - 16, y0 = sh - m - 16;
    panel(ctx, x0 - 6, y0 - 6, m + 12, m + 12);
    const span = W.SIZE + W.HALF * 2;
    const s = m / span;
    const mx = (x) => x0 + (x + W.HALF) * s, my = (y) => y0 + (y + W.HALF) * s;
    ctx.fillStyle = '#2e4428';
    ctx.fillRect(x0, y0, m, m);
    ctx.fillStyle = '#5d6169';
    const rw = Math.max(2, C.road * s);
    for (let k = 0; k <= W.N; k++) {
      ctx.fillRect(x0, my(k * W.CELL) - rw / 2, m, rw);
      ctx.fillRect(mx(k * W.CELL) - rw / 2, y0, rw, m);
    }
    const y = W.yard;
    ctx.fillStyle = g.job.state === 'towing' && Math.floor(g.clock * 3) % 2 ? '#5ee07a' : '#f4c20d';
    ctx.fillRect(mx(y.x), my(y.y), y.w * s, y.h * s);
    if (g.gps) {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      g.gps.forEach((p, k) => (k ? ctx.lineTo(mx(p.x), my(p.y)) : ctx.moveTo(mx(p.x), my(p.y))));
      ctx.stroke();
    }
    for (const p of g.pickups) {
      ctx.fillStyle = Extras.PICK_COLOR[p.kind];
      ctx.fillRect(mx(p.x) - 1.5, my(p.y) - 1.5, 3, 3);
    }
    if (g.owner && !g.owner.leaving) {
      ctx.fillStyle = '#ff503c';
      ctx.beginPath();
      ctx.arc(mx(g.owner.x), my(g.owner.y), 4.5, 0, TAU);
      ctx.fill();
    }
    for (const r of g.rivals) {
      ctx.fillStyle = r.company.color;
      ctx.beginPath();
      ctx.arc(mx(r.x), my(r.y), 4, 0, TAU);
      ctx.fill();
    }
    const st = W.station;
    ctx.fillStyle = '#2f5597';
    ctx.fillRect(mx(st.x), my(st.y), st.w * s, st.h * s);
    const flip = Math.floor(g.clock * 8) % 2 === 0;
    for (const p of g.police) {
      const chasing = p.mode === 'chase';
      ctx.fillStyle = chasing ? (flip ? '#ff2d2d' : '#2d6bff') : '#9fc0ff';
      ctx.beginPath();
      ctx.arc(mx(p.x), my(p.y), chasing ? 4.5 : 3, 0, TAU);
      ctx.fill();
    }
    if (g.job.state === 'call' && Math.floor(g.clock * 4) % 2) {
      ctx.fillStyle = '#ff503c';
      ctx.beginPath();
      ctx.arc(mx(g.job.car.x), my(g.job.car.y), 5, 0, TAU);
      ctx.fill();
    }
    const t = g.truck;
    ctx.save();
    ctx.translate(mx(t.x), my(t.y));
    ctx.rotate(t.angle);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawEdgeArrow(ctx, g, sw, sh) {
    const goal = Jobs.goal(g);
    if (!goal) return;
    const z = g.cam.zoom;
    const sx = sw / 2 + (goal.x - g.cam.x) * z, sy = sh / 2 + (goal.y - g.cam.y) * z;
    const pad = 60;
    if (sx > pad && sx < sw - pad && sy > pad + 90 && sy < sh - pad) return;
    const dx = sx - sw / 2, dy = sy - sh / 2;
    const k = Math.min((sw / 2 - pad) / Math.abs(dx || 1e-6), (sh / 2 - pad) / Math.abs(dy || 1e-6));
    const ax = sw / 2 + dx * k, ay = Math.max(pad + 90, sh / 2 + dy * k);
    const ang = Math.atan2(dy, dx);
    const color = goal.label === 'CAR' ? '#ff503c' : '#5ee07a';
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-12, -16);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-12, 16);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    const meters = Math.round(Math.hypot(goal.x - g.truck.x, goal.y - g.truck.y) / 8);
    const lx = ax - Math.cos(ang) * 40, ly = ay - Math.sin(ang) * 34;
    text(ctx, `${goal.label} ${meters}m`, lx, ly, 14, '#fff', 'center');
  }

  let jobBottom = 0;
  function drawJobPanel(ctx, g, sw) {
    const j = g.job;
    // Sits between the money and clock panels, or drops below them on narrow screens.
    const narrow = sw < 760;
    const w = narrow ? sw - 32 : Math.min(420, sw - 360), x = (sw - w) / 2, y = narrow ? 92 : 16;
    const lines = [];
    if (j.state === 'waiting') {
      panel(ctx, x, y, w, 52);
      jobBottom = y + 52;
      text(ctx, g.time > 0 ? 'Waiting for the next call...' : 'Shift over!', x + w / 2, y + 26, 18, '#c9ced8', 'center');
      return;
    }
    const type = Jobs.TYPES[j.type];
    if (j.state === 'call') {
      const others = g.rivals.filter((r) => r.state === 'toJob');
      for (const r of others) lines.push({ color: r.company.color, s: `${r.company.name}: ${Math.round(Math.hypot(r.x - j.car.x, r.y - j.car.y) / 8)}m away` });
      const h = 98 + lines.length * 20;
      panel(ctx, x, y, w, h);
      jobBottom = y + h;
      text(ctx, `CALL: ${type.title}`, x + 16, y + 22, 15, '#ff8a7a');
      text(ctx, money(j.reward), x + w - 16, y + 30, 32, j.reward > j.startReward * 0.5 ? '#5ee07a' : '#ffd23f', 'right');
      const you = Math.round(Math.hypot(g.truck.x - j.car.x, g.truck.y - j.car.y) / 8);
      text(ctx, `You: ${you}m away`, x + 16, y + 46, 14, '#ffd23f');
      text(ctx, type.rule, x + 16, y + 66, 13, '#7af0ff', 'left', 'normal');
      if (j.type === 'parked') text(ctx, 'No rivals on this one', x + 16, y + 86, 14, '#c9ced8', 'left', 'normal');
      else if (!j.dispatched) text(ctx, `Rivals head out in ${Math.ceil(j.rivalTimer)}s`, x + 16, y + 86, 14, '#c9ced8', 'left', 'normal');
      else if (!lines.length) text(ctx, 'Rivals turned back', x + 16, y + 86, 14, '#c9ced8', 'left', 'normal');
      lines.forEach((l, k) => text(ctx, l.s, x + 16, y + 86 + k * 20, 14, l.color));
      return;
    }
    // towing
    const extra = j.type === 'vip' || j.type === 'parked' || j.type === 'big';
    panel(ctx, x, y, w, extra ? 90 : 64);
    jobBottom = y + (extra ? 90 : 64);
    text(ctx, g.overtime ? 'OVERTIME: finish the tow!' : 'Haul it to your yard', x + 16, y + 22, 16, '#5ee07a');
    const pay = j.type === 'vip' ? Math.round(j.payout * j.condition) : j.payout;
    text(ctx, `Payout ${money(pay)} + ${money(C.towFee)} fee`, x + 16, y + 44, 14, '#c9ced8', 'left', 'normal');
    const meters = Math.round(Math.hypot(g.truck.x - (W.yard.x + W.yard.w / 2), g.truck.y - (W.yard.y + W.yard.h / 2)) / 8);
    text(ctx, `${meters}m`, x + w - 16, y + 32, 26, '#fff', 'right');
    if (j.type === 'vip') {
      const c = j.condition;
      bar(ctx, x + 16, y + 62, w - 32, 'Condition', c, c > 0.7 ? '#5ee07a' : c > 0.45 ? '#ffd23f' : '#ff6b5a');
    } else if (j.type === 'parked') {
      if (g.owner && !g.owner.leaving) bar(ctx, x + 16, y + 62, w - 32, 'Owner', j.grab, '#ff503c');
      else text(ctx, j.ownerTimer > 0 ? 'The owner is coming...' : 'The owner gave up', x + 16, y + 68, 13, j.ownerTimer > 0 ? '#ff8a7a' : '#5ee07a', 'left', 'normal');
    } else if (j.type === 'big') {
      text(ctx, 'Heavy load - brake early for corners', x + 16, y + 68, 13, '#7af0ff', 'left', 'normal');
    }
  }

  function bar(ctx, x, y, w, label, value, color) {
    text(ctx, label, x, y + 6, 13, '#c9ced8', 'left', 'normal');
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, x + 72, y, w - 72, 12, 6);
    ctx.fill();
    ctx.fillStyle = color;
    rr(ctx, x + 72, y, Math.max(0, Math.min(1, value)) * (w - 72), 12, 6);
    ctx.fill();
  }

  // Police chase status: how close you are to escaping, and how close to getting arrested.
  function drawWanted(ctx, g, sw, sh) {
    if (!g.wanted) return;
    const narrow = sw < 760;
    const w = Math.min(340, sw - 32), x = (sw - w) / 2, y = narrow ? jobBottom + 10 : sh - 220;
    const flip = Math.floor(g.clock * 6) % 2 === 0;
    panel(ctx, x, y, w, 92);
    ctx.strokeStyle = flip ? '#ff2d2d' : '#2d6bff';
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, 92, 12);
    ctx.stroke();
    text(ctx, 'POLICE CHASE', x + 16, y + 20, 18, flip ? '#ff6b5a' : '#6f9dff');
    text(ctx, g.wanted.reason, x + w - 16, y + 20, 13, '#c9ced8', 'right', 'normal');
    bar(ctx, x + 16, y + 40, w - 32, 'Escape', g.wanted.escape / (g.stats.escapeSeconds || C.police.escapeSeconds), '#5ee07a');
    bar(ctx, x + 16, y + 64, w - 32, 'Busted', g.bust, '#ff503c');
  }

  function drawNitro(ctx, g, sh) {
    const t = g.truck;
    const x = 200, y = sh - 66, w = 150;
    panel(ctx, x, y, w, 50);
    const glow = t.boosting && Math.floor(g.clock * 12) % 2 === 0;
    text(ctx, 'NITRO', x + 12, y + 16, 12, glow ? '#ffd23f' : '#c9ced8', 'left', 'bold');
    text(ctx, t.nitro > 0.05 ? (touchUI ? 'tap NITRO' : 'SHIFT') : 'drift to fill', x + w - 12, y + 16, 11, '#8a909c', 'right', 'normal');
    nitroBar(ctx, g, x + 12, y + 28, w - 24, 12);
  }

  function nitroBar(ctx, g, x, y, w, h) {
    const t = g.truck;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#2fa3ff');
    grad.addColorStop(1, '#7af0ff');
    ctx.fillStyle = grad;
    if (t.nitro > 0.01) { rr(ctx, x, y, Math.max(h, w * t.nitro), h, h / 2); ctx.fill(); }
    if (t.nitro >= 0.999) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(g.clock * 8)})`;
      ctx.lineWidth = 1.5;
      rr(ctx, x - 1, y - 1, w + 2, h + 2, h / 2 + 1);
      ctx.stroke();
    }
  }

  // Live drift score while you're sliding, then the result when it pays out.
  function drawDriftMeter(ctx, g, sw, sh) {
    const d = g.drift;
    const cx = sw / 2, cy = sh * 0.64;
    const live = d.points > 0 && (d.active || d.grace > 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (live) {
      const s = Math.round(d.points * d.combo);
      const pulse = d.active ? 1 + 0.04 * Math.sin(g.clock * 20) : 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.font = `bold 16px ${FONT}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      const label = g.truck.towing ? 'TOW DRIFT' : 'DRIFT';
      ctx.strokeText(label, 0, -30);
      ctx.fillStyle = '#ffd23f';
      ctx.fillText(label, 0, -30);
      ctx.font = `bold 40px ${DISPLAY}`;
      ctx.lineWidth = 6;
      ctx.strokeText(s.toLocaleString(), 0, 4);
      ctx.fillStyle = '#fff';
      ctx.fillText(s.toLocaleString(), 0, 4);
      if (d.combo > 1) {
        ctx.font = `bold 26px ${DISPLAY}`;
        const comboColors = ['#fff', '#fff', '#7af0ff', '#5ee07a', '#ffd23f', '#ff6b3d'];
        ctx.strokeText(`x${d.combo}`, 0, 40);
        ctx.fillStyle = comboColors[d.combo];
        ctx.fillText(`x${d.combo}`, 0, 40);
      }
      ctx.restore();
      // chain timer: start the next drift before it runs out to keep the combo
      if (!d.active) {
        const w = 120, k = Math.max(0, d.grace / C.drift.chainTime);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        rr(ctx, cx - w / 2, cy + 62, w, 6, 3);
        ctx.fill();
        ctx.fillStyle = '#ffd23f';
        rr(ctx, cx - (w * k) / 2, cy + 62, w * k, 6, 3);
        ctx.fill();
      }
    } else if (d.flash) {
      const f = d.flash;
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = `bold 30px ${DISPLAY}`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(f.label, cx, cy - 10);
      ctx.fillStyle = f.failed ? '#ff6b5a' : '#ffd23f';
      ctx.fillText(f.label, cx, cy - 10);
      ctx.font = `bold 18px ${FONT}`;
      ctx.lineWidth = 4;
      const sub = f.failed ? `lost ${f.score.toLocaleString()} points` : `${f.score.toLocaleString()} pts   +$${f.cash}   +nitro`;
      ctx.strokeText(sub, cx, cy + 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(sub, cx, cy + 22);
      ctx.globalAlpha = 1;
    }
  }

  function drawJail(ctx, g, sw, sh) {
    ctx.fillStyle = 'rgba(8,10,14,0.6)';
    ctx.fillRect(0, 0, sw, sh);
    // bars with a bit of shine
    for (let x = 30; x < sw; x += 70) {
      ctx.fillStyle = lin(x, 0, x + 12, 0, [[0, 'rgba(90,96,106,0.85)'], [0.4, 'rgba(210,216,226,0.85)'], [1, 'rgba(90,96,106,0.85)']]);
      ctx.fillRect(x, 0, 12, sh);
    }
    ctx.fillStyle = 'rgba(150,156,166,0.75)';
    ctx.fillRect(0, sh * 0.18, sw, 12);
    ctx.fillRect(0, sh * 0.82, sw, 12);
    const w = Math.min(380, sw - 40), x = (sw - w) / 2, y = sh / 2 - 110;
    panel(ctx, x, y, w, 214);
    text(ctx, 'IN JAIL', sw / 2, y + 38, 36, '#ff6b5a', 'center');
    // countdown ring
    const k = Math.max(0, g.jail / C.police.jailSeconds);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(sw / 2, y + 96, 30, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ff6b5a';
    ctx.beginPath(); ctx.arc(sw / 2, y + 96, 30, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
    text(ctx, `${Math.ceil(g.jail)}`, sw / 2, y + 97, 30, '#fff', 'center');
    text(ctx, 'seconds until you get out', sw / 2, y + 142, 15, '#c9ced8', 'center', 'normal');
    text(ctx, 'The shift clock is still ticking...', sw / 2, y + 164, 13, '#8a909c', 'center', 'normal');
    const bail = g.stats.bail || C.bail;
    const canPay = g.money + g.bankAtStart >= bail;
    const how = touchUI ? 'Tap HOOK' : 'Press B';
    text(ctx, canPay ? `${how} to pay ${money(bail)} bail` : `Bail is ${money(bail)} - not enough cash`, sw / 2, y + 194, 16, canPay ? '#ffd23f' : '#8a909c', 'center');
  }

  // Text that shrinks to fit the screen.
  function fitFont(ctx, s, size, font, maxW) {
    ctx.font = `bold ${size}px ${font}`;
    const w = ctx.measureText(s).width;
    if (w > maxW) { size = Math.max(10, Math.floor((size * maxW) / w)); ctx.font = `bold ${size}px ${font}`; }
    return size;
  }

  // Bonus goals for this shift, with progress.
  function drawContracts(ctx, g, x, y, w) {
    const list = g.contracts;
    if (!list || !list.length) return;
    const h = 30 + list.length * 22;
    panel(ctx, x, y, w, h);
    text(ctx, 'CONTRACTS', x + 12, y + 15, 11, '#f4c20d', 'left', 'bold');
    const doneN = list.filter((c) => c.done).length;
    text(ctx, `${doneN}/${list.length}`, x + w - 12, y + 15, 11, '#8a909c', 'right', 'bold');
    list.forEach((c, k) => {
      const cy = y + 34 + k * 22;
      const cur = Math.min(c.need, Math.floor(c.cur(g)));
      ctx.fillStyle = c.done ? '#2e7d4a' : 'rgba(255,255,255,0.1)';
      rr(ctx, x + 10, cy - 8, 16, 16, 4);
      ctx.fill();
      if (c.done) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x + 13.5, cy); ctx.lineTo(x + 17, cy + 3.5); ctx.lineTo(x + 23, cy - 4); ctx.stroke();
      }
      ctx.font = `600 12px ${FONT}`;
      let label = c.text;
      const room = w - 44 - (c.need > 1 && !c.done ? 44 : 0) - (c.endOnly ? 40 : 0);
      while (ctx.measureText(label + '...').width > room && label.length > 4) label = label.slice(0, -1);
      if (label !== c.text) label = label.trimEnd() + '...';
      text(ctx, label, x + 32, cy, 12, c.done ? '#7fdc98' : '#dfe3ea', 'left', 'normal');
      if (c.need > 1 && !c.done) {
        const shown = c.id === 'driftcash' ? `$${cur}` : `${cur}/${c.need}`;
        text(ctx, shown, x + w - 12, cy, 12, '#ffd23f', 'right', 'bold');
      } else if (c.endOnly && !c.done) text(ctx, g.arrests ? 'failed' : 'so far', x + w - 12, cy, 11, g.arrests ? '#ff6b5a' : '#8a909c', 'right', 'normal');
    });
  }

  // Shield / jammer / cop-light chips, just above the speedometer.
  function drawStatus(ctx, g, x, y) {
    const chips = [];
    if (g.truck.shield) chips.push({ s: 'SHIELD', c: '#9fd8ff', k: 'shield' });
    if (g.jammer > 0) chips.push({ s: `JAMMER ${Math.ceil(g.jammer)}s`, c: '#c69bff', k: 'jammer' });
    if (g.stats.copLight && !(g.jail > 0) && !g.wanted) {
      const seen = Police.canSee(g);
      chips.push({ s: seen ? 'COP WATCHING' : 'NO COPS NEAR', c: seen ? '#ff6b5a' : '#5ee07a', cop: true, seen });
    }
    let cx = x;
    for (const ch of chips) {
      ctx.font = `800 11px ${FONT}`;
      const w = ctx.measureText(ch.s).width + 34;
      panel(ctx, cx, y, w, 24);
      ctx.save();
      ctx.translate(cx + 13, y + 12);
      if (ch.cop) {
        const on = ch.seen && Math.floor(g.clock * 6) % 2 === 0;
        ctx.fillStyle = ch.seen ? (on ? '#ff2d2d' : '#2d6bff') : '#2e7d4a';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      } else {
        ctx.scale(0.55, 0.55);
        pickupIcon(ctx, ch.k, 14);
      }
      ctx.restore();
      text(ctx, ch.s, cx + 24, y + 12, 11, ch.c, 'left', 'bold');
      cx += w + 6;
    }
    return chips.length > 0;
  }

  function drawHUD(ctx, g, sw, sh) {
    if (g.jail > 0) drawJail(ctx, g, sw, sh);
    const narrow = sw < 760, tiny = sw < 560;
    // money, jobs and the delivery streak
    panel(ctx, 16, 16, 190, 66);
    const ms = fitFont(ctx, money(g.money), 28, DISPLAY, g.streak > 0 ? 112 : 160);
    text(ctx, money(g.money), 30, 40, ms, g.money < 0 ? '#ff6b5a' : '#5ee07a');
    text(ctx, `Jobs ${g.jobsDone}   Lost ${g.jobsLost}`, 30, 66, 13, '#c9ced8', 'left', 'normal');
    if (g.streak > 0) {
      const m = Extras.streakMul(g.streak);
      const hot = m >= C.streak.max;
      ctx.fillStyle = hot ? '#ff6b3d' : '#ff9f43';
      rr(ctx, 146, 25, 52, 22, 11);
      ctx.fill();
      // a little flame
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.moveTo(157, 43); ctx.quadraticCurveTo(149, 37, 156, 28); ctx.quadraticCurveTo(157, 33, 160, 33); ctx.quadraticCurveTo(163, 38, 157, 43);
      ctx.fill();
      text(ctx, `x${m.toFixed(1)}`, 182, 36, 12, '#1b1d22', 'center', 'bold');
    }
    // shift clock (it says RUSH HOUR while rush hour is on)
    const tLeft = Math.ceil(g.time);
    const clock = `${Math.floor(tLeft / 60)}:${String(tLeft % 60).padStart(2, '0')}`;
    const rush = Extras.rushOn(g);
    panel(ctx, sw - 136, 16, 120, 66);
    if (rush) {
      ctx.strokeStyle = Math.floor(g.clock * 3) % 2 ? '#ff9f43' : '#ffd23f';
      ctx.lineWidth = 3;
      rr(ctx, sw - 136, 16, 120, 66, 12);
      ctx.stroke();
      text(ctx, `RUSH HOUR ${Math.ceil(g.rush.left)}s`, sw - 76, 31, 11, '#ff9f43', 'center', 'bold');
    } else text(ctx, 'SHIFT', sw - 76, 32, 12, '#c9ced8', 'center', 'normal');
    text(ctx, clock, sw - 76, 56, 28, tLeft <= 30 && Math.floor(g.clock * 2) % 2 ? '#ff6b5a' : '#fff', 'center');
    drawJobPanel(ctx, g, sw);
    if (!narrow) drawContracts(ctx, g, 16, 92, sw >= 1100 ? 280 : 236);
    else {
      // phones and small windows: just a little badge
      const doneN = g.contracts.filter((c) => c.done).length;
      text(ctx, `★ ${doneN}/${g.contracts.length}`, 196, 66, 12, '#f4c20d', 'right', 'bold');
    }
    // speedometer with the speed limit sign (and the nitro bar folded in on small screens)
    const P = C.police;
    const over = Math.abs(g.truck.speed) > P.speedLimit + 10;
    const sy = tiny ? sh - 78 : sh - 66, sph = tiny ? 62 : 50;
    panel(ctx, 16, sy, 176, sph);
    text(ctx, `${Math.round(Math.abs(g.truck.speed) * 0.25)}`, 30, sy + 25, 26, over ? '#ff6b5a' : '#fff');
    text(ctx, 'km/h', 84, sy + 28, 13, '#c9ced8', 'left', 'normal');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(162, sy + 25, 18, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e0261b';
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, `${Math.round(P.speedLimit * 0.25)}`, 162, sy + 26, 15, '#111', 'center');
    if (tiny) nitroBar(ctx, g, 28, sy + 48, 152, 8);
    else drawNitro(ctx, g, sh);
    const chipY = sy - 30;
    const hasChips = drawStatus(ctx, g, 16, chipY);
    drawDriftMeter(ctx, g, sw, sh);
    // small notices ("Ran a red light! No cops saw it.")
    const nBase = (hasChips ? chipY : sy) - 40;
    g.notices.forEach((n, k) => {
      ctx.globalAlpha = Math.min(1, n.life * 2);
      const size = fitFont(ctx, n.text, 14, FONT, sw - 60);
      const w = ctx.measureText(n.text).width + 24;
      panel(ctx, 16, nBase - k * 38, w, 30);
      text(ctx, n.text, 28, nBase + 15 - k * 38, size, n.color);
      ctx.globalAlpha = 1;
    });
    drawMinimap(ctx, g, sw, sh);
    if (!(g.jail > 0)) drawEdgeArrow(ctx, g, sw, sh);
    drawWanted(ctx, g, sw, sh);
    // hook prompt
    const hook = Jobs.canHook(g);
    if (hook) {
      const ok = hook === 'ok';
      const msg = ok ? (touchUI ? 'Tap HOOK to hook the car' : 'Press  E  to hook the car') : 'Slow down to hook!';
      const w = Math.min(300, sw - 32), x = (sw - w) / 2, y = tiny ? sh / 2 + 70 : sh - 120;
      const pulse = ok ? 0.85 + 0.15 * Math.sin(g.clock * 10) : 1;
      ctx.globalAlpha = pulse;
      panel(ctx, x, y, w, 48);
      const size = fitFont(ctx, msg, 20, DISPLAY, w - 20);
      text(ctx, msg, sw / 2, y + 24, size, ok ? '#5ee07a' : '#ffae00', 'center');
      ctx.globalAlpha = 1;
    }
    // banner: pops in, then fades out
    const b = g.banner;
    if (b && b.life > 0) {
      const a = Math.min(1, b.life * 2, (3 - b.life) * 6);
      const pop = 1 + Math.max(0, (b.life - 2.75) * 1.6);
      ctx.globalAlpha = Math.max(0, a);
      const y = g.jail > 0 ? Math.max(120, sh / 2 - 170) : sh * (tiny ? 0.38 : 0.3);
      ctx.save();
      ctx.translate(sw / 2, y);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fitFont(ctx, b.title, 44, DISPLAY, sw - 40);
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(b.title, 0, 0);
      ctx.fillStyle = b.color;
      ctx.fillText(b.title, 0, 0);
      fitFont(ctx, b.sub, 18, FONT, sw - 30);
      ctx.lineWidth = 5;
      ctx.strokeText(b.sub, 0, 38);
      ctx.fillStyle = '#fff';
      ctx.fillText(b.sub, 0, 38);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // Soft cloud shadows drifting slowly over the city.
  const CLOUDS = Array.from({ length: 9 }, (_, k) => ({ x: (k * 1777) % 5200, y: (k * 2333) % 5200, r: 260 + (k % 4) * 90, s: 18 + (k % 3) * 7 }));
  function drawClouds(ctx, g, v) {
    const span = 6400;
    for (const c of CLOUDS) {
      const x = ((c.x + g.clock * c.s) % span + span) % span - 900;
      const y = ((c.y + g.clock * c.s * 0.35) % span + span) % span - 900;
      if (x + c.r * 1.6 < v.x0 || x - c.r * 1.6 > v.x1 || y + c.r < v.y0 || y - c.r > v.y1) continue;
      ctx.fillStyle = rad(x, y, c.r * 0.2, c.r * 1.2, [[0, 'rgba(10,20,40,0.13)'], [1, 'rgba(10,20,40,0)']]);
      ctx.beginPath(); ctx.ellipse(x, y, c.r * 1.5, c.r, 0.3, 0, TAU); ctx.fill();
    }
  }

  // ---------- one full frame ----------
  function frame(ctx, g, sw, sh, showHud) {
    ctxRef = ctx;
    // the sun goes down as the shift goes on
    dusk = showHud ? Math.max(0, 1 - g.time / C.shiftSeconds - 0.45) / 0.55 : 0;
    const cam = g.cam, z = cam.zoom;
    const shx = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0;
    const shy = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0;
    const v = { x0: cam.x - sw / 2 / z - 60, y0: cam.y - sh / 2 / z - 60, x1: cam.x + sw / 2 / z + 60, y1: cam.y + sh / 2 / z + 60 };
    ctx.save();
    ctx.translate(sw / 2 + shx, sh / 2 + shy);
    ctx.scale(z, z);
    ctx.translate(-cam.x, -cam.y);

    drawGround(ctx, v);
    drawDepots(ctx, v);
    drawMarkings(ctx, v);
    for (const b of W.blocks) if (inView(v, b.x, b.y, b.w, b.h)) drawBlock(ctx, b, g);
    drawLights(ctx, v, g);
    drawSkids(ctx, g);
    drawGps(ctx, g);
    drawPickups(ctx, g, v);

    const j = g.job;
    if (j.state === 'call') {
      if (j.type === 'parked' && j.sign) drawNoParking(ctx, j.sign.x, j.sign.y);
      if (j.type === 'crash') drawCones(ctx, j.car);
      drawCar(ctx, j.car, { hazard: !j.car.parked && Math.floor(g.clock * 3) % 2 === 0 });
    }
    for (const w of j.extras) drawCar(ctx, w, {});
    if (g.owner) drawOwner(ctx, g.owner, g.clock);
    const seen = (o) => o.x > v.x0 && o.x < v.x1 && o.y > v.y0 && o.y < v.y1;
    for (const f of g.traffic) if (seen(f)) drawCar(ctx, f, {});
    for (const r of g.rivals) {
      if (!seen(r)) continue;
      if (r.towing) drawCar(ctx, r.towing, {});
      drawTruck(ctx, r, r.company.color, !r.leaving, g.clock + 0.3);
    }
    for (const p of g.police) if (seen(p)) drawPolice(ctx, p, p.mode === 'chase' || p.mode === 'scene', g.clock);
    const t = g.truck;
    if (!(g.jail > 0)) {
      if (t.towing) drawCar(ctx, t.towing, {});
      drawTruck(ctx, t, '#f4c20d', j.state !== 'waiting', g.clock);
      drawTruckFx(ctx, g);
    }
    drawClouds(ctx, g, v);
    if (dusk > 0) {
      ctx.fillStyle = `rgba(28,22,70,${0.32 * dusk})`;
      ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      drawNightLights(ctx, g, v);
    }
    drawParticles(ctx, g);
    drawGoalMarker(ctx, g);
    drawFloaters(ctx, g);
    ctx.restore();

    // soft dark edges, like a camera lens
    ctx.fillStyle = rad(sw / 2, sh / 2, Math.min(sw, sh) * 0.35, Math.max(sw, sh) * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.32)']]);
    ctx.fillRect(0, 0, sw, sh);

    if (showHud) {
      // the sun goes down as the shift goes on: a warm sunset glow in the last part of the shift
      const late = dusk;
      if (late > 0) {
        ctx.fillStyle = `rgba(255,120,40,${0.1 * late})`;
        ctx.fillRect(0, 0, sw, sh);
        ctx.fillStyle = rad(sw / 2, sh / 2, Math.min(sw, sh) * 0.3, Math.max(sw, sh) * 0.8, [[0, 'rgba(40,20,60,0)'], [1, `rgba(40,20,60,${0.25 * late})`]]);
        ctx.fillRect(0, 0, sw, sh);
      }
      // nitro speed lines streaking past the edges of the screen
      if (g.truck.boosting && !(g.jail > 0)) {
        ctx.save();
        ctx.translate(sw / 2, sh / 2);
        for (let k = 0; k < 26; k++) {
          const a = (k / 26) * TAU + (Math.floor(g.clock * 20) % 7) * 0.13;
          const r0 = Math.min(sw, sh) * (0.36 + ((k * 37 + Math.floor(g.clock * 30)) % 10) * 0.03), len = 70 + (k % 4) * 40;
          ctx.strokeStyle = `rgba(170,240,255,${0.16 + (k % 3) * 0.08})`;
          ctx.lineWidth = 2 + (k % 3);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len));
          ctx.stroke();
        }
        ctx.restore();
      }
      // a red flash at the edges after a big crash
      if (g.flash > 0) {
        ctx.fillStyle = rad(sw / 2, sh / 2, Math.min(sw, sh) * 0.25, Math.max(sw, sh) * 0.7, [[0, 'rgba(255,40,30,0)'], [1, `rgba(255,40,30,${g.flash})`]]);
        ctx.fillRect(0, 0, sw, sh);
      }
      if (!/nohud/.test(location.search)) drawHUD(ctx, g, sw, sh);
    }
  }

  let touchUI = false;
  return { frame, money, setTouch(v) { touchUI = !!v; } };
})();
