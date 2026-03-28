/* ============================================================
   SOUNDS — Web Audio API synthesizer
   All sounds generated programmatically — no audio files needed
   ============================================================ */

const Sounds = (() => {
  let ctx = null;
  let musicOscillators = [];
  let musicGain = null;
  let muted = false;
  let musicMuted = false;

  let _resumePromise = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended' && !_resumePromise) {
      _resumePromise = ctx.resume().then(() => { _resumePromise = null; }).catch(() => { _resumePromise = null; });
    }
    return ctx;
  }

  // Returns a safe scheduling base time, adding extra buffer if context just resumed
  function _baseTime() {
    const c = getCtx();
    return c.currentTime + (_resumePromise ? 0.12 : 0.005);
  }

  function playTone(freq, type, startTime, duration, gain, pitchEnd) {
    if (gain === undefined) gain = 0.3;
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (pitchEnd) osc.frequency.exponentialRampToValueAtTime(pitchEnd, startTime + duration);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  // Reusable white-noise buffer — allocated once at max needed duration (0.5s).
  // Each caller trims playback via gain envelope; the long buffer tail fades to silence.
  let _noiseBuf = null;
  function _getNoiseBuf() {
    const c = getCtx();
    if (_noiseBuf && _noiseBuf.sampleRate === c.sampleRate) return _noiseBuf;
    const len = Math.ceil(c.sampleRate * 0.5);
    _noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = _noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return _noiseBuf;
  }

  function playNoise(startTime, duration, gain, highpass) {
    if (gain === undefined) gain = 0.2;
    if (highpass === undefined) highpass = 200;
    const c = getCtx();
    const src = c.createBufferSource();
    src.buffer = _getNoiseBuf();
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  // ---- Sound effects ----

  function rollDice() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    // Rapid dice rattle — 8 impacts over 600ms, fading out
    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.072 + Math.random() * 0.02;
      const fadeGain = 0.22 - i * 0.015;
      playNoise(t, 0.045, fadeGain, 350 + Math.random() * 700);
      playTone(130 + Math.random() * 280, 'square', t, 0.03, 0.1);
    }
    // Final clunk settling — punchy thud + crisp high click
    playNoise(now + 0.62, 0.09, 0.38, 180);
    playTone(110, 'sine', now + 0.62, 0.14, 0.28, 72);
    playNoise(now + 0.62, 0.014, 0.20, 4800);
  }

  function moveStep() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    playTone(600, 'sine', now, 0.08, 0.15, 700);
  }

  function landSnake() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    // Loud hiss burst
    playNoise(now, 0.25, 0.35, 4000);
    playNoise(now + 0.2, 0.25, 0.28, 3000);
    playNoise(now + 0.4, 0.3, 0.2, 2000);
    // Descending slide
    playTone(350, 'sawtooth', now, 0.4, 0.25, 120);
    playTone(180, 'sine', now + 0.2, 0.35, 0.15, 80);
    playTone(80, 'sine', now + 0.4, 0.25, 0.1, 40);
  }

  function landBounce() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    // Thud impact at the wall
    playNoise(now, 0.07, 0.4, 100);
    playTone(180, 'sine', now, 0.09, 0.28, 90);
    // Spring bounce-back: ascending chirp
    playTone(260, 'triangle', now + 0.10, 0.22, 0.20, 520);
    playTone(520, 'triangle', now + 0.24, 0.18, 0.14, 320);
    // Sad descending slide to reinforce "nope, not yet"
    playTone(500, 'sine', now + 0.42, 0.30, 0.18, 220);
  }

  function landLadder() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    // Ascending arpeggio timed to fit 600ms animation
    const notes = [261, 329, 392, 523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone(freq, 'triangle', now + i * 0.065, 0.18, 0.28);
    });
    // Sparkle chime at peak
    playTone(1568, 'sine', now + 0.45, 0.2, 0.22, 2000);
    playTone(2093, 'sine', now + 0.52, 0.15, 0.15);
  }

  function win() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    // Victory fanfare melody
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    const times  = [0,   0.12,0.24,0.40, 0.55,0.68, 0.82];
    melody.forEach((freq, i) => {
      playTone(freq, 'triangle', now + times[i], 0.22, 0.35);
      playTone(freq * 0.5, 'sine', now + times[i], 0.22, 0.18);
    });
    // Crowd cheer noise swell
    playNoise(now + 0.3, 0.9, 0.18, 400);
    playNoise(now + 0.55, 0.7, 0.14, 300);
    // Punchy drum hits
    playNoise(now, 0.1, 0.38, 80);
    playNoise(now + 0.4, 0.1, 0.32, 80);
    playNoise(now + 0.82, 0.18, 0.4, 80);
  }

  function playerMove(soundId) {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    const sounds = {
      boop:   () => playTone(660, 'sine', now, 0.12, 0.3),
      pop:    () => { playTone(880, 'triangle', now, 0.05, 0.4, 440); playNoise(now, 0.05, 0.15, 2000); },
      ding:   () => { playTone(1047, 'sine', now, 0.3, 0.25); playTone(1319, 'sine', now + 0.02, 0.25, 0.1); },
      beep:   () => playTone(440, 'square', now, 0.1, 0.2),
      squeak: () => { playTone(800, 'sawtooth', now, 0.15, 0.15, 1200); playNoise(now, 0.08, 0.08, 1500); },
      chord:  () => { playTone(523, 'triangle', now, 0.2, 0.15); playTone(659, 'triangle', now, 0.2, 0.12); playTone(784, 'triangle', now, 0.2, 0.1); },
    };
    (sounds[soundId] || sounds.boop)();
  }

  function button() {
    if (muted) return;
    getCtx();
    playTone(440, 'sine', _baseTime(), 0.08, 0.2, 550);
  }

  // L5: ascending chime when a player enters "almost there" zone
  function almostThere() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    // Three rising notes: E5 → G5 → C6 — bright and exciting
    playTone(659, 'triangle', now,        0.18, 0.22);
    playTone(784, 'triangle', now + 0.14, 0.18, 0.26);
    playTone(1047,'triangle', now + 0.28, 0.30, 0.30);
    // Sparkle shimmer on top
    playNoise(now + 0.28, 0.12, 0.06, 6000);
  }

  // L7: short error buzz for invalid designer placement
  function errorBuzz() {
    if (muted) return;
    const c = getCtx();
    const now = _baseTime();
    playNoise(now, 0.04, 0.18, 90);
    playTone(110, 'sawtooth', now, 0.04, 0.15, 80);
  }

  // ---- Themed player sounds ----

  let _lastThemedSoundAt = 0;
  function playThemedSound(theme, soundId) {
    if (muted) return;
    // L12: debounce rapid character tapping — ignore if < 350ms since last sound
    const perfNow = performance.now();
    if (perfNow - _lastThemedSoundAt < 350) return;
    _lastThemedSoundAt = perfNow;
    const c = getCtx();
    const now = _baseTime();

    const defs = {
      // ---- JUNGLE ----
      lion: () => {
        // Deep rumbling roar: noise burst + low harmonics descending
        playNoise(now, 0.65, 0.32, 55);
        playNoise(now + 0.08, 0.5, 0.25, 110);
        playTone(75, 'sawtooth', now, 0.6, 0.35, 45);
        playTone(150, 'sawtooth', now, 0.5, 0.18, 70);
        playTone(38, 'sine', now + 0.25, 0.45, 0.22, 28);
      },
      elephant: () => {
        // Classic trumpet: starts low, sweeps UP fast
        playTone(270, 'sawtooth', now, 0.55, 0.38, 900);
        playTone(135, 'triangle', now, 0.55, 0.18, 450);
        playNoise(now + 0.08, 0.3, 0.1, 700);
      },
      monkey: () => {
        // "Ooh ooh aah aah" chattering sequence
        [320, 480, 640, 480, 320, 520, 720, 520, 380].forEach((f, i) =>
          playTone(f, 'triangle', now + i * 0.062, 0.055, 0.22)
        );
        playNoise(now, 0.55, 0.04, 900);
      },
      parrot: () => {
        // Loud squawk — two sharp raspy bursts
        playTone(880, 'square', now, 0.07, 0.28, 680);
        playNoise(now, 0.08, 0.12, 1400);
        playTone(1250, 'square', now + 0.1, 0.07, 0.22, 950);
        playTone(820, 'sawtooth', now + 0.19, 0.1, 0.2, 1150);
        playNoise(now + 0.1, 0.15, 0.08, 1600);
      },
      frog_j: () => {
        // Ribbit croak: two-phase low trill
        playTone(155, 'sine', now, 0.05, 0.3, 105);
        playTone(195, 'sine', now + 0.07, 0.06, 0.28, 135);
        playTone(155, 'sine', now + 0.15, 0.09, 0.3, 95);
        playNoise(now, 0.22, 0.07, 280);
      },
      croc: () => {
        // Jaw snap: sharp crack + low thud resonance
        playNoise(now, 0.025, 0.5, 120);
        playTone(95, 'sine', now, 0.09, 0.32, 45);
        playNoise(now + 0.025, 0.08, 0.18, 380);
      },

      // ---- SPACE ----
      laser: () => {
        // Pew! Sharp descending zap
        playTone(2600, 'square', now, 0.14, 0.26, 140);
        playNoise(now, 0.04, 0.14, 4500);
      },
      rocket_s: () => {
        // Ignition whoosh + sustained thrust
        playNoise(now, 0.55, 0.3, 70);
        playTone(110, 'sawtooth', now, 0.5, 0.22, 240);
        playTone(55, 'sine', now, 0.55, 0.15, 95);
      },
      alien: () => {
        // Wobbling transmission
        const osc = c.createOscillator();
        const g = c.createGain();
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.value = 10;
        lfoGain.gain.value = 70;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.frequency.value = 380;
        osc.type = 'sine';
        g.gain.setValueAtTime(0.28, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(g);
        g.connect(c.destination);
        lfo.start(now); osc.start(now);
        lfo.stop(now + 0.46); osc.stop(now + 0.46);
      },
      warp: () => {
        // Hyperdrive sweep
        playTone(80, 'sine', now, 0.5, 0.18);
        playTone(320, 'sine', now, 0.5, 0.18, 2400);
        playNoise(now + 0.1, 0.3, 0.08, 600);
      },
      computer: () => {
        // R2D2-style beep-boop sequence
        [1100, 660, 1320, 550, 990, 1210].forEach((f, i) =>
          playTone(f, 'square', now + i * 0.055, 0.045, 0.2)
        );
      },

      // ---- OCEAN ----
      whale: () => {
        // Haunting moan: sweeps up then back down
        playTone(115, 'sine', now, 0.45, 0.24, 330);
        playTone(330, 'sine', now + 0.4, 0.55, 0.22, 155);
        playTone(58, 'sine', now, 0.9, 0.1);
      },
      dolphin: () => {
        // Echolocation clicks then rising whistle
        for (let i = 0; i < 4; i++) {
          playNoise(now + i * 0.032, 0.016, 0.22, 4200);
        }
        playTone(2900, 'sine', now + 0.18, 0.22, 0.16, 3600);
        playTone(3600, 'sine', now + 0.36, 0.18, 0.12, 2600);
      },
      splash: () => {
        playNoise(now, 0.05, 0.38, 150);
        playNoise(now + 0.04, 0.2, 0.2, 300);
      },
      bubble: () => {
        [380, 560, 760, 980].forEach((f, i) =>
          playTone(f, 'sine', now + i * 0.09, 0.065, 0.2, f * 1.6)
        );
      },
      sonar: () => {
        playTone(980, 'sine', now, 0.65, 0.22);
        playTone(1960, 'sine', now + 0.05, 0.2, 0.08);
      },

      // ---- FANTASY ----
      magic: () => {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
          playTone(f, 'triangle', now + i * 0.07, 0.15, 0.2)
        );
      },
      dragon: () => {
        // Roar + fire breath crackle
        playTone(85, 'sawtooth', now, 0.7, 0.3, 55);
        playNoise(now, 0.7, 0.22, 70);
        playNoise(now + 0.12, 0.55, 0.2, 350);
        playTone(190, 'sawtooth', now + 0.08, 0.55, 0.14, 95);
      },
      fairy: () => {
        [2093, 2349, 2637, 3136].forEach((f, i) =>
          playTone(f, 'sine', now + i * 0.1, 0.09, 0.18)
        );
      },
      horn: () => {
        [440, 494, 523, 587].forEach((f, i) =>
          playTone(f, 'triangle', now + i * 0.18, 0.2, 0.25)
        );
      },
      crystal: () => {
        playTone(1047, 'sine', now, 0.9, 0.22);
        playTone(2093, 'sine', now + 0.04, 0.5, 0.1);
      },

      // ---- CARTOON ----
      boing: () => {
        // Classic spring boing
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.linearRampToValueAtTime(820, now + 0.18);
        osc.frequency.linearRampToValueAtTime(280, now + 0.38);
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(g); g.connect(c.destination);
        osc.start(now); osc.stop(now + 0.4);
      },
      roar_c: () => {
        // Cartoon tiger roar — exaggerated short growl
        playNoise(now, 0.25, 0.25, 90);
        playTone(130, 'sawtooth', now, 0.25, 0.3, 80);
        playTone(260, 'sawtooth', now, 0.2, 0.15, 100);
        playNoise(now + 0.1, 0.15, 0.15, 200);
      },
      munch_c: () => {
        // Panda munching bamboo — crunchy chomps
        [0, 0.12, 0.24].forEach(t => {
          playNoise(now + t, 0.04, 0.28, 250);
          playTone(200, 'square', now + t, 0.04, 0.18, 150);
        });
      },
      yip_c: () => {
        // Fox yip — quick high bark
        playTone(900, 'triangle', now, 0.04, 0.28, 600);
        playNoise(now, 0.04, 0.12, 900);
        playTone(700, 'triangle', now + 0.06, 0.06, 0.18, 400);
      },
      squeak_c: () => {
        // Penguin squawk — nasal short burst
        playTone(750, 'square', now, 0.06, 0.22, 550);
        playNoise(now, 0.06, 0.1, 1200);
        playTone(620, 'square', now + 0.07, 0.07, 0.18, 480);
      },
      pop_c: () => {
        playNoise(now, 0.03, 0.3, 500);
        playTone(880, 'sine', now + 0.03, 0.1, 0.25, 200);
      },
      honk: () => {
        playTone(340, 'sawtooth', now, 0.08, 0.25);
        playTone(280, 'sawtooth', now + 0.07, 0.12, 0.22, 240);
        playTone(340, 'sawtooth', now + 0.17, 0.06, 0.18);
      },
      spring: () => {
        [200, 300, 400, 500, 600].forEach((f, i) =>
          playTone(f, 'square', now + i * 0.05, 0.05, 0.2)
        );
      },
      zap: () => {
        playTone(2000, 'square', now, 0.15, 0.25, 200);
        playNoise(now + 0.1, 0.08, 0.15, 500);
      },
    };

    if (defs[soundId]) defs[soundId]();
    else playerMove(soundId);
  }

  // ---- Background Music (lookahead scheduler — multi-voice, per-theme) ----
  //
  // Each theme is a 16-step sequencer at 8th-note resolution with independent
  // tracks: melody, bass, kick drum, hi-hat, optional clap.
  // The scheduler runs every 25ms and schedules notes 120ms ahead using
  // AudioContext.currentTime for sample-accurate, drift-free timing.

  const MUSIC = {
    // ── CARTOON ── bouncy C-major, 138 BPM ──────────────────────────────
    cartoon: {
      bpm: 138, steps: 16,
      tracks: [
        { kind:'tone',  wave:'triangle', gain:0.088, dur:0.86,
          notes:[523,659,784,523,494,392,440,0,  523,587,659,784,880,784,659,0] },
        { kind:'tone',  wave:'square',   gain:0.038, dur:0.38,
          notes:[130,0,196,0,130,0,175,0,          130,0,196,0,220,0,196,0] },
        { kind:'kick',  gain:0.50,
          steps:[1,0,0,0,1,0,0,0,                  1,0,0,0,1,0,0,0] },
        { kind:'hihat', gain:0.028,
          steps:[1,1,1,1,1,1,1,1,                  1,1,1,1,1,1,1,1] },
      ],
    },
    // ── JUNGLE ── D-minor pentatonic, tribal groove, 108 BPM ────────────
    jungle: {
      bpm: 108, steps: 16,
      tracks: [
        { kind:'tone',  wave:'triangle', gain:0.076, dur:0.82,
          notes:[293,0,349,392,440,0,523,440,       587,0,523,440,392,349,293,0] },
        { kind:'tone',  wave:'sine',     gain:0.068, dur:0.50,
          notes:[147,0,0,147,0,110,0,0,             147,0,0,130,0,98,0,0] },
        { kind:'kick',  gain:0.46,
          steps:[1,0,1,0,1,0,0,1,                   1,0,1,0,0,1,0,0] },
        { kind:'clap',  gain:0.20,
          steps:[0,0,0,0,1,0,0,0,                   0,0,0,0,1,0,0,0] },
        { kind:'hihat', gain:0.020,
          steps:[0,1,0,1,0,1,0,1,                   0,1,0,1,0,1,0,1] },
      ],
    },
    // ── SPACE ── D-minor, floaty pads + sparse melody, 76 BPM ───────────
    space: {
      bpm: 76, steps: 16,
      tracks: [
        { kind:'tone',  wave:'sine', gain:0.068, dur:0.88,
          notes:[293,0,0,0,440,0,0,0,               349,0,0,0,392,0,440,0] },
        { kind:'tone',  wave:'sine', gain:0.052, dur:0.75,
          notes:[147,0,0,0,110,0,0,0,               175,0,0,0,130,0,0,0] },
        // Long pad notes (dur > 1 step = legato chord tones)
        { kind:'tone',  wave:'sine', gain:0.024, dur:3.2,
          notes:[220,0,0,0,165,0,0,0,               175,0,0,0,196,0,0,0] },
        { kind:'hihat', gain:0.015,
          steps:[0,0,1,0,0,0,1,0,                   0,0,1,0,0,0,0,1] },
      ],
    },
    // ── OCEAN ── flowing C-major arpeggios, 104 BPM ──────────────────────
    ocean: {
      bpm: 104, steps: 16,
      tracks: [
        { kind:'tone',  wave:'sine', gain:0.076, dur:0.88,
          notes:[261,329,392,440,392,329,349,440,    523,440,392,329,293,349,329,261] },
        { kind:'tone',  wave:'sine', gain:0.056, dur:0.52,
          notes:[130,0,0,196,0,0,175,0,             0,130,0,0,196,0,0,0] },
        { kind:'kick',  gain:0.30,
          steps:[1,0,0,0,1,0,0,0,                   1,0,0,0,1,0,0,0] },
        { kind:'hihat', gain:0.017,
          steps:[0,0,1,0,0,0,1,0,                   0,0,1,0,0,0,1,0] },
      ],
    },
    // ── FANTASY ── C-major harp arpeggios, magical, 122 BPM ─────────────
    fantasy: {
      bpm: 122, steps: 16,
      tracks: [
        { kind:'tone',  wave:'triangle', gain:0.082, dur:0.85,
          notes:[523,392,659,784,659,494,392,440,    523,659,784,880,784,659,587,523] },
        { kind:'tone',  wave:'triangle', gain:0.042, dur:0.52,
          notes:[130,0,196,0,130,0,175,0,            130,0,165,0,196,0,220,0] },
        { kind:'hihat', gain:0.018,
          steps:[1,0,1,0,1,0,1,0,                   1,0,1,0,1,0,1,0] },
        { kind:'kick',  gain:0.26,
          steps:[0,0,0,0,1,0,0,0,                   0,0,0,0,1,0,0,0] },
      ],
    },
  };

  // ── Scheduler state ─────────────────────────────────────────────────────
  const _LOOKAHEAD = 0.12;   // schedule 120ms ahead (seconds)
  const _TICK_MS   = 25;     // scheduler interval (ms)
  let _sched       = null;   // setTimeout handle
  let _stepTime    = 0;      // AudioContext time of next scheduled step
  let _stepIdx     = 0;      // index into the 16-step pattern
  let _stepDur     = 0;      // duration of one 8th-note step (seconds)
  let _activeTheme = null;   // theme key currently playing
  let _hihatBuf    = null;   // reusable white-noise buffer for hi-hat
  let _clapBuf     = null;   // reusable noise buffer for clap

  // ── Percussion synthesis ─────────────────────────────────────────────────
  function _playKick(time, gain) {
    const c = getCtx();
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.11);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.start(time); osc.stop(time + 0.20);
  }

  function _playHihat(time, gain) {
    const c = getCtx();
    // Create/reuse the noise buffer
    if (!_hihatBuf) {
      const len = Math.floor(c.sampleRate * 0.06);
      _hihatBuf = c.createBuffer(1, len, c.sampleRate);
      const d = _hihatBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src    = c.createBufferSource();
    src.buffer   = _hihatBuf;
    const filter = c.createBiquadFilter();
    filter.type  = 'highpass';
    filter.frequency.value = 9000;
    const g = c.createGain();
    src.connect(filter); filter.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    src.start(time); src.stop(time + 0.06);
  }

  function _playClap(time, gain) {
    const c = getCtx();
    if (!_clapBuf) {
      const len = Math.floor(c.sampleRate * 0.08);
      _clapBuf = c.createBuffer(1, len, c.sampleRate);
      const d = _clapBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const src    = c.createBufferSource();
    src.buffer   = _clapBuf;
    const filter = c.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
    const g = c.createGain();
    src.connect(filter); filter.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    src.start(time); src.stop(time + 0.10);
  }

  // ── Tonal note with attack/sustain/release envelope ─────────────────────
  function _playMusicNote(freq, wave, time, dur, gain) {
    const c   = getCtx();
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = wave;
    osc.frequency.value = freq;
    const atk = Math.min(0.012, dur * 0.1);
    const rel = dur * 0.28;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + atk);
    g.gain.setValueAtTime(gain, time + dur - rel);
    g.gain.linearRampToValueAtTime(0, time + dur);
    osc.start(time); osc.stop(time + dur + 0.01);
  }

  // ── Core scheduler ───────────────────────────────────────────────────────
  function _scheduleStep(theme, idx, time) {
    for (const tr of theme.tracks) {
      if (tr.kind === 'tone') {
        const note = tr.notes[idx];
        if (note > 0) _playMusicNote(note, tr.wave, time, _stepDur * tr.dur, tr.gain);
      } else if (tr.kind === 'kick')  { if (tr.steps[idx]) _playKick(time, tr.gain); }
        else if (tr.kind === 'hihat') { if (tr.steps[idx]) _playHihat(time, tr.gain); }
        else if (tr.kind === 'clap')  { if (tr.steps[idx]) _playClap(time, tr.gain); }
    }
  }

  function _musicTick() {
    if (!_activeTheme || musicMuted) return;
    const c     = getCtx();
    const theme = MUSIC[_activeTheme];
    while (_stepTime < c.currentTime + _LOOKAHEAD) {
      _scheduleStep(theme, _stepIdx, _stepTime);
      _stepIdx  = (_stepIdx + 1) % theme.steps;
      _stepTime += _stepDur;
    }
    _sched = setTimeout(_musicTick, _TICK_MS);
  }

  // ── Public music controls ────────────────────────────────────────────────
  function startMusic(theme) {
    stopMusic();
    _activeTheme = theme || 'cartoon';
    if (musicMuted) return;
    const td  = MUSIC[_activeTheme] || MUSIC.cartoon;
    _stepDur  = 60 / td.bpm / 2;            // one 8th note in seconds
    _stepIdx  = 0;
    _stepTime = _baseTime() + 0.05; // start 50ms+ from now
    _musicTick();
  }

  // Restart the last-playing theme — called on app foreground resume.
  function resumeMusic() {
    if (_activeTheme && !musicMuted) startMusic(_activeTheme);
  }

  function stopMusic() {
    if (_sched) { clearTimeout(_sched); _sched = null; }
  }

  // Toggle ALL sound (SFX + music) with one button
  function toggleMute() {
    muted = !muted;
    musicMuted = muted;
    if (muted) stopMusic();
    else if (_activeTheme) startMusic(_activeTheme);
    return muted;
  }

  // Toggle SFX only — music unaffected
  function toggleSfx() {
    // L4: play a confirm click while still unmuted so there's audio feedback
    if (!muted) button();
    muted = !muted;
    return muted;
  }

  // Toggle music only — SFX unaffected
  function toggleMusic() {
    musicMuted = !musicMuted;
    if (musicMuted) stopMusic();
    else if (_activeTheme) startMusic(_activeTheme);
    return musicMuted;
  }

  function setMuted(val) {
    muted = val;
    if (muted) stopMusic();
  }

  function isMuted() { return muted; }
  function isMusicMuted() { return musicMuted; }

  // Pause music on backgrounding, resume when app returns to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (ctx && ctx.state === 'running') ctx.suspend();
    } else {
      if (ctx && ctx.state === 'suspended' && !musicMuted) ctx.resume();
    }
  });

  return {
    rollDice, moveStep, landSnake, landBounce, landLadder, win, playerMove, button, errorBuzz, almostThere,
    playThemedSound,
    startMusic, stopMusic, resumeMusic, toggleMute, toggleSfx, toggleMusic,
    setMuted, isMuted, isMusicMuted,
  };
})();
