// Potato SDK — every game in /games includes this file.
// It talks to the Potato hub (the parent page) with postMessage.
//
//   Potato.onReady(player => { ... })  called once the hub sends the player's avatar
//   Potato.earn(n)                     give the player n Spuds (hub caps how many per game session)
//   Potato.score(n)                    report a score; the hub keeps the best one
//   Potato.exit()                      go back to the hub
//   Potato.drawAvatar(ctx, x, y, size, player, opts)  draw the player's potato on a canvas
//   Potato.save(key, value) / Potato.load(key, fallback)  per-game local save data
//   Potato.lang                        the player's language code ('en', 'ko', 'ja', ...)
//   Potato.tr(table)                   pick table[Potato.lang], falling back to table.en
//   Potato.LANGS                       every language the hub offers: [{ code, name }]
//   Potato.font                        font fallbacks to append for Korean/Japanese/Chinese text

(function () {
  const DEFAULT_PLAYER = { name: 'Guest', color: '#c9925a', hat: 'none', face: 'happy', acc: 'none' };
  const inHub = window.parent && window.parent !== window;
  let player = null;
  const readyCallbacks = [];

  // ---------- language ----------
  const LANGS = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
  ];
  const LANG_KEY = 'potato.lang';
  function readLang() {
    let code = null;
    try { code = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (!code) { try { code = localStorage.getItem(LANG_KEY); } catch (e) {} }
    return LANGS.some((l) => l.code === code) ? code : 'en';
  }
  let lang = readLang();
  document.documentElement.lang = lang;
  function tr(table) {
    if (!table) return '';
    return table[lang] != null ? table[lang] : table.en;
  }

  function send(msg) {
    if (inHub) window.parent.postMessage(msg, '*');
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window.parent) return;
    const d = e.data;
    if (d && d.type === 'potato:hello' && !player) {
      player = Object.assign({}, DEFAULT_PLAYER, d.player || {});
      if (d.lang && LANGS.some((l) => l.code === d.lang)) lang = d.lang;
      readyCallbacks.splice(0).forEach((cb) => cb(player));
    }
  });

  // Running the game file on its own (not inside the hub)? Use a guest player.
  if (!inHub) {
    setTimeout(() => {
      if (!player) {
        player = Object.assign({}, DEFAULT_PLAYER);
        readyCallbacks.splice(0).forEach((cb) => cb(player));
      }
    }, 0);
  } else {
    send({ type: 'potato:ready' });
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // Draws the potato centred on (x, y). size = body height in px.
  // opts.facing: 1 or -1 to look right/left. opts.squash: 0..1 for landing squish.
  function drawAvatar(ctx, x, y, size, p, opts) {
    p = p || player || DEFAULT_PLAYER;
    opts = opts || {};
    const facing = opts.facing || 1;
    const squash = opts.squash || 0;
    const w = size * 0.8 * (1 + squash * 0.25);
    const h = size * (1 - squash * 0.25);
    ctx.save();
    ctx.translate(x, y + (size - h) / 2);

    drawAccBack(ctx, p.acc, size, w, h, facing);

    // body
    ctx.fillStyle = p.color;
    ctx.strokeStyle = shade(p.color, -60);
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // spots
    ctx.fillStyle = shade(p.color, -35);
    [[-0.18, 0.22, 0.05], [0.2, 0.3, 0.04], [-0.05, -0.32, 0.035]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx * size, sy * size, sr * size, 0, Math.PI * 2);
      ctx.fill();
    });

    // face
    const fx = facing * size * 0.08;
    ctx.fillStyle = '#1d1a17';
    const eyeY = -size * 0.08;
    if (p.face === 'cool') {
      ctx.fillRect(fx - size * 0.24, eyeY - size * 0.06, size * 0.48, size * 0.1);
    } else if (p.face === 'love') {
      ctx.fillStyle = '#e8364f';
      [-1, 1].forEach((s) => heart(ctx, fx + s * size * 0.12, eyeY, size * 0.075));
    } else if (p.face === 'star') {
      ctx.fillStyle = '#f5b700';
      [-1, 1].forEach((s) => star(ctx, fx + s * size * 0.12, eyeY, size * 0.075));
    } else if (p.face === 'wink') {
      ctx.beginPath();
      ctx.arc(fx - size * 0.12, eyeY, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = size * 0.04;
      ctx.strokeStyle = '#1d1a17';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fx + size * 0.07, eyeY + size * 0.01);
      ctx.quadraticCurveTo(fx + size * 0.12, eyeY - size * 0.05, fx + size * 0.17, eyeY + size * 0.01);
      ctx.stroke();
    } else if (p.face === 'sleepy') {
      ctx.lineWidth = size * 0.04;
      ctx.strokeStyle = '#1d1a17';
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.arc(fx + s * size * 0.12, eyeY - size * 0.02, size * 0.05, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      });
    } else {
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.arc(fx + s * size * 0.12, eyeY, size * 0.055, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#fff';
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.arc(fx + s * size * 0.12 + size * 0.02, eyeY - size * 0.02, size * 0.018, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.strokeStyle = '#1d1a17';
    ctx.lineWidth = Math.max(1.2, size * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (p.face === 'shock') {
      ctx.fillStyle = '#1d1a17';
      ctx.ellipse(fx, size * 0.13, size * 0.06, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.face === 'grumpy') {
      ctx.arc(fx, size * 0.2, size * 0.1, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else if (p.face === 'silly') {
      ctx.arc(fx, size * 0.06, size * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#ef6f8f';
      ctx.beginPath();
      ctx.ellipse(fx + size * 0.03, size * 0.2, size * 0.05, size * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath();
      ctx.moveTo(fx + size * 0.03, size * 0.16);
      ctx.lineTo(fx + size * 0.03, size * 0.23);
      ctx.stroke();
    } else {
      ctx.arc(fx, size * 0.06, size * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    drawAccFront(ctx, p.acc, size, w, h, fx, eyeY, facing);
    drawHat(ctx, p.hat, size, h);
    ctx.restore();
  }

  function heart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.fill();
  }
  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Accessories drawn behind the body (capes, wings, a backpack, a balloon).
  function drawAccBack(ctx, acc, size, w, h, facing) {
    if (!acc || acc === 'none') return;
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    if (acc === 'cape') {
      // flows out behind both sides, a little wavy at the bottom
      ctx.fillStyle = '#c92a2a';
      ctx.beginPath();
      ctx.moveTo(-w * 0.38, -h * 0.12);
      ctx.quadraticCurveTo(-w * 0.95, h * 0.2, -w * 0.82, h * 0.58);
      ctx.quadraticCurveTo(-w * 0.55, h * 0.5, -w * 0.3, h * 0.6);
      ctx.quadraticCurveTo(0, h * 0.52, w * 0.3, h * 0.6);
      ctx.quadraticCurveTo(w * 0.55, h * 0.5, w * 0.82, h * 0.58);
      ctx.quadraticCurveTo(w * 0.95, h * 0.2, w * 0.38, -h * 0.12);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a61e1e';
      ctx.beginPath();
      ctx.moveTo(-w * 0.6, h * 0.1);
      ctx.quadraticCurveTo(-w * 0.75, h * 0.35, -w * 0.7, h * 0.55);
      ctx.lineTo(-w * 0.55, h * 0.52);
      ctx.closePath();
      ctx.fill();
    } else if (acc === 'wings') {
      ctx.fillStyle = '#ffffff';
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s * w * 0.3, -h * 0.05);
        ctx.quadraticCurveTo(s * w * 1.05, -h * 0.55, s * w * 0.95, h * 0.05);
        ctx.quadraticCurveTo(s * w * 0.8, h * 0.02, s * w * 0.75, h * 0.12);
        ctx.quadraticCurveTo(s * w * 0.6, h * 0.1, s * w * 0.3, h * 0.15);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      });
    } else if (acc === 'backpack') {
      ctx.fillStyle = '#3b82c4';
      const bx = -facing * w * 0.62;
      roundRect(ctx, bx - size * 0.15, -h * 0.18, size * 0.3, size * 0.46, size * 0.08);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b6aa6';
      roundRect(ctx, bx - size * 0.11, size * 0.04, size * 0.22, size * 0.15, size * 0.04);
      ctx.fill();
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath(); ctx.arc(bx, -h * 0.05, size * 0.025, 0, Math.PI * 2); ctx.fill();
    } else if (acc === 'balloon') {
      const bx = facing * w * 0.7, by = -h * 0.75;
      ctx.strokeStyle = '#555';
      ctx.lineWidth = Math.max(1, size * 0.012);
      ctx.beginPath();
      ctx.moveTo(facing * w * 0.45, h * 0.05);
      ctx.quadraticCurveTo(bx + facing * size * 0.05, -h * 0.2, bx, by + size * 0.17);
      ctx.stroke();
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.ellipse(bx, by, size * 0.14, size * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(bx - size * 0.05, by - size * 0.06, size * 0.03, size * 0.05, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Accessories drawn on top of the body and face.
  function drawAccFront(ctx, acc, size, w, h, fx, eyeY, facing) {
    if (!acc || acc === 'none') return;
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    if (acc === 'glasses') {
      ctx.strokeStyle = '#1d1a17';
      ctx.lineWidth = Math.max(1.2, size * 0.025);
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.arc(fx + s * size * 0.12, eyeY, size * 0.085, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(fx - size * 0.035, eyeY);
      ctx.lineTo(fx + size * 0.035, eyeY);
      ctx.stroke();
    } else if (acc === 'monocle') {
      ctx.strokeStyle = '#d4a017';
      ctx.lineWidth = Math.max(1.2, size * 0.025);
      ctx.beginPath();
      ctx.arc(fx + facing * size * 0.12, eyeY, size * 0.09, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx + facing * size * 0.2, eyeY + size * 0.04);
      ctx.quadraticCurveTo(fx + facing * size * 0.26, size * 0.12, fx + facing * size * 0.22, size * 0.24);
      ctx.stroke();
    } else if (acc === 'mustache') {
      ctx.fillStyle = '#3b2a1a';
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.ellipse(fx + s * size * 0.07, size * 0.04, size * 0.08, size * 0.035, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (acc === 'bowtie') {
      ctx.fillStyle = '#d6336c';
      const by = h * 0.36;
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(-size * 0.13, by - size * 0.07);
      ctx.lineTo(-size * 0.13, by + size * 0.07);
      ctx.closePath();
      ctx.moveTo(0, by);
      ctx.lineTo(size * 0.13, by - size * 0.07);
      ctx.lineTo(size * 0.13, by + size * 0.07);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, by, size * 0.03, 0, Math.PI * 2); ctx.fill();
    } else if (acc === 'scarf') {
      ctx.fillStyle = '#e8590c';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.3, w * 0.42, size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      roundRect(ctx, facing * w * 0.12, h * 0.3, size * 0.1, size * 0.24, size * 0.03);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-w * 0.3, h * 0.29, w * 0.6, size * 0.02);
    } else if (acc === 'backpack') {
      // shoulder straps on the front
      ctx.strokeStyle = '#2b6aa6';
      ctx.lineWidth = Math.max(1.5, size * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-facing * w * 0.3, -h * 0.3);
      ctx.quadraticCurveTo(-facing * w * 0.12, h * 0.05, -facing * w * 0.32, h * 0.3);
      ctx.stroke();
    } else if (acc === 'cape') {
      // gold clasp at the neck
      ctx.fillStyle = '#f5c242';
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath(); ctx.arc(0, h * 0.27, size * 0.045, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c92a2a';
      ctx.lineWidth = Math.max(1.5, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(-w * 0.36, h * 0.12); ctx.lineTo(-size * 0.04, h * 0.27);
      ctx.moveTo(w * 0.36, h * 0.12); ctx.lineTo(size * 0.04, h * 0.27);
      ctx.stroke();
    } else if (acc === 'medal') {
      ctx.strokeStyle = '#2f6fdc';
      ctx.lineWidth = Math.max(1.5, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, h * 0.12);
      ctx.lineTo(0, h * 0.34);
      ctx.lineTo(size * 0.1, h * 0.12);
      ctx.stroke();
      ctx.fillStyle = '#f5c242';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath(); ctx.arc(0, h * 0.4, size * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (acc === 'flower') {
      const cx = facing * w * 0.32, cy = -h * 0.28;
      ctx.fillStyle = '#ff8fab';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * size * 0.05, cy + Math.sin(a) * size * 0.05, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.035, 0, Math.PI * 2); ctx.fill();
    } else if (acc === 'headphones') {
      ctx.strokeStyle = '#26232b';
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.1, w * 0.5, h * 0.42, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.fillStyle = '#7b5cff';
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = Math.max(1, size * 0.02);
      [-1, 1].forEach((s) => {
        roundRect(ctx, s * w * 0.5 - size * 0.06, -h * 0.18, size * 0.12, size * 0.2, size * 0.05);
        ctx.fill(); ctx.stroke();
      });
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawHat(ctx, hat, size, h) {
    const top = -h / 2;
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    if (hat === 'cap') {
      ctx.fillStyle = '#e8453c';
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.08, size * 0.3, size * 0.17, 0, Math.PI, 0);
      ctx.fill(); ctx.stroke();
      ctx.fillRect(0, top + size * 0.05, size * 0.42, size * 0.06);
    } else if (hat === 'tophat') {
      ctx.fillStyle = '#26232b';
      ctx.fillRect(-size * 0.32, top + size * 0.02, size * 0.64, size * 0.07);
      ctx.fillRect(-size * 0.2, top - size * 0.36, size * 0.4, size * 0.4);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-size * 0.2, top - size * 0.06, size * 0.4, size * 0.07);
    } else if (hat === 'crown') {
      ctx.fillStyle = '#f5c242';
      ctx.beginPath();
      ctx.moveTo(-size * 0.25, top + size * 0.1);
      ctx.lineTo(-size * 0.25, top - size * 0.14);
      ctx.lineTo(-size * 0.12, top - size * 0.02);
      ctx.lineTo(0, top - size * 0.2);
      ctx.lineTo(size * 0.12, top - size * 0.02);
      ctx.lineTo(size * 0.25, top - size * 0.14);
      ctx.lineTo(size * 0.25, top + size * 0.1);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d6336c';
      ctx.beginPath(); ctx.arc(0, top - size * 0.01, size * 0.035, 0, Math.PI * 2); ctx.fill();
    } else if (hat === 'party') {
      ctx.fillStyle = '#7b5cff';
      ctx.beginPath();
      ctx.moveTo(-size * 0.18, top + size * 0.1);
      ctx.lineTo(size * 0.18, top + size * 0.1);
      ctx.lineTo(0, top - size * 0.35);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath(); ctx.arc(0, top - size * 0.36, size * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-size * 0.04, top - size * 0.08, size * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(size * 0.06, top - size * 0.18, size * 0.025, 0, Math.PI * 2); ctx.fill();
    } else if (hat === 'beanie') {
      ctx.fillStyle = '#2f9e6e';
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.1, size * 0.3, size * 0.22, 0, Math.PI, 0);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1f7a52';
      ctx.fillRect(-size * 0.3, top + size * 0.06, size * 0.6, size * 0.08);
      ctx.fillStyle = '#f1f3f5';
      ctx.beginPath(); ctx.arc(0, top - size * 0.13, size * 0.06, 0, Math.PI * 2); ctx.fill();
    } else if (hat === 'chef') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-size * 0.2, top - size * 0.08, size * 0.4, size * 0.18);
      [-0.13, 0, 0.13].forEach((cx) => {
        ctx.beginPath(); ctx.arc(cx * size, top - size * 0.12, size * 0.12, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeRect(-size * 0.2, top - size * 0.02, size * 0.4, size * 0.12);
    } else if (hat === 'halo') {
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = size * 0.05;
      ctx.beginPath();
      ctx.ellipse(0, top - size * 0.12, size * 0.22, size * 0.06, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (hat === 'cowboy') {
      ctx.fillStyle = '#a0682f';
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.06, size * 0.42, size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, top + size * 0.05);
      ctx.quadraticCurveTo(-size * 0.22, top - size * 0.22, -size * 0.06, top - size * 0.18);
      ctx.quadraticCurveTo(0, top - size * 0.12, size * 0.06, top - size * 0.18);
      ctx.quadraticCurveTo(size * 0.22, top - size * 0.22, size * 0.2, top + size * 0.05);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5c3a1a';
      ctx.fillRect(-size * 0.2, top - size * 0.01, size * 0.4, size * 0.05);
    } else if (hat === 'wizard') {
      ctx.fillStyle = '#3b3fb5';
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.07, size * 0.34, size * 0.06, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, top + size * 0.07);
      ctx.quadraticCurveTo(-size * 0.05, top - size * 0.2, size * 0.12, top - size * 0.48);
      ctx.quadraticCurveTo(size * 0.06, top - size * 0.15, size * 0.2, top + size * 0.07);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd43b';
      star(ctx, -size * 0.02, top - size * 0.08, size * 0.05);
      star(ctx, size * 0.08, top - size * 0.25, size * 0.035);
    } else if (hat === 'pirate') {
      ctx.fillStyle = '#26232b';
      ctx.beginPath();
      ctx.moveTo(-size * 0.36, top + size * 0.08);
      ctx.quadraticCurveTo(-size * 0.2, top - size * 0.28, 0, top - size * 0.16);
      ctx.quadraticCurveTo(size * 0.2, top - size * 0.28, size * 0.36, top + size * 0.08);
      ctx.quadraticCurveTo(0, top - size * 0.02, -size * 0.36, top + size * 0.08);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f1f3f5';
      ctx.beginPath(); ctx.arc(0, top - size * 0.08, size * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-size * 0.035, top - size * 0.03, size * 0.07, size * 0.015);
    } else if (hat === 'bunny') {
      [-1, 1].forEach((s) => {
        ctx.fillStyle = '#f8f9fa';
        ctx.beginPath();
        ctx.ellipse(s * size * 0.12, top - size * 0.18, size * 0.07, size * 0.22, s * 0.2, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffb3c6';
        ctx.beginPath();
        ctx.ellipse(s * size * 0.12, top - size * 0.17, size * 0.035, size * 0.15, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(-size * 0.22, top + size * 0.02, size * 0.44, size * 0.05);
    } else if (hat === 'propeller') {
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.1, size * 0.28, size * 0.2, 0, Math.PI, 0);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8453c';
      ctx.beginPath();
      ctx.moveTo(0, top + size * 0.1);
      ctx.lineTo(0, top - size * 0.1);
      ctx.arc(0, top + size * 0.1, size * 0.2, -Math.PI / 2, -Math.PI / 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#555';
      ctx.fillRect(-size * 0.01, top - size * 0.17, size * 0.02, size * 0.08);
      ctx.fillStyle = '#2f9e6e';
      ctx.beginPath();
      ctx.ellipse(-size * 0.1, top - size * 0.17, size * 0.1, size * 0.025, 0.15, 0, Math.PI * 2);
      ctx.ellipse(size * 0.1, top - size * 0.17, size * 0.1, size * 0.025, -0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat === 'viking') {
      ctx.fillStyle = '#f1e3c6';
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s * size * 0.22, top + size * 0.02);
        ctx.quadraticCurveTo(s * size * 0.42, top - size * 0.02, s * size * 0.38, top - size * 0.26);
        ctx.quadraticCurveTo(s * size * 0.32, top - size * 0.08, s * size * 0.18, top - size * 0.06);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = '#8d99ae';
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.08, size * 0.27, size * 0.2, 0, Math.PI, 0);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6c7a91';
      ctx.fillRect(-size * 0.27, top + size * 0.04, size * 0.54, size * 0.05);
    } else if (hat === 'flowercrown') {
      const cols = ['#ff8fab', '#ffd43b', '#74c0fc', '#b197fc', '#ff8fab'];
      ctx.strokeStyle = '#2f9e6e';
      ctx.lineWidth = Math.max(1.5, size * 0.03);
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.05, size * 0.27, size * 0.06, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.stroke();
      cols.forEach((c, i) => {
        const fxp = -size * 0.24 + i * size * 0.12;
        const fyp = top + size * 0.02 - Math.sin((i / 4) * Math.PI) * size * 0.05;
        ctx.fillStyle = c;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(fxp + Math.cos(a) * size * 0.035, fyp + Math.sin(a) * size * 0.035, size * 0.03, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fff3bf';
        ctx.beginPath(); ctx.arc(fxp, fyp, size * 0.022, 0, Math.PI * 2); ctx.fill();
      });
    } else if (hat === 'grad') {
      ctx.fillStyle = '#26232b';
      ctx.beginPath();
      ctx.ellipse(0, top + size * 0.06, size * 0.22, size * 0.1, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-size * 0.34, top - size * 0.06);
      ctx.lineTo(0, top - size * 0.17);
      ctx.lineTo(size * 0.34, top - size * 0.06);
      ctx.lineTo(0, top + size * 0.05);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath();
      ctx.moveTo(0, top - size * 0.06);
      ctx.lineTo(size * 0.26, top - size * 0.02);
      ctx.lineTo(size * 0.27, top + size * 0.14);
      ctx.stroke();
    } else if (hat === 'kingcrown') {
      // The Potato King's own crown: taller, jewelled and glowing.
      const g = ctx.createLinearGradient(0, top - size * 0.34, 0, top + size * 0.12);
      g.addColorStop(0, '#fff3a8');
      g.addColorStop(0.5, '#f5c242');
      g.addColorStop(1, '#c98a0e');
      ctx.save();
      ctx.shadowColor = 'rgba(255, 214, 80, 0.8)';
      ctx.shadowBlur = size * 0.12;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, top + size * 0.12);
      ctx.lineTo(-size * 0.32, top - size * 0.2);
      ctx.lineTo(-size * 0.17, top - size * 0.04);
      ctx.lineTo(-size * 0.08, top - size * 0.3);
      ctx.lineTo(0, top - size * 0.1);
      ctx.lineTo(size * 0.08, top - size * 0.3);
      ctx.lineTo(size * 0.17, top - size * 0.04);
      ctx.lineTo(size * 0.32, top - size * 0.2);
      ctx.lineTo(size * 0.3, top + size * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.stroke();
      ctx.fillStyle = '#7b2cbf';
      ctx.fillRect(-size * 0.3, top + size * 0.04, size * 0.6, size * 0.08);
      [[-0.32, -0.2], [-0.08, -0.3], [0.08, -0.3], [0.32, -0.2]].forEach(([px, py]) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(px * size, top + py * size, size * 0.03, 0, Math.PI * 2); ctx.fill();
      });
      [['#e03131', -0.17], ['#2f9e44', 0], ['#1c7ed6', 0.17]].forEach(([c, px]) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(px * size, top + size * 0.08, size * 0.035, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#c9925a';
      ctx.beginPath();
      ctx.ellipse(0, top - size * 0.06, size * 0.045, size * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function storageKey(key) {
    return 'potato.game.' + location.pathname.split('/').pop().replace('.html', '') + '.' + key;
  }

  window.Potato = {
    get player() { return player || DEFAULT_PLAYER; },
    inHub,
    onReady(cb) { if (player) cb(player); else readyCallbacks.push(cb); },
    earn(n) { n = Math.floor(n); if (n > 0) send({ type: 'potato:earn', amount: n }); },
    score(n) { if (isFinite(n)) send({ type: 'potato:score', value: n }); },
    exit() { if (inHub) send({ type: 'potato:exit' }); else location.href = '../index.html'; },
    drawAvatar,
    shade,
    get lang() { return lang; },
    LANGS,
    tr,
    font: "'Apple SD Gothic Neo', 'Malgun Gothic', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK KR', 'Noto Sans CJK JP', 'Noto Sans CJK SC', sans-serif",
    save(key, value) {
      try { localStorage.setItem(storageKey(key), JSON.stringify(value)); } catch (e) {}
    },
    load(key, fallback) {
      try {
        const v = localStorage.getItem(storageKey(key));
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
  };
})();
