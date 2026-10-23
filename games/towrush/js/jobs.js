// Tow calls: a car needs towing somewhere, its payout drops every second,
// and rival tow companies race you for it. Hook it first, then haul it back to your yard.
//
// Kinds of calls:
//   breakdown - the normal one
//   vip       - pays double, but every crash while you tow it knocks money off
//   parked    - illegally parked: no rivals, but the angry owner chases you to take it back
//   crash     - a crash scene with a cop parked there, so drive by the rules nearby
//   big       - a broken-down bus: huge payout, but slow and heavy to tow (needs an engine upgrade)
const Jobs = (() => {
  const C = CONFIG;
  const K = C.calls;
  const W = World;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // title, banner and rule come from the translation table (i18n.js), e.g. jt_vip_t / jt_vip_b / jt_vip_r
  const TYPES = {};
  for (const id of ['breakdown', 'vip', 'parked', 'crash', 'big']) {
    TYPES[id] = { get title() { return tl(`jt_${id}_t`); }, get banner() { return tl(`jt_${id}_b`); }, get rule() { return tl(`jt_${id}_r`); } };
  }

  // Angry car owners drive like cops: grippy, no drifting.
  const OWNER_STATS = {
    ...C.truck, maxSpeed: K.parked.ownerSpeed, accel: 520, frontGrip: 760, rearGrip: 980, slideGrip: 0.9,
    canDrift: false, steerHigh: 0.28, steerIn: 10, steerOut: 12,
  };

  function reset(g) {
    g.job = {
      state: 'waiting', timer: 2.5, type: 'breakdown', car: null, extras: [], reward: 0, startReward: 0, elapsed: 0,
      rivalTimer: 0, dispatched: false, payout: 0, edge: null, condition: 1, ownerTimer: 0, grab: 0, ownerAway: 0,
    };
    g.owner = null;
    g.callsMade = 0;
  }

  function rivalSpeed(g) {
    return Math.min(C.rivalSpeedMax, C.rivalSpeed + g.jobsDone * C.rivalSpeedPerJob);
  }

  function rivalCount(g) {
    return Math.min(C.rivalsMax, C.rivalsAtStart + Math.floor(g.jobsDone / C.jobsPerExtraRival));
  }

  function pickType(g) {
    if (g.callsMade === 0) return 'breakdown'; // first call of the shift is always a simple one
    const pool = Object.keys(K).filter((k) => !K[k].needsEngine || g.stats.levels.engine >= K[k].needsEngine);
    let r = Math.random() * pool.reduce((s, k) => s + K[k].weight, 0);
    for (const k of pool) { r -= K[k].weight; if (r <= 0) return k; }
    return 'breakdown';
  }

  function makeCar(type, x, y, angle) {
    if (type === 'big') return { x, y, angle, len: 80, wid: 28, color: '#f2b705', bus: true, heavy: true };
    if (type === 'vip') return { x, y, angle, len: 48, wid: 23, color: '#15181d', vip: true };
    return { x, y, angle, len: 44, wid: 22, color: Vehicles.randomColor(), parked: type === 'parked' };
  }

  function newCall(g) {
    const t = g.truck;
    const type = pickType(g);
    for (let tries = 0; tries < 300; tries++) {
      const A = { i: Math.floor(Math.random() * (W.N + 1)), j: Math.floor(Math.random() * (W.N + 1)) };
      const dirs = W.validDirs(A);
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const B = W.step(A, d);
      const n = W.nodePos(A), D = W.DIRS[d], R = W.right(d);
      const along = W.CELL * (0.35 + Math.random() * 0.3);
      const x = n.x + D.x * along + R.x * C.shoulder;
      const y = n.y + D.y * along + R.y * C.shoulder;
      const far = Math.hypot(x - t.x, y - t.y);
      if (far < 1100 - Math.min(tries, 200) * 3 || far > 3400) continue;

      const car = makeCar(type, x, y, (d * Math.PI) / 2);
      car.broken = true;
      car.towDist = 0;
      const j = g.job;
      j.state = 'call';
      j.type = type;
      j.car = car;
      j.extras = [];
      j.edge = { A, B };
      j.elapsed = 0;
      j.condition = 1;
      j.grab = 0;
      j.startReward = Math.round(((C.rewardBase + far * C.rewardPerDistance) * K[type].pay * (Extras.rushOn(g) ? C.rushHour.payMul : 1)) / 10) * 10;
      j.rushBonus = Extras.rushOn(g);
      j.towCrashes = 0;
      j.reward = j.startReward;
      j.rivalTimer = Math.max(C.rivalDelayMin, C.rivalDelay - g.jobsDone * C.rivalDelayPerJob);
      // Nobody else is coming for an illegally parked car; it's your contract.
      j.dispatched = type === 'parked';

      if (type === 'crash') {
        // The crash: a second wrecked car ahead, and a cop parked behind with the lights on.
        car.angle += 0.45;
        j.extras.push({ x: x + D.x * 64, y: y + D.y * 64, angle: (d * Math.PI) / 2 + 2.6, len: 44, wid: 22, color: Vehicles.randomColor(), wreck: true });
        g.police.push(Police.makeSceneCop(x - D.x * 95, y - D.y * 95, (d * Math.PI) / 2));
      }
      if (type === 'parked') j.sign = { x: x + R.x * 34, y: y + R.y * 34 };

      g.callsMade++;
      g.toast(TYPES[type].banner, tl('call_sub', { title: TYPES[type].title, m: '$' + j.startReward }), '#ffd23f');
      Sound.call();
      return;
    }
  }

  function dispatch(g) {
    const j = g.job;
    j.dispatched = true;
    const pool = C.rivals.slice().sort(() => Math.random() - 0.5).slice(0, rivalCount(g));
    for (const co of pool) {
      const home = { i: co.home[0], j: co.home[1] };
      const path = W.route(home, j.edge.A);
      path.push(j.edge.B);
      const dir = W.dirBetween(path[0], path[1]);
      const r = Vehicles.makeFollower(home, dir, 0, {
        kind: 'rival', isTruck: true, route: path.slice(1),
        speed: rivalSpeed(g), accel: 420, turnSpeed: 190, patience: 0.6, len: 60, wid: 26, color: co.color,
      });
      r.company = co;
      r.home = home;
      r.state = 'toJob';
      g.rivals.push(r);
    }
    const names = pool.map((c) => c.name).join(' & ');
    g.toast(tl('rivals_t'), tl(pool.length > 1 ? 'rivals_many' : 'rivals_one', { names }), '#ff6b5a');
    Sound.alarm();
  }

  function sendHome(r) {
    r.state = 'home';
    Vehicles.setRoute(r, r.home);
  }

  // The crash-scene cop drives off and the wreck gets cleared once the car is gone.
  function clearScene(g) {
    for (const p of g.police) if (p.mode === 'scene') { p.mode = 'leaving'; p.ghostly = true; }
    g.job.extras = [];
  }

  function endJob(g, timer) {
    const j = g.job;
    clearScene(g);
    if (g.owner) { g.owner.leaving = true; g.owner.ghostly = true; }
    j.car = null;
    j.state = 'waiting';
    j.timer = timer;
  }

  function rivalClaims(g, r) {
    const j = g.job;
    j.car.broken = false;
    j.car.towDist = dist(r, j.car);
    r.towing = j.car;
    r.maxSpeed *= 0.85;
    for (const o of g.rivals) if (o.state === 'toJob') sendHome(o);
    g.jobsLost++;
    Extras.streakLost(g, 'rival');
    g.toast(tl('too_slow'), tl('too_slow_sub', { name: r.company.name }), '#ff6b5a');
    Sound.lose();
    endJob(g, 3.5);
  }

  function canHook(g) {
    const j = g.job, t = g.truck;
    if (j.state !== 'call' || g.jail > 0) return null;
    if (dist(t, j.car) > g.stats.hookRange + (j.car.bus ? 18 : 0)) return null;
    return Math.abs(t.speed) <= g.stats.hookMaxSpeed ? 'ok' : 'slow';
  }

  function tryHook(g) {
    if (canHook(g) !== 'ok') return;
    const j = g.job, t = g.truck;
    j.state = 'towing';
    j.payout = Math.round(j.reward);
    j.car.broken = false;
    j.car.towDist = dist(t, j.car);
    t.towing = j.car;
    // Beat rivals who were already on their way? That counts for the contract.
    if (g.rivals.some((r) => r.state === 'toJob')) g.track.beatRivals++;
    for (const r of g.rivals) if (r.state === 'toJob') sendHome(r);
    j.towCrashes = 0;
    j.hookedAt = g.clock;
    clearScene(g);
    Sound.hook();
    if (j.type === 'parked') {
      j.ownerTimer = 2.5;
      j.ownerAway = 0;
      g.toast(tl('uhoh'), tl('uhoh_sub'), '#ff6b5a');
      return;
    }
    const tag = tl(j.elapsed < 18 ? 'hk_fast' : j.elapsed < 30 ? 'hk_nice' : 'hk_ok');
    const lockKey = j.type === 'vip' ? 'locked_vip' : j.type === 'big' ? 'locked_big' : 'locked';
    g.toast(tag, tl(lockKey, { m: '$' + j.payout }), '#5ee07a');
  }

  // A crash while towing a VIP car knocks money off the payout.
  function towCrash(g) {
    const j = g.job;
    if (j.state !== 'towing') return;
    j.towCrashes = (j.towCrashes || 0) + 1;
    if (j.type !== 'vip') return;
    const before = j.condition;
    j.condition = Math.max(K.vip.minCondition, j.condition - K.vip.hitDamage * (g.stats.vipDamageMul || 1));
    if (j.condition < before) g.notice(tl('vip_dmg', { n: Math.round(j.condition * 100) }), '#ff6b5a');
  }

  function deliver(g) {
    const j = g.job, t = g.truck;
    // Delivery streak: every car in a row without losing one pays a little more.
    const mul = Extras.streakMul(g.streak);
    const jobPay = Math.round(j.payout * (j.type === 'vip' ? j.condition : 1) * mul);
    const total = jobPay + C.towFee;
    g.money += total;
    g.earned += total;
    g.jobsDone++;
    g.streak++;
    g.track.bestStreak = Math.max(g.track.bestStreak, g.streak);
    if (j.type === 'vip' && j.condition >= 0.8) g.track.vipGood = 1;
    if (j.elapsed + (g.clock - (j.hookedAt || g.clock)) <= 45) g.track.fast = 1;
    if (!j.towCrashes) g.track.cleanTows++;
    g.yardCars.push(j.car.color);
    g.float(t.x, t.y - 40, `+$${total}`, '#5ee07a');
    const note = (j.type === 'vip' ? tl('note_cond', { n: Math.round(j.condition * 100) }) : '') + (mul > 1 ? tl('note_streak', { m: mul.toFixed(1) }) : '');
    g.toast(tl('delivered'), tl('deliv_sub', { pay: '$' + jobPay, note, fee: '$' + C.towFee }), '#5ee07a');
    Sound.cash();
    t.towing = null;
    endJob(g, 2.5);
  }

  // Lost the car you were towing (arrested, or the owner took it back).
  function loseTow(g) {
    if (g.job.state !== 'towing') return;
    g.truck.towing = null;
    g.jobsLost++;
    Extras.streakLost(g);
    endJob(g, 3);
  }

  // ---------- the angry owner of an illegally parked car ----------
  function spawnOwner(g) {
    const c = g.job.car;
    const o = Vehicles.makeTruck(c.x, c.y, c.angle);
    Object.assign(o, { isPlayer: false, isOwner: true, len: 46, wid: 22, color: '#c0392b', alpha: 1 });
    // They pull out from where their car was parked.
    const sp = W.nodePos(g.job.edge.A);
    o.x = sp.x; o.y = sp.y;
    Police.toChase(o);
    g.owner = o;
    g.notice(tl('owner_coming'), '#ff6b5a');
    Sound.honk();
  }

  function updateOwner(g, dt) {
    const o = g.owner;
    if (!o) return;
    if (o.leaving) {
      Vehicles.updateTruck(o, {}, dt, OWNER_STATS);
      o.alpha -= dt * 1.5;
      if (o.alpha <= 0) g.owner = null;
      return;
    }
    const j = g.job, t = g.truck;
    Police.chase(o, t, dt, OWNER_STATS);
    if (g.jail > 0) return;
    const close = dist(o, t) < 90 || (t.towing && dist(o, t.towing) < 70);
    j.grab = close ? j.grab + dt / K.parked.ownerGrabSeconds : Math.max(0, j.grab - dt * 0.5);
    j.ownerAway = dist(o, t) > K.parked.ownerGiveUpRange ? j.ownerAway + dt : 0;
    if (j.grab >= 1) {
      g.toast(tl('caught'), tl('caught_sub'), '#ff6b5a');
      Sound.lose();
      loseTow(g);
    } else if (j.ownerAway >= K.parked.ownerGiveUpSeconds) {
      o.leaving = true;
      o.ghostly = true;
      g.notice(tl('owner_gaveup'), '#5ee07a');
    }
  }

  function update(g, dt) {
    const j = g.job;
    if (j.state === 'waiting') {
      if (g.time > 0) {
        j.timer -= dt;
        if (j.timer <= 0) newCall(g);
      }
    } else if (j.state === 'call') {
      j.elapsed += dt;
      j.reward = Math.max(C.rewardMin, j.startReward - C.rewardDecayPerSec * K[j.type].pay * j.elapsed);
      if (!j.dispatched) {
        j.rivalTimer -= dt;
        if (j.rivalTimer <= 0) dispatch(g);
      }
      // Maxed-out Quick hook grabs the car as you roll past.
      if (g.stats.autoHook && canHook(g) === 'ok') tryHook(g);
      else {
        for (const r of g.rivals) {
          if (r.state === 'toJob' && dist(r, j.car) < 50 + (j.car.bus ? 18 : 0)) { rivalClaims(g, r); break; }
        }
      }
    } else if (j.state === 'towing') {
      if (j.type === 'parked' && !g.owner && j.ownerTimer > 0) {
        j.ownerTimer -= dt;
        if (j.ownerTimer <= 0) spawnOwner(g);
      }
      if (W.pointInRect(g.truck.x, g.truck.y, W.yard.zone) && Math.abs(g.truck.speed) < 140) deliver(g);
    }
    updateOwner(g, dt);

    // Rivals: keep chasing the car, or drive home and disappear.
    for (const r of g.rivals) {
      if (!r.routeDone || r.leaving) continue;
      r.routeDone = false;
      if (r.state === 'toJob' && j.state === 'call') {
        r.route = W.route(r.target, j.edge.A);
        r.route.push(j.edge.B);
        r.nextDir = W.dirBetween(r.route[0], r.route[1]);
      } else if (r.state === 'toJob' || r.state === 'home') {
        sendHome(r);
      }
    }
  }

  // Where the GPS should point you right now.
  function goal(g) {
    const j = g.job;
    if (j.state === 'call') return { x: j.car.x, y: j.car.y, nodes: [j.edge.A, j.edge.B], label: 'CAR' };
    if (j.state === 'towing') {
      const y = W.yard;
      return { x: y.gate.x + y.gate.w / 2, y: y.y + 60, nodes: y.gateNodes, label: 'YARD' };
    }
    return null;
  }

  // Truck settings while towing: buses are heavy.
  function towStats(g) {
    const t = g.truck;
    if (!t.towing || !t.towing.heavy) return g.stats.truck;
    return { ...g.stats.truck, towSpeedMul: K.big.towSpeedMul, towAccelMul: K.big.towAccelMul };
  }

  return { reset, update, tryHook, canHook, goal, sendHome, dropTow: loseTow, towCrash, towStats, TYPES };
})();
