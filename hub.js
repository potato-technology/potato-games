// Potato hub: profile, Spuds, avatar, shop, and launching games in an iframe.

// ---------- game registry ----------
// To add a game: put it in /games (a single .html file, or a folder with an index.html)
// that includes potato-sdk.js, then add an entry here.
// Order Up!'s card picture is an image file; redraw the cards once it loads.
const ORDERUP_THUMB = new Image();
ORDERUP_THUMB.onload = () => { if (typeof render === 'function') render(); };
ORDERUP_THUMB.src = 'games/orderup-thumb.svg';

// Use a picture file as a game's card: thumb: cardPicture('games/mygame/thumb.svg')
function cardPicture(src) {
  const img = new Image();
  img.onload = () => { if (typeof render === 'function') render(); };
  img.src = src;
  return (ctx, w, h) => {
    if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, w, h);
    else { ctx.fillStyle = '#2c2835'; ctx.fillRect(0, 0, w, h); }
  };
}

const GAMES = [
  {
    id: 'towrush',
    title: 'Tow Rush',
    by: 'Potato Studios',
    file: 'games/towrush/index.html',
    desc: 'Cars are breaking down all over the city. Race rival tow trucks to every call, drift through traffic, dodge the cops, and haul cars back to your yard. Spend your cash on upgrades in the garage. Every $50 you make earns 1 Spud.',
    controls: '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows to drive, <kbd>Space</kbd> handbrake / drift, <kbd>Shift</kbd> nitro, <kbd>E</kbd> hook a car, <kbd>B</kbd> pay bail, <kbd>P</kbd> pause',
    score: { label: 'Best shift', format: (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString() },
    thumb: cardPicture('games/towrush/thumb.svg'),
  },
  {
    id: 'tatertyper',
    title: 'Tater Typer',
    by: 'Potato Studios',
    file: 'games/tatertyper.html',
    desc: 'The great potato race! Type fun facts (potatoes, food, animals, space and more) as fast as you can to run your potato past Hash Brown, Mashley and the gang. Mistakes trip you up, and 25 perfect letters in a row lets you throw butter at a rival. Try Endless mode to outrun the Masher, or race a friend with a race code.',
    controls: 'Just type! Match the sentence exactly, capitals and punctuation too. <kbd>Esc</kbd> for the menu, <kbd>Enter</kbd> to race again.',
    score: { label: 'Best speed', format: (n) => Math.round(n) + ' WPM' },
    thumb: cardPicture('games/tatertyper-thumb.svg'),
  },
  {
    id: 'orderup',
    title: 'Order Up!',
    by: 'Potato Studios',
    file: 'games/orderup.html',
    desc: 'Run a busy diner! Grill burgers, fry fries and pour sodas before your customers lose patience. Chain combos for bigger tips, impress the food critic, earn 3 stars every day, and turn your diner into the coolest spot in town.',
    controls: 'Click (or tap) to grab something, then click where it goes. Click a customer to serve them. <kbd>Esc</kbd> drops what you\'re holding.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb(ctx, w, h) {
      // Drawn in games/orderup-thumb.svg; shows a plain color until the picture has loaded.
      if (ORDERUP_THUMB.complete && ORDERUP_THUMB.naturalWidth) ctx.drawImage(ORDERUP_THUMB, 0, 0, w, h);
      else { ctx.fillStyle = "#f3d9b1"; ctx.fillRect(0, 0, w, h); }
    },
  },
  {
    id: 'goblingate',
    title: 'Goblin Gate',
    by: 'Potato Studios',
    file: 'games/goblingate.html',
    desc: 'Goblins, wolves, bats and armored orcs are marching on the castle! Build archer towers, cannons, frost towers and lightning towers, upgrade them, and drop meteors on the horde. Keep 18 lives for 3 stars, spend your stars on upgrades, and see how long you last in Endless Horde.',
    controls: 'Click a stone pad to build, click a tower to upgrade or sell. <kbd>Space</kbd> next wave, <kbd>1</kbd>–<kbd>4</kbd> pick a tower, <kbd>U</kbd> upgrade, <kbd>Q</kbd> meteor, <kbd>E</kbd> ice storm, <kbd>F</kbd> fast forward, <kbd>P</kbd> pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/goblingate-thumb.svg'),
  },
  {
    id: 'gemmine',
    title: 'Gem Mine',
    by: 'Potato Studios',
    file: 'games/gemmine.html',
    desc: 'Swap shiny gems to make rows of 3 or more! Match 4 for a line blaster, an L for a bomb and 5 for a rainbow gem, then swap them together for giant blasts. Dig through dirt, smash stones and drop gold down the mine across 24 levels in four mines.',
    controls: 'Drag a gem (or click two gems next to each other) to swap them. Arrow keys and <kbd>Space</kbd> work too. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> boosters, <kbd>H</kbd> hint, <kbd>P</kbd> pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/gemmine-thumb.svg'),
  },
  {
    id: 'jungledash',
    title: 'Jungle Dash',
    by: 'Potato Studios',
    file: 'games/jungledash.html',
    desc: 'Run and jump through the jungle, a lost temple and a volcano! Bop beetles, dodge spiky hedgehogs, ride moving platforms and find the 3 hidden gems in every level. Spend your coins on double jump, an air dash and cool hats.',
    controls: '<kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to run, <kbd>Space</kbd> or <kbd>↑</kbd> to jump (hold to go higher), <kbd>Shift</kbd> to dash once you buy it, <kbd>P</kbd> pause. Big touch buttons show up on phones and tablets.',
    score: { label: 'Gems found', format: (n) => Math.round(n) + ' gems' },
    thumb: cardPicture('games/jungledash-thumb.svg'),
  },
  {
    id: 'beatdrop',
    title: 'Beat Drop',
    by: 'Potato Studios',
    file: 'games/beatdrop.html',
    desc: 'Hit the notes right on the beat on a glowing neon stage! Rock out to 7 catchy songs, from pop and chiptune to funk, rock and EDM, on Easy, Normal or Hard. Chain giant combos, trigger Fever mode and earn stars to unlock new songs.',
    controls: '<kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> or <kbd>←</kbd> <kbd>↓</kbd> <kbd>↑</kbd> <kbd>→</kbd> hit notes (hold for long notes), tap lanes on touch, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/beatdrop-thumb.svg'),
  },
  {
    id: 'sunnyacres',
    title: 'Sunny Acres',
    by: 'Potato Studios',
    file: 'games/sunnyacres.html',
    desc: 'Run your own cozy farm! Plant carrots, corn and sunflowers, water them, raise chickens, cows and sheep, and fill truck orders before the sun sets. Earn 3 stars a day, level up and decorate with fountains, gnomes and a windmill!',
    controls: 'Click (or drag) plots to till, plant, water and harvest. <kbd>1</kbd>–<kbd>9</kbd> tools and seeds, <kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move the cursor, <kbd>Space</kbd> use, <kbd>P</kbd> pause',
    score: { label: 'Farm level', format: (n) => 'Level ' + Math.round(n) },
    thumb: cardPicture('games/sunnyacres-thumb.svg'),
  },
  {
    id: 'brickblitz',
    title: 'Brick Blitz',
    by: 'Potato Studios',
    file: 'games/brickblitz.html',
    desc: 'Smash glowing candy bricks across 30 neon levels in Neon City, Star Voyage and the Crystal Core! Chain explosive bricks, grab multi-ball, lasers and fireballs, find the key to open locked vaults, and earn 3 stars on every level to upgrade your paddle.',
    controls: 'Move the paddle with the mouse or <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd>. <kbd>Space</kbd> or click to launch and fire lasers, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/brickblitz-thumb.svg'),
  },
  {
    id: 'puttparty',
    title: 'Putt Party',
    by: 'Potato Studios',
    file: 'games/puttparty.html',
    desc: 'Wild mini golf in a flower garden, on a pirate island and aboard a space station! Bounce off bumpers, jump ramps over the water, dodge windmills and warp through portals. Sink holes in one to win stars, medals and cool balls, trails and flags in the Pro Shop.',
    controls: 'Drag back from the ball and let go to putt (mouse or touch). Or aim with <kbd>←</kbd> <kbd>→</kbd> and hold <kbd>Space</kbd> to charge. <kbd>U</kbd> mulligan, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/puttparty-thumb.svg'),
  },
  {
    id: 'snakearena',
    title: 'Snake Arena',
    by: 'Potato Studios',
    file: 'games/snakearena.html',
    desc: 'Slither through the Meadow, Desert and Neon City arenas, gobble glowing orbs and grow super long! Trick rival snakes into bumping into you so they pop into big juicy orbs, beat the giant King snakes, and unlock tiger, rainbow and galaxy skins plus silly hats.',
    controls: 'Steer with the mouse or <kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd>. Hold the mouse button, <kbd>Space</kbd> or <kbd>W</kbd> to boost, <kbd>P</kbd> pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/snakearena-thumb.svg'),
  },
  {
    id: 'luckylake',
    title: 'Lucky Lake',
    by: 'Potato Studios',
    file: 'games/luckylake.html',
    desc: 'Cast your line from morning to moonlight at Sunny Pond, Misty River, Coral Bay and Frozen Lake! Wait for the bobber to dive, then fight bluegills, marlins and legendary fish without snapping your line. Fill your Fish Book, finish challenges for stars, and buy better rods, lures and boats.',
    controls: 'Hold <kbd>Space</kbd> or the mouse to charge, let go to cast. Tap to stop the lure and to hook a bite. Hold to reel, and let go when the line turns red. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Species found', format: (n) => Math.round(n) + ' fish' },
    thumb: cardPicture('games/luckylake-thumb.svg'),
  },
  {
    id: 'shadowheist',
    title: 'Shadow Heist',
    by: 'Potato Studios',
    file: 'games/shadowheist.html',
    desc: 'Be a sneaky cat burglar and win back stolen treasures from a moonlit museum, a creaky manor and a high-tech bank! Dodge flashlight beams, toss coins to fool the guards, and slip past cameras and lasers. Earn 3 stars by escaping, grabbing all the loot and never getting spotted.',
    controls: '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows (or click) to move, hold <kbd>Shift</kbd> to sneak, <kbd>E</kbd> or right-click to throw a coin, <kbd>Space</kbd> smoke bomb, <kbd>P</kbd> pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/shadowheist-thumb.svg'),
  },
  {
    id: 'wordwizard',
    title: 'Word Wizard',
    by: 'Potato Studios',
    file: 'games/wordwizard.html',
    desc: 'Spell words from magic letter tiles to blast slimes, ghosts and dragons with fireballs, lightning and ice! Longer words cast bigger spells, so hunt for bonus words, earn 3 stars in every battle and defeat the Ember King.',
    controls: 'Click tiles or type the letters, <kbd>Enter</kbd> to cast, <kbd>Backspace</kbd> to undo. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> potion / hint / scramble, <kbd>Esc</kbd> clear or pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/wordwizard-thumb.svg'),
  },
  {
    id: 'starblaster',
    title: 'Star Blaster',
    by: 'Potato Studios',
    file: 'games/starblaster.html',
    desc: 'Pilot a star fighter through 3 glowing galaxies! Blast swooping alien squadrons, dodge asteroid belts and defeat giant bosses like the Crab Dreadnought and the Void Emperor. Collect crystals to unlock new ships and power up your blasters.',
    controls: 'Fly with the mouse, drag a finger, or use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / arrows. It fires by itself (or hold <kbd>Space</kbd>). <kbd>B</kbd> or right-click for a bomb, <kbd>P</kbd> pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/starblaster-thumb.svg'),
  },
  {
    id: 'hoopshot',
    title: 'Hoop Shot',
    by: 'Potato Studios',
    file: 'games/hoopshot.html',
    desc: 'Flick to shoot hoops in a roaring arena! Sink 3 swishes in a row to catch fire for double points, nail the money balls before the buzzer, and conquer 20 trick-shot challenges or beat the CPU at HORSE. Unlock glowing balls, a sunset street court and a beach court!',
    controls: 'Flick up toward the hoop with the mouse or a finger, or aim with <kbd>↑</kbd> <kbd>↓</kbd> and hold <kbd>Space</kbd> to power up. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/hoopshot-thumb.svg'),
  },
];

