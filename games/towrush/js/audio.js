// Little synthesized sound effects (no audio files needed).
const Sound = (() => {
  let ac = null, master = null, engOsc = null, engGain = null, engFilter = null, sirenGain = null, screechGain = null;
  let muted = false;

  function init() {
    if (window.__noAudio) return; // automated tests run without sound
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ac.destination);
      engOsc = ac.createOscillator();
      engOsc.type = 'sawtooth';
      engFilter = ac.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 380;
      engGain = ac.createGain();
      engGain.gain.value = 0;
      engOsc.connect(engFilter).connect(engGain).connect(master);
      engOsc.start();
      // Police siren: a tone that sweeps up and down, silent until a chase starts.
      const siren = ac.createOscillator(), lfo = ac.createOscillator(), lfoDepth = ac.createGain();
      siren.type = 'triangle';
      siren.frequency.value = 760;
      lfo.frequency.value = 1.6;
      lfoDepth.gain.value = 230;
      lfo.connect(lfoDepth).connect(siren.frequency);
      sirenGain = ac.createGain();
      sirenGain.gain.value = 0;
      siren.connect(sirenGain).connect(master);
      siren.start();
      lfo.start();
      // Tire screech: looping noise through a narrow filter, silent until you slide.
      const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const screech = ac.createBufferSource(), band = ac.createBiquadFilter();
      screech.buffer = buf;
      screech.loop = true;
      band.type = 'bandpass';
      band.frequency.value = 1500;
      band.Q.value = 6;
      screechGain = ac.createGain();
      screechGain.gain.value = 0;
      screech.connect(band).connect(screechGain).connect(master);
      screech.start();
    } catch (e) {
      ac = null;
    }
  }

  function engine(speedRatio, on) {
    if (!ac) return;
    const t = ac.currentTime;
    engOsc.frequency.setTargetAtTime(36 + speedRatio * 95, t, 0.08);
    engGain.gain.setTargetAtTime(on ? 0.05 + speedRatio * 0.05 : 0, t, 0.1);
  }

  function screech(level) {
    if (!ac) return;
    screechGain.gain.setTargetAtTime(level * 0.12, ac.currentTime, 0.05);
  }

  function siren(level) {
    if (!ac) return;
    sirenGain.gain.setTargetAtTime(level * 0.07, ac.currentTime, 0.15);
  }

  function tone(freq, dur, { type = 'square', vol = 0.15, slide = 0, delay = 0 } = {}) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, cutoff = 900) {
    if (!ac) return;
    const t = ac.currentTime;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  return {
    init,
    engine,
    siren,
    screech,
    driftBank(score) {
      const steps = score >= 4000 ? 5 : score >= 1500 ? 4 : score >= 500 ? 3 : 2;
      for (let i = 0; i < steps; i++) tone(700 + i * 180, 0.12, { type: 'triangle', vol: 0.14, delay: i * 0.06 });
    },
    driftFail() { tone(220, 0.3, { type: 'sawtooth', vol: 0.1, slide: -120 }); },
    boost() { noise(0.5, 0.35, 2500); tone(180, 0.4, { type: 'sawtooth', vol: 0.06, slide: 400 }); },
    whistle() { tone(2200, 0.18, { type: 'sine', vol: 0.12, slide: 300 }); tone(2400, 0.3, { type: 'sine', vol: 0.12, delay: 0.22 }); },
    busted() { [520, 440, 350, 260].forEach((f, i) => tone(f, 0.3, { type: 'square', vol: 0.09, delay: i * 0.18 })); noise(0.4, 0.4, 500); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    crash(power) { noise(0.25, Math.min(0.9, 0.25 + power / 500), 700); tone(90, 0.2, { type: 'triangle', vol: 0.25, slide: -50 }); },
    hook() { tone(520, 0.07, { vol: 0.12 }); tone(780, 0.1, { vol: 0.12, delay: 0.07 }); noise(0.1, 0.3, 3000); },
    cash() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.18, delay: i * 0.07 })); },
    lose() { [440, 370, 300].forEach((f, i) => tone(f, 0.22, { type: 'sawtooth', vol: 0.1, delay: i * 0.13 })); },
    call() { tone(990, 0.12, { vol: 0.1 }); tone(990, 0.12, { vol: 0.1, delay: 0.18 }); },
    alarm() { tone(600, 0.35, { type: 'sawtooth', vol: 0.07, slide: 300 }); tone(600, 0.35, { type: 'sawtooth', vol: 0.07, slide: 300, delay: 0.35 }); },
    honk() { tone(370, 0.22, { vol: 0.05 }); tone(466, 0.22, { vol: 0.05 }); },
    tick() { tone(1400, 0.04, { vol: 0.05 }); },
    pickup(kind) {
      if (kind === 'cash') { tone(988, 0.08, { type: 'square', vol: 0.08 }); tone(1319, 0.16, { type: 'square', vol: 0.08, delay: 0.07 }); }
      else if (kind === 'nitro') { noise(0.25, 0.25, 3000); tone(300, 0.25, { type: 'sawtooth', vol: 0.05, slide: 600 }); }
      else if (kind === 'shield') { tone(520, 0.2, { type: 'triangle', vol: 0.14, slide: 400 }); tone(1040, 0.25, { type: 'sine', vol: 0.08, delay: 0.08 }); }
      else if (kind === 'jammer') { [1200, 900, 1200, 900].forEach((f, i) => tone(f, 0.08, { type: 'square', vol: 0.05, delay: i * 0.07 })); }
      else { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.12, delay: i * 0.05 })); }
    },
    shieldPop() { tone(880, 0.15, { type: 'triangle', vol: 0.15, slide: -500 }); noise(0.15, 0.25, 4000); },
    contract() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.16, delay: i * 0.09 })); },
    rush() { [440, 554, 659, 880].forEach((f, i) => tone(f, 0.16, { type: 'sawtooth', vol: 0.06, delay: i * 0.1 })); },
  };
})();
