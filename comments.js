// Comments page. Comments live in a Firebase Firestore database (see comments-config.js
// and firestore.rules). Every comment is checked by comments-filter.js before it is sent,
// and again when it is shown, so bad words, links and contact info never appear.

const FIREBASE_VERSION = '10.12.2';
const COOLDOWN_MS = 30 * 1000;
const COOLDOWN_KEY = 'potato.comments.last';
const MAX_SHOWN = 100;

let db = null;
let fs = null;           // firestore functions
let loaded = [];         // comments from the database, newest first
let loading = null;
let wired = false;

const $ = (s) => document.querySelector(s);

async function connect() {
  if (db) return db;
  const cfg = window.POTATO_FIREBASE;
  if (!cfg) return null;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
  const [{ initializeApp }, firestore] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-firestore.js'),
  ]);
  fs = firestore;
  db = fs.getFirestore(initializeApp(cfg));
  return db;
}

function gameTitle(id) {
  const g = GAMES.find((x) => x.id === id);
  return g ? gameText(g, 'title') : null;
}

function fillGameSelects() {
  const pick = $('#c-game');
  const show = $('#c-show');
  const keepPick = pick.value || 'general';
  const keepShow = show.value || 'all';
  const sorted = [...GAMES].sort((a, b) => gameText(a, 'title').localeCompare(gameText(b, 'title'), lang));
  const opt = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; };
  pick.replaceChildren(opt('general', t('comments.general')), ...sorted.map((g) => opt(g.id, gameText(g, 'title'))));
  show.replaceChildren(opt('all', t('comments.all')), opt('general', t('comments.general')), ...sorted.map((g) => opt(g.id, gameText(g, 'title'))));
  pick.value = keepPick;
  show.value = keepShow;
}

function timeAgo(ms) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return t('ago.now');
  if (s < 3600) return t('ago.m', { n: Math.floor(s / 60) });
  if (s < 86400) return t('ago.h', { n: Math.floor(s / 3600) });
  return t('ago.d', { n: Math.floor(s / 86400) });
}

// Turn a stored "color|hat|face|acc" string back into an avatar, only allowing real shop items.
function lookFrom(str) {
  const [color, hat, face, acc] = String(str || '').split('|');
  const has = (part, id) => CATALOG[part].some((i) => i.id === id);
  return {
    color: has('color', color) ? color : '#c9925a',
    hat: has('hat', hat) ? hat : 'none',
    face: has('face', face) ? face : 'happy',
    acc: has('acc', acc) ? acc : 'none',
  };
}

function showStatus(key) {
  const el = $('#c-status');
  el.textContent = key ? t(key) : '';
  el.hidden = !key;
}

function renderList() {
  const list = $('#comment-list');
  const which = $('#c-show').value || 'all';
  const shown = loaded.filter((c) => which === 'all' || c.game === which);
  list.replaceChildren(...shown.map((c) => {
    const card = document.createElement('article');
    card.className = 'comment';
    const pic = document.createElement('canvas');
    pic.width = 96; pic.height = 96;
    pic.className = 'comment-avatar';
    paintAvatar(pic, lookFrom(c.look));
    const body = document.createElement('div');
    body.className = 'comment-body';
    const head = document.createElement('p');
    head.className = 'comment-head';
    const who = document.createElement('strong');
    who.textContent = c.name;
    head.appendChild(who);
    const title = c.game !== 'general' ? gameTitle(c.game) : null;
    if (title) {
      const about = document.createElement('span');
      about.className = 'comment-game';
      about.textContent = t('comments.about', { game: title });
      head.appendChild(about);
    }
    const when = document.createElement('span');
    when.className = 'comment-when';
    when.textContent = c.created ? timeAgo(c.created) : t('ago.now');
    head.appendChild(when);
    const text = document.createElement('p');
    text.className = 'comment-text';
    text.textContent = c.text;
    body.append(head, text);
    card.append(pic, body);
    return card;
  }));
  if (!loading) showStatus(window.POTATO_FIREBASE ? (shown.length ? null : 'comments.status.none') : 'comments.status.setup');
}

async function load() {
  if (loading) return loading;
  loading = (async () => {
    try {
      if (!(await connect())) { loaded = []; return; }
      if (!loaded.length) showStatus('comments.status.loading');
      const q = fs.query(fs.collection(db, 'comments'), fs.orderBy('created', 'desc'), fs.limit(MAX_SHOWN));
      const snap = await fs.getDocs(q);
      loaded = snap.docs.map((d) => {
        const v = d.data();
        return {
          name: String(v.name || '').slice(0, 20),
          text: String(v.text || '').slice(0, 300),
          game: String(v.game || 'general'),
          look: v.look,
          created: v.created && v.created.toMillis ? v.created.toMillis() : 0,
        };
      }).filter((c) => c.name && c.text && !window.CommentFilter.checkComment(c.name, c.text));
    } catch (e) {
      loaded = [];
      showStatus('comments.status.error');
      return;
    } finally {
      loading = null;
    }
  })();
  await loading;
  renderList();
}

function showError(key, vars) {
  const el = $('#c-error');
  if (!key) { el.hidden = true; el.textContent = ''; el.classList.remove('ok'); return; }
  el.textContent = t(key, vars);
  el.hidden = false;
}

async function submit(e) {
  e.preventDefault();
  showError(null);
  const name = $('#c-name').value.replace(/\s+/g, ' ').trim();
  const text = $('#c-text').value.replace(/\s+/g, ' ').trim();
  const game = $('#c-game').value || 'general';
  if (!name) return showError('comments.err.name');
  if (!text) return showError('comments.err.empty');
  const problem = window.CommentFilter.checkComment(name, text);
  if (problem) return showError('comments.err.' + problem);
  let last = 0;
  try { last = Number(localStorage.getItem(COOLDOWN_KEY)) || 0; } catch (err) {}
  const wait = COOLDOWN_MS - (Date.now() - last);
  if (wait > 0) return showError('comments.err.wait', { n: Math.ceil(wait / 1000) });
  if (!window.POTATO_FIREBASE) return showError('comments.status.setup');

  const btn = $('#c-send');
  btn.disabled = true;
  btn.textContent = t('comments.sending');
  try {
    await connect();
    const look = [profile.color, profile.hat, profile.face, profile.acc || 'none'].join('|');
    await fs.addDoc(fs.collection(db, 'comments'), {
      name, text, game, lang, look, created: fs.serverTimestamp(),
    });
    try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch (err) {}
    $('#c-text').value = '';
    updateCount();
    toast(t('comments.posted'));
    loaded.unshift({ name, text, game, look, created: Date.now() });
    renderList();
  } catch (err) {
    showError('comments.err.net');
  } finally {
    btn.disabled = false;
    btn.textContent = t('comments.send');
  }
}

function updateCount() {
  $('#c-count').textContent = `${$('#c-text').value.length} / 300`;
}

function wire() {
  if (wired) return;
  wired = true;
  $('#comment-form').addEventListener('submit', submit);
  $('#c-text').addEventListener('input', () => { updateCount(); showError(null); });
  $('#c-name').addEventListener('input', () => showError(null));
  $('#c-show').addEventListener('change', renderList);
}

window.PotatoComments = {
  render() {
    wire();
    fillGameSelects();
    const nameBox = $('#c-name');
    if (!nameBox.value) nameBox.value = profile.name;
    updateCount();
    renderList();
    load();
  },
};

// The hub may have opened straight onto #comments before this module finished loading.
if (location.hash === '#comments') window.PotatoComments.render();
