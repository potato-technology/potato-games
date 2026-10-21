// Tow Rush tuning knobs. Change these numbers to change how the game feels.
const CONFIG = {
  // ---------- city ----------
  seed: 1337,          // change for a different city layout
  blocks: 8,           // the city is blocks x blocks
  cell: 520,           // distance between road centers
  road: 140,           // road width
  lane: 35,            // lane center distance from the road's middle
  shoulder: 58,        // where broken-down cars pull over
  yardBlock: [3, 4],   // which block is your tow yard
  parkChance: 0.14,    // chance a block is a park instead of buildings

  // ---------- your tow truck ----------
  truck: {
    maxSpeed: 430,
    accel: 470,
    brake: 900,
    reverseMax: 170,
    coast: 0.6,          // slowdown when you're off the gas
    // steering
    steerLow: 0.5,       // how far the front wheels turn (radians) when you're slow...
    steerHigh: 0.14,     // ...and at top speed, so it's calm instead of twitchy when fast
    steerDrift: 0.55,    // extra lock while sliding, so you can countersteer
    steerIn: 3.5,        // how fast the wheel turns when you press left/right (lower = quick taps turn less)
    steerOut: 10,        // how fast it straightens (or swaps sides) when you let go
    // tires and body
    cgFront: 21,         // distance from the middle of the truck to each axle
    cgRear: 19,
    inertia: 600,        // how lazily the truck rotates
    frontGrip: 560,
    rearGrip: 640,
    slipPeak: 0.18,      // tire slip angle where grip is strongest
    slideGrip: 0.72,     // rear grip left once the tires are sliding (lower = easier, longer drifts)
    handbrakeGrip: 0.3,  // rear grip while holding the handbrake at low speed
    handbrakeDecel: 260,
    powerOversteer: 0.55, // how much the gas loosens the rear tires mid-drift
    canDrift: true,
    driftMinSpeed: 170,  // handbrake + steer above this speed to start a drift
    driftEnter: 0.3,     // the back end sliding out this far on its own also starts one
    driftExit: 0.08,     // straighten up past this and the drift ends
    driftAngle: 0.4,     // drift angle (radians) with a little steering into the turn
    driftAngleSteer: 0.45, // full steering into the turn adds this much (0.85 rad, about 49 degrees)
    driftAngleMax: 0.95,
    driftAngleRate: 4,   // how quickly the nose swings to the angle you want
    driftFade: 1.3,      // how slowly the drift fades out when you let go of steering
    driftCarve: 2.8,     // how hard the truck curves around the turn for a given angle
    driftScrub: 1.1,     // speed lost to sliding sideways
    driftPower: 0.95,    // how much the gas keeps your speed up mid-drift
    driftAssist: 1.5,    // stops big drifts from turning into spins
    towSpeedMul: 0.82,   // top speed while towing
    towAccelMul: 0.72,   // acceleration while towing
    boostSpeedMul: 1.3,  // nitro top speed
    boostAccelMul: 1.9,  // nitro acceleration
  },

  // Steering sensitivity you can pick on the title screen or pause menu.
  //   yawCap     = the fastest the truck can turn (radians per second) at any speed, so turns feel the same slow or fast
  //   stability  = how firmly the truck follows the wheels in normal driving (the back end won't step out by itself)
  //   gripAssist = how quickly sideways sliding settles down when you aren't drifting
  // (Holding Space turns the assists off, so you can still kick the truck into a drift.)
  steering: {
    low: { steerLow: 0.44, steerHigh: 0.11, steerIn: 2.6, steerOut: 8, yawCap: 1.25, stability: 6, gripAssist: 3 },
    normal: { steerLow: 0.5, steerHigh: 0.14, steerIn: 3.2, steerOut: 9, yawCap: 1.5, stability: 6, gripAssist: 3 },
    high: { steerLow: 0.6, steerHigh: 0.19, steerIn: 4.5, steerOut: 10, yawCap: 1.8, stability: 6, gripAssist: 3 },
  },

  // ---------- drifting and nitro ----------
  drift: {
    minSpeed: 170,       // have to be going at least this fast...
    minAngle: 0.3,       // ...and sideways by this much (radians, about 17 degrees) to count as a drift
    pointsPerSpeed: 1,   // points per second = speed x angle bonus x this
    comboEvery: 1.2,     // seconds of drifting for each extra combo multiplier
    maxCombo: 5,
    chainTime: 1.2,      // seconds you have to start the next drift and keep the combo going
    towBonus: 1.5,       // drifting with a car on the hook is worth more
    cashPerPoint: 0.02,  // drift points become cash...
    nitroPerPoint: 1 / 2500, // ...and nitro (a full tank is 2500 points)
    minBank: 60,         // tiny wiggles don't count
    boostSeconds: 3,     // how long a full tank of nitro lasts
  },

  // ---------- garage (spend your money between shifts) ----------
  bail: 150,                // pay this in jail to get out right away
  upgradeCosts: {           // price of levels 1, 2 and 3
    engine: [400, 900, 1800],
    tires: [350, 800, 1600],
    nitro: [300, 700, 1400],
    hook: [250, 600, 1200],
  },

  // ---------- traffic lights ----------
  lights: {
    green: 6,          // seconds each direction gets a green light
    yellow: 1.8,
    allRed: 0.8,       // short pause where both directions are red
  },

  // ---------- police ----------
  police: {
    stationBlock: [5, 2],  // which block is the police station
    patrols: 5,            // police cars driving around
    patrolSpeed: [165, 195],
    chaseSpeed: 445,       // a little faster than your truck, so don't let them get close
    seeRange: 650,         // how close a cop has to be to see you break a rule
    speedingSeeRange: 450, // cops only clock your speed from closer up
    speedLimit: 320,       // 80 km/h on the speedometer
    joinRange: 1300,       // other cops this close join the chase
    escapeRange: 950,      // get this far from every cop...
    escapeSeconds: 5,      // ...for this long to lose them
    bustRange: 85,         // a cop this close slowly arrests you
    bustSeconds: 1.2,      // time to get arrested if you're stopped (longer if you're still moving)
    jailSeconds: 30,
    wrongWaySeconds: 1.5,  // time on the wrong side of the road before it counts
  },

  // ---------- traffic ----------
  trafficCount: 64,
  trafficSpeed: [140, 205],

  // ---------- rival tow companies ----------
  rivals: [
    { name: "Rusty's Towing", color: '#d6453d', home: [0, 2] },
    { name: 'Hook & Go', color: '#8e5bd6', home: [8, 6] },
    { name: "Big Mike's Tow", color: '#ef8a2b', home: [5, 0] },
    { name: 'Swift Haul', color: '#2fa3c7', home: [2, 8] },
  ],
  rivalSpeed: 285,          // starting speed (they stop at red lights too)
  rivalSpeedPerJob: 7,      // they get faster every job you finish
  rivalSpeedMax: 360,
  rivalDelay: 9,            // seconds after a call before rivals head out
  rivalDelayPerJob: 0.6,
  rivalDelayMin: 3,
  rivalsAtStart: 1,
  rivalsMax: 3,
  jobsPerExtraRival: 3,     // one more rival joins every N jobs you finish

  // ---------- kinds of tow calls ----------
  // weight = how often it shows up, pay = payout multiplier
  calls: {
    breakdown: { weight: 4, pay: 1 },
    vip: { weight: 2, pay: 2, hitDamage: 0.15, minCondition: 0.3 }, // each crash while towing knocks 15% off
    parked: { weight: 2, pay: 0.75, ownerSpeed: 370, ownerGrabSeconds: 1.3, ownerGiveUpRange: 1000, ownerGiveUpSeconds: 4 },
    crash: { weight: 2, pay: 1.5 },                                 // a cop is parked at the scene
    big: { weight: 1.5, pay: 2.5, needsEngine: 1, towSpeedMul: 0.62, towAccelMul: 0.5 },
  },

  // ---------- jobs and money ----------
  shiftSeconds: 240,
  shiftStars: [500, 1200, 2000], // shift money for 1, 2 and 3 stars
  rewardBase: 260,          // starting value of a call
  rewardPerDistance: 0.06,  // farther calls are worth more
  rewardDecayPerSec: 7,     // the value drops every second you take
  rewardMin: 40,
  towFee: 80,               // flat fee paid when you drop the car at your yard
  hookRange: 85,
  hookMaxSpeed: 95,
  crashMinSpeed: 90,        // hits softer than this are free
  crashCostPerSpeed: 0.12,  // repair bill per unit of impact speed
};
