// Everything you see: the city, the cars, effects, and the HUD.
const Render = (() => {
  const C = CONFIG;
  const W = World;
  const TAU = Math.PI * 2;
  const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

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

  // ---------- city ----------
  function drawGround(ctx, v) {
    ctx.fillStyle = pat(ctx, 'grass');
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const lo = -W.HALF, hi = W.SIZE + W.HALF;
    ctx.fillStyle = pat(ctx, 'asphalt');
    ctx.fillRect(lo, lo, hi - lo, hi - lo);
    ctx.strokeStyle = '#6b6f75';
    ctx.lineWidth = 8;
    ctx.setLineDash([4, 18]);
    ctx.strokeRect(lo - 6, lo - 6, hi - lo + 12, hi - lo + 12);
    ctx.setLineDash([]);
  }

  // Rival company garages sit just outside the city edge.
  function drawDepots(ctx, v) {
    for (const co of C.rivals) {
      const n = W.nodePos({ i: co.home[0], j: co.home[1] });
      const out = W.HALF + 30, dw = 150, dd = 120;
      let x, y, w, h;
      if (co.home[0] === 0) { x = n.x - out - dd; y = n.y - dw / 2; w = dd; h = dw; }
      else if (co.home[0] === W.N) { x = n.x + out; y = n.y - dw / 2; w = dd; h = dw; }
      else if (co.home[1] === 0) { x = n.x - dw / 2; y = n.y - out - dd; w = dw; h = dd; }
      else { x = n.x - dw / 2; y = n.y + out; w = dw; h = dd; }
      if (!inView(v, x, y, w, h)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 8, y + 8, w, h);
      ctx.fillStyle = co.color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 10, y + 12 + k * ((h - 24) / 4), w - 20, 4);
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
      ctx.fillStyle = 'rgba(170,215,255,0.55)';
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
      tree(ctx, rx + rw * 0.35, ry + rh * 0.4, Math.min(rw, rh) * 0.12);
      tree(ctx, rx + rw * 0.65, ry + rh * 0.62, Math.min(rw, rh) * 0.09);
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
    for (const t of b.trees) tree(ctx, t.x, t.y, t.r);
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
    ctx.font = `bold 26px ${FONT}`;
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
    ctx.fillStyle = '#f4c20d';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#c99c00';
    ctx.fillRect(o.x, o.y + o.h - 8, o.w, 8);
    ctx.fillStyle = '#222';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText('TOW RUSH', o.x + o.w / 2, o.y + o.h / 2 - 3);
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
    ctx.font = `bold 40px ${FONT}`;
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
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    rr(ctx, -L / 2 + 2, -Wd / 2 + 3, L + 3, Wd + 2, 6);
    ctx.fill();
    ctx.fillStyle = '#111';
    for (const wx of [L * 0.32, -L * 0.18, -L * 0.36]) for (const sy of [-1, 1]) { rr(ctx, wx - 5, sy * (Wd / 2) - 2.5, 10, 5, 2); ctx.fill(); }
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
      ctx.font = `bold 24px ${FONT}`;
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
    ctx.fillStyle = 'rgba(16,18,24,0.78)';
    rr(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  function drawMinimap(ctx, g, sw, sh) {
    const m = Math.round(Math.max(120, Math.min(200, sw * 0.24)));
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

  function drawJobPanel(ctx, g, sw) {
    const j = g.job;
    // Sits between the money and clock panels, or drops below them on narrow screens.
    const narrow = sw < 760;
    const w = narrow ? sw - 32 : Math.min(420, sw - 360), x = (sw - w) / 2, y = narrow ? 92 : 16;
    const lines = [];
    if (j.state === 'waiting') {
      panel(ctx, x, y, w, 52);
      text(ctx, g.time > 0 ? 'Waiting for the next call...' : 'Shift over!', x + w / 2, y + 26, 18, '#c9ced8', 'center');
      return;
    }
    const type = Jobs.TYPES[j.type];
    if (j.state === 'call') {
      const others = g.rivals.filter((r) => r.state === 'toJob');
      for (const r of others) lines.push({ color: r.company.color, s: `${r.company.name}: ${Math.round(Math.hypot(r.x - j.car.x, r.y - j.car.y) / 8)}m away` });
      const h = 98 + lines.length * 20;
      panel(ctx, x, y, w, h);
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
    const w = Math.min(340, sw - 32), x = (sw - w) / 2, y = sh - 220;
    const flip = Math.floor(g.clock * 6) % 2 === 0;
    panel(ctx, x, y, w, 92);
    ctx.strokeStyle = flip ? '#ff2d2d' : '#2d6bff';
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, 92, 12);
    ctx.stroke();
    text(ctx, 'POLICE CHASE', x + 16, y + 20, 18, flip ? '#ff6b5a' : '#6f9dff');
    text(ctx, g.wanted.reason, x + w - 16, y + 20, 13, '#c9ced8', 'right', 'normal');
    bar(ctx, x + 16, y + 40, w - 32, 'Escape', g.wanted.escape / C.police.escapeSeconds, '#5ee07a');
    bar(ctx, x + 16, y + 64, w - 32, 'Busted', g.bust, '#ff503c');
  }

  function drawNitro(ctx, g, sh) {
    const t = g.truck;
    const x = 200, y = sh - 66, w = 150;
    panel(ctx, x, y, w, 50);
    const glow = t.boosting && Math.floor(g.clock * 12) % 2 === 0;
    text(ctx, 'NITRO', x + 12, y + 16, 12, glow ? '#ffd23f' : '#c9ced8', 'left', 'bold');
    text(ctx, t.nitro > 0.05 ? 'SHIFT' : 'drift to fill', x + w - 12, y + 16, 11, '#8a909c', 'right', 'normal');
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, x + 12, y + 28, w - 24, 12, 6);
    ctx.fill();
    const grad = ctx.createLinearGradient(x + 12, 0, x + w - 12, 0);
    grad.addColorStop(0, '#2fa3ff');
    grad.addColorStop(1, '#7af0ff');
    ctx.fillStyle = grad;
    rr(ctx, x + 12, y + 28, Math.max(0, (w - 24) * t.nitro), 12, 6);
    ctx.fill();
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
      ctx.font = `bold 40px ${FONT}`;
      ctx.lineWidth = 6;
      ctx.strokeText(s.toLocaleString(), 0, 4);
      ctx.fillStyle = '#fff';
      ctx.fillText(s.toLocaleString(), 0, 4);
      if (d.combo > 1) {
        ctx.font = `bold 26px ${FONT}`;
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
      ctx.font = `bold 30px ${FONT}`;
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
    ctx.fillStyle = 'rgba(150,156,166,0.75)';
    for (let x = 30; x < sw; x += 70) ctx.fillRect(x, 0, 12, sh);
    ctx.fillRect(0, sh * 0.18, sw, 12);
    ctx.fillRect(0, sh * 0.82, sw, 12);
    const w = Math.min(380, sw - 40), x = (sw - w) / 2, y = sh / 2 - 90;
    panel(ctx, x, y, w, 214);
    text(ctx, 'IN JAIL', sw / 2, y + 38, 36, '#ff6b5a', 'center');
    text(ctx, `${Math.ceil(g.jail)}`, sw / 2, y + 96, 56, '#fff', 'center');
    text(ctx, 'seconds until you get out', sw / 2, y + 136, 15, '#c9ced8', 'center', 'normal');
    text(ctx, 'The shift clock is still ticking...', sw / 2, y + 160, 13, '#8a909c', 'center', 'normal');
    const canPay = g.money + g.bankAtStart >= C.bail;
    text(ctx, canPay ? `Press B to pay ${money(C.bail)} bail` : `Bail is ${money(C.bail)} - not enough cash`, sw / 2, y + 192, 16, canPay ? '#ffd23f' : '#8a909c', 'center');
  }

  function drawHUD(ctx, g, sw, sh) {
    if (g.jail > 0) drawJail(ctx, g, sw, sh);
    // money
    panel(ctx, 16, 16, 190, 66);
    text(ctx, money(g.money), 30, 40, 28, g.money < 0 ? '#ff6b5a' : '#5ee07a');
    text(ctx, `Jobs ${g.jobsDone}   Lost ${g.jobsLost}`, 30, 66, 13, '#c9ced8', 'left', 'normal');
    // shift clock
    const tLeft = Math.ceil(g.time);
    const clock = `${Math.floor(tLeft / 60)}:${String(tLeft % 60).padStart(2, '0')}`;
    panel(ctx, sw - 136, 16, 120, 66);
    text(ctx, 'SHIFT', sw - 76, 32, 12, '#c9ced8', 'center', 'normal');
    text(ctx, clock, sw - 76, 56, 28, tLeft <= 30 && Math.floor(g.clock * 2) % 2 ? '#ff6b5a' : '#fff', 'center');
    drawJobPanel(ctx, g, sw);
    // speedometer with the speed limit sign
    const P = C.police;
    const over = Math.abs(g.truck.speed) > P.speedLimit + 10;
    panel(ctx, 16, sh - 66, 176, 50);
    text(ctx, `${Math.round(Math.abs(g.truck.speed) * 0.25)}`, 30, sh - 41, 26, over ? '#ff6b5a' : '#fff');
    text(ctx, 'km/h', 84, sh - 38, 13, '#c9ced8', 'left', 'normal');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(162, sh - 41, 18, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e0261b';
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, `${Math.round(P.speedLimit * 0.25)}`, 162, sh - 40, 15, '#111', 'center');
    drawNitro(ctx, g, sh);
    drawDriftMeter(ctx, g, sw, sh);
    // small notices ("Ran a red light! No cops saw it.")
    g.notices.forEach((n, k) => {
      ctx.globalAlpha = Math.min(1, n.life * 2);
      ctx.font = `bold 14px ${FONT}`;
      const w = ctx.measureText(n.text).width + 24;
      panel(ctx, 16, sh - 108 - k * 38, w, 30);
      text(ctx, n.text, 28, sh - 93 - k * 38, 14, n.color);
      ctx.globalAlpha = 1;
    });
    drawMinimap(ctx, g, sw, sh);
    if (!(g.jail > 0)) drawEdgeArrow(ctx, g, sw, sh);
    drawWanted(ctx, g, sw, sh);
    // hook prompt
    const hook = Jobs.canHook(g);
    if (hook) {
      const ok = hook === 'ok';
      const msg = ok ? 'Press  E  to hook the car' : 'Slow down to hook!';
      const w = 300, x = (sw - w) / 2, y = sh - 120;
      const pulse = ok ? 0.85 + 0.15 * Math.sin(g.clock * 10) : 1;
      ctx.globalAlpha = pulse;
      panel(ctx, x, y, w, 48);
      text(ctx, msg, sw / 2, y + 24, 20, ok ? '#5ee07a' : '#ffae00', 'center');
      ctx.globalAlpha = 1;
    }
    // banner
    const b = g.banner;
    if (b && b.life > 0) {
      const a = Math.min(1, b.life * 2, (3 - b.life) * 6);
      ctx.globalAlpha = Math.max(0, a);
      const y = sh * 0.3;
      ctx.font = `bold 44px ${FONT}`;
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(b.title, sw / 2, y);
      ctx.fillStyle = b.color;
      ctx.fillText(b.title, sw / 2, y);
      ctx.font = `bold 18px ${FONT}`;
      ctx.lineWidth = 5;
      ctx.strokeText(b.sub, sw / 2, y + 38);
      ctx.fillStyle = '#fff';
      ctx.fillText(b.sub, sw / 2, y + 38);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- one full frame ----------
  function frame(ctx, g, sw, sh, showHud) {
    ctxRef = ctx;
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
    }
    drawParticles(ctx, g);
    drawGoalMarker(ctx, g);
    drawFloaters(ctx, g);
    ctx.restore();

    // soft dark edges, like a camera lens
    ctx.fillStyle = rad(sw / 2, sh / 2, Math.min(sw, sh) * 0.35, Math.max(sw, sh) * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.32)']]);
    ctx.fillRect(0, 0, sw, sh);

    if (showHud) drawHUD(ctx, g, sw, sh);
  }

  return { frame, money };
})();