// ---------- shop catalog ----------
const CATALOG = {
  hat: [
    { id: 'none', name: 'No hat', price: 0 },
    { id: 'cap', name: 'Red Cap', price: 0 },
    { id: 'beanie', name: 'Beanie', price: 40 },
    { id: 'party', name: 'Party Hat', price: 75 },
    { id: 'chef', name: 'Chef Hat', price: 120 },
    { id: 'tophat', name: 'Top Hat', price: 180 },
    { id: 'crown', name: 'Crown', price: 350 },
    { id: 'halo', name: 'Halo', price: 600 },
  ],
  color: [
    { id: '#c9925a', name: 'Russet', price: 0 },
    { id: '#e3c06a', name: 'Golden', price: 0 },
    { id: '#b5534a', name: 'Red Potato', price: 30 },
    { id: '#e9813c', name: 'Sweet Potato', price: 40 },
    { id: '#7d4e9e', name: 'Purple Potato', price: 60 },
    { id: '#5fbf98', name: 'Minty', price: 90 },
    { id: '#4a63c9', name: 'Blueberry', price: 120 },
    { id: '#f2f2f2', name: 'Mashed', price: 200 },
  ],
  face: [
    { id: 'happy', name: 'Happy', price: 0 },
    { id: 'sleepy', name: 'Sleepy', price: 25 },
    { id: 'shock', name: 'Shocked', price: 25 },
    { id: 'grumpy', name: 'Grumpy', price: 35 },
    { id: 'cool', name: 'Shades', price: 80 },
  ],
};

