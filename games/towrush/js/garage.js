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
    {
      id: 'armor', name: 'Bumper armor',
      desc: 'Steel bumpers. Crashes cost less to repair, and VIP cars get scratched less.',
      levels: ['Repairs cost 20% less', 'Repairs cost 40% less', 'Repairs cost 60% less, VIP damage halved'],
    },
    {
      id: 'scanner', name: 'Police scanner',
      desc: 'Know where the cops are. Lights up when a cop can see you, so you know when to behave.',
      levels: ['"Cop watching" light on your dashboard', 'Lose a chase 2 seconds faster', 'Bail costs half price'],
    },
  ];

  // Little pictures for the garage cards.
  const ICONS = {
    engine: '<svg viewBox="0 0 32 32"><rect x="5" y="10" width="20" height="14" rx="3" fill="#9aa3ae"/><rect x="9" y="6" width="10" height="5" rx="1" fill="#6b727d"/><rect x="25" y="14" width="4" height="6" rx="1" fill="#6b727d"/><path d="M15 12 L11 18 H15 L13 23 L19 16 H15 L17 12 Z" fill="#ffd23f"/></svg>',
    tires: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#1d1f24"/><circle cx="16" cy="16" r="6" fill="#9aa3ae"/><circle cx="16" cy="16" r="2.5" fill="#4b4f57"/><g stroke="#3a3f47" stroke-width="2"><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l3 3M21.5 21.5l3 3M7.5 24.5l3-3M21.5 10.5l3-3"/></g></svg>',
    nitro: '<svg viewBox="0 0 32 32"><rect x="9" y="6" width="14" height="22" rx="5" fill="#2fa3ff"/><rect x="13" y="3" width="6" height="4" rx="1" fill="#9aa3ae"/><rect x="11" y="9" width="3" height="16" rx="1.5" fill="#bdf2ff" opacity=".6"/><path d="M16 12 l-4 7 h4 l-2 6 6-9 h-4 l2-4z" fill="#fff"/></svg>',
    hook: '<svg viewBox="0 0 32 32"><path d="M16 3v14" stroke="#9aa3ae" stroke-width="3"/><path d="M16 17 a6 6 0 1 1 -6 6" fill="none" stroke="#ffd23f" stroke-width="3.5" stroke-linecap="round"/><circle cx="16" cy="4" r="3" fill="#6b727d"/></svg>',
    armor: '<svg viewBox="0 0 32 32"><path d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z" fill="#7d8597"/><path d="M16 6 L24 9 V15 C24 20 20 24 16 26 Z" fill="#c9ced8"/></svg>',
    scanner: '<svg viewBox="0 0 32 32"><rect x="5" y="9" width="22" height="16" rx="4" fill="#2f5597"/><circle cx="16" cy="17" r="5" fill="#0d1018"/><circle cx="16" cy="17" r="2.5" fill="#7af0ff"/><rect x="9" y="5" width="6" height="5" rx="1" fill="#ff2d2d"/><rect x="17" y="5" width="6" height="5" rx="1" fill="#2d6bff"/></svg>',
  };

  const fresh = () => ({ bank: 0, upgrades: { engine: 0, tires: 0, nitro: 0, hook: 0, armor: 0, scanner: 0 } });

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
      repairMul: 1 - 0.2 * (save.upgrades.armor || 0),
      vipDamageMul: (save.upgrades.armor || 0) >= 3 ? 0.5 : 1,
      copLight: (save.upgrades.scanner || 0) >= 1,
      escapeSeconds: C.police.escapeSeconds - ((save.upgrades.scanner || 0) >= 2 ? 2 : 0),
      bail: (save.upgrades.scanner || 0) >= 3 ? Math.round(C.bail / 2) : C.bail,
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
      card.className = 'upgrade' + (c === null ? ' maxed' : save.bank >= c ? ' can-buy' : '');
      const pips = [0, 1, 2].map((k) => `<span class="pip${k < lvl ? ' on' : ''}"></span>`).join('');
      card.innerHTML = `
        <div class="up-head"><span class="up-title"><span class="up-icon">${ICONS[u.id] || ""}</span><span class="up-name">${u.name}</span></span><span class="pips">${pips}</span></div>
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
