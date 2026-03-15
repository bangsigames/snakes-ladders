/* ============================================================
   GAME — Game state, logic, dice, animations
   ============================================================ */

const Game = (() => {

  let state = null;
  let animating = false;
  let shakeTimeout = null;
  let lastShake = 0;
  let currentTheme = 'cartoon';
  let _almostNotified = new Set(); // player IDs that have heard the almost-there chime

  // ---- State ----

  function init(boardConfig, players) {
    _almostNotified = new Set();
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

  // ---- Visual flash overlay ----

  function flashCanvas(type) {
    const el = document.getElementById('canvas-flash');
    if (!el) return;
    el.classList.remove('flash-snake'); // reset
    void el.offsetWidth; // force reflow to restart animation
    if (type === 'snake') el.classList.add('flash-snake');
  }

  // ---- Dice ----

  function rollDice() {
    if (!state || state.phase !== 'rolling' || animating) return;

    dismissTurnBanner(); // B4: dismiss banner as soon as player rolls

    const value = randomInt(1, 6);
    state.diceValue = value;
    state.phase = 'animating';
    animating = true;

    // M8: haptic on Android
    if (navigator.vibrate) navigator.vibrate(80);
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
    const rawNew = oldPos === 0 ? steps : oldPos + steps;

    // Detect bounce before clamping
    const bounced = rawNew > total;
    let newPos = bounced ? total - (rawNew - total) : rawNew;

    // Zoom board toward the player's current token position
    zoomBoard(oldPos > 0 ? oldPos : newPos);

    animateMove(player, oldPos, newPos, () => {
      player.position = newPos;
      player.turns++;
      state.turn++;

      Sounds.playThemedSound(currentTheme, player.sound);

      // Bounce — player rolled past the finish line
      if (bounced) {
        Board.redrawGame(state.board, state.players, null);
        updateGameUI();
        Sounds.landBounce();
        unzoomBoard(() => {
          showEventBrief('bounce', player, {
            rolled: steps,
            needed: total - oldPos,
            newPos,
          }, () => {
            // After bounce card, check if landing square has a snake or ladder
            const snake = state.board.snakes.find(s => s.head === newPos);
            if (snake) {
              zoomBoard(newPos);
              Sounds.landSnake();
              flashCanvas('snake');
              animateAlongSnake(player, snake, () => {
                player.position = snake.tail;
                player.snakeBites++;
                state.turn++;
                if (snake.tail <= state.board.total - 10) _almostNotified.delete(player.id);
                Board.redrawGame(state.board, state.players, null);
                updateGameUI();
                unzoomBoard(() => showEventBrief('snake', player, snake, () => nextTurn()));
              });
              return;
            }
            const ladder = state.board.ladders.find(l => l.bottom === newPos);
            if (ladder) {
              zoomBoard(newPos);
              Sounds.landLadder();
              animateAlongLadder(player, ladder, () => {
                player.position = ladder.top;
                player.laddersClimbed++;
                state.turn++;
                Board.redrawGame(state.board, state.players, null);
                updateGameUI();
                unzoomBoard(() => showEventBrief('ladder', player, ladder, () => nextTurn()));
              });
              return;
            }
            nextTurn();
          });
        });
        return;
      }

      // Check for win first
      if (newPos === total) {
        player.finished = true;
        player.finishTurn = state.turn;
        state.rankings.push(player);
        unzoomBoard(null);

        // Can remaining players continue racing?
        // Yes if: 3+ total players AND at least 1 unfinished human still playing
        const unfinishedHumans = state.players.filter(p => !p.finished && !p.isBot);
        const canContinue = state.players.length >= 3 && unfinishedHumans.length > 0;

        if (allPlayersFinished() || !canContinue) {
          endGame();
          return;
        }

        // Interim winner — pause game, show winner screen with continue option
        state.phase = 'done';
        Sounds.win();
        setTimeout(() => App.showWinner(state, true), 800);
        return;
      }

      // Check snakes
      const snake = state.board.snakes.find(s => s.head === newPos);
      if (snake) {
        Sounds.landSnake();
        flashCanvas('snake');
        // Animate along snake bezier (stay zoomed), then zoom out → event card
        animateAlongSnake(player, snake, () => {
          player.position = snake.tail;
          player.snakeBites++;
          state.turn++;
          // If snake pushes player back below almost-there zone, let chime play again
          if (snake.tail <= state.board.total - 10) _almostNotified.delete(player.id);
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
    }, bounced ? rawNew : undefined);
  }

  function animateMove(player, fromPos, toPos, onDone, overPos) {
    const board = state.board;
    const total = board.total;

    // Build path of cells to traverse
    const path = [];
    if (fromPos === 0) {
      for (let i = 1; i <= toPos; i++) path.push(i);
    } else if (overPos && overPos > total) {
      // Bounce: animate forward through finish line, then back to toPos
      for (let i = fromPos + 1; i <= total; i++) path.push(i);
      for (let i = total - 1; i >= toPos; i--) path.push(i);
    } else {
      for (let i = fromPos + 1; i <= toPos; i++) path.push(i);
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
    overlay.classList.remove('snake-event', 'ladder-event', 'bounce-event');
    card.classList.remove('snake-card', 'ladder-card', 'bounce-card');

    if (type === 'bounce') {
      emoji.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="wc">
            <rect x="72" y="12" width="20" height="76" rx="3"/>
          </clipPath>
        </defs>
        <!-- Faded dashed forward arc (where the player tried to go) -->
        <path d="M18 75 Q36 22 64 48" fill="none" stroke="#F97316" stroke-width="2.5"
              stroke-dasharray="4 3" stroke-linecap="round" opacity="0.35"/>
        <!-- Finish wall -->
        <rect x="72" y="12" width="20" height="76" rx="3" fill="#1e293b"/>
        <g clip-path="url(#wc)">
          <rect x="72" y="12" width="10" height="13" fill="white" opacity="0.88"/>
          <rect x="82" y="25" width="10" height="13" fill="white" opacity="0.88"/>
          <rect x="72" y="38" width="10" height="13" fill="white" opacity="0.88"/>
          <rect x="82" y="51" width="10" height="13" fill="white" opacity="0.88"/>
          <rect x="72" y="64" width="10" height="13" fill="white" opacity="0.88"/>
          <rect x="82" y="77" width="10" height="11" fill="white" opacity="0.88"/>
        </g>
        <rect x="72" y="12" width="20" height="76" rx="3" fill="none" stroke="#475569" stroke-width="1.5"/>
        <!-- Sparkle impact lines -->
        <line x1="68" y1="35" x2="62" y2="29" stroke="#FCD34D" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="70" y1="47" x2="62" y2="45" stroke="#FCD34D" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="67" y1="59" x2="62" y2="65" stroke="#FCD34D" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="71" cy="43" r="2" fill="#FCD34D" opacity="0.65"/>
        <!-- Bounce-back arc (solid red with arrow) -->
        <path d="M64 48 Q70 63 61 72 Q46 82 18 75"
              fill="none" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M23 70 L18 75 L24 79" fill="none" stroke="#EF4444" stroke-width="3.5"
              stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Token drop shadow -->
        <circle cx="65" cy="50" r="13" fill="#7c2d12" opacity="0.22"/>
        <!-- Token body -->
        <circle cx="64" cy="48" r="13" fill="#F97316" stroke="#C2410C" stroke-width="2.5"/>
        <!-- Surprised face: wide eyes -->
        <circle cx="59" cy="45" r="2.8" fill="white"/>
        <circle cx="69" cy="45" r="2.8" fill="white"/>
        <circle cx="59.5" cy="45.8" r="1.4" fill="#1e293b"/>
        <circle cx="69.5" cy="45.8" r="1.4" fill="#1e293b"/>
        <!-- Surprised open mouth -->
        <ellipse cx="64" cy="53" rx="3.5" ry="2.8" fill="#7c2d12"/>
        <!-- Gloss highlight -->
        <ellipse cx="60" cy="43" rx="3.5" ry="2" fill="white" opacity="0.3" transform="rotate(-20,60,43)"/>
      </svg>`;
      title.textContent = 'Bounced Back!';
      desc.textContent = `${player.name} needed ${data.needed} — rolled ${data.rolled}!`;
      overlay.classList.add('bounce-event');
      card.classList.add('bounce-card');
      Particles.stop();
    } else if (type === 'snake') {
      emoji.innerHTML = `<svg viewBox="0 -13 100 113" xmlns="http://www.w3.org/2000/svg">
        <!-- Body shadow/outline -->
        <path d="M18 92 Q6 68 18 50 Q30 32 50 30 Q70 28 64 10"
              fill="none" stroke="#1b5e20" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Body -->
        <path d="M18 92 Q6 68 18 50 Q30 32 50 30 Q70 28 64 10"
              fill="none" stroke="#4CAF50" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Belly stripe -->
        <path d="M18 92 Q6 68 18 50 Q30 32 50 30 Q70 28 64 10"
              fill="none" stroke="rgba(200,240,175,0.68)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Scale arcs along body (manually placed) -->
        <ellipse cx="19" cy="78" rx="8" ry="5" fill="rgba(20,80,20,0.48)" transform="rotate(-55 19 78)"/>
        <ellipse cx="12" cy="62" rx="8" ry="5" fill="rgba(20,80,20,0.48)" transform="rotate(-35 12 62)"/>
        <ellipse cx="17" cy="47" rx="8" ry="5" fill="rgba(20,80,20,0.48)" transform="rotate(5 17 47)"/>
        <ellipse cx="33" cy="34" rx="8" ry="5" fill="rgba(20,80,20,0.48)" transform="rotate(40 33 34)"/>
        <ellipse cx="52" cy="27" rx="8" ry="5" fill="rgba(20,80,20,0.48)" transform="rotate(5 52 27)"/>
        <!-- Head shadow -->
        <circle cx="66" cy="9" r="20" fill="#1b5e20"/>
        <!-- Head -->
        <circle cx="66" cy="8" r="18" fill="#4CAF50"/>
        <!-- Head gloss -->
        <ellipse cx="57" cy="2" rx="7" ry="4.5" fill="rgba(255,255,255,0.22)" transform="rotate(-20 57 2)"/>
        <!-- Eyes — wide and alarmed -->
        <circle cx="56" cy="3"  r="6" fill="white"/>
        <circle cx="76" cy="3"  r="6" fill="white"/>
        <circle cx="57" cy="4"  r="3.4" fill="#111"/>
        <circle cx="77" cy="4"  r="3.4" fill="#111"/>
        <!-- Eye shine -->
        <circle cx="55.5" cy="2.2" r="1.4" fill="white"/>
        <circle cx="75.5" cy="2.2" r="1.4" fill="white"/>
        <!-- Tongue -->
        <line x1="66" y1="25" x2="66" y2="36" stroke="#FF1744" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="66" y1="36" x2="59" y2="43" stroke="#FF1744" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="66" y1="36" x2="73" y2="43" stroke="#FF1744" stroke-width="3.2" stroke-linecap="round"/>
      </svg>`;
      title.textContent = 'Oh no!';
      desc.textContent = `${player.name} hit a snake!`;
      overlay.classList.add('snake-event');
      card.classList.add('snake-card');
      Particles.stop();
    } else if (type === 'ladder') {
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
      clearTimeout(tapEnableTimer);
      clearTimeout(hintTimer);
      Particles.stop();
      const hint = document.getElementById('event-tap-hint');
      if (hint) hint.textContent = '';
      overlay.classList.add('hidden');
      overlay.removeEventListener('click', dismiss);
      if (cb) cb();
    };
    // B3: show "Tap to continue" hint after tap is enabled
    const hint = document.getElementById('event-tap-hint');
    if (hint) hint.textContent = '';
    const hintTimer = setTimeout(() => {
      if (hint && !dismissed) hint.textContent = 'Tap to continue';
    }, 550);
    // M5: delay tap listener so accidental finger-still-on-screen doesn't dismiss
    const tapEnableTimer = setTimeout(() => {
      overlay.addEventListener('click', dismiss);
    }, 500);
    // auto-dismiss after 6s (kids need more reading time)
    const timer = setTimeout(dismiss, 6000);
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
    showTurnAnnounce(state.players[next]);
    Storage.saveGameState(state);

    // Auto-roll for bot
    scheduleBotTurn();
  }

  let _turnAnnounceTimer = null;

  function dismissTurnBanner() {
    const banner = document.getElementById('turn-announce');
    if (!banner) return;
    if (_turnAnnounceTimer) { clearTimeout(_turnAnnounceTimer); _turnAnnounceTimer = null; }
    banner.classList.remove('show');
    setTimeout(() => banner.classList.add('hidden'), 300);
  }

  function showTurnAnnounce(player) {
    const banner  = document.getElementById('turn-announce');
    const avatar  = document.getElementById('turn-announce-avatar');
    const text    = document.getElementById('turn-announce-text');
    if (!banner || !avatar || !text) return;

    if (_turnAnnounceTimer) { clearTimeout(_turnAnnounceTimer); _turnAnnounceTimer = null; }

    avatar.textContent = player.character;
    text.textContent   = player.isBot ? `${player.name}'s turn` : `${player.name} — YOUR TURN!`;
    banner.style.borderLeft = `4px solid ${player.color}`;

    banner.classList.remove('hidden');
    // Force reflow so transition fires
    banner.getBoundingClientRect();
    banner.classList.add('show');

    // B4: for bot turns auto-dismiss; for human turns keep visible until they roll
    if (player.isBot) {
      _turnAnnounceTimer = setTimeout(() => {
        banner.classList.remove('show');
        _turnAnnounceTimer = setTimeout(() => {
          banner.classList.add('hidden');
        }, 300);
      }, 2800);
    }
    // human banner is dismissed by dismissTurnBanner() called from rollDice()
  }

  function endGame() {
    state.phase = 'done';
    Storage.clearGameState(); // game over — no need to resume
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

  function continueForNextPlace() {
    animating = false;
    state.phase = 'rolling';
    Board.redrawGame(state.board, state.players, null);
    updateGameUI();
    nextTurn();
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
    const diceEl      = document.getElementById('dice');
    const tapLabel    = document.getElementById('dice-tap-label');
    const gameScreen  = document.getElementById('screen-game');
    const canRoll     = state.phase === 'rolling' && !player.isBot;
    const isBotTurn   = player.isBot && state.phase === 'rolling';
    if (diceEl) {
      diceEl.classList.toggle('dice-disabled', !canRoll);
      diceEl.classList.toggle('bot-thinking', isBotTurn);
    }
    if (gameScreen) {
      gameScreen.classList.toggle('human-turn', canRoll);
    }
    if (tapLabel) {
      tapLabel.innerHTML = canRoll ? 'Tap to roll!' : isBotTurn ? '<span class="bot-thinking-label">🤖 Bot thinking…</span>' : '';
      // L1: re-animate label each time it becomes active so kids notice it
      if (canRoll) {
        tapLabel.classList.remove('tap-ready');
        tapLabel.getBoundingClientRect(); // force reflow
        tapLabel.classList.add('tap-ready');
      } else {
        tapLabel.classList.remove('tap-ready');
      }
    }

    updatePlayersStatus();
  }

  function updatePlayersStatus() {
    if (!state) return;
    const container = document.getElementById('players-status');
    if (!container) return;

    const total = state.board.total || 100;
    container.innerHTML = state.players.map((p, i) => {
      const almostThere = !p.finished && p.position > 0 && (total - p.position) <= 10;
      // L5: play chime once per player on first entry into almost-there zone
      if (almostThere && !_almostNotified.has(p.id)) {
        _almostNotified.add(p.id);
        setTimeout(() => Sounds.almostThere(), 350); // slight delay after landing sound
      }
      return `
      <div class="player-chip ${i === state.currentIndex ? 'active-chip' : ''} ${almostThere ? 'chip-almost' : ''}"
           style="border-color: ${i === state.currentIndex ? p.color : 'transparent'}">
        <span class="chip-avatar">${almostThere ? '🏁' : p.character}</span>
        <div>
          <div class="chip-name" style="color:${p.color}">${p.isBot ? '🤖 ' : ''}${p.name}</div>
          <div class="chip-pos">${p.position === 0 ? 'Start' : p.finished ? '🏁 Done!' : almostThere ? `${total - p.position} to go!` : `Sq. ${p.position}`}</div>
        </div>
      </div>
    `}).join('');
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

  function restoreGame(snapshot) {
    currentTheme = snapshot.board.theme || 'cartoon';
    state = {
      board:        snapshot.board,
      players:      snapshot.players,
      currentIndex: snapshot.currentIndex,
      turn:         snapshot.turn,
      phase:        'rolling',
      diceValue:    null,
      winner:       null,
      rankings:     snapshot.rankings || [],
    };

    Board.initGameCanvas(
      document.getElementById('game-canvas'),
      state.board,
      state.players
    );
    Board.redrawGame(state.board, state.players, null);

    const initFace = document.querySelector('.dice-face');
    if (initFace) renderDiceFace(initFace, 6);

    Sounds.startMusic(state.board.theme);
    setupShakeDetection();
    updateGameUI();
    scheduleBotTurn();
  }

  return { init, getState, rollDice, cleanup, restoreGame, continueForNextPlace };
})();
