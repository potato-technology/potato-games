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
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    if (mode === 'playing') togglePause();
  });

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
    g.notice = (text, color) => { g.notices.push({ text, color, life: 3 }); if (g.notices.length > 3) g.notices.shift(); };
    g.stats = Garage.stats(); // your upgrades
    Object.assign(g.stats.truck, C.steering[steering]);
    g.bankAtStart = Garage.bank;
    g.bailPaid = 0;
    Jobs.reset(g);
    Police.reset(g);
    Drift.reset(g);
    return g;
  }

  function show(id, on) { $(id).classList.toggle('hidden', !on); }

  function start() {
    Sound.init();
    game = makeGame();
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
    if (g.money + g.bankAtStart < C.bail) { g.notice(`Bail is ${Render.money(C.bail)} - you can't afford it`, '#ff6b5a'); return; }
    g.money -= C.bail;
    g.bailPaid += C.bail;
    g.jail = 0.001;
    Sound.cash();
    g.notice(`Paid ${Render.money(C.bail)} bail`, '#ffd23f');
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
    mode = 'over';
    Sound.engine(0, false);
    Sound.siren(0);
    Sound.screech(0);
    const best = loadBest();
    const isBest = !best || g.money > best.money;
    if (isBest) saveBest({ money: g.money, jobs: g.jobsDone });
    $('ov-money').textContent = Render.money(g.money);
    $('ov-earned').textContent = Render.money(g.earned);
    $('ov-repairs').textContent = '-' + Render.money(g.repairs);
    $('ov-jobs').textContent = g.jobsDone;
    $('ov-lost').textContent = g.jobsLost;
    $('ov-arrests').textContent = g.arrests;
    $('ov-drift').textContent = Render.money(g.drift.cash);
    $('ov-best-drift').textContent = g.drift.best.toLocaleString();
    $('ov-bail').textContent = '-' + Render.money(g.bailPaid);
    $('ov-best').textContent = isBest ? 'New personal best!' : `Best shift: ${Render.money(best.money)}`;
    $('ov-best').classList.toggle('new-best', isBest);
    Garage.deposit(g.money);
    $('ov-bank').textContent = Render.money(Garage.bank);
    // Potato hub: report the shift as a score and pay out Spuds (1 per $50 earned).
    const spuds = Math.floor(Math.max(0, g.money) / 50);
    if (window.Potato) {
      Potato.score(Math.round(g.money));
      if (spuds > 0) Potato.earn(spuds);
    }
    $('ov-spuds').textContent = window.Potato && Potato.inHub ? `+${spuds} Spuds` : '';
    show('over', true);
  }

  function showBankOnTitle() {
    const best = loadBest();
    $('title-best').textContent = best ? `Best shift: ${Render.money(best.money)} (${best.jobs} jobs)` : '';
    $('title-bank').textContent = `Bank: ${Render.money(Garage.bank)}`;
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

      if (playing && impact > C.crashMinSpeed && t.crashCd <= 0) {
        const cost = Math.round(impact * C.crashCostPerSpeed);
        g.money -= cost;
        g.repairs += cost;
        g.crashes++;
        g.float(t.x, t.y - 30, `-$${cost}`, '#ff6b5a');
        Sound.crash(impact);
        t.crashCd = 0.5;
        g.shake = Math.min(14, impact / 28);
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

    // jobs and the shift clock
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
    for (const p of g.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
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

    Sound.engine(sp, playing && g.jail <= 0);
    Sound.siren(playing ? Police.sirenLevel(g) : 0);
  }

  // ---------- main loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Small fixed-size steps keep the physics smooth even when the frame rate dips.
    if (mode !== 'paused') {
      const steps = Math.ceil(dt / (1 / 60));
      for (let k = 0; k < steps && mode !== 'paused'; k++) update(dt / steps);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Render.frame(ctx, game, sw, sh, mode !== 'title');
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Handy for poking at the game from the browser console: TowRush.game
  window.TowRush = { get game() { return game; }, get mode() { return mode; } };

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