// ---------- profile (saved in this browser) ----------
const SAVE_KEY = 'potato.profile.v1';
const STARTING_SPUDS = 50;
const MAX_EARN_PER_GAME = 300; // a single game session can't hand out more than this

function freshProfile() {
  return {
    name: 'Guest' + Math.floor(1000 + Math.random() * 9000),
    color: '#c9925a', hat: 'cap', face: 'happy',
    spuds: STARTING_SPUDS,
    owned: Object.fromEntries(Object.entries(CATALOG).map(([k, items]) => [k, items.filter((i) => i.price === 0).map((i) => i.id)])),
    games: {},
  };
}
function loadProfile() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const p = Object.assign(freshProfile(), JSON.parse(raw));
      for (const k of Object.keys(CATALOG)) if (!Array.isArray(p.owned[k])) p.owned[k] = freshProfile().owned[k];
      return p;
    }
  } catch (e) {}
  return freshProfile();
}
let profile = loadProfile();
function saveProfile() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); } catch (e) {}
}
saveProfile();

const avatarOf = (p = profile) => ({ name: p.name, color: p.color, hat: p.hat, face: p.face });

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, '0');
  return m + ':' + sec;
}
function formatBig(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toLocaleString();
}
function formatScore(game, v) {
  return game.score.format ? game.score.format(v) : Math.floor(v).toLocaleString();
}
function toast(text, bad) {
  const el = document.createElement('div');
  el.className = 'toast' + (bad ? ' bad' : '');
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function paintAvatar(canvas, p = avatarOf(), bg) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  Potato.drawAvatar(ctx, w / 2, h * 0.56, h * 0.62, p);
}
function paintThumb(canvas, game) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  game.thumb(ctx, canvas.width, canvas.height, avatarOf());
}

