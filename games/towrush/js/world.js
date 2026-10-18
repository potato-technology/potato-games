// The city: a grid of two-lane roads with blocks of buildings, parks and your tow yard in between.
// Road intersections are "nodes" {i, j}; node (i, j) sits at (i * cell, j * cell).
const World = (() => {
  const C = CONFIG;
  const N = C.blocks;
  const CELL = C.cell;
  const HALF = C.road / 2;
  const SIZE = N * CELL;
  // 0 = east, 1 = south, 2 = west, 3 = north (screen y points down)
  const DIRS = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];

  function makeRng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Driver's right-hand side for a heading. Traffic drives on the right.
  const right = (d) => DIRS[(d + 1) % 4];
  const laneOffset = (d) => ({ x: right(d).x * C.lane, y: right(d).y * C.lane });
  const nodePos = (n) => ({ x: n.i * CELL, y: n.j * CELL });
  const inBounds = (i, j) => i >= 0 && j >= 0 && i <= N && j <= N;
  const step = (n, d) => ({ i: n.i + DIRS[d].x, j: n.j + DIRS[d].y });
  const sameNode = (a, b) => a.i === b.i && a.j === b.j;

  function dirBetween(a, b) {
    for (let d = 0; d < 4; d++) if (a.i + DIRS[d].x === b.i && a.j + DIRS[d].y === b.j) return d;
    return -1;
  }

  function validDirs(n) {
    return [0, 1, 2, 3].filter((d) => inBounds(n.i + DIRS[d].x, n.j + DIRS[d].y));
  }

  function nearestNode(x, y) {
    const c = (v) => Math.max(0, Math.min(N, Math.round(v / CELL)));
    return { i: c(x), j: c(y) };
  }

  // Shortest route between two nodes. Neighbors are shuffled so drivers don't all take the same streets.
  function route(a, b, shuffle = true) {
    if (sameNode(a, b)) return [a];
    const key = (n) => n.i * 1000 + n.j;
    const prev = new Map([[key(a), null]]);
    const queue = [a];
    while (queue.length) {
      const n = queue.shift();
      const dirs = validDirs(n);
      if (shuffle) dirs.sort(() => Math.random() - 0.5);
      for (const d of dirs) {
        const m = step(n, d);
        if (prev.has(key(m))) continue;
        prev.set(key(m), n);
        if (sameNode(m, b)) {
          const path = [m];
          let p = n;
          while (p) { path.push(p); p = prev.get(key(p)); }
          return path.reverse();
        }
        queue.push(m);
      }
    }
    return [a];
  }

  // ---------- build the city ----------
  const rand = makeRng(C.seed);
  const solids = []; // rectangles you crash into
  const blocks = []; // everything needed to draw the blocks
  const ROOFS = ['#7d8597', '#a36f5c', '#6c7a89', '#b8a07e', '#8c6d8f', '#5f7f73', '#9a8b7a', '#c08a5b', '#6f6a8a', '#8a9a6a'];
  const SIDEWALK = 16;

  function makeBuilding(x, y, w, h) {
    const kinds = ['ac', 'ac', 'plain', 'garden', 'pool', 'pad'];
    let kind = kinds[Math.floor(rand() * kinds.length)];
    if (kind === 'pad' && (w < 150 || h < 150)) kind = 'ac';
    const units = [];
    for (let k = 0, n = 1 + Math.floor(rand() * 3); k < n; k++) {
      units.push({ x: 0.15 + rand() * 0.6, y: 0.15 + rand() * 0.6 });
    }
    return {
      x, y, w, h, kind, units,
      color: ROOFS[Math.floor(rand() * ROOFS.length)],
      height: 0.4 + rand() * 1.2,
    };
  }

  function fillBuildings(b) {
    const gap = 10;
    const x = b.x + SIDEWALK, y = b.y + SIDEWALK, s = b.w - SIDEWALK * 2;
    const h2 = (s - gap) / 2;
    const layout = Math.floor(rand() * 5);
    const list = [];
    if (layout === 0) list.push(makeBuilding(x, y, s, s));
    else if (layout === 1) list.push(makeBuilding(x, y, h2, s), makeBuilding(x + h2 + gap, y, h2, s));
    else if (layout === 2) list.push(makeBuilding(x, y, s, h2), makeBuilding(x, y + h2 + gap, s, h2));
    else if (layout === 3) {
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) list.push(makeBuilding(x + ox * (h2 + gap), y + oy * (h2 + gap), h2, h2));
    } else {
      list.push(makeBuilding(x, y, h2, s), makeBuilding(x + h2 + gap, y, h2, h2), makeBuilding(x + h2 + gap, y + h2 + gap, h2, h2));
    }
    b.buildings = list;
  }

  function fillPark(b) {
    b.trees = [];
    const n = 9 + Math.floor(rand() * 8);
    for (let k = 0; k < n; k++) {
      b.trees.push({ x: b.x + 40 + rand() * (b.w - 80), y: b.y + 40 + rand() * (b.h - 80), r: 16 + rand() * 14 });
    }
    b.pond = rand() < 0.5 ? { x: b.x + b.w * (0.3 + rand() * 0.4), y: b.y + b.h * (0.3 + rand() * 0.4), r: 40 + rand() * 30 } : null;
    if (b.pond) b.trees = b.trees.filter((t) => Math.hypot(t.x - b.pond.x, t.y - b.pond.y) > b.pond.r + t.r);
  }

  let yard = null;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const s = CELL - C.road;
      const b = { i, j, x: i * CELL + HALF, y: j * CELL + HALF, w: s, h: s, kind: 'city' };
      if (i === C.yardBlock[0] && j === C.yardBlock[1]) b.kind = 'yard';
      else if (i === C.police.stationBlock[0] && j === C.police.stationBlock[1]) b.kind = 'police';
      else if (rand() < C.parkChance) b.kind = 'park';
      if (b.kind === 'city') fillBuildings(b);
      if (b.kind === 'park') fillPark(b);
      if (b.kind !== 'yard') solids.push({ x: b.x, y: b.y, w: b.w, h: b.h });
      else yard = b;
      blocks.push(b);
    }
  }

  // Your tow yard: a fenced lot with a gate on the north side.
  {
    const b = yard, WT = 12, GATE = 160;
    const side = (b.w - GATE) / 2;
    b.walls = [
      { x: b.x, y: b.y, w: WT, h: b.h },
      { x: b.x + b.w - WT, y: b.y, w: WT, h: b.h },
      { x: b.x, y: b.y + b.h - WT, w: b.w, h: WT },
      { x: b.x, y: b.y, w: side, h: WT },
      { x: b.x + side + GATE, y: b.y, w: side, h: WT },
    ];
    b.office = { x: b.x + b.w - WT - 86, y: b.y + WT + 4, w: 82, h: 60 };
    b.gate = { x: b.x + side, w: GATE, y: b.y };
    b.zone = { x: b.x + 30, y: b.y + 80, w: b.w - 60, h: b.h - 118 };
    b.gateNodes = [{ i: b.i, j: b.j }, { i: b.i + 1, j: b.j }];
    solids.push(...b.walls, b.office);
  }

  // Walls around the edge of the map.
  {
    const lo = -HALF, hi = SIZE + HALF, T = 600;
    solids.push(
      { x: lo - T, y: lo - T, w: hi - lo + T * 2, h: T },
      { x: lo - T, y: hi, w: hi - lo + T * 2, h: T },
      { x: lo - T, y: lo, w: T, h: hi - lo },
      { x: hi, y: lo, w: T, h: hi - lo },
    );
  }

  // Police station: you get released onto the road just south of it.
  const station = blocks.find((b) => b.kind === 'police');
  station.exit = { x: station.x + station.w / 2, y: station.y + station.h + HALF + C.lane, angle: 0 };

  // ---------- traffic lights ----------
  // Every intersection where 3 or 4 roads meet gets a light. Axis 0 = east/west traffic, axis 1 = north/south.
  const L = C.lights;
  const CYCLE = (L.green + L.yellow + L.allRed) * 2;
  const lightOffsets = new Map();
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      if (validDirs({ i, j }).length >= 3) lightOffsets.set(i * 1000 + j, rand() * CYCLE);
    }
  }
  const hasLight = (n) => lightOffsets.has(n.i * 1000 + n.j);

  function lightState(n, axis, clock) {
    const off = lightOffsets.get(n.i * 1000 + n.j);
    if (off === undefined) return 'green';
    let p = (clock + off) % CYCLE;
    if (axis === 1) p = (p + CYCLE / 2) % CYCLE;
    if (p < L.green) return 'green';
    if (p < L.green + L.yellow) return 'yellow';
    return 'red';
  }

  // Which intersection box a point is inside (or null).
  function intersectionAt(x, y) {
    const n = nearestNode(x, y);
    const p = nodePos(n);
    return Math.abs(x - p.x) < HALF && Math.abs(y - p.y) < HALF ? n : null;
  }

  const pointInRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  return {
    N, CELL, HALF, SIZE, DIRS, SIDEWALK,
    right, laneOffset, nodePos, inBounds, step, sameNode, dirBetween, validDirs, nearestNode, route,
    solids, blocks, yard, station, pointInRect,
    hasLight, lightState, intersectionAt,
  };
})();
