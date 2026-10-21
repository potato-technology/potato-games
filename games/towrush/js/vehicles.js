// Vehicles: your tow truck (free driving with simple car physics) and
// "lane followers" (traffic and rival tow trucks) that drive along the road lanes.
const Vehicles = (() => {
  const C = CONFIG;
  const W = World;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CAR_COLORS = ['#e74c3c', '#3498db', '#ecf0f1', '#2ecc71', '#9b59b6', '#34495e', '#1abc9c', '#e67e22', '#bdc3c7', '#16a085', '#c0392b', '#2c3e50', '#f5d76e', '#7f8c8d'];
  const randomColor = () => CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];

  // ---------- your tow truck ----------
  function makeTruck(x, y, angle) {
    return {
      x, y, angle, vx: 0, vy: 0, yaw: 0, steer: 0, speed: 0, slide: 0, slip: 0,
      len: 60, wid: 26, isPlayer: true, isTruck: true, towing: null, crashCd: 0, nitro: 0, boosting: false,
    };
  }

  // Sideways grip of a tire. Grip rises as the tire slips, peaks, then drops a little once it's sliding.
  // That drop is what lets a drift keep going after you kick the back end out.
  function tireForce(slipAngle, peak, maxForce, slideGrip) {
    const x = Math.abs(slipAngle) / peak;
    const f = x < 1 ? x * (2 - x) : Math.max(slideGrip, 1 - (x - 1) * 0.3);
    return Math.sign(slipAngle) * f * maxForce;
  }

  const wrap = (a) => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

  function startDrift(t, dir) {
    t.drifting = true;
    t.driftDir = dir || 1; // +1 = drifting through a right-hand turn, -1 = left
  }

  // Drifting is arcade-style so it's controllable on a keyboard:
  // the nose swings out to an angle you control with steering, and the truck carves around the turn.
  //  - hold steering into the turn: the drift holds, bigger angle the harder you steer
  //  - let go of steering: the drift fades out smoothly
  //  - countersteer or let off the gas: the truck snaps straight and the drift ends
  function driftStep(t, input, h, T, maxF, accel) {
    const spd = Math.hypot(t.vx, t.vy);
    let heading = Math.atan2(t.vy, t.vx);
    let beta = wrap(t.angle - heading); // how far the nose points away from where you're going
    const into = t.steer * t.driftDir;  // 1 = steering into the turn, -1 = countersteering
    let target = 0, rate = T.driftFade;
    if (input.up && into > 0.1) {
      target = Math.min(T.driftAngleMax, T.driftAngle + T.driftAngleSteer * into + (input.handbrake ? 0.15 : 0));
      rate = T.driftAngleRate;
    } else if (into < -0.1 || !input.up) {
      rate = T.driftAngleRate * 1.5;
    }
    beta += (target * t.driftDir - beta) * (1 - Math.exp(-rate * h));
    heading += T.driftCarve * beta * h;

    let push = input.up ? accel * T.driftPower * Math.max(0, 1 - (spd / maxF) ** 2) : 0;
    let scrub = spd * T.driftScrub * Math.abs(Math.sin(beta)) * (input.handbrake ? 1.8 : 1);
    if (input.down) scrub += T.brake * 0.6;
    const ns = Math.max(0, spd + (push - scrub) * h);

    t.vx = Math.cos(heading) * ns;
    t.vy = Math.sin(heading) * ns;
    const angle = heading + beta;
    t.yaw = wrap(angle - t.angle) / h;
    t.angle = angle;
    t.x += t.vx * h;
    t.y += t.vy * h;

    if (Math.abs(beta) < T.driftExit && target < T.driftExit * 2) t.drifting = false;
    else if (ns < T.driftMinSpeed - 60) t.drifting = false;
  }

  // Drives a free-moving vehicle with a simple two-axle tire model.
  // `input` has up/down/left/right/handbrake, or an analog `steer` from -1 to 1.
  // `stats` lets police cars reuse this with their own numbers.
  function updateTruck(t, input, dt, stats = C.truck) {
    const T = stats;
    const towing = !!t.towing;
    const boost = !!t.boosting;
    const maxF = T.maxSpeed * (towing ? T.towSpeedMul : 1) * (boost ? T.boostSpeedMul : 1);
    const accel = T.accel * (towing ? T.towAccelMul : 1) * (boost ? T.boostAccelMul : 1);
    const L = T.cgFront + T.cgRear;

    // The steering wheel eases in, and snaps back (or across, for a countersteer) faster.
    const steerTarget = input.steer !== undefined ? input.steer : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const turningIn = Math.abs(steerTarget) > Math.abs(t.steer) && Math.sign(steerTarget) === Math.sign(t.steer || steerTarget);
    t.steer += (steerTarget - t.steer) * (1 - Math.exp(-(turningIn ? T.steerIn : T.steerOut) * dt));

    const steps = 4, h = dt / steps;
    for (let k = 0; k < steps; k++) {
      const cos = Math.cos(t.angle), sin = Math.sin(t.angle);
      const vx = t.vx * cos + t.vy * sin;    // forward speed
      const vy = -t.vx * sin + t.vy * cos;   // sideways speed (+ = to the right)
      const sp = Math.abs(vx);
      const beta = Math.atan2(vy, Math.max(sp, 1));
      // (With the stability assist on, the extra countersteer lock is only for handbrake slides.)
      const sliding = Math.abs(beta) > 0.2 && sp > 80 && (!T.stability || input.handbrake);

      // Less steering at high speed so the truck isn't twitchy, more while sliding so you can countersteer.
      let steerMax = T.steerLow + (T.steerHigh - T.steerLow) * clamp(sp / T.maxSpeed, 0, 1);
      // Never let the wheel turn the truck faster than yawCap (radians per second), at any speed,
      // so a turn feels the same whether you're crawling or flying.
      if (T.yawCap) steerMax = Math.min(steerMax, Math.atan((L * T.yawCap) / Math.max(sp, 30)));
      const delta = t.steer * (sliding ? Math.max(steerMax, T.steerDrift) : steerMax);

      // engine and brakes
      let Fx = 0;
      if (input.up) Fx += vx < -5 ? T.brake : accel * Math.max(0, 1 - (vx / maxF) ** 2);
      if (input.down) Fx -= vx > 5 ? T.brake : T.accel * 0.7 * Math.max(0, 1 - (vx / T.reverseMax) ** 2);
      if (!input.up && !input.down) Fx -= vx * T.coast + Math.sign(vx) * Math.min(25, sp / h);
      if (vx > maxF) Fx -= (vx - maxF) * 2.5; // bleed off extra speed after a boost
      // Start a drift: handbrake + steering at speed, or the back end stepping out on its own.
      if (T.canDrift && !t.drifting && vx > T.driftMinSpeed) {
        if (input.handbrake && Math.abs(t.steer) > 0.3) startDrift(t, Math.sign(t.steer));
        else if (Math.abs(beta) > T.driftEnter) startDrift(t, -Math.sign(beta));
      }
      if (t.drifting) {
        driftStep(t, input, h, T, maxF, accel);
        continue;
      }

      let rearGrip = T.rearGrip;
      if (input.handbrake) {
        rearGrip *= T.handbrakeGrip;
        Fx -= Math.sign(vx) * Math.min(sp / h, T.handbrakeDecel);
      }
      // Gas uses up some of the rear tires' grip, so throttle swings the back end out mid-drift.
      const used = Math.min(Math.abs(Fx) * T.powerOversteer, rearGrip * 0.95);
      const rearLat = Math.sqrt(rearGrip * rearGrip - used * used);

      let fx = Fx, fy, torque;
      if (vx > -5) {
        const vxs = Math.max(sp, 150);
        const af = Math.atan2(vy + t.yaw * T.cgFront, vxs) - delta;
        const ar = Math.atan2(vy - t.yaw * T.cgRear, vxs);
        const Ff = -tireForce(af, T.slipPeak, T.frontGrip, 0.85);
        const Fr = -tireForce(ar, T.slipPeak, rearLat, T.slideGrip);
        const cd = Math.cos(delta), sd = Math.sin(delta);
        fx -= Ff * sd;
        fy = Fr + Ff * cd;
        torque = T.cgFront * Ff * cd - T.cgRear * Fr;
      } else {
        fy = -vy * 10; // reversing: just keep it from sliding
        torque = 0;
      }
      // At low speed (and in reverse) the truck simply goes where the wheels point.
      const kin = vx < 0 ? 1 : clamp(1 - (sp - 60) / 80, 0, 1);
      t.vx += (fx * cos - fy * sin) * h;
      t.vy += (fx * sin + fy * cos) * h;
      t.yaw += (torque / T.inertia) * h;

      // Drift assist: calm the rotation at big angles so a drift doesn't instantly become a spin.
      const excess = Math.max(0, Math.abs(beta) - 0.6);
      if (excess > 0 && Math.sign(t.yaw) === Math.sign(beta)) t.yaw *= Math.exp(-T.driftAssist * excess * h * 10);

      // Stability assist: in normal driving the truck turns the way the wheels point and the back end
      // doesn't step out by itself, so steering is smooth and predictable. Holding the handbrake turns
      // it off, so Space still kicks the truck into a drift.
      if (T.stability && !input.handbrake && vx > 0) {
        const yawK = (vx * Math.tan(delta)) / L;
        t.yaw += (yawK - t.yaw) * (1 - Math.exp(-T.stability * h));
        const lat = -t.vx * sin + t.vy * cos;
        const d = lat * (1 - Math.exp(-T.gripAssist * h));
        t.vx += sin * d;
        t.vy -= cos * d;
      }

      if (kin > 0) {
        const yawK = (vx * Math.tan(delta)) / L;
        t.yaw += (yawK - t.yaw) * Math.min(1, kin * 20 * h);
        const lat = -t.vx * sin + t.vy * cos;
        const damp = lat * Math.min(1, kin * 15 * h);
        t.vx += sin * damp;
        t.vy -= cos * damp;
      }

      t.yaw = clamp(t.yaw, -4.5, 4.5);
      t.angle += t.yaw * h;
      t.x += t.vx * h;
      t.y += t.vy * h;
    }

    const cos = Math.cos(t.angle), sin = Math.sin(t.angle);
    t.speed = t.vx * cos + t.vy * sin;
    t.slide = -t.vx * sin + t.vy * cos;
    t.slip = Math.atan2(t.slide, Math.max(Math.abs(t.speed), 1));
    if (t.crashCd > 0) t.crashCd -= dt;
  }

  // The truck's body as three circles along its length (good enough for bumping into things).
  function truckCircles(t) {
    const fx = Math.cos(t.angle), fy = Math.sin(t.angle);
    return [-19, 0, 19].map((o) => ({ x: t.x + fx * o, y: t.y + fy * o, r: 13 }));
  }

  function carCircles(c) {
    const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    const o = c.len / 4, r = c.wid / 2;
    return [{ x: c.x - fx * o, y: c.y - fy * o, r }, { x: c.x + fx * o, y: c.y + fy * o, r }];
  }

  function circleRect(cx, cy, r, rc) {
    const px = clamp(cx, rc.x, rc.x + rc.w), py = clamp(cy, rc.y, rc.y + rc.h);
    const dx = cx - px, dy = cy - py, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return null;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, pen: r - d }; }
    const l = cx - rc.x, rr = rc.x + rc.w - cx, tp = cy - rc.y, b = rc.y + rc.h - cy;
    const m = Math.min(l, rr, tp, b);
    if (m === l) return { nx: -1, ny: 0, pen: l + r };
    if (m === rr) return { nx: 1, ny: 0, pen: rr + r };
    if (m === tp) return { nx: 0, ny: -1, pen: tp + r };
    return { nx: 0, ny: 1, pen: b + r };
  }

  // Push the truck out along normal n and bounce its velocity. Returns impact speed.
  function bounce(t, nx, ny, pen, ovx = 0, ovy = 0) {
    t.x += nx * pen;
    t.y += ny * pen;
    const vn = (t.vx - ovx) * nx + (t.vy - ovy) * ny;
    if (vn >= 0) return 0;
    t.vx -= nx * vn * 1.15;
    t.vy -= ny * vn * 1.15;
    t.vx *= 0.94; t.vy *= 0.94;
    if (-vn > 40) t.yaw *= 0.6;
    if (-vn > 90) t.drifting = false;
    return -vn;
  }

  function collideTruckWorld(t) {
    let impact = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of truckCircles(t)) {
        for (const s of W.solids) {
          if (c.x + c.r < s.x || c.x - c.r > s.x + s.w || c.y + c.r < s.y || c.y - c.r > s.y + s.h) continue;
          const hit = circleRect(c.x, c.y, c.r, s);
          if (hit) {
            impact = Math.max(impact, bounce(t, hit.nx, hit.ny, hit.pen));
            c.x += hit.nx * hit.pen; c.y += hit.ny * hit.pen;
          }
        }
      }
    }
    return impact;
  }

  // Bump the truck against another vehicle. Returns impact speed (0 if not touching).
  function collideTruckCar(t, car, ovx = 0, ovy = 0) {
    if (Math.abs(car.x - t.x) > 80 || Math.abs(car.y - t.y) > 80) return 0;
    let impact = 0;
    const others = car.isTruck ? truckCircles(car) : carCircles(car);
    for (const a of truckCircles(t)) {
      for (const b of others) {
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d >= min || d < 1e-6) continue;
        impact = Math.max(impact, bounce(t, dx / d, dy / d, min - d, ovx, ovy) || 0.01);
      }
    }
    return impact;
  }

  // ---------- lane followers: traffic and rival tow trucks ----------
  function makeFollower(node, dir, along, opts) {
    const n = W.nodePos(node), D = W.DIRS[dir], o = W.laneOffset(dir);
    const f = {
      kind: opts.kind, isTruck: !!opts.isTruck,
      x: n.x + o.x + D.x * along, y: n.y + o.y + D.y * along,
      dir, node, target: W.step(node, dir), route: opts.route || null,
      speed: opts.speed * 0.5, maxSpeed: opts.speed, accel: opts.accel || 220, turnSpeed: opts.turnSpeed || 110,
      patience: opts.patience || 3, angle: (dir * Math.PI) / 2,
      len: opts.len || 44, wid: opts.wid || 22, color: opts.color || randomColor(),
      stuck: 0, ghost: 0, stun: 0, honkCd: 0, alpha: 1, blockedBy: null,
    };
    f.nextDir = pickNext(f);
    return f;
  }

  function pickNext(f) {
    if (f.route && f.route.length >= 2) return W.dirBetween(f.route[0], f.route[1]);
    const opts = W.validDirs(f.target).filter((d) => d !== (f.dir + 2) % 4);
    if (!opts.length) return (f.dir + 2) % 4;
    if (f.route) return opts.includes(f.dir) ? f.dir : opts[0];
    // traffic: mostly straight, sometimes turn
    const bag = [];
    for (const d of opts) for (let k = 0; k < (d === f.dir ? 3 : 1); k++) bag.push(d);
    return bag[Math.floor(Math.random() * bag.length)];
  }

  // Send a follower somewhere new. The route starts at the node it's already driving toward.
  function setRoute(f, dest) {
    f.route = W.route(f.target, dest);
    f.nextDir = pickNext(f);
  }

  // Where the follower switches from its current lane into the next one.
  function switchPoint(f) {
    const n = W.nodePos(f.target), o1 = W.laneOffset(f.dir), o2 = W.laneOffset(f.nextDir);
    return { x: n.x + o1.x + o2.x, y: n.y + o1.y + o2.y };
  }

  function arrive(f) {
    f.node = f.target;
    if (f.route) {
      f.route.shift();
      if (!f.route.length) f.routeDone = true;
    }
    f.dir = f.nextDir;
    f.target = W.step(f.node, f.dir);
    f.nextDir = pickNext(f);
  }

  const STOP_LINE = 28; // cars stop this far before the intersection
  const wrapAngle = (a) => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

  // Left and right turns follow a quarter circle through the intersection.
  function turnRadius(f) {
    if (f.nextDir === (f.dir + 1) % 4) return 34; // right turn: tight
    if (f.nextDir === (f.dir + 3) % 4) return 90; // left turn: wide
    return 0;                                     // straight or U-turn
  }

  function startArc(f, sp, r) {
    const D = W.DIRS[f.dir], D2 = W.DIRS[f.nextDir];
    const start = { x: sp.x - D.x * r, y: sp.y - D.y * r };
    f.x = start.x; f.y = start.y;
    const cx = start.x + D2.x * r, cy = start.y + D2.y * r;
    const a0 = Math.atan2(-D2.y, -D2.x);
    const sweep = wrapAngle(Math.atan2(D.y, D.x) - a0);
    f.arc = { cx, cy, r, a0, sweep, s: 0, len: (r * Math.PI) / 2, heading: (f.dir * Math.PI) / 2, turn: wrapAngle(((f.nextDir - f.dir) * Math.PI) / 2) };
  }

  // Moves a follower along its lane: stops at red lights, brakes for anything in front,
  // and curves smoothly through turns. Returns true when it passes through an intersection.
  function updateFollower(f, dt, obstacles, clock) {
    const D = W.DIRS[f.dir];
    const sp = switchPoint(f);
    const rem = (sp.x - f.x) * D.x + (sp.y - f.y) * D.y;
    const hx = Math.cos(f.angle), hy = Math.sin(f.angle);

    let desired = f.maxSpeed;
    const turning = f.nextDir !== f.dir;
    if (f.arc || (turning && rem < 130)) desired = Math.min(desired, f.turnSpeed);

    // Traffic light ahead?
    f.waitingLight = false;
    if (!f.arc && !f.ignoreLights) {
      const light = W.lightState(f.target, f.dir % 2, clock);
      if (light !== 'green') {
        const n = W.nodePos(f.target);
        const toStop = (n.x * D.x + n.y * D.y) - W.HALF - STOP_LINE - ((f.x * D.x + f.y * D.y) + f.len / 2);
        // On yellow, only stop if there's room to do it.
        if (toStop > -4 && (light === 'red' || toStop > 35)) {
          const v = Math.max(0, toStop * 2.5);
          if (v < desired) { desired = v; f.waitingLight = toStop < 30; }
        }
      }
    }

    f.blockedBy = null;
    for (const o of obstacles) {
      if (o === f || o.ghostly) continue;
      if (f.ghost > 0 && !o.isPlayer) continue;
      const dx = o.x - f.x, dy = o.y - f.y;
      const fwd = dx * hx + dy * hy;
      if (fwd <= 0 || fwd > 140) continue;
      if (Math.abs(dy * hx - dx * hy) > 20) continue;
      const gap = fwd - (f.len + o.len) / 2 - 8;
      const v = Math.max(0, gap * 4);
      if (v < desired) { desired = v; f.blockedBy = o; }
    }
    if (f.stun > 0) { f.stun -= dt; desired = 0; }

    f.braking = desired < f.speed - 5;
    if (f.speed > desired) f.speed = Math.max(desired, f.speed - 800 * dt);
    else f.speed = Math.min(desired, f.speed + f.accel * dt);

    // Waiting in line at a red light is fine. Stuck behind something else for too long? Squeeze past it.
    const b = f.blockedBy;
    f.queued = !!b && (b.waitingLight || b.queued);
    if (b && f.speed < 8 && !f.queued && !b.isPlayer) {
      f.stuck += dt;
      if (f.stuck > f.patience) { f.ghost = 1.2; f.stuck = 0; }
    } else f.stuck = Math.max(0, f.stuck - dt);
    if (f.ghost > 0) f.ghost -= dt;
    if (f.honkCd > 0) f.honkCd -= dt;

    let arrived = false;
    const move = f.speed * dt;

    if (f.arc) {
      const a = f.arc;
      a.s += move;
      const k = Math.min(1, a.s / a.len);
      const ang = a.a0 + a.sweep * k;
      f.x = a.cx + Math.cos(ang) * a.r;
      f.y = a.cy + Math.sin(ang) * a.r;
      f.angle = a.heading + a.turn * k;
      if (k >= 1) {
        f.arc = null;
        arrive(f);
        arrived = true;
      }
      return arrived;
    }

    const r = turnRadius(f);
    if (r && rem <= r + move) {
      startArc(f, sp, r);
      return false;
    }
    if (move >= rem) {
      const m = Math.max(0, rem);
      f.x += D.x * m; f.y += D.y * m;
      arrive(f);
      arrived = true;
    } else {
      f.x += D.x * move; f.y += D.y * move;
    }

    // Ease sideways into the lane (only matters after a U-turn) and turn the body smoothly.
    const D2 = W.DIRS[f.dir], n = W.nodePos(f.target), o = W.laneOffset(f.dir);
    const k = Math.min(1, dt * 6);
    if (D2.x !== 0) f.y += (n.y + o.y - f.y) * k;
    else f.x += (n.x + o.x - f.x) * k;
    f.angle += wrapAngle((f.dir * Math.PI) / 2 - f.angle) * Math.min(1, dt * 10);
    return arrived;
  }

  // A car on a tow hook swings along behind whatever is pulling it.
  function updateTowed(car, puller, dt) {
    const fx = Math.cos(puller.angle), fy = Math.sin(puller.angle);
    const hx = puller.x - fx * (puller.len / 2), hy = puller.y - fy * (puller.len / 2);
    const want = car.len / 2 + 4;
    car.towDist += (want - car.towDist) * Math.min(1, dt * 5);
    let dx = car.x - hx, dy = car.y - hy;
    const d = Math.hypot(dx, dy) || 1;
    car.x = hx + (dx / d) * car.towDist;
    car.y = hy + (dy / d) * car.towDist;
    car.angle = Math.atan2(hy - car.y, hx - car.x);
  }

  function spawnTraffic(count, avoid) {
    const list = [];
    let tries = 0;
    while (list.length < count && tries++ < count * 40) {
      const node = { i: Math.floor(Math.random() * (W.N + 1)), j: Math.floor(Math.random() * (W.N + 1)) };
      const dirs = W.validDirs(node);
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const along = 90 + Math.random() * (W.CELL - 180);
      const van = Math.random() < 0.2;
      const f = makeFollower(node, dir, along, {
        kind: 'traffic',
        speed: C.trafficSpeed[0] + Math.random() * (C.trafficSpeed[1] - C.trafficSpeed[0]),
        len: van ? 54 : 44, wid: van ? 24 : 22,
      });
      f.van = van;
      if (avoid && Math.hypot(f.x - avoid.x, f.y - avoid.y) < 350) continue;
      if (list.some((o) => Math.hypot(o.x - f.x, o.y - f.y) < 90)) continue;
      list.push(f);
    }
    return list;
  }

  return {
    makeTruck, updateTruck, collideTruckWorld, collideTruckCar,
    makeFollower, updateFollower, setRoute, updateTowed, spawnTraffic, randomColor,
  };
})();