// ---------- header ----------
function renderHeader() {
  $('#spud-count').textContent = profile.spuds.toLocaleString();
  $('#me-name').textContent = profile.name;
  paintAvatar($('#me-avatar'));
}
function bumpSpuds() {
  const el = $('.spuds');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// ---------- play page ----------
function gameCard(game) {
  const stats = profile.games[game.id] || {};
  const btn = document.createElement('button');
  btn.className = 'card';
  btn.innerHTML = `
    <canvas width="480" height="270"></canvas>
    <div class="card-body">
      <p class="card-title"></p>
      <div class="card-meta"></div>
    </div>`;
  btn.querySelector('.card-title').textContent = game.title;
  const meta = btn.querySelector('.card-meta');
  if (stats.plays) {
    meta.innerHTML = `<span>${stats.plays} play${stats.plays === 1 ? '' : 's'}</span>`;
    if (stats.best != null) {
      const s = document.createElement('span');
      s.textContent = game.score.label + ': ' + formatScore(game, stats.best);
      meta.appendChild(s);
    }
  } else {
    meta.innerHTML = '<span>New — not played yet</span>';
  }
  paintThumb(btn.querySelector('canvas'), game);
  btn.addEventListener('click', () => openDetails(game));
  return btn;
}
function renderPlay() {
  $('#hero-title').textContent = `Hey, ${profile.name}!`;
  paintAvatar($('#hero-avatar'));

  const grid = $('#game-grid');
  grid.replaceChildren(...GAMES.map(gameCard));

  const recent = GAMES
    .filter((g) => profile.games[g.id]?.lastPlayed)
    .sort((a, b) => profile.games[b.id].lastPlayed - profile.games[a.id].lastPlayed)
    .slice(0, 3);
  $('#continue-wrap').hidden = recent.length === 0;
  $('#continue-row').replaceChildren(...recent.map(gameCard));
}

// ---------- details dialog ----------
let detailsGame = null;
function openDetails(game) {
  detailsGame = game;
  const stats = profile.games[game.id] || {};
  paintThumb($('#details-thumb'), game);
  $('#details-title').textContent = game.title;
  $('#details-by').textContent = 'by ' + game.by;
  $('#details-desc').textContent = game.desc;
  $('#details-controls').innerHTML = '<strong>Controls:</strong> ' + game.controls;
  $('#details-stats').innerHTML = `
    <div class="stat"><span>Your plays</span>${stats.plays || 0}</div>
    <div class="stat"><span>${game.score.label}</span>${stats.best != null ? formatScore(game, stats.best) : '—'}</div>
    <div class="stat"><span>Spuds earned here</span>${(stats.earned || 0).toLocaleString()}</div>`;
  $('#details').showModal();
  $('#details-play').focus();
}
$('#details-close').addEventListener('click', () => $('#details').close());
$('#details').addEventListener('click', (e) => { if (e.target === $('#details')) $('#details').close(); });
$('#details-play').addEventListener('click', () => {
  $('#details').close();
  launch(detailsGame);
});

// ---------- running a game ----------
let current = null; // { game, earned }
const frame = $('#game-frame');

function launch(game) {
  current = { game, earned: 0 };
  const stats = (profile.games[game.id] ||= { plays: 0, best: null, earned: 0 });
  stats.plays++;
  stats.lastPlayed = Date.now();
  saveProfile();

  $('#game-name').textContent = game.title;
  $('#session-earn').textContent = '0';
  $('#game-layer').hidden = false;
  document.body.style.overflow = 'hidden';
  frame.src = game.file;
  frame.focus();
}
function leaveGame() {
  if (!current) return;
  const { game, earned } = current;
  current = null;
  frame.src = 'about:blank';
  $('#game-layer').hidden = true;
  document.body.style.overflow = '';
  if (earned > 0) toast(`You earned ${earned} Spuds in ${game.title}!`);
  render();
}
$('#leave-btn').addEventListener('click', leaveGame);
frame.addEventListener('load', () => frame.focus());

window.addEventListener('message', (e) => {
  // Only listen to the game we launched.
  if (!current || e.source !== frame.contentWindow) return;
  const d = e.data;
  if (!d || typeof d.type !== 'string') return;
  const { game } = current;
  const stats = profile.games[game.id];

  if (d.type === 'potato:ready') {
    frame.contentWindow.postMessage({ type: 'potato:hello', player: avatarOf() }, '*');
  } else if (d.type === 'potato:earn') {
    const want = Math.max(0, Math.floor(Number(d.amount) || 0));
    const amount = Math.min(want, MAX_EARN_PER_GAME - current.earned);
    if (amount <= 0) return;
    current.earned += amount;
    stats.earned = (stats.earned || 0) + amount;
    profile.spuds += amount;
    saveProfile();
    $('#session-earn').textContent = current.earned;
    renderHeader();
    bumpSpuds();
  } else if (d.type === 'potato:score') {
    const v = Number(d.value);
    if (!isFinite(v)) return;
    const better = stats.best == null || (game.score.lowerIsBetter ? v < stats.best : v > stats.best);
    if (better) {
      stats.best = v;
      saveProfile();
    }
  } else if (d.type === 'potato:exit') {
    leaveGame();
  }
});

// ---------- avatar page ----------
let avatarPart = 'hat';
function previewWith(part, id) {
  const p = avatarOf();
  p[part] = id;
  return p;
}
function itemTile(part, item, mode) {
  const el = document.createElement(mode === 'shop' ? 'div' : 'button');
  el.className = 'item';
  const equipped = profile[part] === item.id;
  const owned = profile.owned[part].includes(item.id);
  if (mode === 'equip' && equipped) el.classList.add('equipped');
  el.innerHTML = `<canvas width="176" height="176"></canvas><span class="item-name"></span>`;
  el.querySelector('.item-name').textContent = item.name;
  paintAvatar(el.querySelector('canvas'), previewWith(part, item.id));

  if (mode === 'equip') {
    const tag = document.createElement('span');
    tag.className = 'item-tag';
    tag.textContent = equipped ? 'Wearing' : 'Wear';
    el.appendChild(tag);
    el.addEventListener('click', () => {
      profile[part] = item.id;
      saveProfile();
      render();
    });
  } else {
    if (owned) {
      const tag = document.createElement('span');
      tag.className = 'item-tag';
      tag.textContent = 'Owned';
      el.appendChild(tag);
    } else {
      const price = document.createElement('span');
      price.className = 'price';
      price.innerHTML = '<span class="spud-coin"></span>' + item.price;
      const buy = document.createElement('button');
      buy.className = 'btn primary';
      buy.textContent = 'Buy';
      buy.disabled = profile.spuds < item.price;
      buy.title = buy.disabled ? `You need ${item.price - profile.spuds} more Spuds` : '';
      buy.addEventListener('click', () => {
        if (profile.spuds < item.price) return;
        profile.spuds -= item.price;
        profile.owned[part].push(item.id);
        profile[part] = item.id; // put it on right away
        saveProfile();
        toast(`Bought ${item.name}! You're wearing it now.`);
        render();
      });
      el.append(price, buy);
    }
  }
  return el;
}
function renderAvatar() {
  paintAvatar($('#avatar-big'));
  const input = $('#name-input');
  if (document.activeElement !== input) input.value = profile.name;
  document.querySelectorAll('.avatar-parts .seg button').forEach((b) => b.setAttribute('aria-selected', b.dataset.part === avatarPart));
  const owned = CATALOG[avatarPart].filter((i) => profile.owned[avatarPart].includes(i.id));
  $('#part-grid').replaceChildren(...owned.map((i) => itemTile(avatarPart, i, 'equip')));
}
document.querySelectorAll('.avatar-parts .seg button').forEach((b) => b.addEventListener('click', () => {
  avatarPart = b.dataset.part;
  renderAvatar();
}));
$('#name-input').addEventListener('input', (e) => {
  const name = e.target.value.replace(/[^\w\- ]/g, '').trim();
  if (!name) return;
  profile.name = name;
  saveProfile();
  renderHeader();
  $('#hero-title').textContent = `Hey, ${profile.name}!`;
});

// ---------- shop page ----------
let shopPart = 'hat';
function renderShop() {
  document.querySelectorAll('#shop-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.part === shopPart));
  $('#shop-grid').replaceChildren(...CATALOG[shopPart].map((i) => itemTile(shopPart, i, 'shop')));
}
document.querySelectorAll('#shop-tabs button').forEach((b) => b.addEventListener('click', () => {
  shopPart = b.dataset.part;
  renderShop();
}));

// ---------- routing ----------
const PAGES = ['play', 'avatar', 'shop'];
function currentPage() {
  const h = location.hash.slice(1);
  return PAGES.includes(h) ? h : 'play';
}
function render() {
  const page = currentPage();
  PAGES.forEach((p) => { $('#page-' + p).hidden = p !== page; });
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.nav === page));
  renderHeader();
  if (page === 'play') renderPlay();
  if (page === 'avatar') renderAvatar();
  if (page === 'shop') renderShop();
}
window.addEventListener('hashchange', render);
document.fonts?.ready.then(render);
render();
