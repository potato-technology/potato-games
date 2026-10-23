// Drifting: the skill part. Slide the truck sideways at speed to rack up points.
// Hold a drift longer to grow the combo, chain drifts back to back to keep it, and don't crash.
// When a drift ends cleanly the points pay out as cash and fill your nitro (Shift to boost).
const Drift = (() => {
  const C = CONFIG;
  const cfg = (g) => (g.stats ? g.stats.drift : C.drift); // garage upgrades can change these

  function reset(g) {
    g.drift = { active: false, points: 0, combo: 1, time: 0, grace: 0, angle: 0, best: 0, cash: 0, count: 0, flash: null };
  }

  const score = (d) => Math.round(d.points * d.combo);

  function update(g, dt) {
    const D = cfg(g);
    const t = g.truck, d = g.drift;
    const speed = Math.hypot(t.vx, t.vy);
    const angle = Math.abs(t.slip);
    const sliding = !(g.jail > 0) && t.speed > 0 && speed > D.minSpeed && angle > D.minAngle;

    if (sliding) {
      if (!d.active && d.grace <= 0) { d.points = 0; d.time = 0; }
      d.active = true;
      d.time += dt;
      d.combo = Math.min(D.maxCombo, 1 + Math.floor(d.time / D.comboEvery));
      // Bigger angles are worth more.
      const angleBonus = 0.5 + Math.min(1, (angle - D.minAngle) / 0.5);
      d.points += dt * speed * angleBonus * D.pointsPerSpeed * (t.towing ? D.towBonus : 1);
      d.grace = D.chainTime;
      d.angle = angle;
    } else {
      d.active = false;
      if (d.grace > 0) {
        d.grace -= dt;
        if (d.grace <= 0) bank(g);
      }
    }
    if (d.flash) {
      d.flash.life -= dt;
      if (d.flash.life <= 0) d.flash = null;
    }
  }

  function bank(g) {
    const D = cfg(g);
    const d = g.drift, t = g.truck;
    const s = score(d);
    d.points = 0;
    d.time = 0;
    d.combo = 1;
    d.grace = 0;
    if (s < D.minBank) return;
    const cash = Math.max(1, Math.round(s * D.cashPerPoint));
    g.money += cash;
    d.cash += cash;
    d.count++;
    d.best = Math.max(d.best, s);
    t.nitro = Math.min(1, t.nitro + s * D.nitroPerPoint);
    const label = tl(s >= 4000 ? 'd_insane' : s >= 1500 ? 'd_great' : s >= 500 ? 'd_nice' : 'd_drift');
    d.flash = { label, score: s, cash, life: 2 };
    g.float(t.x, t.y - 40, `+$${cash}`, '#ffd23f');
    Sound.driftBank(s);
  }

  // A hard crash mid-drift (or while the combo is still open) loses the points.
  function crash(g) {
    const d = g.drift;
    if (d.points <= 0 || (!d.active && d.grace <= 0)) return;
    d.flash = { label: tl('d_fail'), score: score(d), cash: 0, life: 1.6, failed: true };
    d.points = 0;
    d.time = 0;
    d.combo = 1;
    d.grace = 0;
    d.active = false;
    Sound.driftFail();
  }

  // Nitro: hold Shift to burn it for extra speed and acceleration.
  function updateBoost(g, dt, wantBoost) {
    const D = cfg(g);
    const t = g.truck;
    const was = t.boosting;
    t.boosting = !!wantBoost && t.nitro > 0 && !(g.jail > 0) && t.speed > -10;
    if (t.boosting) t.nitro = Math.max(0, t.nitro - dt / D.boostSeconds);
    if (t.boosting && !was) Sound.boost();
  }

  return { reset, update, crash, updateBoost, score };
})();
