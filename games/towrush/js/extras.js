// Extras that make each shift different:
//   Pickups   - cash bags, nitro cans, bumper shields, siren jammers and bonus time out on the streets
//   Contracts - three bonus goals every shift that pay extra cash
//   Streak    - deliver cars back to back for bigger and bigger job pay
//   Rush hour - partway through the shift the streets fill up and calls pay more
const Extras = (() => {
  const C = CONFIG;
  const W = World;
  const PK = C.pickups;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------- street pickups ----------
  const LABEL = { cash: 'Cash', nitro: 'Nitro', shield: 'Shield', jammer: 'Jammer', clock: 'Time' };

  function pickKind() {
    const kinds = Object.keys(PK.kinds);
    let r = Math.random() * kinds.reduce((s, k) => s + PK.kinds[k].weight, 0);
    for (const k of kinds) { r -= PK.kinds[k].weight; if (r <= 0) return k; }
    return 'cash';
  }

  function spawnPickup(g, near) {
    for (let tries = 0; tries < 60; tries++) {
      const A = { i: Math.floor(Math.random() * (W.N + 1)), j: Math.floor(Math.random() * (W.N + 1)) };
      const dirs = W.validDirs(A);
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const n = W.nodePos(A), D = W.DIRS[d], o = W.laneOffset(d);
      const along = W.CELL * (0.3 + Math.random() * 0.4);
      const p = { x: n.x + D.x * along + o.x, y: n.y + D.y * along + o.y };
      const fromTruck = dist(p, g.truck);
      if (fromTruck < 420) continue;
      if (near && fromTruck > 1600) continue;
      if (g.pickups.some((q) => dist(q, p) < 300)) continue;
      if (W.pointInRect(p.x, p.y, W.yard)) continue;
      g.pickups.push({ ...p, kind: pickKind(), t: Math.random() * 10, born: 0 });
      return;
    }
  }

  function grab(g, p) {
    const t = g.truck;
    const K = PK.kinds[p.kind];
    let text = '', color = '#fff';
    if (p.kind === 'cash') { g.money += K.value; g.earned += K.value; text = `+$${K.value}`; color = '#5ee07a'; }
    else if (p.kind === 'nitro') { t.nitro = Math.min(1, t.nitro + K.amount); text = '+NITRO'; color = '#7af0ff'; }
    else if (p.kind === 'shield') { t.shield = true; text = 'SHIELD!'; color = '#9fd8ff'; g.notice('Bumper shield: your next crash is free', '#9fd8ff'); }
    else if (p.kind === 'jammer') {
      g.jammer = K.seconds;
      text = 'JAMMER!'; color = '#c69bff';
      if (g.wanted) { Police.endChase(g); g.toast('JAMMED!', 'The cops lost your signal', '#c69bff'); }
      else g.notice(`Siren jammer: cops ignore you for ${K.seconds}s`, '#c69bff');
    } else if (p.kind === 'clock') {
      if (g.time > 0) g.time += K.seconds;
      text = `+${K.seconds}s`; color = '#ffd23f';
    }
    g.track.pickups++;
    g.float(p.x, p.y - 30, text, color);
    Sound.pickup(p.kind);
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2, s = 90 + Math.random() * 140;
      g.parts.length < 400 && g.parts.push({ type: 'confetti', x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3, spin: (Math.random() - 0.5) * 12, color: PICK_COLOR[p.kind], size: 5, life: 0.8, max: 0.8 });
    }
    g.parts.length < 400 && g.parts.push({ type: 'ring', color: PICK_COLOR[p.kind], x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5 });
  }
  const PICK_COLOR = { cash: '#5ee07a', nitro: '#4fc3ff', shield: '#9fd8ff', jammer: '#c69bff', clock: '#ffd23f' };

  function updatePickups(g, dt, playing) {
    const t = g.truck;
    for (const p of g.pickups) { p.t += dt; p.born = Math.min(1, p.born + dt * 2); }
    if (playing && !(g.jail > 0)) {
      for (let k = g.pickups.length - 1; k >= 0; k--) {
        const p = g.pickups[k];
        if (dist(p, t) < PK.grabRange) { grab(g, p); g.pickups.splice(k, 1); }
      }
    }
    g.pickupTimer -= dt;
    if (g.pickups.length < PK.count && g.pickupTimer <= 0) { g.pickupTimer = 1.5; spawnPickup(g, Math.random() < 0.5); }
    if (g.jammer > 0) g.jammer = Math.max(0, g.jammer - dt);
  }

  // ---------- contracts ----------
  // need: how many; cur(g): progress so far. endOnly ones can only be judged when the shift ends.
  const POOL = [
    { id: 'tow3', text: 'Deliver 3 cars', need: 3, reward: 150, cur: (g) => g.jobsDone },
    { id: 'tow5', text: 'Deliver 5 cars', need: 5, reward: 300, cur: (g) => g.jobsDone },
    { id: 'vip', text: 'Deliver a VIP car in 80%+ shape', need: 1, reward: 200, cur: (g) => g.track.vipGood },
    { id: 'drift', text: 'Bank a 1,500 point drift', need: 1, reward: 150, cur: (g) => (g.drift.best >= 1500 ? 1 : 0) },
    { id: 'bigdrift', text: 'Bank a 4,000 point drift', need: 1, reward: 250, cur: (g) => (g.drift.best >= 4000 ? 1 : 0) },
    { id: 'pickups', text: 'Grab 6 street pickups', need: 6, reward: 120, cur: (g) => g.track.pickups },
    { id: 'fast', text: 'Deliver a car in under 45s', need: 1, reward: 180, cur: (g) => g.track.fast },
    { id: 'escape', text: 'Escape a police chase', need: 1, reward: 200, cur: (g) => g.track.escapes },
    { id: 'rivals', text: 'Beat rolling rivals to 2 cars', need: 2, reward: 180, cur: (g) => g.track.beatRivals },
    { id: 'streak', text: 'Get a x1.3 delivery streak', need: 3, reward: 200, cur: (g) => g.track.bestStreak },
    { id: 'driftcash', text: 'Earn $60 from drifting', need: 60, reward: 140, cur: (g) => g.drift.cash },
    { id: 'clean', text: 'Finish without getting busted', need: 1, reward: 150, endOnly: true, cur: (g) => (g.arrests ? 0 : 1) },
    { id: 'nocrash', text: 'Tow 2 cars with no crashes', need: 2, reward: 160, cur: (g) => g.track.cleanTows },
  ];

  function pickContracts() {
    // never two of the same kind (tow3 + tow5, or the two drift ones)
    const family = (c) => (c.id === 'tow5' ? 'tow3' : c.id === 'bigdrift' ? 'drift' : c.id);
    const bag = POOL.slice().sort(() => Math.random() - 0.5);
    const out = [];
    for (const c of bag) {
      if (out.length >= 3) break;
      if (out.some((o) => family(o) === family(c))) continue;
      out.push({ ...c, done: false });
    }
    return out;
  }

  function updateContracts(g) {
    for (const c of g.contracts) {
      if (c.done || c.endOnly) continue;
      if (c.cur(g) >= c.need) {
        c.done = true;
        g.money += c.reward;
        g.contractCash += c.reward;
        g.toast('CONTRACT DONE!', `${c.text}  +$${c.reward}`, '#ffd23f');
        g.float(g.truck.x, g.truck.y - 60, `+$${c.reward}`, '#ffd23f');
        Sound.contract();
      }
    }
  }

  // At the end of the shift: pay the ones that could only be judged now.
  function finishContracts(g) {
    for (const c of g.contracts) {
      if (c.done) continue;
      if (c.endOnly && c.cur(g) >= c.need) { c.done = true; g.money += c.reward; g.contractCash += c.reward; }
    }
  }

  // ---------- delivery streak ----------
  const streakMul = (n) => Math.min(C.streak.max, 1 + C.streak.step * n);

  function streakLost(g, why) {
    if (g.streak > 0) g.notice(`Streak lost${why ? ' - ' + why : ''}`, '#ff8a7a');
    g.streak = 0;
  }

  // ---------- rush hour ----------
  function updateRush(g, dt, playing) {
    const R = C.rushHour;
    if (!playing) return;
    if (!g.rush.started && g.time <= R.at && g.time > 20) {
      g.rush.started = true;
      g.rush.left = R.seconds;
      const extra = Vehicles.spawnTraffic(R.extraTraffic, g.truck, 700, g.traffic);
      for (const f of extra) { f.rush = true; f.alpha = 0; f.fadeIn = true; }
      g.traffic.push(...extra);
      g.toast('RUSH HOUR!', `Busy streets - calls pay +${Math.round((R.payMul - 1) * 100)}% for ${R.seconds}s`, '#ff9f43');
      Sound.rush();
      // the call that's already out gets the bonus too
      if (g.job.state === 'call') { g.job.startReward = Math.round(g.job.startReward * R.payMul); g.job.rushBonus = true; }
    }
    if (g.rush.left > 0) {
      g.rush.left -= dt;
      if (g.rush.left <= 0) {
        g.notice('Rush hour is over', '#c9ced8');
        for (const f of g.traffic) if (f.rush) f.fadeOut = true;
      }
    }
    for (const f of g.traffic) {
      if (f.fadeIn) { f.alpha = Math.min(1, f.alpha + dt * 1.5); if (f.alpha >= 1) f.fadeIn = false; }
      if (f.fadeOut) { f.ghostly = true; f.alpha -= dt * 0.8; }
    }
    if (g.traffic.some((f) => f.fadeOut && f.alpha <= 0)) g.traffic = g.traffic.filter((f) => !(f.fadeOut && f.alpha <= 0));
  }
  const rushOn = (g) => g.rush && g.rush.left > 0;

  function reset(g) {
    g.pickups = [];
    g.pickupTimer = 0;
    g.jammer = 0;
    g.truck.shield = false;
    g.contracts = pickContracts();
    g.contractCash = 0;
    g.streak = 0;
    g.track = { pickups: 0, vipGood: 0, fast: 0, escapes: 0, beatRivals: 0, bestStreak: 0, cleanTows: 0 };
    g.rush = { started: false, left: 0 };
    for (let k = 0; k < PK.count; k++) spawnPickup(g, k < 5);
  }

  function update(g, dt, playing) {
    updatePickups(g, dt, playing);
    updateRush(g, dt, playing);
    if (playing) updateContracts(g);
  }

  return { reset, update, finishContracts, pickContracts, streakMul, streakLost, rushOn, LABEL, PICK_COLOR };
})();
