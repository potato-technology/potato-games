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
    desc: 'Cars are breaking down all over the city. Race rival tow trucks to every call, drift through traffic, dodge the cops, and haul cars back to your yard. Earn up to 3 stars a shift and spend your cash on garage upgrades. Every $50 you make earns 1 Spud.',
    controls: '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows to drive, <kbd>Space</kbd> handbrake / drift, <kbd>Shift</kbd> nitro, <kbd>E</kbd> hook a car, <kbd>B</kbd> pay bail, <kbd>P</kbd> pause, <kbd>M</kbd> mute. On a touch screen, use the on-screen buttons.',
    score: { label: 'Best shift', format: (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString() },
    thumb: cardPicture('games/towrush/thumb.svg'),
  },
  {
    id: 'tatertyper',
    title: 'Tater Typer',
    by: 'Potato Studios',
    file: 'games/tatertyper.html',
    desc: 'The great potato race! Type fun facts (potatoes, food, animals, space and more) as fast as you can to run your potato past Hash Brown, Mashley and the gang. Mistakes trip you up, and 25 perfect letters in a row lets you throw butter at a rival. Every right letter is XP: level up to unlock sneakers and trails in the Locker. Try Endless mode to outrun the Masher, or race a friend with a race code.',
    controls: 'Just type! Match the sentence exactly, capitals and punctuation too. <kbd>Esc</kbd> for the menu, <kbd>Enter</kbd> to race again. The Pause button pauses a solo race.',
    score: { label: 'Best speed', format: (n) => Math.round(n) + ' WPM' },
    thumb: cardPicture('games/tatertyper-thumb.svg'),
  },
  {
    id: 'orderup',
    title: 'Order Up!',
    by: 'Potato Studios',
    file: 'games/orderup.html',
    desc: 'Run a busy diner! Grill burgers and hot dogs, fry fries and pour sodas before your customers lose patience. Chain combos for bigger tips, impress the food critic, rush orders for busy customers in suits, earn 3 stars every day, and turn your diner into the coolest spot in town.',
    controls: 'Click (or tap) to grab something, then click where it goes. Click a customer to serve them. <kbd>Esc</kbd> drops what you\'re holding, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
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
    desc: 'Goblins, wolves, bats, armored orcs and splitting slimes are marching on the castle! Build archer towers, cannons, frost towers and lightning towers, upgrade them, and drop meteors on the horde across 12 battles. Keep 18 lives for 3 stars, spend your stars on upgrades, and see how long you last in Endless Horde.',
    controls: 'Click a stone pad to build, click a tower to upgrade or sell. <kbd>Space</kbd> next wave, <kbd>1</kbd>–<kbd>4</kbd> pick a tower, <kbd>U</kbd> upgrade, <kbd>Q</kbd> meteor, <kbd>E</kbd> ice storm, <kbd>F</kbd> speed 1x/2x/3x, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/goblingate-thumb.svg'),
  },
  {
    id: 'gemmine',
    title: 'Gem Mine',
    by: 'Potato Studios',
    file: 'games/gemmine.html',
    desc: 'Swap shiny gems to make rows of 3 or more! Match 4 for a line blaster, an L for a bomb and 5 for a rainbow gem, then swap them together for giant blasts. Dig through dirt, smash stones, free frozen gems and drop gold down the mine across 24 levels in four mines.',
    controls: 'Drag a gem (or click two gems next to each other) to swap them. Arrow keys and <kbd>Space</kbd> work too. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> boosters, <kbd>H</kbd> hint, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/gemmine-thumb.svg'),
  },
  {
    id: 'jungledash',
    title: 'Jungle Dash',
    by: 'Potato Studios',
    file: 'games/jungledash.html',
    desc: 'Run and jump through the jungle, a lost temple and a volcano! Bop beetles, frogs and bats, dodge spiky hedgehogs and jumping fireballs, ride moving platforms and find the 3 hidden gems in every level. Spend your coins on double jump, an air dash and cool hats.',
    controls: '<kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to run, <kbd>Space</kbd> or <kbd>↑</kbd> to jump (hold to go higher), <kbd>Shift</kbd> to dash once you buy it, <kbd>P</kbd> pause, <kbd>M</kbd> sound. Big touch buttons show up on phones and tablets.',
    score: { label: 'Gems found', format: (n) => Math.round(n) + ' gems' },
    thumb: cardPicture('games/jungledash-thumb.svg'),
  },
  {
    id: 'beatdrop',
    title: 'Beat Drop',
    by: 'Potato Studios',
    file: 'games/beatdrop.html',
    desc: 'Hit the notes right on the beat on a glowing neon stage! Rock out to 7 catchy songs, from pop and lofi to funk, disco, EDM, rock and chiptune, on Easy, Normal or Hard. Hear a preview, chain giant combos, trigger Fever mode and earn stars to unlock new songs.',
    controls: '<kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> or <kbd>←</kbd> <kbd>↓</kbd> <kbd>↑</kbd> <kbd>→</kbd> hit notes (hold for long notes), tap lanes on touch, arrows + <kbd>Enter</kbd> pick a song, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/beatdrop-thumb.svg'),
  },
  {
    id: 'sunnyacres',
    title: 'Sunny Acres',
    by: 'Potato Studios',
    file: 'games/sunnyacres.html',
    desc: 'Run your own cozy farm! Plant carrots, corn, sunflowers and watermelons, water them, raise chickens, cows, sheep and goats, and fill truck orders before the sun sets. Find golden crops, earn 3 stars a day, level up and decorate with fountains, a windmill and a hot air balloon!',
    controls: 'Click (or drag) plots to till, plant, water and harvest. Bare Hands pick the right seed for you. <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> tools and seeds, <kbd>Q</kbd>/<kbd>E</kbd> switch tools, <kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move the cursor, <kbd>Space</kbd> use, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
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
    desc: 'Wild mini golf in a flower garden, on a pirate island and aboard a space station! Bounce off bumpers, jump ramps over the water, dodge windmills and warp through portals. Grab the spinning coins on every hole, sink holes in one for stars and medals, and kit out your ball in the Pro Shop.',
    controls: 'Drag back from the ball and let go to putt (mouse or touch). Or aim with <kbd>←</kbd> <kbd>→</kbd> and hold <kbd>Space</kbd> to charge. <kbd>U</kbd> mulligan, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/puttparty-thumb.svg'),
  },
  {
    id: 'snakearena',
    title: 'Snake Arena',
    by: 'Potato Studios',
    file: 'games/snakearena.html',
    desc: 'Slither through the Meadow, Desert and Neon City arenas, gobble glowing orbs and grow super long! Trick rival snakes into bumping into you so they pop into big juicy orbs, beat the giant King snakes, and unlock tiger, rainbow and galaxy skins plus silly hats. Arrows at the edge of the screen point you to golden apples and the giant King snake.',
    controls: 'Steer with the mouse or <kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd>. Hold the mouse button, <kbd>Space</kbd> or <kbd>W</kbd> to boost, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
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
    desc: 'Be a sneaky cat burglar and win back stolen treasures from a moonlit museum, a creaky manor and a high-tech bank! Dodge flashlight beams, toss coins to fool the guards, and slip past cameras and lasers while an arrow points you to the loot. Earn 3 stars by escaping, grabbing all the loot and never getting spotted.',
    controls: '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows (or click) to move, hold <kbd>Shift</kbd> to sneak, <kbd>E</kbd> or right-click to throw a coin, <kbd>Space</kbd> smoke bomb, <kbd>P</kbd> pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/shadowheist-thumb.svg'),
  },
  {
    id: 'wordwizard',
    title: 'Word Wizard',
    by: 'Potato Studios',
    file: 'games/wordwizard.html',
    desc: 'Spell words from magic letter tiles to blast slimes, ghosts and dragons with fireballs, lightning and ice! Your spellbook knows over 10,000 words, and longer words cast bigger spells. Hunt for bonus words, earn 3 stars in every battle and defeat the Ember King.',
    controls: 'Click tiles or type the letters, <kbd>Enter</kbd> to cast, <kbd>Backspace</kbd> to undo. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> potion / hint / scramble, <kbd>Esc</kbd> clear or pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/wordwizard-thumb.svg'),
  },
  {
    id: 'starblaster',
    title: 'Star Blaster',
    by: 'Potato Studios',
    file: 'games/starblaster.html',
    desc: 'Pilot a star fighter through 3 glowing galaxies! Blast swooping alien squadrons, dodge asteroid belts and defeat giant bosses like the Crab Dreadnought and the Void Emperor. Lost to a boss? Jump straight into a rematch! Collect crystals to unlock new ships and power up your blasters.',
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
  {
    id: 'petpals',
    title: 'Pet Pals',
    by: 'Potato Studios',
    file: 'games/petpals.html',
    desc: 'Adopt a puppy, kitten or bunny and make them your best friend! Feed, wash, play with and tuck in your pet, earn coins in four fun minigames, then shop for treats, toys, cute outfits and room decorations. Happy pets level up and unlock new goodies.',
    controls: 'Click or tap the buttons to care for your pet, drag treats to its mouth, and rub your pet for cuddles. <kbd>1</kbd>–<kbd>8</kbd> pick actions. Minigames: mouse/touch, <kbd>←</kbd><kbd>→</kbd> in Treat Catch, hold <kbd>Space</kbd> in Fetch. <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Pet level', format: (n) => 'Level ' + Math.round(n) },
    thumb: cardPicture('games/petpals-thumb.svg'),
  },
  {
    id: 'ghostmaze',
    title: 'Ghost Maze',
    by: 'Potato Studios',
    file: 'games/ghostmaze.html',
    desc: 'Zip through glowing mazes collecting every star while four cheeky ghosts chase you! Grab a power orb to turn the tables and tag them for big points. Clear 25 mazes in 5 worlds, grab bonus treats, and unlock cute skins and sparkly trails.',
    controls: '<kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move (press a turn early to take the next corner), or swipe on touch screens. <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString('en-US') },
    thumb: cardPicture('games/ghostmaze-thumb.svg'),
  },
  {
    id: 'puckblast',
    title: 'Puck Blast',
    by: 'Potato Studios',
    file: 'games/puckblast.html',
    desc: 'Slam, bank and slap-shot your way through an air hockey tournament against eight funny animal opponents! First to 7 goals wins. Try the wild Power Cup with power-ups, and unlock awesome tables, mallets and pucks.',
    controls: 'Move the mouse or drag your finger to slide your mallet (or use <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd>). Swing fast for slap shots! <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Tournament stars', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/puckblast-thumb.svg'),
  },
  {
    id: 'hoproad',
    title: 'Hop Road',
    by: 'Potato Studios',
    file: 'games/hoproad.html',
    desc: 'Hop across busy roads, ride logs over rivers and dash over train tracks in a cute blocky world! Collect coins to unlock 13 animal friends, travel from sunny meadows to Candy Land, and finish daily challenges and missions for stars.',
    controls: 'Hop with <kbd>↑</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>↓</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> (<kbd>Space</kbd> hops forward). On a phone, tap to hop and swipe to turn. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best distance', format: (n) => Math.round(n) + ' hops' },
    thumb: cardPicture('games/hoproad-thumb.svg'),
  },
  {
    id: 'tankarena',
    title: 'Tank Arena',
    by: 'Potato Studios',
    file: 'games/tankarena.html',
    desc: 'Drive a cute little tank through 24 arenas and 3 boss battles! Bounce shells off the walls, blast crates for power-ups, dodge mines and pop the bot tanks into confetti. Earn 3 stars per arena, then upgrade your tank and give it a cool paint job.',
    controls: 'Drive with <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or the arrows, aim with the mouse and click to fire (or <kbd>Space</kbd> to auto-aim). Right-click or <kbd>E</kbd> drops a mine. On a phone, drag on the left to drive and tap on the right to shoot. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/tankarena-thumb.svg'),
  },
  {
    id: 'slicesquad',
    title: 'Slice Squad',
    by: 'Potato Studios',
    file: 'games/slicesquad.html',
    desc: 'Swipe to slice flying fruit into juicy halves! Chain combos, skip the bombs, and grab special bananas for Frenzy, Double Points and Freeze. Play Classic, Arcade or Zen, finish missions for stars and unlock blazing blade trails and new backgrounds.',
    controls: 'Hold the mouse button and swipe across the fruit (or drag a finger). <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/slicesquad-thumb.svg'),
  },
  {
    id: 'mergemania',
    title: 'Merge Mania',
    by: 'Potato Studios',
    file: 'games/mergemania.html',
    desc: 'Slide the tiles and smoosh matching pairs together to hatch eggs into chicks, birds and dragons! Play endless Classic or Big Board, earn 3 stars on 30 goal levels, and unlock space, sweets and gem tile sets.',
    controls: 'Swipe, or press <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> (or <kbd>WASD</kbd>) to slide. <kbd>Z</kbd> undo, <kbd>H</kbd> hammer, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/mergemania-thumb.svg'),
  },
  {
    id: 'goalrush',
    title: 'Goal Rush',
    by: 'Potato Studios',
    file: 'games/goalrush.html',
    desc: 'Fast 2-on-2 arcade soccer! Dribble, pass, slide tackle and blast power shots past the goalie. Climb three cup ladders against tougher teams, win penalty shootouts, and unlock cool kits and balls.',
    controls: 'Move with <kbd>WASD</kbd> or the arrow keys. <kbd>Space</kbd> pass or switch player, hold <kbd>X</kbd> to power up a shot (or slide tackle without the ball), <kbd>Shift</kbd> sprint. Touch buttons on phones. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Cup stars', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/goalrush-thumb.svg'),
  },
  {
    id: 'dungeondelve',
    title: 'Dungeon Delve',
    by: 'Potato Studios',
    file: 'games/dungeondelve.html',
    desc: 'Explore a brand-new dungeon every run! Swing your sword at cute slimes, bats and skeletons that poof into sparkles, find keys, chests and relic power-ups, and beat a big boss every third floor. Gems you find buy upgrades for your next adventure.',
    controls: 'Move with <kbd>WASD</kbd> or the arrow keys. <kbd>J</kbd> / <kbd>Space</kbd> or left click to swing your sword, <kbd>K</kbd> / <kbd>Shift</kbd> or right click to dash. Touch buttons on phones. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Deepest floor', format: (n) => 'Floor ' + Math.round(n) },
    thumb: cardPicture('games/dungeondelve-thumb.svg'),
  },
  {
    id: 'kartkings',
    title: 'Kart Kings',
    by: 'Potato Studios',
    file: 'games/kartkings.html',
    desc: 'Race go-karts against five rivals through flowery meadows, desert canyons, icy peaks, candy land and outer space! Drift around corners for speed boosts, grab ? boxes for Zoom Shrooms, Slippy Peels, Bubble Shots and Star Shields, and win trophies in 5 cups. Spend your coins on new karts, paint jobs and racers.',
    controls: '<kbd>↑</kbd>/<kbd>W</kbd> drive, <kbd>←</kbd> <kbd>→</kbd> steer, <kbd>↓</kbd> brake, hold <kbd>Shift</kbd> (or <kbd>Z</kbd>) to drift, <kbd>Space</kbd> (or <kbd>X</kbd>) use an item, <kbd>P</kbd> pause, <kbd>M</kbd> mute. Touch buttons and gamepads work too.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/kartkings-thumb.svg'),
  },
  {
    id: 'bubblepop',
    title: 'Bubble Pop',
    by: 'Potato Studios',
    file: 'games/bubblepop.html',
    desc: 'Aim, bounce your shots off the walls and match 3 or more bubbles to pop them! Drop whole bunches at once, rescue trapped chicks, fish and gummy bears, and blast through ice, bombs and rainbow bubbles across 48 levels in 4 worlds. Save shots for 3 stars and spend your coins on boosters and fun bubble blasters.',
    controls: 'Move the mouse to aim and click to shoot (on touch: drag, then let go). Click the next bubble or press <kbd>X</kbd> to swap. <kbd>←</kbd> <kbd>→</kbd> aim, <kbd>Space</kbd> shoot, <kbd>1</kbd>–<kbd>4</kbd> boosters, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/bubblepop-thumb.svg'),
  },
  {
    id: 'blockstack',
    title: 'Block Stack',
    by: 'Potato Studios',
    file: 'games/blockstack.html',
    desc: "Stack the falling blocks and fill whole rows to clear them! Smooth controls with hold, a next-piece preview and a ghost piece that shows where you'll land. Go the distance in a 150-line Marathon, race the clock in Sprint 40, or beat 24 Challenges full of puzzles, digging and big quad clears, then unlock shiny block skins.",
    controls: '<kbd>←</kbd> <kbd>→</kbd> move, <kbd>↑</kbd>/<kbd>X</kbd> rotate, <kbd>Z</kbd> rotate the other way, <kbd>↓</kbd> soft drop, <kbd>Space</kbd> hard drop, <kbd>C</kbd>/<kbd>Shift</kbd> hold, <kbd>R</kbd> restart, <kbd>P</kbd> pause, <kbd>M</kbd> mute. On-screen buttons on touch screens.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/blockstack-thumb.svg'),
  },
  {
    id: 'strikelanes',
    title: 'Strike Lanes',
    by: 'Potato Studios',
    file: 'games/strikelanes.html',
    desc: 'Roll strikes in a glowing bowling alley! Aim, add curve and power, then watch the pins crash into each other. Beat 10 rival bowlers on the career ladder, solve tricky split challenges and unlock shiny new balls and alleys.',
    controls: 'Move the mouse (or drag) to slide and aim, click to set each step, then click to stop the power meter. Or use <kbd>←</kbd> <kbd>→</kbd> and <kbd>Space</kbd>. <kbd>↑</kbd> <kbd>↓</kbd> curve, <kbd>Esc</kbd> back, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best game', format: (n) => Math.round(n) + ' pins' },
    thumb: cardPicture('games/strikelanes-thumb.svg'),
  },
  {
    id: 'skaterush',
    title: 'Skate Rush',
    by: 'Potato Studios',
    file: 'games/skaterush.html',
    desc: 'Ollie, kickflip and grind your way through sunny schoolyards, beach boardwalks, neon streets and rooftops! Chain tricks into giant combos, grab the S-K-A-T-E letters and unlock cool boards and outfits.',
    controls: '<kbd>Space</kbd> or tap to ollie (hold for higher). In the air: <kbd>←</kbd> kickflip, <kbd>→</kbd> heelflip, <kbd>↑</kbd> 360 spin, hold <kbd>↓</kbd> to grab (or swipe and hold). On the ground <kbd>←</kbd> <kbd>→</kbd> change speed; on rails they keep your balance. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/skaterush-thumb.svg'),
  },
  {
    id: 'idlekingdom',
    title: 'Idle Kingdom',
    by: 'Potato Studios',
    file: 'games/idlekingdom.html',
    desc: "Tap your castle for gold, then build farms, bakeries, wizard towers and dragon roosts that earn gold all by themselves, even while you're away! Catch the golden goose, collect awards and start a New Era to earn crowns.",
    controls: 'Click or tap the castle (or press <kbd>Space</kbd>) for gold, and use the panel to build and upgrade. Click the golden goose and treasure chests! <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: {
      label: 'Gold earned',
      format: (n) => {
        const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
        let i = 0;
        while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
        return (i ? n.toFixed(2) + ' ' + u[i] : Math.floor(n)) + ' gold';
      },
    },
    thumb: cardPicture('games/idlekingdom-thumb.svg'),
  },
  // NEW-GAMES-END
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
const PAGES = ['play', 'avatar', 'shop', 'about'];
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
  if (page === 'about') renderAbout();
  fillAds();
}

// ---------- ads ----------
// Ad slots on hidden pages have no width yet, so each one only becomes an
// "adsbygoogle" slot (and gets filled) the first time it shows up on screen.
function fillAds() {
  document.querySelectorAll('ins.ad-slot:not(.adsbygoogle)').forEach((slot) => {
    if (!slot.offsetWidth) return;
    slot.classList.add('adsbygoogle');
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ad blocked or offline */ }
  });
}
window.addEventListener('resize', fillAds);

// ---------- about page ----------
function renderAbout() {
  // The Potato King himself: golden potato, crown, shades.
  paintAvatar($('#about-avatar'), { color: '#e3c06a', hat: 'crown', face: 'cool' });
  $('#about-games').textContent = GAMES.length;
}
window.addEventListener('hashchange', render);
document.fonts?.ready.then(render);
render();
