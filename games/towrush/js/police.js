// Police: patrol cars drive around obeying the lights. Break a rule where a cop can see you
// (red light, wrong side of the road, speeding, crashing into cars) and they come after you.
// Get far enough away to lose them, or get caught and sit in jail while the shift clock keeps running.
const Police = (() => {
  const C = CONFIG;
  const P = C.police;
  const W = World;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrapAngle = (a) => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  // Police cars grip harder than your truck (they don't drift) and steer quicker.
  const CHASE_STATS = { ...C.truck, maxSpeed: P.chaseSpeed, accel: 560, frontGrip: 760, rearGrip: 980, slideGrip: 0.9, canDrift: false, steerHigh: 0.28, steerIn: 10, steerOut: 12 };

  function makePatrol(avoid) {
    for (let tries = 0; tries < 200; tries++) {
      const node = { i: Math.floor(Math.random() * (W.N + 1)), j: Math.floor(Math.random() * (W.N + 1)) };
      const dirs = W.validDirs(node);
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const p = Vehicles.makeFollower(node, dir, 100 + Math.random() * (W.CELL - 200), {
        kind: 'police', isTruck: true, len: 48, wid: 23, color: '#f4f6f8', accel: 260, turnSpeed: 120, patience: 2,
        speed: P.patrolSpeed[0] + Math.random() * (P.patrolSpeed[1] - P.patrolSpeed[0]),
      });
      if (avoid && dist(p, avoid) < 700) continue;
      p.isPolice = true;
      p.mode = 'patrol';
      return p;
    }
    return null;
  }

  function reset(g) {
    g.police = [];
    for (let k = 0; k < P.patrols; k++) {
      const p = makePatrol(g.truck);
      if (p) g.police.push(p);
    }
    g.wanted = null;
    g.bust = 0;
    g.jail = 0;
    g.arrests = 0;
    g.respawnTimer = 0;
    g.rules = { inter: null, px: g.truck.x, py: g.truck.y, wrongWay: 0, speeding: 0, cd: {} };
  }

  // ---------- breaking the rules ----------
  function violate(g, reason, range = P.seeRange) {
    if (g.jail > 0) return;
    const rs = g.rules;
    if ((rs.cd[reason] || 0) > g.clock) return;
    rs.cd[reason] = g.clock + 4;
    if (g.wanted) return;
    const witnesses = g.police.filter((p) => (p.mode === 'patrol' || p.mode === 'scene') && dist(p, g.truck) < range);
    if (!witnesses.length) {
      if (reason !== 'Speeding') g.notice(`${reason}! No cops saw it.`, '#ffae00');
      return;
    }
    startChase(g, reason, witnesses);
  }

  function startChase(g, reason, witnesses) {
    g.wanted = { reason, escape: 0 };
    g.bust = 0;
    for (const p of g.police) {
      if ((p.mode === 'patrol' || p.mode === 'scene') && (witnesses.includes(p) || dist(p, g.truck) < P.joinRange)) toChase(p);
    }
    g.toast('POLICE!', `${reason} - lose them or get arrested`, '#4d8dff');
    Sound.whistle();
  }

  function toChase(p) {
    p.mode = 'chase';
    p.vx = Math.cos(p.angle) * p.speed;
    p.vy = Math.sin(p.angle) * p.speed;
    p.steer = 0;
    p.yaw = 0;
    p.path = null;
    p.routeTimer = 0;
    p.stuckT = 0;
    p.reverseT = 0;
    p.crashCd = 0;
    p.arc = null;
  }

  // Watches how you drive. Called every frame while you're out on the road.
  function checkRules(g, dt) {
    const t = g.truck, rs = g.rules;
    const speed = Math.hypot(t.vx, t.vy);

    // Red light: checked the moment you drive into an intersection.
    const inter = W.intersectionAt(t.x, t.y);
    if (inter && !rs.inter) {
      const p = W.nodePos(inter);
      const axis = Math.abs(rs.px - p.x) > Math.abs(rs.py - p.y) ? 0 : 1;
      const inward = (p.x - rs.px) * t.vx + (p.y - rs.py) * t.vy > 0;
      if (inward && speed > 40 && W.lightState(inter, axis, g.clock) === 'red') violate(g, 'Ran a red light');
    }
    rs.inter = inter;
    rs.px = t.x;
    rs.py = t.y;

    // Wrong side of the road (a quick pass around a car is fine).
    let wrong = false;
    if (!inter && speed > 80) {
      const p = W.nodePos(W.nearestNode(t.x, t.y));
      const onH = Math.abs(t.y - p.y) < W.HALF, onV = Math.abs(t.x - p.x) < W.HALF;
      if (onH && !onV && Math.abs(t.vx) > Math.abs(t.vy)) wrong = (t.vx > 0 && t.y < p.y - 4) || (t.vx < 0 && t.y > p.y + 4);
      if (onV && !onH && Math.abs(t.vy) > Math.abs(t.vx)) wrong = (t.vy > 0 && t.x > p.x + 4) || (t.vy < 0 && t.x < p.x - 4);
    }
    rs.wrongWay = wrong ? rs.wrongWay + dt : Math.max(0, rs.wrongWay - dt * 2);
    if (rs.wrongWay > P.wrongWaySeconds) { violate(g, 'Driving on the wrong side'); rs.wrongWay = 0; }

    // Speeding: cops only notice from closer up.
    rs.speeding = speed > P.speedLimit + 10 ? rs.speeding + dt : 0;
    if (rs.speeding > 0.6) violate(g, 'Speeding', P.speedingSeeRange);
  }

  // ---------- chasing ----------
  function updateChaser(p, g, dt) {
    chase(p, g.truck, dt, CHASE_STATS);
  }

  // Drives car `p` after target `t` through the streets. Also used by angry car owners.
  function chase(p, t, dt, stats) {
    const d = dist(p, t);
    let tx, ty, sharpTurnAhead = false, wpDist = d;
    if (d < 380) {
      tx = t.x + t.vx * 0.25;
      ty = t.y + t.vy * 0.25;
    } else {
      p.routeTimer -= dt;
      if (p.routeTimer <= 0 || !p.path || !p.path.length) {
        p.routeTimer = 0.5;
        p.path = W.route(W.nearestNode(p.x, p.y), W.nearestNode(t.x, t.y), false).map(W.nodePos);
      }
      while (p.path.length > 1 && (dist(p.path[0], p) < 90 || dist(p, p.path[1]) < dist(p.path[0], p.path[1]))) p.path.shift();
      const wp = p.path[0];
      tx = wp.x;
      ty = wp.y;
      wpDist = dist(p, wp);
      if (p.path.length > 1) {
        const a1 = Math.atan2(wp.y - p.y, wp.x - p.x), a2 = Math.atan2(p.path[1].y - wp.y, p.path[1].x - wp.x);
        sharpTurnAhead = Math.abs(wrapAngle(a2 - a1)) > 0.6;
      }
    }
    const fwd = p.vx * Math.cos(p.angle) + p.vy * Math.sin(p.angle);
    const diff = wrapAngle(Math.atan2(ty - p.y, tx - p.x) - p.angle);
    let input = { steer: clamp(diff * 2.4, -1, 1), up: true };
    // Slow down for corners so they don't fly into buildings.
    if ((sharpTurnAhead && wpDist < fwd * 0.75 && fwd > 230) || (Math.abs(diff) > 0.9 && fwd > 220)) input = { steer: input.steer, down: true };
    // Close in on you without flying past: match your speed plus a bit.
    const yourSpeed = Math.hypot(t.vx, t.vy);
    if (d < 260 && fwd > yourSpeed + d * 1.2 + 40) input = { steer: input.steer, down: true };
    else if (d < 260 && fwd > yourSpeed + d * 0.8 + 30) input = { steer: input.steer };
    if (p.reverseT > 0) {
      p.reverseT -= dt;
      input = { down: true, steer: -input.steer };
    } else if (Math.abs(fwd) < 25) {
      p.stuckT += dt;
      if (p.stuckT > 0.8) { p.reverseT = 0.7; p.stuckT = 0; }
    } else p.stuckT = 0;
    Vehicles.updateTruck(p, input, dt, stats);
    Vehicles.collideTruckWorld(p);
  }

  // A cop parked at a crash scene with the lights on. Sees everything nearby.
  function makeSceneCop(x, y, angle) {
    const p = Vehicles.makeTruck(x, y, angle);
    Object.assign(p, { isPlayer: false, isPolice: true, len: 48, wid: 23, mode: 'scene', alpha: 1 });
    return p;
  }

  function update(g, dt, obstacles) {
    const t = g.truck;
    for (const p of g.police) {
      if (p.mode === 'patrol') Vehicles.updateFollower(p, dt, obstacles, g.clock);
      else if (p.mode === 'chase') updateChaser(p, g, dt);
      else if (p.mode === 'scene') continue;
      else {
        Vehicles.updateTruck(p, {}, dt, CHASE_STATS);
        p.alpha -= dt * 1.5;
      }
    }
    g.police = g.police.filter((p) => p.alpha > 0);

    // Keep the streets patrolled.
    if (g.police.length < P.patrols) {
      g.respawnTimer -= dt;
      if (g.respawnTimer <= 0) {
        g.respawnTimer = 4;
        const p = makePatrol(t);
        if (p) g.police.push(p);
      }
    }

    if (!g.wanted || g.jail > 0) return;
    const chasers = g.police.filter((p) => p.mode === 'chase');
    // Cops you drive past during a chase join in.
    for (const p of g.police) if (p.mode === 'patrol' && dist(p, t) < 450) { toChase(p); chasers.push(p); }
    const near = chasers.reduce((m, p) => Math.min(m, dist(p, t)), Infinity);

    if (near > P.escapeRange) g.wanted.escape += dt;
    else g.wanted.escape = Math.max(0, g.wanted.escape - dt * 2);
    if (g.wanted.escape >= P.escapeSeconds || !chasers.length) {
      endChase(g);
      g.toast('ESCAPED!', 'You lost the cops', '#5ee07a');
      return;
    }

    if (near < P.bustRange) {
      const slow = Math.abs(t.speed) < 60;
      g.bust += (dt / P.bustSeconds) * (slow ? 1 : 0.35);
    } else g.bust = Math.max(0, g.bust - dt * 0.6);
    if (g.bust >= 1) arrest(g);
  }

  function endChase(g) {
    for (const p of g.police) if (p.mode === 'chase') { p.mode = 'leaving'; p.ghostly = true; }
    g.wanted = null;
    g.bust = 0;
  }

  function arrest(g) {
    endChase(g);
    g.jail = P.jailSeconds;
    g.arrests++;
    Jobs.dropTow(g);
    const t = g.truck;
    t.x = W.station.x + W.station.w / 2;
    t.y = W.station.y + W.station.h / 2;
    t.vx = t.vy = t.speed = t.slide = t.yaw = t.steer = 0;
    g.rearPrev = null;
    g.toast('BUSTED!', `${P.jailSeconds} seconds in jail - the shift clock keeps ticking`, '#ff6b5a');
    Sound.busted();
  }

  function updateJail(g, dt) {
    g.jail -= dt;
    if (g.jail > 0) return;
    g.jail = 0;
    const t = g.truck, e = W.station.exit;
    t.x = e.x;
    t.y = e.y;
    t.angle = e.angle;
    t.vx = t.vy = t.speed = 0;
    g.rules.inter = null;
    g.rules.px = t.x;
    g.rules.py = t.y;
    g.toast('RELEASED', 'Drive carefully this time', '#c9ced8');
  }

  // Volume for the siren: louder the closer the nearest chasing cop is.
  function sirenLevel(g) {
    let near = Infinity;
    for (const p of g.police) if (p.mode === 'chase') near = Math.min(near, dist(p, g.truck));
    return near === Infinity ? 0 : clamp(1 - near / 1400, 0.15, 1);
  }

  return { reset, update, checkRules, violate, updateJail, sirenLevel, chase, toChase, makeSceneCop };
})();
