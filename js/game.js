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
    }, 650);
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
    const overlay = document.getElementById('dice-overlay');
    const diceEl = document.getElementById('dice-big');
    const textEl = document.getElementById('dice-result-text');
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    diceEl.textContent = faces[value - 1];
    const player = state.players[state.currentIndex];
    textEl.textContent = `${player.name} rolled a ${value}!`;
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('hidden');
      if (cb) cb();
    }, 1200);
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
        // Animate along snake bezier, then show event card
        animateAlongSnake(player, snake, () => {
          player.position = snake.tail;
          player.snakeBites++;
          state.turn++;
          Board.redrawGame(state.board, state.players, null);
          updateGameUI();
          showEventBrief('snake', player, snake, () => {
            nextTurn();
          });
        });
        return;
      }

      // Check ladders
      const ladder = state.board.ladders.find(l => l.bottom === newPos);
      if (ladder) {
        Sounds.landLadder();
        // Animate along ladder, then show event card
        animateAlongLadder(player, ladder, () => {
          player.position = ladder.top;
          player.laddersClimbed++;
          state.turn++;
          Board.redrawGame(state.board, state.players, null);
          updateGameUI();
          showEventBrief('ladder', player, ladder, () => {
            nextTurn();
          });
        });
        return;
      }

      Board.redrawGame(state.board, state.players, null);
      updateGameUI();
      nextTurn();
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
    const STEP_DURATION = 180; // ms per cell

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

    const DURATION = 1500; // 1.5 seconds
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

    const DURATION = 1200; // 1.2 seconds
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
    const emoji = document.getElementById('event-emoji');
    const title = document.getElementById('event-title');
    const desc = document.getElementById('event-desc');

    if (type === 'snake') {
      emoji.textContent = '🐍';
      title.textContent = 'Oh no! A Snake!';
      desc.textContent = `${player.name} slides from ${data.head} down to ${data.tail}!`;
    } else {
      emoji.textContent = '🪜';
      title.textContent = 'Woohoo! A Ladder!';
      desc.textContent = `${player.name} climbs from ${data.bottom} up to ${data.top}!`;
    }

    overlay.classList.remove('hidden');
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      overlay.classList.add('hidden');
      overlay.removeEventListener('click', dismiss);
      if (cb) cb();
    };
    overlay.addEventListener('click', dismiss);
    const timer = setTimeout(dismiss, 1000); // 1s auto-dismiss
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
      avatar.style.background = player.color;
    }
    if (name) {
      name.textContent = player.isBot ? ('🤖 ' + player.name) : player.name;
    }
    if (turnCount) turnCount.textContent = `Turn ${state.turn}`;
    if (rollBtn) {
      // Disable roll button when it's a bot's turn or not in rolling phase
      rollBtn.disabled = state.phase !== 'rolling' || player.isBot;
      document.getElementById('roll-btn-text').textContent =
        (state.phase === 'rolling' && !player.isBot) ? '🎲 Roll Dice' :
        (player.isBot && state.phase === 'rolling') ? '🤖 Bot thinking…' : '⏳';
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
