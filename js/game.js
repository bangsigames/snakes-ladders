/* ============================================================
   GAME — Game state, logic, dice, animations
   ============================================================ */

const Game = (() => {

  let state = null;
  let animating = false;
  let shakeTimeout = null;
  let lastShake = 0;
  let currentTheme = 'cartoon';

  // ---- State ----

  function init(boardConfig, players) {
    currentTheme = boardConfig.theme || 'cartoon';
    state = {
      board: boardConfig,
      players: players.map((p, i) => ({
        ...p,
        id: i,
        position: 0,     // 0 = waiting to enter
        turns: 0,
        snakeBites: 0,
        laddersClimbed: 0,
        finished: false,
        finishTurn: null,
        isBot: p.isBot || false,
      })),
      currentIndex: 0,
      turn: 1,
      phase: 'rolling', // 'rolling' | 'animating' | 'event' | 'done'
      diceValue: null,
      winner: null,
      rankings: [],
    };

    Board.initGameCanvas(
      document.getElementById('game-canvas'),
      boardConfig,
      state.players
    );

    // Initialize dice display
    const initFace = document.querySelector('.dice-face');
    if (initFace) renderDiceFace(initFace, 6);

    Sounds.startMusic(boardConfig.theme);
    setupShakeDetection();
    updateGameUI();

    // If first player is a bot (shouldn't happen, but handle gracefully)
    scheduleBotTurn();
  }

  function getState() { return state; }

  // ---- Bot scheduling ----

  function scheduleBotTurn() {
    if (!state) return;
    const player = state.players[state.currentIndex];
    if (player && player.isBot && state.phase === 'rolling') {
      setTimeout(() => {
        if (state && state.players[state.currentIndex].isBot && state.phase === 'rolling') {
          rollDice();
        }
      }, 1200 + Math.random() * 600);
    }
  }

  // ---- Dice ----

  function rollDice() {
    if (!state || state.phase !== 'rolling' || animating) return;

    const value = randomInt(1, 6);
    state.diceValue = value;
    state.phase = 'animating';
    animating = true;

    Sounds.rollDice();
    animateDice(value, () => {
      showDiceResult(value, () => {
        moveCurrentPlayer(value);
      });
    });
  }

  function animateDice(value, cb) {
    const dice = document.getElementById('dice');
    renderDiceFace(document.querySelector('.dice-face'), value);
    dice.classList.add('rolling');
    setTimeout(() => {
      dice.classList.remove('rolling');
      if (cb) cb();
    }, 800);
  }

  function renderDiceFace(el, value) {
    if (!el) return;
    const patterns = DICE_DOT_PATTERNS[value] || [];
    el.innerHTML = '';
    el.style.display = 'grid';
    el.style.gridTemplateColumns = 'repeat(3, 1fr)';
    el.style.gridTemplateRows = 'repeat(3, 1fr)';
    el.style.padding = '6px';
    el.style.gap = '2px';

    // Create 3x3 grid
    const grid = Array(9).fill(false);
    for (const [r, c] of patterns) {
      grid[r * 3 + c] = true;
    }
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      if (grid[i]) {
        cell.className = 'dice-dot';
      }
      el.appendChild(cell);
    }
  }

  function showDiceResult(value, cb) {
    const overlay  = document.getElementById('dice-overlay');
    const diceEl   = document.getElementById('dice-big');
    const textEl   = document.getElementById('dice-result-text');
    const avatarEl = document.getElementById('dice-result-avatar');
    const faces    = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    const player   = state.players[state.currentIndex];

    diceEl.textContent = faces[value - 1];
    textEl.textContent = `${player.name} rolled ${value}!`;

    if (avatarEl) {
      avatarEl.textContent = player.character;
      avatarEl.style.background = player.color + '44';
      avatarEl.style.border = `2px solid ${player.color}`;
    }

    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('hidden');
      if (cb) cb();
    }, 900);
  }

  // ---- Board zoom helpers ----

  function zoomBoard(targetPos) {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const board = state.board;
    const pos = (targetPos > 0) ? targetPos : Math.ceil(board.total / 2);
    const cell = getCellRect(pos, board.cols, board.rows, canvas.width, canvas.height);
    const pctX = (cell.cx / canvas.width  * 100).toFixed(1);
    const pctY = (cell.cy / canvas.height * 100).toFixed(1);
    canvas.style.transformOrigin = `${pctX}% ${pctY}%`;
    canvas.style.transform = 'scale(1.08)';
  }

  function unzoomBoard(cb) {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) { if (cb) cb(); return; }
    canvas.style.transform = '';
    if (!cb) return;
    let done = false;
    const finish = () => { if (!done) { done = true; cb(); } };
    canvas.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 400); // fallback in case transitionend doesn't fire
  }

  // ---- Movement ----

  function moveCurrentPlayer(steps) {
    const player = state.players[state.currentIndex];
    const total = state.board.total;

    let oldPos = player.position;
    let newPos = oldPos === 0 ? steps : oldPos + steps;

    // Can't go past the end
    if (newPos > total) {
      const over = newPos - total;
      newPos = total - over;
    }

    // Zoom board toward the player's current token position
    zoomBoard(oldPos > 0 ? oldPos : newPos);

    // Animate movement step by step
    animateMove(player, oldPos, newPos, () => {
      player.position = newPos;
      player.turns++;
      state.turn++;

      Sounds.playThemedSound(currentTheme, player.sound);

      // Check for win first
      if (newPos === total) {
        player.finished = true;
        player.finishTurn = state.turn;
        state.rankings.push(player);
        unzoomBoard(null); // zoom out; don't delay win screen
        if (allPlayersFinished() || state.rankings.length === 1) {
          endGame();
          return;
        }
        nextTurn();
        return;
      }

      // Check snakes
      const snake = state.board.snakes.find(s => s.head === newPos);
      if (snake) {
        Sounds.landSnake();
        // Animate along snake bezier (stay zoomed), then zoom out → event card
        animateAlongSnake(player, snake, () => {
          player.position = snake.tail;
          player.snakeBites++;
          state.turn++;
          Board.redrawGame(state.board, state.players, null);
          updateGameUI();
          unzoomBoard(() => {
            showEventBrief('snake', player, snake, () => {
              nextTurn();
            });
          });
        });
        return;
      }

      // Check ladders
      const ladder = state.board.ladders.find(l => l.bottom === newPos);
      if (ladder) {
        Sounds.landLadder();
        // Animate along ladder (stay zoomed), then zoom out → event card
        animateAlongLadder(player, ladder, () => {
          player.position = ladder.top;
          player.laddersClimbed++;
          state.turn++;
          Board.redrawGame(state.board, state.players, null);
          updateGameUI();
          unzoomBoard(() => {
            showEventBrief('ladder', player, ladder, () => {
              nextTurn();
            });
          });
        });
        return;
      }

      Board.redrawGame(state.board, state.players, null);
      updateGameUI();
      unzoomBoard(nextTurn);
    });
  }

  function animateMove(player, fromPos, toPos, onDone) {
    const board = state.board;
    const total = board.total;

    // Build path of cells to traverse
    const path = [];
    if (fromPos === 0) {
      path.push(toPos);
    } else {
      for (let i = fromPos + 1; i <= toPos; i++) path.push(i);
      // Bounce case
      if (toPos < fromPos) {
        for (let i = fromPos + 1; i <= total; i++) path.push(i);
        for (let i = total - 1; i >= toPos; i--) path.push(i);
      }
    }

    if (path.length === 0) { onDone(); return; }

    let step = 0;
    const STEP_DURATION = 120; // ms per cell

    function doStep() {
      if (step >= path.length) {
        player.position = toPos;
        Board.redrawGame(board, state.players, null);
        animating = false;
        onDone();
        return;
      }
      player.position = path[step];
      Board.redrawGame(board, state.players, null);
      updatePlayersStatus();
      if (step < path.length - 1) Sounds.moveStep();
      step++;
      setTimeout(doStep, STEP_DURATION);
    }
    doStep();
  }

  // Animate player token sliding along snake bezier (head → tail)
  function animateAlongSnake(player, snake, onDone) {
    const canvas = document.getElementById('game-canvas');
    const board = state.board;
    const w = canvas.width, h = canvas.height;
    const bp = Board.getSnakeBezierPath(snake.head, snake.tail, board.cols, board.rows, w, h);

    const DURATION = 700; // ms
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      const animState = {
        playerId: player.id,
        bezierPath: bp,
        progress: progress,
      };

      Board.redrawGame(board, state.players, animState);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        animating = false;
        onDone();
      }
    }

    requestAnimationFrame(frame);
  }

  // Animate player token climbing up ladder
  function animateAlongLadder(player, ladder, onDone) {
    const canvas = document.getElementById('game-canvas');
    const board = state.board;
    const w = canvas.width, h = canvas.height;
    const bp = Board.getLadderBezierPath(ladder.bottom, ladder.top, board.cols, board.rows, w, h);

    const DURATION = 600; // ms
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      const animState = {
        playerId: player.id,
        bezierPath: bp,
        progress: progress,
      };

      Board.redrawGame(board, state.players, animState);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        animating = false;
        onDone();
      }
    }

    requestAnimationFrame(frame);
  }

  // Show event briefly (1s auto-dismiss) after animation
  function showEventBrief(type, player, data, cb) {
    const overlay = document.getElementById('event-overlay');
    const card = document.getElementById('event-card');
    const emoji = document.getElementById('event-emoji');
    const title = document.getElementById('event-title');
    const desc = document.getElementById('event-desc');
    const confettiCanvas = document.getElementById('event-confetti-canvas');

    // Reset classes
    overlay.classList.remove('snake-event', 'ladder-event');
    card.classList.remove('snake-card', 'ladder-card');

    if (type === 'snake') {
      emoji.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 88 Q14 60 28 44 Q44 28 42 12" fill="none" stroke="#1e6b2a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20 88 Q14 60 28 44 Q44 28 42 12" fill="none" stroke="#4CD964" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="45" cy="9" r="13" fill="#1e6b2a"/>
        <circle cx="45" cy="8" r="12" fill="#4CD964"/>
        <circle cx="40" cy="5" r="4" fill="white"/><circle cx="50" cy="5" r="4" fill="white"/>
        <circle cx="41" cy="5.5" r="2.2" fill="#111"/><circle cx="51" cy="5.5" r="2.2" fill="#111"/>
        <line x1="45" y1="19" x2="45" y2="28" stroke="#FF4444" stroke-width="3" stroke-linecap="round"/>
        <line x1="45" y1="28" x2="39" y2="36" stroke="#FF4444" stroke-width="3" stroke-linecap="round"/>
        <line x1="45" y1="28" x2="51" y2="36" stroke="#FF4444" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
      title.textContent = 'Oh no!';
      desc.textContent = `${player.name} hit a snake!`;
      overlay.classList.add('snake-event');
      card.classList.add('snake-card');
      Particles.stop();
    } else {
      emoji.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <line x1="22" y1="6" x2="22" y2="94" stroke="#8d4e00" stroke-width="10" stroke-linecap="round"/>
        <line x1="78" y1="6" x2="78" y2="94" stroke="#8d4e00" stroke-width="10" stroke-linecap="round"/>
        <line x1="22" y1="6"  x2="22" y2="94" stroke="#FFB700" stroke-width="7" stroke-linecap="round"/>
        <line x1="78" y1="6"  x2="78" y2="94" stroke="#FFB700" stroke-width="7" stroke-linecap="round"/>
        <line x1="22" y1="22" x2="78" y2="22" stroke="#8d4e00" stroke-width="9" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="78" y2="42" stroke="#8d4e00" stroke-width="9" stroke-linecap="round"/>
        <line x1="22" y1="62" x2="78" y2="62" stroke="#8d4e00" stroke-width="9" stroke-linecap="round"/>
        <line x1="22" y1="82" x2="78" y2="82" stroke="#8d4e00" stroke-width="9" stroke-linecap="round"/>
        <line x1="22" y1="22" x2="78" y2="22" stroke="#FFE066" stroke-width="6" stroke-linecap="round"/>
        <line x1="22" y1="42" x2="78" y2="42" stroke="#FFE066" stroke-width="6" stroke-linecap="round"/>
        <line x1="22" y1="62" x2="78" y2="62" stroke="#FFE066" stroke-width="6" stroke-linecap="round"/>
        <line x1="22" y1="82" x2="78" y2="82" stroke="#FFE066" stroke-width="6" stroke-linecap="round"/>
      </svg>`;
      title.textContent = 'Woohoo!';
      desc.textContent = `${player.name} climbs the ladder!`;
      overlay.classList.add('ladder-event');
      card.classList.add('ladder-card');
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      Particles.start(confettiCanvas, 70);
    }

    overlay.classList.remove('hidden');
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      Particles.stop();
      overlay.classList.add('hidden');
      overlay.removeEventListener('click', dismiss);
      if (cb) cb();
    };
    overlay.addEventListener('click', dismiss);
    const timer = setTimeout(dismiss, 1800);
  }

  // Legacy showEvent for compatibility
  function showEvent(type, player, data, cb) {
    showEventBrief(type, player, data, cb);
  }

  function allPlayersFinished() {
    return state.players.every(p => p.finished);
  }

  function nextTurn() {
    animating = false;
    state.phase = 'rolling';

    // Find next unfinished player
    let next = (state.currentIndex + 1) % state.players.length;
    let attempts = 0;
    while (state.players[next].finished && attempts < state.players.length) {
      next = (next + 1) % state.players.length;
      attempts++;
    }
    state.currentIndex = next;
    updateGameUI();

    // Auto-roll for bot
    scheduleBotTurn();
  }

  function endGame() {
    state.phase = 'done';
    Sounds.stopMusic();
    Sounds.win();
    const winner = state.rankings[0] || state.players[0];
    state.winner = winner;

    // Save score
    Storage.saveScore({
      playerName: winner.name,
      character: winner.character,
      turns: winner.turns,
      boardName: state.board.name || 'Custom Board',
    });

    setTimeout(() => {
      App.showWinner(state);
    }, 800);
  }

  // ---- UI Updates ----

  function updateGameUI() {
    if (!state) return;
    const player = state.players[state.currentIndex];

    // Current player indicator
    const avatar = document.getElementById('cp-avatar');
    const name = document.getElementById('cp-name');
    const turnCount = document.getElementById('game-turn-count');
    const rollBtn = document.getElementById('btn-roll');

    if (avatar) {
      avatar.textContent = player.character;
      avatar.style.background = player.color + '55';
      avatar.style.boxShadow = `0 0 0 2px ${player.color}`;
    }
    if (name) {
      name.textContent = `${player.name}'s turn`;
    }

    // Floating dice state
    const diceEl   = document.getElementById('dice');
    const tapLabel = document.getElementById('dice-tap-label');
    const canRoll  = state.phase === 'rolling' && !player.isBot;
    if (diceEl) diceEl.classList.toggle('dice-disabled', !canRoll);
    if (tapLabel) {
      tapLabel.textContent = canRoll ? 'Tap to roll!' :
        (player.isBot && state.phase === 'rolling') ? 'Bot thinking...' : '';
    }

    updatePlayersStatus();
  }

  function updatePlayersStatus() {
    if (!state) return;
    const container = document.getElementById('players-status');
    if (!container) return;

    container.innerHTML = state.players.map((p, i) => `
      <div class="player-chip ${i === state.currentIndex ? 'active-chip' : ''}"
           style="border-color: ${i === state.currentIndex ? p.color : 'transparent'}">
        <span class="chip-avatar">${p.character}</span>
        <div>
          <div class="chip-name" style="color:${p.color}">${p.isBot ? '🤖 ' : ''}${p.name}</div>
          <div class="chip-pos">${p.position === 0 ? 'Start' : p.finished ? '🏁 Done!' : `Sq. ${p.position}`}</div>
        </div>
      </div>
    `).join('');
  }

  // ---- Shake detection ----

  function setupShakeDetection() {
    if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) {
      // iOS 13+ needs permission - will be requested on first roll
    } else if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }
  }

  function handleMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const total = Math.sqrt(a.x**2 + a.y**2 + a.z**2);
    const now = Date.now();
    if (total > 28 && now - lastShake > 1000) {
      lastShake = now;
      rollDice();
    }
  }

  function cleanup() {
    window.removeEventListener('devicemotion', handleMotion);
    Sounds.stopMusic();
  }

  return { init, getState, rollDice, cleanup };
})();
