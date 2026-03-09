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

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
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

  function playNoise(startTime, duration, gain, highpass) {
    if (gain === undefined) gain = 0.2;
    if (highpass === undefined) highpass = 200;
    const c = getCtx();
    const bufSize = Math.ceil(c.sampleRate * duration);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
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
    const now = c.currentTime;
    // Rapid dice rattle — 8 impacts over 600ms, fading out
    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.072 + Math.random() * 0.02;
      const fadeGain = 0.22 - i * 0.015;
      playNoise(t, 0.045, fadeGain, 350 + Math.random() * 700);
      playTone(130 + Math.random() * 280, 'square', t, 0.03, 0.1);
    }
    // Final clunk settling
    playNoise(now + 0.62, 0.09, 0.28, 180);
    playTone(110, 'sine', now + 0.62, 0.14, 0.18, 75);
  }

  function moveStep() {
    if (muted) return;
    const c = getCtx();
    const now = c.currentTime;
    playTone(600, 'sine', now, 0.08, 0.15, 700);
  }

  function landSnake() {
    if (muted) return;
    const c = getCtx();
    const now = c.currentTime;
    // Loud hiss burst
    playNoise(now, 0.25, 0.35, 4000);
    playNoise(now + 0.2, 0.25, 0.28, 3000);
    playNoise(now + 0.4, 0.3, 0.2, 2000);
    // Descending slide
    playTone(350, 'sawtooth', now, 0.4, 0.25, 120);
    playTone(180, 'sine', now + 0.2, 0.35, 0.15, 80);
    playTone(80, 'sine', now + 0.4, 0.25, 0.1, 40);
  }

  function landLadder() {
    if (muted) return;
    const c = getCtx();
    const now = c.currentTime;
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
    const now = c.currentTime;
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
    const now = c.currentTime;
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
    const c = getCtx();
    playTone(440, 'sine', c.currentTime, 0.08, 0.2, 550);
  }

  // ---- Themed player sounds ----

  function playThemedSound(theme, soundId) {
    if (muted) return;
    const c = getCtx();
    const now = c.currentTime;

    const defs = {
      // Jungle
      lion: () => playTone(80, 'sawtooth', now, 0.5, 0.3, 60),
      elephant: () => playTone(500, 'triangle', now, 0.4, 0.25, 150),
      monkey: () => {
        [400, 600, 800].forEach((f, i) => playTone(f, 'sine', now + i * 0.09, 0.08, 0.25));
      },
      parrot: () => playTone(1200, 'square', now, 0.15, 0.2, 900),
      frog_j: () => playTone(200, 'sine', now, 0.1, 0.25),

      // Space
      laser: () => playTone(2000, 'square', now, 0.2, 0.25, 100),
      rocket_s: () => {
        playNoise(now, 0.3, 0.2, 200);
        playTone(200, 'sine', now, 0.3, 0.2, 800);
      },
      alien: () => {
        const osc = c.createOscillator();
        const g = c.createGain();
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.value = 8;
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.frequency.value = 400;
        osc.type = 'sine';
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(g);
        g.connect(c.destination);
        lfo.start(now); osc.start(now);
        lfo.stop(now + 0.41); osc.stop(now + 0.41);
      },
      warp: () => {
        playTone(100, 'sine', now, 0.5, 0.15);
        playTone(400, 'sine', now, 0.5, 0.15, 2000);
      },
      computer: () => {
        [880, 660, 440].forEach((f, i) => playTone(f, 'square', now + i * 0.07, 0.06, 0.2));
      },

      // Ocean
      whale: () => playTone(300, 'sine', now, 1.0, 0.2, 80),
      dolphin: () => {
        for (let i = 0; i < 5; i++) {
          playTone(2000 + Math.random() * 1000, 'sine', now + i * 0.05, 0.04, 0.2);
        }
      },
      splash: () => playNoise(now, 0.2, 0.25, 200),
      bubble: () => {
        [400, 600, 800].forEach((f, i) => playTone(f, 'sine', now + i * 0.08, 0.07, 0.2, f * 1.5));
      },
      sonar: () => playTone(1000, 'sine', now, 0.6, 0.2),

      // Fantasy
      magic: () => {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
          playTone(f, 'triangle', now + i * 0.07, 0.15, 0.2)
        );
      },
      dragon: () => {
        playTone(100, 'sawtooth', now, 0.6, 0.25);
        playNoise(now, 0.6, 0.15, 80);
      },
      fairy: () => {
        [2093, 2349, 2637].forEach((f, i) => playTone(f, 'sine', now + i * 0.11, 0.1, 0.18));
      },
      horn: () => {
        [440, 494, 523].forEach((f, i) => playTone(f, 'triangle', now + i * 0.2, 0.2, 0.25));
      },
      crystal: () => playTone(1047, 'sine', now, 0.8, 0.2),

      // Cartoon
      boing: () => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        osc.frequency.linearRampToValueAtTime(300, now + 0.4);
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now); osc.stop(now + 0.41);
      },
      pop_c: () => {
        playNoise(now, 0.03, 0.3, 500);
        playTone(880, 'sine', now + 0.03, 0.1, 0.25, 200);
      },
      honk: () => playTone(300, 'sawtooth', now, 0.2, 0.25, 200),
      spring: () => {
        [200, 300, 400, 500, 600].forEach((f, i) => playTone(f, 'square', now + i * 0.05, 0.05, 0.2));
      },
      zap: () => {
        playTone(2000, 'square', now, 0.15, 0.25, 200);
        playNoise(now + 0.1, 0.08, 0.15, 500);
      },
    };

    if (defs[soundId]) defs[soundId]();
    else playerMove(soundId);
  }

  // ---- Background Music ----

  const MUSIC_PATTERNS = {
    jungle: {
      notes: [261, 293, 329, 261, 220, 261, 293, 220],
      tempo: 0.55,
      type: 'triangle',
      gain: 0.055,
    },
    space: {
      notes: [196, 0, 220, 0, 196, 0, 175, 0, 220, 0, 246, 0],
      tempo: 0.7,
      type: 'sine',
      gain: 0.05,
    },
    ocean: {
      notes: [293, 329, 349, 392, 440, 392, 349, 329],
      tempo: 0.42,
      type: 'sine',
      gain: 0.055,
    },
    fantasy: {
      notes: [523, 659, 784, 880, 784, 659, 523, 440],
      tempo: 0.38,
      type: 'triangle',
      gain: 0.055,
    },
    cartoon: {
      notes: [523, 659, 784, 880, 784, 659, 784, 523],
      tempo: 0.25,
      type: 'triangle',
      gain: 0.06,
    },
  };

  let musicTimer = null;
  let musicPattern = null;
  let musicStep = 0;

  function startMusic(theme) {
    stopMusic();
    if (musicMuted) return;
    musicPattern = MUSIC_PATTERNS[theme] || MUSIC_PATTERNS.cartoon;
    musicStep = 0;
    playMusicStep();
  }

  function playMusicStep() {
    if (!musicPattern || musicMuted) return;
    const c = getCtx();
    const note = musicPattern.notes[musicStep % musicPattern.notes.length];
    const gain = musicPattern.gain || 0.06;
    if (note > 0) {
      playTone(note, musicPattern.type, c.currentTime, musicPattern.tempo * 0.8, gain);
    }
    musicStep++;
    musicTimer = setTimeout(playMusicStep, musicPattern.tempo * 1000);
  }

  function stopMusic() {
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    musicPattern = null;
  }

  // Toggle ALL sound (SFX + music) with one button
  function toggleMute() {
    muted = !muted;
    musicMuted = muted;
    if (muted) stopMusic();
    return muted;
  }

  function toggleMusic() {
    musicMuted = !musicMuted;
    if (musicMuted) stopMusic();
    return musicMuted;
  }

  function setMuted(val) {
    muted = val;
    if (muted) stopMusic();
  }

  function isMuted() { return muted; }
  function isMusicMuted() { return musicMuted; }

  return {
    rollDice, moveStep, landSnake, landLadder, win, playerMove, button,
    playThemedSound,
    startMusic, stopMusic, toggleMute, toggleMusic,
    setMuted, isMuted, isMusicMuted,
  };
})();
