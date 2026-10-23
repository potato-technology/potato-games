// Comment safety filter: blocks bad words, links, contact info and spam.
// checkComment(name, text) returns null when the comment is OK, or an error key
// ('bad', 'contact', 'caps', 'spam', 'short') for the hub to show in the player's language.
// The database rules (firestore.rules) block the worst words again on the server side.

(function () {
  // Whole words that are never allowed (checked after cleaning up symbols and l33t speak).
  const BAD_WORDS = [
    // English
    'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking', 'fck', 'fcking', 'fuk', 'fuking', 'fuq', 'motherfucker', 'mf', 'mofo',
    'shit', 'shits', 'shitty', 'bullshit', 'sht', 'bitch', 'bitches', 'bitchy', 'biatch', 'bastard', 'ass', 'asshole', 'assholes', 'arse',
    'arsehole', 'jackass', 'dumbass', 'dick', 'dicks', 'dickhead', 'cock', 'cocks', 'pussy', 'cunt', 'cunts', 'twat', 'wanker', 'prick',
    'slut', 'sluts', 'whore', 'whores', 'piss', 'pissed', 'bollocks', 'retard', 'retarded', 'tard', 'idiot', 'idiots', 'stupid', 'moron',
    'stfu', 'gtfo', 'wtf', 'kys', 'killyourself', 'sex', 'sexy', 'porn', 'porno', 'nude', 'nudes', 'boobs', 'boob', 'tits', 'titty',
    'penis', 'vagina', 'horny', 'rape', 'raped', 'rapist', 'nazi', 'nazis', 'hitler', 'suicide', 'nigger', 'niggers', 'nigga', 'niggas',
    'faggot', 'faggots', 'fag', 'fags', 'dyke', 'tranny', 'chink', 'spic', 'kike', 'wetback', 'gook', 'coon', 'paki', 'beaner',
    // Spanish / Portuguese
    'puta', 'putas', 'puto', 'mierda', 'pendejo', 'pendeja', 'cabron', 'cabrón', 'joder', 'coño', 'carajo', 'gilipollas', 'idiota',
    'estupido', 'estúpido', 'estupida', 'estúpida', 'caralho', 'porra', 'merda', 'buceta', 'viado', 'otario', 'otário', 'foda', 'fodase',
    // French
    'merde', 'putain', 'connard', 'connasse', 'salope', 'encule', 'enculé', 'batard', 'bâtard', 'nique', 'niquer', 'pute', 'conne',
    // German
    'scheisse', 'scheiße', 'scheiss', 'scheiß', 'arschloch', 'arsch', 'fotze', 'hure', 'wichser', 'schlampe', 'fick', 'ficken', 'missgeburt', 'hurensohn',
  ];
  // Bad phrases (matched with spaces between the words).
  const BAD_PHRASES = ['shut up', 'hate you', 'kill yourself', 'go die', 'ta gueule', 'fils de pute', 'hijo de puta', 'vai se foder', 'halt die fresse'];
  // Bad words that are fine to spot even inside a longer word ("f*cking", "fuuuuck", "b1tch").
  const STRONG = ['fuck', 'fck', 'motherfuck', 'bitch', 'asshole', 'dickhead', 'nigger', 'nigga', 'faggot', 'cunt', 'whore', 'slut', 'porn',
    'retard', 'arschloch', 'scheisse', 'scheiße', 'hurensohn', 'putain', 'salope', 'connard', 'mierda', 'pendejo', 'caralho', 'buceta'];
  // Bad words in languages written without spaces between words (matched anywhere).
  const BAD_SUBSTRINGS = [
    // Korean
    '씨발', '시발', '씨바', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '개새끼', '새끼', '좆', '존나', '졸라', '꺼져', '닥쳐', '지랄', '엿먹어', '등신', '니애미', '느금마', '섹스',
    // Japanese
    'ばか', 'バカ', '馬鹿', 'あほ', 'アホ', '死ね', 'しね', 'シネ', 'くそ', 'クソ', 'きもい', 'キモい', 'キモイ', 'うざい', 'ウザい', 'ちんこ', 'まんこ', 'ころす', '殺す', 'ブス', 'エロ', 'セックス',
    // Chinese
    '傻逼', '傻b', '傻比', '煞笔', '操你', '肏', '他妈', '妈的', '去死', '白痴', '婊子', '王八蛋', '混蛋', '贱人', '色情', '做爱', '鸡巴',
  ];
  // Words that are fine on their own but are often used to slip contact info in. Matched as whole words.
  const CONTACT_WORDS = ['discord', 'snapchat', 'instagram', 'insta', 'whatsapp', 'telegram', 'tiktok', 'kik', 'wechat', 'kakaotalk', 'kakao',
    'gmail', 'hotmail', 'outlook', 'yahoo', 'icloud', 'add me', 'dm me', 'my number', 'my address', 'my school', 'call me', 'text me',
    'email me', 'meet me', 'meet up', 'phone number', 'where do you live', 'how old are you', '카톡', '전화번호', '주소', '番号', '住所', 'ライン', '微信', '电话'];

  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '|': 'i', '€': 'e' };
  const BAD_SET = new Set(BAD_WORDS);

  function normalize(s) {
    return String(s).normalize('NFKC').toLowerCase();
  }
  function deleet(s) {
    return s.replace(/[0-9@$!|€]/g, (c) => LEET[c] || c);
  }
  const once = (w) => w.replace(/(\p{L})\1+/gu, '$1');       // "fuuuck" -> "fuck"
  const twice = (w) => w.replace(/(\p{L})\1{2,}/gu, '$1$1'); // "asssshole" -> "asshole"

  function hasBadWords(text) {
    const n = normalize(text);
    const d = deleet(n);
    // 1. whole words
    for (const w of d.split(/[^\p{L}]+/u)) {
      if (!w) continue;
      if (BAD_SET.has(w) || BAD_SET.has(twice(w)) || BAD_SET.has(once(w))) return true;
    }
    // 2. phrases
    const spaced = d.replace(/[^\p{L}]+/gu, ' ');
    for (const p of BAD_PHRASES) if ((' ' + spaced + ' ').includes(' ' + p + ' ')) return true;
    // 3. strong words hidden inside one chunk of text ("f*ck", "b!tch", "fuuuck", "superfuck")
    for (const chunk of d.split(/\s+/)) {
      const letters = chunk.replace(/[^\p{L}]/gu, '');
      if (letters.length < 3) continue;
      for (const s of STRONG) if (letters.includes(s) || once(letters).includes(once(s))) return true;
    }
    // 4. strong words spelled out with spaces: "f u c k"
    const runs = d.match(/(?:\p{L}[\s._\-*]+){2,}\p{L}/gu) || [];
    for (const run of runs) {
      const joined = run.replace(/[^\p{L}]/gu, '');
      if (BAD_SET.has(joined) || STRONG.some((s) => joined.includes(s))) return true;
    }
    // 5. Korean, Japanese and Chinese
    const compact = n.replace(/\s+/g, '');
    for (const w of BAD_SUBSTRINGS) if (compact.includes(w)) return true;
    return false;
  }

  function hasContactInfo(text) {
    const s = normalize(text);
    if (/(https?:\/\/|www\.|\b[a-z0-9-]+\s*(\.|\bdot\b)\s*(com|net|org|io|gg|ly|co|me|tv|xyz|app|dev|info|link|site|kr|jp|cn)\b)/i.test(s)) return true;
    if (/[^\s@]+\s*(@|\(at\)|\[at\])\s*[^\s@]+\s*(\.|\bdot\b)\s*[a-z]{2,}/i.test(s)) return true; // emails
    if (/(^|\s)@[a-z0-9_.]{3,}/i.test(s)) return true; // @handles
    if (/#\d{4}\b/.test(s)) return true; // tags like name#1234
    if ((s.match(/\d/g) || []).length >= 7) return true; // phone numbers and the like
    const flat = ' ' + s.replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
    const compact = s.replace(/\s+/g, '');
    return CONTACT_WORDS.some((w) => /[a-z]/.test(w) ? flat.includes(' ' + w + ' ') : compact.includes(w));
  }

  function checkComment(name, text) {
    const all = name + ' ' + text;
    if (hasBadWords(all)) return 'bad';
    if (hasContactInfo(all)) return 'contact';
    const trimmed = text.trim();
    if (trimmed.length < 2) return 'short';
    const letters = trimmed.replace(/[^A-Za-z]/g, '');
    if (letters.length >= 8 && letters === letters.toUpperCase()) return 'caps';
    if (/(.)\1{9,}/u.test(trimmed)) return 'spam';
    if (/(\S+)(\s+\1){4,}/u.test(trimmed)) return 'spam';
    return null;
  }

  window.CommentFilter = { checkComment, hasBadWords, hasContactInfo };
})();
