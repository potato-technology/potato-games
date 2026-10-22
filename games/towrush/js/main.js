// Game loop, input, and the title / pause / shift-over screens.
(() => {
  const C = CONFIG;
  const W = World;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let sw = 0, sh = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    sw = window.innerWidth;
    sh = window.innerHeight;
    canvas.width = Math.round(sw * dpr);
    canvas.height = Math.round(sh * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- input ----------
  const keys = {};
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'handbrake',
    ShiftLeft: 'boost', ShiftRight: 'boost',
  };
  window.addEventListener('keydown', (e) => {
    if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    if (e.repeat) return;
    if (e.code === 'KeyE' && mode === 'playing') Jobs.tryHook(game);
    if (e.code === 'KeyB' && mode === 'playing') payBail();
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'Enter') {
      if (mode === 'title' || mode === 'over' || mode === 'garage') start();
      else if (mode === 'paused') togglePause();
    }
  });
  window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { for (const k in keys) keys[k] = false; if (mode === "playing") togglePause(); }
  });
  window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
    if (mode === 'playing') togglePause();
  });

  // ---------- on-screen buttons for touch screens ----------
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0 || /[?&]touch/.test(location.search);
  document.querySelectorAll('#touch button').forEach((b) => {
    const k = b.dataset.k;
    const down = (e) => {
      e.preventDefault();
      Sound.init();
      b.classList.add('on');
      if (k === 'pause') { togglePause(); return; }
      if (k === 'hook') { if (mode === 'playing') { Jobs.tryHook(game); payBail(); } return; }
      keys[k] = true;
    };
    const up = (e) => { e.preventDefault(); b.classList.remove('on'); if (k !== 'pause' && k !== 'hook') keys[k] = false; };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });
  Render.setTouch(isTouch);
  function syncTouch() { $('touch').classList.toggle('hidden', !(isTouch && mode === 'playing')); }

  // ---------- steering sensitivity (saved in this browser) ----------
  let steering = 'normal';
  try { steering = localStorage.getItem('towrush.steering') || 'normal'; } catch (e) { /* storage blocked */ }
  if (!C.steering[steering]) steering = 'normal';

  function applySteering() {
    if (game && game.stats) Object.assign(game.stats.truck, C.steering[steering]);
    document.querySelectorAll('.steer-opt').forEach((b) => b.classList.toggle('on', b.dataset.steer === steering));
  }

  function setSteering(s) {
    steering = s;
    try { localStorage.setItem('towrush.steering', s); } catch (e) { /* storage blocked */ }
    applySteering();
  }

  // ---------- game state ----------
  let mode = 'title';
  let game = makeGame();
  let upcoming = Extras.pickContracts(); // the contracts for your next shift (shown on the menus)
  function showUpcoming() {
    const html = upcoming.map((c) => `<div class="ct"><i>★</i><span>${c.text}</span><b>+${Render.money(c.reward)}</b></div>`).join("");
    document.querySelectorAll(".next-contracts").forEach((el) => (el.innerHTML = html));
  }

  function makeGame() {
    const y = W.yard;
    const truck = Vehicles.makeTruck(y.gate.x + y.gate.w / 2, y.y + 130, -Math.PI / 2);
    const g = {
      time: C.shiftSeconds, overtime: false, clock: 0,
      money: 0, earned: 0, repairs: 0, jobsDone: 0, jobsLost: 0, crashes: 0,
      truck, traffic: Vehicles.spawnTraffic(C.trafficCount, truck), rivals: [],
      parts: [], floaters: [], skids: [], yardCars: [], banner: null,
      cam: { x: truck.x, y: truck.y - 200, zoom: 1 }, look: { x: 0, y: 0 }, notices: [], gps: null, gpsTimer: 0, shake: 0, smokeTimer: 0, rearPrev: null,
    };
    g.toast = (title, sub, color) => { g.banner = { title, sub, color, life: 3 }; };
    g.float = (x, y, text, color) => g.floaters.push({ x, y, text, color, life: 1.4 });
    g.notice = (text, color) => {
      const same = g.notices.find((n) => n.text === text);
      if (same) { same.life = 3; return; } // no stacks of the same message
      g.notices.push({ text, color, life: 3 });
      if (g.notices.length > 3) g.notices.shift();
    };
    g.stats = Garage.stats(); // your upgrades
    Object.assign(g.stats.truck, C.steering[steering]);
    g.bankAtStart = Garage.bank;
    g.bailPaid = 0;
    Jobs.reset(g);
    Police.reset(g);
    Drift.reset(g);
    Extras.reset(g);
    return g;
  }

  function show(id, on) { $(id).classList.toggle('hidden', !on); }

  function start() {
    Sound.init();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // so Space (handbrake) can't press a menu button
    game = makeGame();
    game.contracts = upcoming;
    upcoming = Extras.pickContracts();
    mode = 'playing';
    show('title', false);
    show('over', false);
    show('pause', false);
    show('garage', false);
  }

  function openGarage() {
    Sound.init();
    mode = 'garage';
    show('title', false);
    show('over', false);
    show('garage', true);
    Garage.renderUI();
  }

  function closeGarage() {
    mode = 'title';
    show('garage', false);
    showBankOnTitle();
    show('title', true);
  }

  // In jail? Pay to get out now. Comes out of this shift's money, and your bank covers the rest.
  function payBail() {
    const g = game;
    if (!(g.jail > 0)) return;
    const bail = g.stats.bail || C.bail;
    if (g.money + g.bankAtStart < bail) { g.notice(`Bail is ${Render.money(bail)} - you can't afford it`, "#ff6b5a"); return; }
    g.money -= bail;
    g.bailPaid += bail;
    g.jail = 0.001;
    Sound.cash();
    g.notice(`Paid ${Render.money(bail)} bail`, '#ffd23f');
  }

  function togglePause() {
    if (mode === 'playing') { mode = 'paused'; show('pause', true); Sound.engine(0, false); Sound.siren(0); Sound.screech(0); }
    else if (mode === 'paused') { mode = 'playing'; show('pause', false); }
  }

  function toggleMute() {
    const m = Sound.toggleMute();
    document.querySelectorAll('.mute-label').forEach((el) => (el.textContent = m ? 'Sound: off (M)' : 'Sound: on (M)'));
  }

  function loadBest() {
    try { return JSON.parse(localStorage.getItem('towrush.best') || 'null'); } catch (e) { return null; }
  }
  function saveBest(b) {
    try { localStorage.setItem('towrush.best', JSON.stringify(b)); } catch (e) { /* storage blocked */ }
  }

  function endShift() {
    const g = game;
    mode = "over";
    Extras.finishContracts(g);
    Sound.engine(0, false);
    Sound.siren(0);
    Sound.screech(0);
    const best = loadBest();
    const isBest = !best || g.money > best.money;
    if (isBest) saveBest({ money: g.money, jobs: g.jobsDone });
    $('ov-money').textContent = Render.money(g.money);
    // 1 to 3 stars for a good shift, and a fun rank to go with them
    const stars = C.shiftStars.filter((s) => g.money >= s).length;
    [...$('ov-stars').children].forEach((s, i) => { s.className = i < stars ? 'on' : ''; });
    $('ov-rank').textContent = ['Tow Rookie', 'Road Runner', 'Tow Pro', 'Tow Legend'][stars] + (stars < 3 ? ` · next star at ${Render.money(C.shiftStars[stars])}` : '');
    $('ov-title').textContent = stars === 3 ? 'Legendary shift!' : stars ? 'Shift over' : 'Shift over... keep at it!';
    if (stars > 0) Sound.cash();
    $('ov-earned').textContent = Render.money(g.earned);
    $('ov-repairs').textContent = g.repairs ? '-' + Render.money(g.repairs) : '$0';
    $('ov-jobs').textContent = g.jobsDone;
    $('ov-lost').textContent = g.jobsLost;
    $('ov-arrests').textContent = g.arrests;
    $('ov-drift').textContent = Render.money(g.drift.cash);
    $('ov-best-drift').textContent = g.drift.best.toLocaleString();
    $('ov-bail').textContent = g.bailPaid ? '-' + Render.money(g.bailPaid) : '$0';
    $('ov-streak').textContent = g.track.bestStreak ? g.track.bestStreak + ' in a row' : '-';
    $('ov-pickups').textContent = g.track.pickups;
    $("ov-contracts").innerHTML = g.contracts.map((c) => `<div class="ct${c.done ? " done" : ""}"><i>${c.done ? "✔" : "✖"}</i><span>${c.text}</span><b>${c.done ? "+" : ""}${Render.money(c.reward)}</b></div>`).join("");
    $('ov-best').textContent = isBest ? 'New personal best!' : `Best shift: ${Render.money(best.money)}`;
    $('ov-best').classList.toggle('new-best', isBest);
    Garage.deposit(g.money);
    $('ov-bank').textContent = Render.money(Garage.bank);
    // Potato hub: report the shift as a score and pay out Spuds (1 per $50 earned).
    const spuds = Math.min(40, Math.floor(Math.max(0, g.money) / 50));
    if (window.Potato) {
      Potato.score(Math.round(g.money));
      if (spuds > 0) Potato.earn(spuds);
    }
    $('ov-spuds').textContent = window.Potato && Potato.inHub ? `+${spuds} Spuds` : '';
    showUpcoming();
    show("over", true);
  }

  function showBankOnTitle() {
    const best = loadBest();
    $('title-best').textContent = best ? `Best shift: ${Render.money(best.money)} (${best.jobs} jobs)` : '';
    $('title-bank').textContent = `Bank: ${Render.money(Garage.bank)}`;
    showUpcoming();
  }
  // Playing from the Potato hub: greet the driver and earn Spuds.
  if (window.Potato && Potato.inHub) {
    Potato.onReady((p) => { $('title-driver').textContent = `Driver: ${p.name} - every $50 you make is 1 Spud`; });
  }
  showBankOnTitle();

  // ---------- update ----------
  function addParticle(g, p) {
    if (g.parts.length < 400) g.parts.push(p);
  }

  function update(dt) {
    const g = game;
    const t = g.truck;
    const playing = mode === 'playing';
    const jailed = g.jail > 0;
    g.clock += dt;

    if (playing) g.time = Math.max(0, g.time - dt);
    let impact = 0;
    if (!jailed) {
      Drift.updateBoost(g, dt, playing && keys.boost);
      Vehicles.updateTruck(t, playing ? keys : {}, dt, Jobs.towStats(g));
      impact = Vehicles.collideTruckWorld(t);
    }

    // traffic, rivals and police
    const obstacles = [...g.traffic, ...g.rivals, ...g.police];
    if (!jailed) obstacles.push(t);
    if (t.towing) obstacles.push(t.towing);
    if (g.job.car && g.job.car.broken) obstacles.push(g.job.car);
    obstacles.push(...g.job.extras);
    if (g.owner) obstacles.push(g.owner);
    for (const r of g.rivals) if (r.towing) obstacles.push(r.towing);
    for (const f of g.traffic) Vehicles.updateFollower(f, dt, obstacles, g.clock);
    for (const r of g.rivals) {
      const arrived = Vehicles.updateFollower(r, dt, obstacles, g.clock);
      if (arrived && r.state === 'home' && W.sameNode(r.node, r.home)) { r.leaving = true; r.ghostly = true; }
      if (r.leaving) r.alpha -= dt * 2;
      if (r.towing) { Vehicles.updateTowed(r.towing, r, dt); r.towing.alpha = r.alpha; }
    }
    g.rivals = g.rivals.filter((r) => r.alpha > 0);
    Police.update(g, dt, obstacles);

    if (!jailed) {
      // bumping into things
      for (const f of g.traffic) {
        if (f.fadeOut) continue; // rush-hour cars that are leaving
        const D = W.DIRS[f.dir];
        const hit = Vehicles.collideTruckCar(t, f, D.x * f.speed, D.y * f.speed);
        if (!hit) continue;
        impact = Math.max(impact, hit);
        if (hit > 60) f.stun = 1.2;
        if (hit > 40 && f.honkCd <= 0) { Sound.honk(); f.honkCd = 2.5; }
        if (hit > 150 && playing) Police.violate(g, 'Crashing into cars');
      }
      for (const r of g.rivals) {
        if (r.leaving) continue;
        const D = W.DIRS[r.dir];
        impact = Math.max(impact, Vehicles.collideTruckCar(t, r, D.x * r.speed, D.y * r.speed));
      }
      for (const p of g.police) {
        if (p.mode === 'leaving') continue;
        const D = W.DIRS[p.dir];
        const v = p.mode === 'patrol' ? { x: D.x * p.speed, y: D.y * p.speed } : { x: p.vx, y: p.vy };
        // Getting boxed in by cops doesn't cost repair money; ramming a patrol car starts a chase.
        const hit = Vehicles.collideTruckCar(t, p, v.x, v.y);
        if (hit > 60 && (p.mode === 'patrol' || p.mode === 'scene') && playing) Police.violate(g, 'Ramming a police car', Infinity);
      }
      if (g.job.car && g.job.car.broken) impact = Math.max(impact, Vehicles.collideTruckCar(t, g.job.car));
      for (const w of g.job.extras) impact = Math.max(impact, Vehicles.collideTruckCar(t, w));
      if (g.owner && !g.owner.leaving) Vehicles.collideTruckCar(t, g.owner, g.owner.vx, g.owner.vy); // the owner shoving you is free
      if (t.towing) Vehicles.updateTowed(t.towing, t, dt);

      if (playing && impact > C.crashMinSpeed && t.crashCd <= 0 && t.shield) {
        // The bumper shield soaks up one crash: no repair bill, no lost drift, no VIP damage.
        t.shield = false;
        t.crashCd = 0.6;
        g.shake = Math.min(8, impact / 40);
        g.float(t.x, t.y - 30, "SHIELD!", "#9fd8ff");
        Sound.shieldPop();
        addParticle(g, { type: "ring", color: "#9fd8ff", x: t.x, y: t.y, vx: 0, vy: 0, life: 0.5, max: 0.5 });
      }
      if (playing && impact > C.crashMinSpeed && t.crashCd <= 0) {
        const cost = Math.round(impact * C.crashCostPerSpeed * (g.stats.repairMul ?? 1));
        g.money -= cost;
        g.repairs += cost;
        g.crashes++;
        g.float(t.x, t.y - 30, `-$${cost}`, "#ff6b5a");
        Sound.crash(impact);
        t.crashCd = 0.5;
        t.bump = 1;
        g.shake = Math.min(14, impact / 28);
        if (impact > 160) g.flash = Math.min(0.5, impact / 600);
        Drift.crash(g);
        Jobs.towCrash(g);
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2, s = 100 + Math.random() * 250;
          addParticle(g, { type: 'spark', x: t.x + Math.cos(t.angle) * 26, y: t.y + Math.sin(t.angle) * 26, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, max: 0.4 });
        }
      }

      // Traffic stuck behind you gets impatient.
      if (playing) {
        for (const f of g.traffic) {
          if ((f.blockedBy === t || f.blockedBy === t.towing) && f.speed < 5) {
            f.waitHonk = (f.waitHonk || 0) + dt;
            if (f.waitHonk > 1.5 && f.honkCd <= 0) { Sound.honk(); f.honkCd = 3; f.waitHonk = 0; }
          } else f.waitHonk = 0;
        }
        Police.checkRules(g, dt);
        Drift.update(g, dt);
      }
    } else if (playing) {
      Police.updateJail(g, dt);
      Drift.update(g, dt);
    }

    // jobs, pickups, contracts and the shift clock
    Extras.update(g, dt, playing);
    if (playing) {
      Jobs.update(g, dt);
      if (g.time <= 0) {
        if (g.job.state === 'towing') {
          if (!g.overtime) { g.overtime = true; g.toast('OVERTIME!', 'Shift is over - deliver this last car', '#ffae00'); }
        } else {
          endShift();
        }
      }
      if (g.time > 0 && g.time <= 10 && Math.ceil(g.time) !== Math.ceil(g.time + dt)) Sound.tick();
    }

    // effects
    const fx = Math.cos(t.angle), fy = Math.sin(t.angle);
    const rear = [-1, 1].map((s) => ({ x: t.x - fx * 20 - fy * 10 * s, y: t.y - fy * 20 + fx * 10 * s }));
    const slideAmt = Math.abs(t.slip) * Math.min(1, Math.hypot(t.vx, t.vy) / 250);
    const skidding = !jailed && (slideAmt > 0.15 || (keys.handbrake && playing && Math.abs(t.speed) > 120));
    if (skidding && g.rearPrev) {
      rear.forEach((p, k) => g.skids.push({ x1: g.rearPrev[k].x, y1: g.rearPrev[k].y, x2: p.x, y2: p.y, life: 8 }));
      // tire smoke: heavier the more sideways you are
      for (const p of rear) {
        if (Math.random() < 0.25 + slideAmt) {
          addParticle(g, { type: 'smoke', shade: 215, x: p.x, y: p.y, vx: (Math.random() - 0.5) * 30 - t.vx * 0.1, vy: (Math.random() - 0.5) * 30 - t.vy * 0.1, size: 7 + slideAmt * 8, life: 0.9, max: 0.9 });
        }
      }
    }
    g.rearPrev = rear;
    // nitro flames
    if (t.boosting && !jailed) {
      for (let k = 0; k < 2; k++) {
        const s = 80 + Math.random() * 120;
        addParticle(g, { type: 'flame', x: t.x - fx * 32, y: t.y - fy * 32, vx: -fx * s + (Math.random() - 0.5) * 40 + t.vx * 0.6, vy: -fy * s + (Math.random() - 0.5) * 40 + t.vy * 0.6, size: 6, life: 0.25, max: 0.25 });
      }
    }
    Sound.screech(playing && skidding ? Math.min(1, slideAmt * 1.6 + (keys.handbrake ? 0.3 : 0)) : 0);
    if (g.skids.length > 600) g.skids.splice(0, g.skids.length - 600);
    for (const s of g.skids) s.life -= dt;
    g.skids = g.skids.filter((s) => s.life > 0);

    if (g.job.state === 'call' && !g.job.car.parked) {
      g.smokeTimer -= dt;
      if (g.smokeTimer <= 0) {
        g.smokeTimer = 0.12;
        const c = g.job.car;
        addParticle(g, { type: 'smoke', shade: 90, x: c.x + Math.cos(c.angle) * 16, y: c.y + Math.sin(c.angle) * 16, vx: (Math.random() - 0.5) * 20, vy: -25 - Math.random() * 20, size: 7, life: 1.4, max: 1.4 });
      }
    }
    for (const p of g.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; } if (p.spin) p.rot = (p.rot || 0) + p.spin * dt; }
    if (g.flash > 0) g.flash -= dt;
    // little celebrations: a ring when you hook a car, confetti and coins when you deliver one
    if (g.lastJobState === 'call' && g.job.state === 'towing') addParticle(g, { type: 'ring', x: t.x, y: t.y, vx: 0, vy: 0, life: 0.6, max: 0.6 });
    if (g.jobsDone > (g.lastJobsDone || 0)) {
      for (let k = 0; k < 40; k++) {
        const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 320;
        addParticle(g, { type: k % 3 ? 'confetti' : 'coin', x: t.x, y: t.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.5, spin: (Math.random() - 0.5) * 14, color: ['#ffd23f', '#5ee07a', '#ff6b3d', '#7af0ff', '#ff6fa8'][k % 5], size: 5 + Math.random() * 3, life: 1.4, max: 1.4 });
      }
      g.shake = Math.max(g.shake, 5);
    }
    g.lastJobsDone = g.jobsDone;
    g.lastJobState = g.job.state;
    g.parts = g.parts.filter((p) => p.life > 0);
    for (const f of g.floaters) { f.y -= 40 * dt; f.life -= dt; }
    g.floaters = g.floaters.filter((f) => f.life > 0);
    if (g.banner) g.banner.life -= dt;
    for (const n of g.notices) n.life -= dt;
    g.notices = g.notices.filter((n) => n.life > 0);
    g.shake = Math.max(0, g.shake - dt * 30);

    // GPS route
    g.gpsTimer -= dt;
    if (g.gpsTimer <= 0) {
      g.gpsTimer = 0.3;
      const goal = Jobs.goal(g);
      if (goal) {
        // Inside the yard, the route starts by leaving through the gate.
        const y = W.yard;
        const inYard = W.pointInRect(t.x, t.y, y);
        const gateOut = { x: y.gate.x + y.gate.w / 2, y: y.y - W.HALF };
        const from = inYard ? gateOut : t;
        const startNode = W.nearestNode(from.x, from.y);
        let best = null;
        for (const n of goal.nodes) {
          const p = W.route(startNode, n, false);
          if (!best || p.length < best.length) best = p;
        }
        let pts = best.map(W.nodePos);
        // Skip the first node if you're already past it.
        if (pts.length >= 2 && Math.hypot(pts[1].x - from.x, pts[1].y - from.y) < Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)) pts = pts.slice(1);
        g.gps = [{ x: t.x, y: t.y }, ...(inYard ? [{ x: gateOut.x, y: y.y + 20 }, gateOut] : []), ...pts, { x: goal.x, y: goal.y }];
      } else g.gps = null;
    }
    if (g.gps) g.gps[0] = { x: t.x, y: t.y };

    // camera: look ahead of the truck (eased, so bumps don't jerk the view), zoom out a bit at speed
    const lk = 1 - Math.exp(-2.5 * dt);
    g.look.x += (t.vx * 0.5 - g.look.x) * lk;
    g.look.y += (t.vy * 0.5 - g.look.y) * lk;
    const st = W.station;
    const tx = g.jail > 0 ? st.x + st.w / 2 : t.x + g.look.x;
    const ty = g.jail > 0 ? st.y + st.h / 2 : t.y + g.look.y;
    const ck = 1 - Math.exp(-5 * dt);
    g.cam.x += (tx - g.cam.x) * ck;
    g.cam.y += (ty - g.cam.y) * ck;
    const base = clamp(Math.min(sw, sh) / 820, 0.5, 1.2);
    const sp = Math.min(1, Math.abs(t.speed) / g.stats.truck.maxSpeed);
    const targetZoom = base * (1 - 0.18 * sp - (t.boosting ? 0.08 : 0));
    g.cam.zoom += (targetZoom - g.cam.zoom) * Math.min(1, dt * 2);

    t.braking = playing && keys.down && t.speed > 5;
    if (t.bump > 0) t.bump = Math.max(0, t.bump - dt * 4);
    Sound.engine(sp, playing && g.jail <= 0);
    Sound.siren(playing ? Police.sirenLevel(g) : 0);
  }

  // ---------- main loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Small fixed-size steps keep the physics smooth even when the frame rate dips.
    if (mode !== "paused" && !frozen) {
      const steps = Math.ceil(dt / (1 / 60));
      for (let k = 0; k < steps && mode !== 'paused'; k++) { if (auto && mode === 'playing') autopilot(); update(dt / steps); }
    }
    syncTouch();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rt0 = performance.now();
    Render.frame(ctx, game, sw, sh, mode !== 'title');
    if (window.__frames !== undefined) { window.__frames++; const ms = performance.now() - rt0; window.__fmax = Math.max(window.__fmax || 0, ms); const el = document.getElementById('testlog2'); if (el) el.textContent = 'frames ' + window.__frames + ' max ' + window.__fmax.toFixed(1) + 'ms last ' + ms.toFixed(1); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- autopilot (for testing): follows the GPS line, hooks and delivers ----------
  let auto = false, frozen = false;
  function autopilot() {
    const g = game, t = g.truck;
    for (const k of ['up', 'down', 'left', 'right', 'handbrake', 'boost']) keys[k] = false;
    if (g.jail > 0) { if (g.jail < 29) payBail(); return; }
    if (!g.gps || g.gps.length < 2) { keys.down = Math.abs(t.speed) > 20; return; }
    const ap = g.ap || (g.ap = { stuck: 0, back: 0 });
    let tgt = g.gps[1];
    for (let k = 1; k < g.gps.length; k++) { tgt = g.gps[k]; if (Math.hypot(tgt.x - t.x, tgt.y - t.y) > 90) break; }
    const want = Math.atan2(tgt.y - t.y, tgt.x - t.x);
    const diff = Math.atan2(Math.sin(want - t.angle), Math.cos(want - t.angle));
    if (ap.back > 0) {
      // stuck against something: back up with the wheel turned the other way
      ap.back -= 1 / 60;
      keys.down = true;
      keys.left = diff > 0; keys.right = diff < 0;
      return;
    }
    keys.left = diff < -0.12; keys.right = diff > 0.12;
    const hook = Jobs.canHook(g);
    const carD = g.job.state === 'call' ? Math.hypot(g.job.car.x - t.x, g.job.car.y - t.y) : Infinity;
    if (hook === 'slow' || (carD < 200 && t.speed > 90)) keys.down = true;
    else if (Math.abs(diff) > 1.0 && t.speed > 110) keys.down = true;
    else keys.up = t.speed < (Math.abs(diff) > 0.4 ? 150 : 300);
    if (t.nitro > 0.5 && Math.abs(diff) < 0.1 && t.speed > 150 && !g.wanted) keys.boost = true;
    if (keys.up && Math.abs(t.speed) < 15) ap.stuck += 1 / 60; else ap.stuck = Math.max(0, ap.stuck - 1 / 30);
    if (ap.stuck > 1.2) { ap.stuck = 0; ap.back = 0.9; }
    if (hook === 'ok') Jobs.tryHook(g);
  }

  // A busy moment for screenshots (?demo): rush hour at sunset, a streak going, towing a VIP car.
  function demoSetup() {
    start();
    const g = game, t = g.truck, y = W.yard;
    const stop = () => { t.vx = t.vy = t.speed = 0; t.yaw = 0; };
    for (let k = 0; k < 3; k++) {
      g.job.state = 'waiting'; g.job.timer = 0; update(1 / 60);
      const c = g.job.car;
      t.x = c.x - Math.cos(c.angle) * 50; t.y = c.y - Math.sin(c.angle) * 50; stop();
      Jobs.tryHook(g);
      t.x = y.zone.x + y.zone.w / 2; t.y = y.zone.y + y.zone.h / 2; stop();
      if (t.towing) { t.towing.x = t.x; t.towing.y = t.y + 40; }
      update(1 / 60);
    }
    g.time = C.rushHour.at + 0.01;
    update(1 / 60);
    g.time = 72;
    // hook a VIP car and put the truck on the road heading east
    g.job.state = 'waiting'; g.job.timer = 0; update(1 / 60);
    const c = g.job.car;
    Object.assign(c, { vip: true, color: '#15181d', len: 48, wid: 23, parked: false });
    g.job.type = 'vip';
    t.x = c.x - Math.cos(c.angle) * 50; t.y = c.y - Math.sin(c.angle) * 50; stop();
    Jobs.tryHook(g);
    t.x = 2 * W.CELL + 150; t.y = 4 * W.CELL + C.lane; t.angle = 0; t.vx = 250; t.speed = 250;
    t.towing.x = t.x - 60; t.towing.y = t.y; t.towing.angle = 0;
    g.traffic = g.traffic.filter((f) => Math.hypot(f.x - t.x, f.y - t.y) > 160);
    g.pickups.push({ x: t.x + 230, y: t.y, kind: 'cash', t: 0, born: 1 }, { x: t.x + 330, y: t.y - 70, kind: 'shield', t: 1, born: 1 }, { x: t.x + 460, y: t.y, kind: 'nitro', t: 2, born: 1 });
    t.shield = true;
    g.jammer = 9;
    t.nitro = 0.7;
    g.track.pickups = 4;
    g.camSnap = true;
    for (let k = 0; k < 40; k++) { keys.up = true; update(1 / 60); }
    keys.up = false;
    g.cam.x = t.x + g.look.x; g.cam.y = t.y + g.look.y;
  }

  // A quick self-check of the shift systems (used by ?unit). Teleports the truck around.
  function unitTest() {
    const out = [];
    const ok = (name, cond) => out.push((cond ? 'PASS ' : 'FAIL ') + name);
    start();
    const g = game, t = g.truck, y = W.yard;
    const stop = () => { t.vx = t.vy = t.speed = 0; t.yaw = 0; };
    const doJob = () => {
      g.job.state = 'waiting'; g.job.timer = 0; update(1 / 60);
      const c = g.job.car;
      t.x = c.x - Math.cos(c.angle) * 50; t.y = c.y - Math.sin(c.angle) * 50; stop();
      Jobs.tryHook(g);
      const hooked = g.job.state === 'towing';
      t.x = y.zone.x + y.zone.w / 2; t.y = y.zone.y + y.zone.h / 2; t.angle = -Math.PI / 2; stop();
      if (t.towing) { t.towing.x = t.x; t.towing.y = t.y + 40; }
      update(1 / 60);
      return hooked;
    };
    const m0 = g.money;
    ok('first job hooked', doJob());
    ok('first job delivered', g.jobsDone === 1 && g.streak === 1);
    const pay1 = g.money - m0;
    for (let k = 0; k < 3; k++) doJob();
    ok('streak reaches 4', g.streak === 4 && g.track.bestStreak === 4);
    ok('streak multiplier is x1.4', Math.abs(Extras.streakMul(g.streak) - 1.4) < 1e-9);
    ok('money went up (' + pay1 + ' first job)', g.money > m0 && pay1 > 0);
    // pickups
    for (const kind of ['cash', 'nitro', 'shield', 'jammer', 'clock']) {
      const before = { money: g.money, nitro: t.nitro, time: g.time };
      g.pickups.push({ x: t.x, y: t.y, kind, t: 0, born: 1 });
      update(1 / 60);
      if (kind === 'cash') ok('cash pickup pays', g.money > before.money);
      if (kind === 'nitro') ok('nitro pickup fills', t.nitro > before.nitro);
      if (kind === 'shield') ok('shield pickup', t.shield === true);
      if (kind === 'jammer') ok('jammer pickup', g.jammer > 10);
      if (kind === 'clock') ok('clock pickup adds time', g.time > before.time + 5);
    }
    // jammer hides a red light
    Police.violate(g, 'Ran a red light', Infinity);
    ok('jammer stops a chase starting', !g.wanted);
    g.jammer = 0;
    // shield soaks one crash
    const rep = g.repairs;
    t.crashCd = 0;
    const wall = W.solids[0];
    t.x = wall.x + wall.w / 2; t.y = wall.y - 14; t.angle = Math.PI / 2; t.vx = 0; t.vy = 300;
    update(1 / 60);
    ok('shield used up on a crash with no repair bill', !t.shield && g.repairs === rep);
    // a lost job resets the streak
    g.job.state = 'waiting'; g.job.timer = 0; update(1 / 60);
    g.job.dispatched = true;
    Jobs.dropTow(g); // nothing to drop while not towing
    g.streak = 3; Extras.streakLost(g); ok('streak resets', g.streak === 0);
    // rush hour
    g.time = C.rushHour.at; update(1 / 60);
    ok('rush hour started', g.rush.started && g.rush.left > 0 && g.traffic.some((f) => f.rush));
    g.rush.left = 0.01; update(1 / 60); for (let k = 0; k < 200; k++) update(1 / 60);
    ok('rush traffic fades away', !g.traffic.some((f) => f.rush));
    // contracts and the end of the shift
    ok('contracts picked', g.contracts.length === 3);
    g.time = 0; g.job.state = 'waiting'; update(1 / 60);
    ok('shift ended', mode === 'over');
    ok('no NaN', [t.x, t.y, t.vx, t.vy, g.money].every(isFinite));
    return out;
  }

  // Handy for poking at the game from the browser console: TowRush.game
  window.TowRush = {
    get game() { return game; }, get mode() { return mode; }, keys,
    start, endShift, openGarage,
    step(n = 60, dt = 1 / 60) { for (let k = 0; k < n; k++) { if (auto && mode === 'playing') autopilot(); update(dt); } },
    set autopilot(v) { auto = !!v; }, get autopilot() { return auto; },
  };

  // Test-only URL params, e.g. ?play&sim=40&auto  ?garage&bank=3000  ?over&sim=60
  (() => {
    const q = new URLSearchParams(location.search);
    if (!['play', 'over', 'sim', 'garage', 'unit', 'demo', 'bank', 'log'].some((k) => q.has(k))) return;
    window.__noAudio = true;
    document.body.classList.add("test");
    if (q.has('bank')) { Garage.deposit(+q.get('bank') - Garage.bank); }
    if (q.has("garage")) { openGarage(); return; }
    if (q.has("demo")) { demoSetup(); frozen = q.has("freeze"); }
    if (q.has("unit")) { let r; try { r = unitTest(); } catch (e) { r = ["ERROR " + e.message + " " + (e.stack || "").split("\n")[1]]; } window.__unit = r; }
    if (q.has('play') || q.has('over') || q.has('sim')) {
      start();
      auto = q.has('auto');
      const sim = +q.get('sim') || 0;
      const t0 = performance.now();
      let k = 0;
      for (; k < sim * 60 && mode === "playing"; k++) { if (auto) autopilot(); update(1 / 60); if (performance.now() - t0 > 4000) break; }
      window.__simSteps = k;
      window.__simMs = Math.round(performance.now() - t0);
      frozen = q.has("freeze");
      if (q.has('time')) game.time = +q.get('time');
      if (q.has('over')) endShift();
    }
    if (q.has('log')) {
      // a tiny report for automated checks (read with --dump-dom)
      const g = game;
      const pre = document.createElement('pre');
      pre.id = 'testlog';
      pre.textContent = JSON.stringify({
        unit: window.__unit, errs: window.__errs || [], simMs: window.__simMs, steps: window.__simSteps, mode, money: Math.round(g.money), jobs: g.jobsDone, lost: g.jobsLost, arrests: g.arrests,
        time: Math.round(g.time), pickups: g.track.pickups, streak: g.streak, contracts: g.contracts.map((c) => c.id + (c.done ? '+' : '-')),
        card: (() => { const c = document.querySelector("#over .card").getBoundingClientRect(); return [Math.round(c.left), Math.round(c.width), innerWidth, document.documentElement.scrollWidth, [...document.querySelectorAll("#over .card *")].filter((e) => e.getBoundingClientRect().right > innerWidth).slice(0, 4).map((e) => e.tagName + "." + e.className + ":" + Math.round(e.getBoundingClientRect().width))]; })(),
        traffic: g.traffic.length, rush: g.rush, nan: [g.truck.x, g.truck.y, g.truck.vx, g.money].some((n) => !isFinite(n)),
      });
      pre.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;background:#000c;color:#0f0;font:12px monospace;white-space:pre-wrap;max-width:90vw';
      document.body.appendChild(pre);
      const pre2 = document.createElement("pre");
      pre2.id = "testlog2";
      pre2.style.cssText = "position:fixed;left:8px;top:60px;z-index:99;background:#000c;color:#ff0;font:12px monospace";
      document.body.appendChild(pre2);
      window.__frames = 0;
    }
  })();

  $('btn-start').addEventListener('click', start);
  $('btn-again').addEventListener('click', start);
  $('btn-garage').addEventListener('click', openGarage);
  document.querySelectorAll('.steer-opt').forEach((b) => b.addEventListener('click', (e) => {
    setSteering(b.dataset.steer);
    e.currentTarget.blur(); // so Space (handbrake) doesn't press it again
  }));
  applySteering();
  $('btn-over-garage').addEventListener('click', openGarage);
  $('btn-garage-start').addEventListener('click', start);
  $('btn-garage-back').addEventListener('click', closeGarage);
  $('btn-reset').addEventListener('click', () => {
    if (confirm('Reset your bank and all upgrades?')) { Garage.reset(); Garage.renderUI(); }
  });
  $('btn-resume').addEventListener('click', togglePause);
  document.querySelectorAll('.mute-label').forEach((el) => el.addEventListener('click', toggleMute));
})();
