// The garage: whatever you earn in a shift goes into your bank, and carries over between shifts.
// Spend it here on upgrades. Progress is saved in this browser.
const Garage = (() => {
  const C = CONFIG;
  const KEY = 'towrush.save';

  const UPGRADES = [
    {
      id: 'engine', name: 'Engine',
      desc: 'Higher top speed and quicker acceleration. Beat the rivals to the call.',
      levels: ['+6% top speed, +12% acceleration', '+12% top speed, +24% acceleration', '+18% top speed, +36% acceleration'],
    },
    {
      id: 'tires', name: 'Tires',
      desc: 'More grip, tighter drift lines, and drifts that hold longer.',
      levels: ['+6% grip, tighter drifts', '+12% grip, even tighter drifts', '+18% grip, pro drift tires'],
    },
    {
      id: 'nitro', name: 'Nitro tank',
      desc: 'A bigger tank that fills faster when you drift.',
      levels: ['4 second boost, fills 30% faster', '5 second boost, fills 60% faster', '6 second boost, fills 90% faster'],
    },
    {
      id: 'hook', name: 'Quick hook',
      desc: 'Hook cars from farther away, without coming to a full stop.',
      levels: ['Hook from farther, at higher speed', 'Hook from even farther, even faster', 'Hooks automatically as you roll past'],
    },
  ];

  const fresh = () => ({ bank: 0, upgrades: { engine: 0, tires: 0, nitro: 0, hook: 0 } });

  function read() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.upgrades) return { ...fresh(), ...s, upgrades: { ...fresh().upgrades, ...s.upgrades } };
    } catch (e) { /* storage blocked or corrupt */ }
    return fresh();
  }

  let save = read();

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage blocked */ }
  }

  // What the upgrades actually do, as tweaked copies of the normal settings.
  function stats() {
    const { engine: e, tires: ti, nitro: n, hook: h } = save.upgrades;
    const T = C.truck;
    return {
      truck: {
        ...T,
        maxSpeed: T.maxSpeed * (1 + 0.06 * e),
        accel: T.accel * (1 + 0.12 * e),
        frontGrip: T.frontGrip * (1 + 0.06 * ti),
        rearGrip: T.rearGrip * (1 + 0.06 * ti),
        driftCarve: T.driftCarve + 0.15 * ti,
        driftFade: T.driftFade * (1 - 0.15 * ti),
        driftScrub: T.driftScrub * (1 - 0.1 * ti),
      },
      drift: {
        ...C.drift,
        boostSeconds: C.drift.boostSeconds + n,
        nitroPerPoint: C.drift.nitroPerPoint * (1 + 0.3 * n),
      },
      hookRange: C.hookRange + 25 * h,
      hookMaxSpeed: C.hookMaxSpeed + 70 * h,
      autoHook: h >= 3,
      levels: { ...save.upgrades },
    };
  }

  const cost = (id) => (save.upgrades[id] >= 3 ? null : C.upgradeCosts[id][save.upgrades[id]]);

  function buy(id) {
    const c = cost(id);
    if (c === null || save.bank < c) return false;
    save.bank -= c;
    save.upgrades[id]++;
    persist();
    return true;
  }

  // End of shift: add what you made (or lost) to the bank.
  function deposit(amount) {
    save.bank = Math.max(0, save.bank + Math.round(amount));
    persist();
  }

  function reset() {
    save = fresh();
    persist();
  }

  const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

  // Fill in the garage screen.
  function renderUI() {
    document.getElementById('garage-bank').textContent = money(save.bank);
    const list = document.getElementById('garage-list');
    list.innerHTML = '';
    for (const u of UPGRADES) {
      const lvl = save.upgrades[u.id];
      const c = cost(u.id);
      const card = document.createElement('div');
      card.className = 'upgrade';
      const pips = [0, 1, 2].map((k) => `<span class="pip${k < lvl ? ' on' : ''}"></span>`).join('');
      card.innerHTML = `
        <div class="up-head"><span class="up-name">${u.name}</span><span class="pips">${pips}</span></div>
        <p class="up-desc">${u.desc}</p>
        <p class="up-next">${c === null ? 'Fully upgraded' : `Next: ${u.levels[lvl]}`}</p>`;
      const btn = document.createElement('button');
      btn.className = 'buy';
      if (c === null) {
        btn.textContent = 'MAXED';
        btn.disabled = true;
      } else {
        btn.textContent = `Buy ${money(c)}`;
        btn.disabled = save.bank < c;
        btn.addEventListener('click', () => {
          Sound.init();
          if (buy(u.id)) Sound.cash();
          renderUI();
        });
      }
      card.appendChild(btn);
      list.appendChild(card);
    }
  }

  return { stats, buy, deposit, reset, renderUI, get bank() { return save.bank; }, get levels() { return { ...save.upgrades }; } };
})();
