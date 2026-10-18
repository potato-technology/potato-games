// Potato SDK — every game in /games includes this file.
// It talks to the Potato hub (the parent page) with postMessage.
//
//   Potato.onReady(player => { ... })  called once the hub sends the player's avatar
//   Potato.earn(n)                     give the player n Spuds (hub caps how many per game session)
//   Potato.score(n)                    report a score; the hub keeps the best one
//   Potato.exit()                      go back to the hub
//   Potato.drawAvatar(ctx, x, y, size, player, opts)  draw the player's potato on a canvas
//   Potato.save(key, value) / Potato.load(key, fallback)  per-game local save data

(function () {
  const DEFAULT_PLAYER = { name: 'Guest', color: '#c9925a', hat: 'none', face: 'happy' };
  const inHub = window.parent && window.parent !== window;
  let player = null;
  const readyCallbacks = [];

  function send(msg) {
    if (inHub) window.parent.postMessage(msg, '*');
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window.parent) return;
    const d = e.data;
    if (d && d.type === 'potato:hello' && !player) {
      player = Object.assign({}, DEFAULT_PLAYER, d.player || {});
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
    } else {
      ctx.arc(fx, size * 0.06, size * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    drawHat(ctx, p.hat, size, h);
    ctx.restore();
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
