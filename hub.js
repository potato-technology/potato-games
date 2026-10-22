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
    desc: 'Cars are breaking down all over the city! Race rival tow trucks to every call, drift through traffic and haul cars back to your yard. Grab street pickups, keep a delivery streak going, finish your shift contracts and survive rush hour, but watch out for the police! Every $50 you make earns 1 Spud.',
    controls: '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows to drive, <kbd>Space</kbd> handbrake / drift, <kbd>Shift</kbd> nitro, <kbd>E</kbd> hook a car, <kbd>B</kbd> pay bail, <kbd>P</kbd> pause, <kbd>M</kbd> mute. On a touch screen, use the on-screen buttons.',
    score: { label: 'Best shift', format: (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString() },
    thumb: cardPicture('games/towrush/thumb.svg'),
  },
  {
    id: 'tatertyper',
    title: 'Tater Typer',
    by: 'Potato Studios',
    file: 'games/tatertyper.html',
    desc: 'The great potato race! Type fun facts as fast as you can to run your potato past Hash Brown, Mashley and the gang. Clear golden words for mystery powers, win the Spud Cup against King Russet, try the Daily Dash, outrun the Masher in Endless, or race a friend with a race code. Level up to unlock sneakers and trails.',
    controls: 'Just type! Match the sentence exactly, capitals and punctuation too. <kbd>Esc</kbd> for the menu, <kbd>Enter</kbd> to race again. The Pause button pauses a solo race.',
    score: { label: 'Best speed', format: (n) => Math.round(n) + ' WPM' },
    thumb: cardPicture('games/tatertyper-thumb.svg'),
  },
  {
    id: 'orderup',
    title: 'Order Up!',
    by: 'Potato Studios',
    file: 'games/orderup.html',
    desc: 'Run the busiest diner in town! Grill burgers and hot dogs, fry fries, pour sodas and blend milkshakes before your customers run out of patience. Chain combos for big tips, impress the food critic, rank up from Dish Washer to Diner Legend, earn 3 stars every day, and see how long you last in Lunch Rush!',
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
    desc: 'Goblins, slimes, balloons, shield goblins and the Troll King are marching on the castle! Build archer, cannon, frost and lightning towers, send the brave knight Sir Pip into the fight, grab treasure chests and drop meteors on the horde across 12 battles plus Endless Horde.',
    controls: 'Click a stone pad to build, click a tower to upgrade or sell. <kbd>Space</kbd> next wave, <kbd>1</kbd>–<kbd>4</kbd> pick a tower, <kbd>U</kbd> upgrade, <kbd>Q</kbd> meteor, <kbd>E</kbd> ice storm, <kbd>H</kbd> send Sir Pip, <kbd>F</kbd> speed 1x/2x/3x, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/goblingate-thumb.svg'),
  },
  {
    id: 'gemmine',
    title: 'Gem Mine',
    by: 'Potato Studios',
    file: 'games/gemmine.html',
    desc: 'Swap shiny gems to make lines of 3, build line blasters, bombs and rainbow gems, and dig through 30 levels in five mines. Pop sticky goo, crack open treasure chests and charge your Mega Drill. Come back every day for a brand new Daily Dig!',
    controls: 'Drag a gem (or click two gems next to each other) to swap them. Arrow keys and <kbd>Space</kbd> work too. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> boosters, <kbd>4</kbd> Mega Drill, <kbd>H</kbd> hint, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/gemmine-thumb.svg'),
  },
  {
    id: 'jungledash',
    title: 'Jungle Dash',
    by: 'Potato Studios',
    file: 'games/jungledash.html',
    desc: 'Run, jump and bop beetles through the jungle, a lost temple and a volcano! Dodge coconut monkeys, grab star fruit for star power, and beat a big boss at the end of every world. Find all 3 hidden gems in every level, race the clock for gold medals, and spend coins on double jump, an air dash and cool hats.',
    controls: '<kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to run, <kbd>Space</kbd>, <kbd>↑</kbd> or <kbd>W</kbd> to jump (hold to go higher), <kbd>Shift</kbd> or <kbd>X</kbd> to dash once you buy it, <kbd>P</kbd> pause, <kbd>M</kbd> mute. Big touch buttons show up on phones and tablets.',
    score: { label: 'Gems found', format: (n) => Math.round(n) + ' gems' },
    thumb: cardPicture('games/jungledash-thumb.svg'),
  },
  {
    id: 'beatdrop',
    title: 'Beat Drop',
    by: 'Potato Studios',
    file: 'games/beatdrop.html',
    desc: 'Hit the notes right on the beat on a glowing neon stage! Rock out to 7 catchy songs on Easy, Normal or Hard, catch golden star notes to power up Star Power for double points, take on a new Daily Challenge every day, and collect all the trophies.',
    controls: '<kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> or <kbd>←</kbd> <kbd>↓</kbd> <kbd>↑</kbd> <kbd>→</kbd> hit notes (hold for long notes), tap lanes on touch, <kbd>Space</kbd> Star Power, arrows + <kbd>Enter</kbd> pick a song, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/beatdrop-thumb.svg'),
  },
  {
    id: 'sunnyacres',
    title: 'Sunny Acres',
    by: 'Potato Studios',
    file: 'games/sunnyacres.html',
    desc: 'Run your own cozy farm! Grow crops, raise chickens, cows, sheep and goats, and fill truck orders before sunset. Pick apples in your orchard, bake bread and apple pies in the barn oven, win blue ribbons at the County Fair, then level up and decorate your farm your way.',
    controls: 'Click (or drag) plots to till, plant, water and harvest. Bare Hands pick the right seed for you. <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> tools and seeds, <kbd>Q</kbd>/<kbd>E</kbd> switch tools, <kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move the cursor, <kbd>Space</kbd> use, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Farm level', format: (n) => 'Level ' + Math.round(n) },
    thumb: cardPicture('games/sunnyacres-thumb.svg'),
  },
  {
    id: 'brickblitz',
    title: 'Brick Blitz',
    by: 'Potato Studios',
    file: 'games/brickblitz.html',
    desc: 'Smash glowing candy bricks across 30 neon levels in Neon City, Star Voyage and the Crystal Core! Fill your BLITZ meter for a giant shockwave, beat a silly boss at the end of every world, and see how long you last in the endless Brick Rain mode.',
    controls: 'Move the paddle with the mouse or <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd>. <kbd>Space</kbd> or click to launch and fire lasers, <kbd>B</kbd> or <kbd>Shift</kbd> for a BLITZ wave, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/brickblitz-thumb.svg'),
  },
  {
    id: 'puttparty',
    title: 'Putt Party',
    by: 'Potato Studios',
    file: 'games/puttparty.html',
    desc: 'Wild mini golf in a flower garden, on a pirate island, aboard a space station and in the sweet Candy Kingdom! Bounce on jelly pads, zoom over sugar boost pads and press candy buttons to open licorice walls. Collect stars and medals, or play Party Mode with up to 4 friends on one screen.',
    controls: 'Drag back from the ball and let go to putt (mouse or touch). Or aim with <kbd>←</kbd> <kbd>→</kbd> and hold <kbd>Space</kbd> to charge. <kbd>U</kbd> mulligan, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/puttparty-thumb.svg'),
  },
  {
    id: 'snakearena',
    title: 'Snake Arena',
    by: 'Potato Studios',
    file: 'games/snakearena.html',
    desc: 'Slither through the Meadow, Desert, Neon City and the slippery Frost Cavern, gobble glowing orbs and grow super long! Trick rival snakes into bumping into you, beat the giant King snakes, grab Freeze and Giant power-ups, and take on a brand new Daily Challenge every day.',
    controls: 'Steer with the mouse or <kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd>. Hold the mouse button, <kbd>Space</kbd> or <kbd>W</kbd> to boost, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/snakearena-thumb.svg'),
  },
  {
    id: 'luckylake',
    title: 'Lucky Lake',
    by: 'Potato Studios',
    file: 'games/luckylake.html',
    desc: 'Cast your line from morning to moonlight at Sunny Pond, Misty River, Coral Bay, Frozen Lake and the new Jungle Lagoon! Fish through rain showers, golden hours and feeding frenzies, keep your line in the green for Perfect Catches, and fill your Fish Book with 45 fish.',
    controls: 'Hold <kbd>Space</kbd> or the mouse to charge, let go to cast. Tap to stop the lure and to hook a bite. Hold to reel, and let go when the line turns red. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Species found', format: (n) => Math.round(n) + ' fish' },
    thumb: cardPicture('games/luckylake-thumb.svg'),
  },
  {
    id: 'shadowheist',
    title: 'Shadow Heist',
    by: 'Potato Studios',
    file: 'games/shadowheist.html',
    desc: 'Be a sneaky cat burglar and win back stolen treasures from a museum, a manor and a bank! Stay out of the flashlight beams, toss coins to distract guards and their pups, crawl through air vents and swipe golden pocket watches. Earn 3 stars per heist and try a brand-new Daily Heist every day!',
    controls: '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows (or click) to move, hold <kbd>Shift</kbd> to sneak, <kbd>E</kbd> or right-click to throw a coin, <kbd>Space</kbd> smoke bomb, <kbd>P</kbd> pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/shadowheist-thumb.svg'),
  },
  {
    id: 'wordwizard',
    title: 'Word Wizard',
    by: 'Potato Studios',
    file: 'games/wordwizard.html',
    desc: 'Spell words from magic letter tiles to blast slimes, ghosts and dragons! Your spellbook knows over 10,000 words, and longer words cast bigger spells. Fill your mana orb to unleash a Meteor Shower, watch out for imps that chain up your letters, defeat the Ember King and try the Daily Spell Practice!',
    controls: 'Click tiles or type the letters, <kbd>Enter</kbd> to cast, <kbd>Backspace</kbd> to undo. <kbd>1</kbd> potion, <kbd>2</kbd> hint, <kbd>3</kbd> scramble, <kbd>4</kbd> special spell, <kbd>Esc</kbd> clear or pause',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/wordwizard-thumb.svg'),
  },
  {
    id: 'starblaster',
    title: 'Star Blaster',
    by: 'Potato Studios',
    file: 'games/starblaster.html',
    desc: 'Pilot a star fighter through 3 glowing galaxies and blast alien squadrons, mine layers and shielded drones! Grab spread shots, lasers and golden wingman drones, hit Overdrive for double firepower, and defeat giant bosses like the Crab Dreadnought and the Void Emperor. Lost to a boss? Jump straight into a rematch!',
    controls: 'Fly with the mouse, drag a finger, or use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / arrows. It fires by itself (or hold <kbd>Space</kbd>). <kbd>B</kbd> or right-click for a bomb, <kbd>Shift</kbd> or <kbd>V</kbd> for Overdrive, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/starblaster-thumb.svg'),
  },
  {
    id: 'hoopshot',
    title: 'Hoop Shot',
    by: 'Potato Studios',
    file: 'games/hoopshot.html',
    desc: 'Flick to shoot hoops in a roaring arena! Sink swishes to catch fire, grab special time and rainbow balls, outsmart Blocky the block bot in 25 trick-shot challenges, beat the CPU at HORSE, and play a new Daily Shootout every day.',
    controls: 'Flick up toward the hoop with the mouse or a finger, or aim with <kbd>↑</kbd> <kbd>↓</kbd> and hold <kbd>Space</kbd> to power up. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/hoopshot-thumb.svg'),
  },
  {
    id: 'petpals',
    title: 'Pet Pals',
    by: 'Potato Studios',
    file: 'games/petpals.html',
    desc: 'Adopt a puppy, kitten or bunny and make them your best friend! Feed, wash, cuddle and teach your pet tricks, grow yummy food in the garden, and play five minigames, including a Dance Party. Grant daily wishes, fill your sticker book, and shop for treats, outfits and room decorations.',
    controls: 'Click or tap the buttons to care for your pet, drag treats to its mouth, and rub your pet for cuddles. <kbd>1</kbd>–<kbd>9</kbd> and <kbd>0</kbd> pick actions, <kbd>Space</kbd> during trick practice. Minigames use the mouse or touch, plus <kbd>←</kbd> <kbd>→</kbd> in Treat Catch, hold <kbd>Space</kbd> in Fetch, and <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> in Dance Party. <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Pet level', format: (n) => 'Level ' + Math.round(n) },
    thumb: cardPicture('games/petpals-thumb.svg'),
  },
  {
    id: 'ghostmaze',
    title: 'Ghost Maze',
    by: 'Potato Studios',
    file: 'games/ghostmaze.html',
    desc: 'Zip through glowing mazes collecting every star while cheeky ghosts chase you, including zooming Zippy! Grab power orbs, Speed Sneakers and Snowflakes, build star chains, and pop Big Puff, the boss cloud at the end of every world. 25 mazes in 5 worlds, plus Star Rush.',
    controls: '<kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move (press a turn early to take the next corner), or swipe on touch screens. <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString('en-US') },
    thumb: cardPicture('games/ghostmaze-thumb.svg'),
  },
  {
    id: 'puckblast',
    title: 'Puck Blast',
    by: 'Potato Studios',
    file: 'games/puckblast.html',
    desc: 'Slam, bank and slap-shot your way through an air hockey tournament against eight funny animal opponents, then take on the two-mallet Raccoon Twins! Fill your meter for a curving Super Shot fireball, try 60-second Trick Shots, and unlock awesome tables, mallets and pucks.',
    controls: 'Move the mouse or drag your finger to slide your mallet (or use <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd>). Swing fast for slap shots; a full meter makes a Super Shot! <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Total stars', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/puckblast-thumb.svg'),
  },
  {
    id: 'hoproad',
    title: 'Hop Road',
    by: 'Potato Studios',
    file: 'games/hoproad.html',
    desc: 'Hop across busy roads, ride logs and diving turtles over rivers, and dash over train tracks in a cute blocky world! Grab power-ups like the Bubble Shield and Coin Magnet, keep a speedy hop streak going, and unlock 13 animal friends on the way to Candy Land.',
    controls: 'Hop with <kbd>↑</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>↓</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> (<kbd>Space</kbd> hops forward). On a phone, tap to hop and swipe to turn. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best distance', format: (n) => Math.round(n) + ' hops' },
    thumb: cardPicture('games/hoproad-thumb.svg'),
  },
  {
    id: 'tankarena',
    title: 'Tank Arena',
    by: 'Potato Studios',
    file: 'games/tankarena.html',
    desc: 'Drive a cute little tank through 32 arenas in 4 worlds and bounce your shells off the walls to pop the bot tanks into confetti! Dash through danger, dodge falling bombs, beat four bosses, then see how many waves you can survive in Endless Battle.',
    controls: 'Drive with <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or the arrows, aim with the mouse and click to fire. <kbd>Shift</kbd> dash, <kbd>E</kbd> or right-click drops a mine. On a phone, use the two sticks and buttons. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/tankarena-thumb.svg'),
  },
  {
    id: 'slicesquad',
    title: 'Slice Squad',
    by: 'Potato Studios',
    file: 'games/slicesquad.html',
    desc: "Swipe to slice flying fruit into juicy halves, but don't touch the bombs! Grow your streak, smash Giant Melons, grab Time Berries and Heart Peaches, and try a new Daily Challenge every day. Play Classic, Arcade or Zen and unlock blazing blade trails.",
    controls: 'Hold the mouse button and swipe across the fruit (or drag a finger). <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/slicesquad-thumb.svg'),
  },
  {
    id: 'mergemania',
    title: 'Merge Mania',
    by: 'Potato Studios',
    file: 'games/mergemania.html',
    desc: 'Slide the tiles and merge matching pairs to hatch eggs into chicks, birds and dragons! Keep a combo chain going, catch rainbow Wild Stars, thaw ice blocks and play 40 goal levels or endless Classic. Unlock space, sweets and gem tile sets.',
    controls: 'Swipe, or press <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> (or <kbd>WASD</kbd>) to slide. <kbd>Z</kbd> undo, <kbd>H</kbd> hammer, <kbd>X</kbd> swap, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/mergemania-thumb.svg'),
  },
  {
    id: 'goalrush',
    title: 'Goal Rush',
    by: 'Potato Studios',
    file: 'games/goalrush.html',
    desc: 'Fast 2-on-2 arcade soccer! Pass, tackle and charge up a Super Shot no goalie can hold, grab power-ups, and play in rain, snow and under the lights. Win three cups, beat penalty shootouts and set a record in Target Practice.',
    controls: 'Move with <kbd>WASD</kbd> or the arrow keys. <kbd>Space</kbd> pass or switch player, hold <kbd>X</kbd> to power up a shot (or slide tackle without the ball), <kbd>Shift</kbd> sprint. Stick and buttons on phones. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Cup stars', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/goalrush-thumb.svg'),
  },
  {
    id: 'dungeondelve',
    title: 'Dungeon Delve',
    by: 'Potato Studios',
    file: 'games/dungeondelve.html',
    desc: 'Guide a brave little knight through a brand-new dungeon every run! Poof slimes, bats, spiky balls and sneaky mimic chests, blast rocks with bombs, charge up a spin attack and shop at the friendly frog merchant. Beat the big bosses and spend your gems on upgrades at camp.',
    controls: 'Move with <kbd>WASD</kbd> or the arrow keys. <kbd>J</kbd> / <kbd>Space</kbd> or left click to swing your sword (hold, then let go to spin), <kbd>K</kbd> / <kbd>Shift</kbd> or right click to dash, <kbd>L</kbd> / <kbd>E</kbd> to drop a bomb. Touch buttons on phones. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Deepest floor', format: (n) => 'Floor ' + Math.round(n) },
    thumb: cardPicture('games/dungeondelve-thumb.svg'),
  },
  {
    id: 'kartkings',
    title: 'Kart Kings',
    by: 'Potato Studios',
    file: 'games/kartkings.html',
    desc: 'Race go-karts against five animal rivals through meadows, canyons, icy peaks, candy land and outer space! Drift and do ramp tricks for boosts, tuck in for a slipstream, grab ? boxes for Zoom Shrooms, Boing Springs and Rainbow Comets, and race your own ghost in Time Trial. Win cups to unlock karts, paint and racers.',
    controls: '<kbd>↑</kbd>/<kbd>W</kbd> drive, <kbd>←</kbd> <kbd>→</kbd> steer, <kbd>↓</kbd> brake, hold <kbd>Shift</kbd> (or <kbd>Z</kbd>) to drift or do a ramp trick, <kbd>Space</kbd> (or <kbd>X</kbd>) use an item, <kbd>P</kbd> pause, <kbd>M</kbd> mute. Touch buttons and gamepads work too.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/kartkings-thumb.svg'),
  },
  {
    id: 'bubblepop',
    title: 'Bubble Pop',
    by: 'Potato Studios',
    file: 'games/bubblepop.html',
    desc: 'Aim, bounce and match 3 bubbles to pop them across 48 levels in four colorful worlds! Rescue trapped critters, knock down sleepy rocks, grab clock bubbles for extra shots and charge a Super Shot that pops a whole color. Then see how long you can last in endless Bubble Rush.',
    controls: 'Move the mouse to aim and click to shoot (on touch: drag, then let go). Click the next bubble or press <kbd>X</kbd> to swap. <kbd>←</kbd> <kbd>→</kbd> aim, <kbd>Space</kbd> shoot, <kbd>1</kbd>–<kbd>4</kbd> boosters, <kbd>Q</kbd> Super Shot, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/bubblepop-thumb.svg'),
  },
  {
    id: 'blockstack',
    title: 'Block Stack',
    by: 'Potato Studios',
    file: 'games/blockstack.html',
    desc: 'Stack the falling blocks and fill whole rows to clear them! Play Marathon, Sprint 40, 32 Challenges and a brand-new Daily Dash. Clear sparkly gem blocks to charge your Blaster, fill the Fever meter for double points, and unlock shiny block skins.',
    controls: '<kbd>←</kbd> <kbd>→</kbd> move, <kbd>↑</kbd>/<kbd>X</kbd> rotate, <kbd>Z</kbd> rotate the other way, <kbd>↓</kbd> soft drop, <kbd>Space</kbd> hard drop, <kbd>C</kbd>/<kbd>Shift</kbd> hold, <kbd>B</kbd> Blaster, <kbd>R</kbd> restart, <kbd>P</kbd> pause, <kbd>M</kbd> mute. On-screen buttons on touch screens.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/blockstack-thumb.svg'),
  },
  {
    id: 'strikelanes',
    title: 'Strike Lanes',
    by: 'Potato Studios',
    file: 'games/strikelanes.html',
    desc: 'Roll strikes in a glowing bowling alley! Aim, curve and power your throw, beat 10 rival bowlers, crack pin puzzles and a new Daily Challenge. Use power-ups like the Mega Ball, hit golden pins for bonus coins and roll two strikes in a row to set your ball on fire!',
    controls: 'Move the mouse (or drag) to slide and aim, click to set each step, then click to stop the power meter. Or use <kbd>←</kbd> <kbd>→</kbd> and <kbd>Space</kbd>. <kbd>↑</kbd> <kbd>↓</kbd> curve, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> power-ups, <kbd>Esc</kbd> back, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best game', format: (n) => Math.round(n) + ' pins' },
    thumb: cardPicture('games/strikelanes-thumb.svg'),
  },
  {
    id: 'skaterush',
    title: 'Skate Rush',
    by: 'Potato Studios',
    file: 'games/skaterush.html',
    desc: 'Ollie, kickflip, grab and grind through schoolyards, beach boardwalks, neon streets and rooftops! Chain tricks into giant combos, hop over RC cars and crabs, grab power-up bubbles and fill your SPECIAL meter for double points. Then try Free Skate: a brand-new track and 60 seconds to set a record.',
    controls: '<kbd>Space</kbd> or tap to ollie (hold for higher). In the air: <kbd>←</kbd> kickflip, <kbd>→</kbd> heelflip, <kbd>↑</kbd> 360 spin, hold <kbd>↓</kbd> to grab (or swipe and hold). On the ground <kbd>←</kbd> <kbd>→</kbd> change speed; on rails they keep your balance. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/skaterush-thumb.svg'),
  },
  {
    id: 'idlekingdom',
    title: 'Idle Kingdom',
    by: 'Potato Studios',
    file: 'games/idlekingdom.html',
    desc: "Tap your castle for gold and build a kingdom of farms, bakeries, wizard towers and dragon roosts that keeps earning while you're away. Finish Royal Quests, shoo the crows off your wheat and unleash Royal Powers like the Harvest Festival. Start a New Era to earn crowns that make everything faster forever!",
    controls: 'Click or tap the castle (or press <kbd>Space</kbd>) for gold. Tap fast for a combo! Use the panel to build and upgrade. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> Royal Powers, <kbd>G</kbd> catch the golden goose, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
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
  {
    id: 'toothpaste',
    title: 'Toothpaste Pro',
    by: 'Potato Studios',
    file: 'games/toothpaste.html',
    desc: 'Toothbrushes zoom past on a bathroom conveyor belt! Hold to squeeze the glossy tube and let go at just the right moment to lay a perfect stripe of paste on the bristles. Play 25 levels in four bathrooms with wobbly, giant, double-sided and electric brushes, beat Captain Plaque in the Dentist Rush, and spend your coins on new tubes, flavours and brushes.',
    controls: 'Hold the mouse, a finger or <kbd>Space</kbd> to squeeze, and let go to stop. <kbd>R</kbd> refills the tube, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/toothpaste-thumb.svg'),
  },
  {
    id: 'skystack',
    title: 'Sky Stack',
    by: 'Potato Studios',
    file: 'games/skystack.html',
    desc: 'Tap to drop each swinging block and build the tallest tower ever! Land perfect drops to chain combos, grow your blocks back and trigger Fever. Dodge birds, beat the wind and four silly bosses on your way past the clouds and into outer space.',
    controls: 'Tap, click or press <kbd>Space</kbd> to drop. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> use boosts. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Tallest tower', format: (n) => Math.round(n) + ' floors' },
    thumb: cardPicture('games/skystack-thumb.svg'),
  },
  {
    id: 'bullseye',
    title: 'Bullseye',
    by: 'Potato Studios',
    file: 'games/bullseye.html',
    desc: 'Draw back your bow, read the wind and hold your breath for the perfect shot! Beat 12 rival archers in three tournaments, pull off 24 trick shots through hoops and over walls, and pop balloons in Balloon Blitz. Unlock new bows, arrows and outfits.',
    controls: 'Drag back and let go to shoot (or aim with <kbd>↑</kbd> <kbd>↓</kbd> and hold <kbd>Space</kbd>). Hold <kbd>Shift</kbd> or the lungs button to hold your breath. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/bullseye-thumb.svg'),
  },
  {
    id: 'pinballparty',
    title: 'Pinball Party',
    by: 'Potato Studios',
    file: 'games/pinballparty.html',
    desc: 'Flip, nudge and launch your way across three themed pinball tables: Treasure Cove, Star Voyager and Sugar Rush! Light the lock for multiball, finish missions to start Party Mode and chase the jackpot. Earn stars to unlock new tables and shiny new balls.',
    controls: 'Flippers: <kbd>←</kbd> <kbd>→</kbd> or <kbd>Z</kbd> <kbd>/</kbd>, or tap the left/right side. Hold <kbd>↓</kbd> or <kbd>Space</kbd> to launch. <kbd>N</kbd> nudge, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'High score', format: (n) => Math.round(n).toLocaleString() + ' pts' },
    thumb: cardPicture('games/pinballparty-thumb.svg'),
  },
  {
    id: 'boardbuddies',
    title: 'Board Buddies',
    by: 'Potato Studios',
    file: 'games/boardbuddies.html',
    desc: 'Play Checkers, Four in a Row, Reversi, Tic-Tac-Toe and Ultimate Tic-Tac-Toe against 15 cute animal buddies on Easy, Medium and Hard! Climb the Trophy Ladder to face Leo the Champion, play a friend on the same screen, and unlock fun boards and pieces.',
    controls: 'Click or tap to play (in Checkers, click a piece, then where it goes). <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> move, <kbd>Enter</kbd> places, <kbd>1</kbd>–<kbd>7</kbd> drop in Four in a Row, <kbd>H</kbd> hint, <kbd>U</kbd> undo, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Ladder stars', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/boardbuddies-thumb.svg'),
  },
  {
    id: 'treasuresweeper',
    title: 'Treasure Sweeper',
    by: 'Potato Studios',
    file: 'games/treasuresweeper.html',
    desc: "Dig for pirate treasure on sunny islands! The numbers tell you how many sneaky crabs hide next door, so plant flags, follow Polly the parrot's compass and clear 32 island maps with parrots, message bottles and steamy volcanoes. Play relaxed or race the clock in Treasure Rush.",
    controls: 'Click or tap to dig, right-click or long-press (or the flag tool) to flag. Click a number to dig around it. <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> move, <kbd>Space</kbd> dig, <kbd>F</kbd> flag, <kbd>C</kbd> compass, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/treasuresweeper-thumb.svg'),
  },
  {
    id: 'picturecross',
    title: 'Picture Cross',
    by: 'Potato Studios',
    file: 'games/picturecross.html',
    desc: 'Use the number clues to fill in the right squares and reveal a colourful pixel picture! Solve 62 hand-made puzzles from tiny 5x5 grids to big 15x15 pictures, with hints, a mistake-forgiving Kid mode and an album of every picture you finish.',
    controls: 'Click or drag to fill squares, right-click (or the cross tool) to cross out. <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> move, <kbd>Space</kbd> fill, <kbd>X</kbd> cross, <kbd>H</kbd> hint, <kbd>Z</kbd> undo, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/picturecross-thumb.svg'),
  },
  {
    id: 'lemonadestand',
    title: 'Lemonade Stand',
    by: 'Potato Studios',
    file: 'games/lemonadestand.html',
    desc: 'Run your very own lemonade stand! Check the weather, buy lemons, sugar, ice and cups, mix the perfect recipe and pick a price, then watch customers line up and tell you what they think. Unlock new drinks, upgrade your stand and move to the beach, the stadium and the fun fair!',
    controls: 'Plan your day with the mouse or by tapping. During the day, click or tap the stand to pour faster and tap gold coins to catch tips. <kbd>Space</kbd> shout, <kbd>F</kbd> speed up, <kbd>Enter</kbd> serve, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Cups sold', format: (n) => Math.round(n).toLocaleString() + ' cups' },
    thumb: cardPicture('games/lemonadestand-thumb.svg'),
  },
  {
    id: 'moonlander',
    title: 'Moon Lander',
    by: 'Potato Studios',
    file: 'games/moonlander.html',
    desc: 'Fly a little lander across six planets! Fire your engine, tilt and touch down gently on landing pads, rescue stranded astronauts, grab glowing crystals and fly through icy caves. Spend crystals on ship upgrades and earn all the stars.',
    controls: 'Hold <kbd>↑</kbd> / <kbd>W</kbd> / <kbd>Space</kbd> to fire the engine, <kbd>←</kbd> <kbd>→</kbd> (or <kbd>A</kbd> <kbd>D</kbd>) to tilt, <kbd>S</kbd> to straighten up. On touch screens use the on-screen buttons. <kbd>R</kbd> restart, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/moonlander-thumb.svg'),
  },
  {
    id: 'colorsort',
    title: 'Color Sort',
    by: 'Potato Studios',
    file: 'games/colorsort.html',
    desc: 'Pour colourful liquids between glass tubes until every tube holds just one colour! 200 puzzles that can always be solved, mystery layers, a daily puzzle, a speedy Rush mode, and tube and background skins to collect.',
    controls: 'Click or tap a tube, then another tube to pour. <kbd>1</kbd>–<kbd>9</kbd> or <kbd>←</kbd> <kbd>→</kbd> + <kbd>Space</kbd> pick tubes, <kbd>Z</kbd> undo, <kbd>R</kbd> restart, <kbd>H</kbd> hint, <kbd>T</kbd> extra tube, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/colorsort-thumb.svg'),
  },
  {
    id: 'hillrider',
    title: 'Hill Rider',
    by: 'Potato Studios',
    file: 'games/hillrider.html',
    desc: "Drive a jeep, dirt bike, monster truck, moon rover or race car over bumpy hills, and don't bonk your head! Lean in the air to land flips, grab fuel cans before the tank runs dry, and upgrade your ride to drive all the way to the Moon.",
    controls: '<kbd>→</kbd>/<kbd>D</kbd> gas, <kbd>←</kbd>/<kbd>A</kbd> brake and reverse (they also lean you in the air), <kbd>Space</kbd> nitro, <kbd>P</kbd> pause, <kbd>M</kbd> mute. On phones, use the pedals.',
    score: { label: 'Best distance', format: (n) => Math.round(n).toLocaleString() + ' m' },
    thumb: cardPicture('games/hillrider-thumb.svg'),
  },
  {
    id: 'jetpup',
    title: 'Jet Pup',
    by: 'Potato Studios',
    file: 'games/jetpup.html',
    desc: 'Strap a jetpack on a puppy and zoom through the lab! Dodge zappers, rockets, lasers and Captain Whiskers, ride a mech suit, a bird buddy or gravity boots, and spend coins and bones on gadgets and cute costumes.',
    controls: 'Hold <kbd>Space</kbd>, the mouse button or your finger to fly. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best distance', format: (n) => Math.round(n).toLocaleString() + ' m' },
    thumb: cardPicture('games/jetpup-thumb.svg'),
  },
  {
    id: 'tennisace',
    title: 'Tennis Ace',
    by: 'Potato Studios',
    file: 'games/tennisace.html',
    desc: 'Swing at just the right moment to smash, lob and serve your way through an animal tennis tour on grass, clay and hard courts. Unleash super shots, beat rivals to play as them, buy new rackets and outfits, and sharpen your timing at the Training Camp.',
    controls: '<kbd>Space</kbd> hit or serve (toss, then hit at the top), <kbd>K</kbd> lob, <kbd>L</kbd> drop shot, <kbd>E</kbd> super shot, hold <kbd>←</kbd>/<kbd>→</kbd> to aim, arrows move (auto-run is on to start), <kbd>P</kbd> pause, <kbd>M</kbd> mute. Tap to hit on phones.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/tennisace-thumb.svg'),
  },
  {
    id: 'skybounce',
    title: 'Sky Bounce',
    by: 'Potato Studios',
    file: 'games/skybounce.html',
    desc: 'Bounce higher and higher on springy platforms, stomp silly monsters and grab jetpacks and propeller hats. Climb from sunny meadows all the way to outer space! Beat the Storm Cloud, finish missions, unlock characters and try the Daily Climb.',
    controls: '<kbd>←</kbd> <kbd>→</kbd>, <kbd>A</kbd> <kbd>D</kbd> or the mouse to steer, <kbd>Space</kbd>, <kbd>↑</kbd> or click to shoot. On touch screens, hold to steer and use the star button to shoot. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Best height', format: (n) => Math.round(n).toLocaleString() + ' m' },
    thumb: cardPicture('games/skybounce-thumb.svg'),
  },
  {
    id: 'powderpeak',
    title: 'Powder Peak',
    by: 'Potato Studios',
    file: 'games/powderpeak.html',
    desc: 'Carve down snowy mountains on your snowboard! Zip through slalom flags, launch off kickers for spins, flips and grabs, grind rails and outrun the avalanche. Four mountains, 24 events, and boards and outfits to unlock.',
    controls: '<kbd>←</kbd> <kbd>→</kbd> steer and spin, <kbd>↓</kbd> tuck or grab, <kbd>↑</kbd> brake or flip, <kbd>Space</kbd> or click to jump. The mouse steers too. On touch screens, hold the left or right side, the middle to tuck, and swipe up to jump. <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/powderpeak-thumb.svg'),
  },
  {
    id: 'candydrop',
    title: 'Candy Drop',
    by: 'Potato Studios',
    file: 'games/candydrop.html',
    desc: "Swipe to cut the ropes and swing the candy into Munch's mouth! Float in bubbles, puff air cushions, dodge spikes and zip through teleport pipes. 48 puzzles in four candy boxes, with 3 stars to win on every level.",
    controls: 'Swipe (drag) to cut ropes, click or tap the candy (or <kbd>Space</kbd>) to pop bubbles, click or tap a cushion (or <kbd>1</kbd>–<kbd>4</kbd>) to puff. <kbd>H</kbd> hint, <kbd>R</kbd> restart, <kbd>P</kbd> pause, <kbd>M</kbd> mute',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/candydrop-thumb.svg'),
  },
  {
    id: 'sumobots',
    title: 'Sumo Bots',
    by: 'Potato Studios',
    file: 'games/sumobots.html',
    desc: 'Build a little robot and push your rivals off floating sky platforms! Dash into bots, block to bounce them back and charge up to smash through their guard, while dodging ice, bumpers and spinning hammers. Climb 5 league cups past 5 boss bots, upgrade your parts in the garage, or battle a friend on one keyboard.',
    controls: '<kbd>WASD</kbd> or arrows to move, tap <kbd>Space</kbd> to dash (hold to charge), hold <kbd>Shift</kbd> to block, <kbd>P</kbd> pause, <kbd>M</kbd> mute. 2 players: P1 <kbd>WASD</kbd> + <kbd>F</kbd>/<kbd>G</kbd>, P2 arrows + <kbd>.</kbd>/<kbd>/</kbd>. Touch stick and buttons work too.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/sumobots-thumb.svg'),
  },
  {
    id: 'cardcastle',
    title: 'Card Castle',
    by: 'Potato Studios',
    file: 'games/cardcastle.html',
    desc: 'Three solitaire games in one: Klondike, Spider and Pyramid! Drag cards or tap them to auto-move, use undo and hints, and watch the cards bounce when you win. Earn stars to build your own castle, play the daily deals and unlock new card backs and tables.',
    controls: 'Drag cards or click to auto-move. <kbd>Space</kbd> draw, <kbd>U</kbd> undo, <kbd>H</kbd> hint, <kbd>N</kbd> new game, <kbd>P</kbd> pause, <kbd>M</kbd> mute.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/cardcastle-thumb.svg'),
  },
  {
    id: 'waverider',
    title: 'Wave Rider',
    by: 'Potato Studios',
    file: 'games/waverider.html',
    desc: 'Race jet skis through tropical lagoons, wild rivers and a harbor at night! Pass each buoy on the side its arrow shows to power up, fly off ramps to pull flips and spins, and use your turbo to zoom ahead. Win trophies in 3 cups, race your own ghost in Time Trial and unlock faster jet skis.',
    controls: '<kbd>↑</kbd>/<kbd>W</kbd> go, <kbd>←</kbd> <kbd>→</kbd> steer, <kbd>↓</kbd> brake, <kbd>Space</kbd>/<kbd>Shift</kbd> turbo. In the air: <kbd>←</kbd>/<kbd>→</kbd> spin, <kbd>↑</kbd> front flip, <kbd>↓</kbd> backflip. <kbd>C</kbd> camera, <kbd>P</kbd> pause, <kbd>M</kbd> mute. On a phone the gas is automatic.',
    score: { label: 'Stars earned', format: (n) => Math.round(n) + ' ★' },
    thumb: cardPicture('games/waverider-thumb.svg'),
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
