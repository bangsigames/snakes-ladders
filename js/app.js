/* ============================================================
   APP — Screen management, navigation, designer & setup UI
   ============================================================ */

const App = (() => {

  let currentBoard = null; // board config selected for play

  // ============================================================
  // SCREEN MANAGEMENT
  // ============================================================

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  // ============================================================
  // HOME
  // ============================================================

  function showHome() {
    showScreen('screen-home');
    applyTheme('cartoon');
    Sounds.stopMusic();
  }

  // ============================================================
  // SAVED BOARDS
  // ============================================================

  function showBoardSelect() {
    Sounds.button();
    const boards = Storage.loadBoards();
    const list = document.getElementById('saved-boards-list');
    const empty = document.getElementById('saved-boards-empty');

    if (boards.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'flex';
    } else {
      list.style.display = 'grid';
      empty.style.display = 'none';
      const heroGrads = {
        jungle:  'linear-gradient(135deg, #4ade80 0%, #15803d 100%)',
        space:   'linear-gradient(135deg, #818cf8 0%, #1e1b4b 100%)',
        ocean:   'linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)',
        fantasy: 'linear-gradient(135deg, #c084fc 0%, #6d28d9 100%)',
        cartoon: 'linear-gradient(135deg, #fb7185 0%, #c026d3 100%)',
      };
      const playGrads = {
        jungle:  'linear-gradient(135deg,#22c55e,#15803d); box-shadow:0 5px 0 #14532d',
        space:   'linear-gradient(135deg,#818cf8,#4338ca); box-shadow:0 5px 0 #312e81',
        ocean:   'linear-gradient(135deg,#38bdf8,#0284c7); box-shadow:0 5px 0 #0369a1',
        fantasy: 'linear-gradient(135deg,#c084fc,#9333ea); box-shadow:0 5px 0 #6b21a8',
        cartoon: 'linear-gradient(135deg,#fb7185,#e11d48); box-shadow:0 5px 0 #9f1239',
      };
      list.innerHTML = boards.map(b => {
        const T = THEMES[b.theme] || THEMES.cartoon;
        const heroGrad = heroGrads[b.theme] || heroGrads.cartoon;
        const playStyle = playGrads[b.theme] || playGrads.cartoon;
        const squares = (b.cols || 10) * (b.rows || 10);
        return `
          <div class="saved-board-card">
            <div class="card-hero" style="background:${heroGrad}">
              <span class="card-hero-emoji">${T.emoji}</span>
              <button class="btn-card-delete" onclick="event.stopPropagation();App.deleteBoard('${b.id}')">✕</button>
            </div>
            <div class="card-content">
              <div class="card-name">${escHtml(b.name || 'Unnamed Board')}</div>
              <div class="card-stats">
                <span class="stat-chip">🐍 ${b.snakes.length} snakes</span>
                <span class="stat-chip">🪜 ${b.ladders.length} ladders</span>
                <span class="stat-chip">🎯 ${squares} squares</span>
              </div>
              <button class="btn-board-play" style="background:${playStyle}" onclick="App.selectBoard('${b.id}')">▶ PLAY!</button>
            </div>
          </div>`;
      }).join('');
    }

    showScreen('screen-saved-boards');
  }

  function selectBoard(id) {
    const boards = Storage.loadBoards();
    const board = boards.find(b => b.id === id);
    if (!board) return;
    Sounds.button();
    currentBoard = board;
    applyTheme(board.theme);
    showPlayerSetup();
  }

  function deleteBoard(id) {
    Sounds.button();
    Storage.deleteBoard(id);
    showToast('Board deleted 🗑️');
    showBoardSelect();
  }

  // ============================================================
  // BOARD DESIGNER
  // ============================================================

  let designerStep = 1;
  let _designerInitPreset = null;
  let _designerInitTheme  = null;

  function showDesigner(existingBoard) {
    Sounds.button();
    _designerInitPreset = null;
    _designerInitTheme  = null;
    designerStep = 1;
    updateDesignerStep(1);
    showScreen('screen-designer');
  }

  function updateDesignerStep(step) {
    designerStep = step;
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`designer-step-${i}`);
      if (el) el.classList.toggle('hidden', i !== step);
    }
    document.querySelectorAll('.step-dot').forEach((d, i) => {
      d.classList.toggle('active', i + 1 === step);
      d.classList.toggle('done', i + 1 < step);
    });
    if (step === 3) goToStep3();
    else if (step === 4) goToStep4();
    else if (step === 5) goToStep5();
  }

  function goToStep3() {
    const canvas = document.getElementById('designer-canvas');
    const wrap = document.getElementById('guided-board-wrap-3');
    if (wrap && canvas.parentElement !== wrap) wrap.appendChild(canvas);
    Board.designer.init(canvas);
    const preset = getSelectedPreset();
    const theme  = getSelectedTheme();
    // Only reset snakes/ladders when preset or theme actually changes
    if (preset !== _designerInitPreset || theme !== _designerInitTheme) {
      Board.designer.setPreset(preset);
      Board.designer.setTheme(theme);
      _designerInitPreset = preset;
      _designerInitTheme  = theme;
    } else {
      Board.designer.setTheme(theme);
    }
    Board.designer.setMode('snake-head');
    setSnakeGuideStep(1);
    updateSnakeList();
  }

  function goToStep4() {
    const canvas = document.getElementById('designer-canvas');
    const wrap = document.getElementById('guided-board-wrap-4');
    if (wrap && canvas.parentElement !== wrap) wrap.appendChild(canvas);
    Board.designer.setMode('ladder-bottom');
    setLadderGuideStep(1);
    updateLadderList();
  }

  function generateBoardName(config) {
    const adventureWords = {
      jungle:  'Jungle Adventure',
      space:   'Cosmic Quest',
      ocean:   'Deep Sea Escape',
      fantasy: 'Mystic Kingdom',
      cartoon: 'Cartoon Chaos',
    };
    const score = (config.snakes || []).length - (config.ladders || []).length;
    const difficulty = score <= 0 ? 'Easy' : score <= 2 ? 'Normal' : score <= 4 ? 'Tricky' : 'Hard';
    const word = adventureWords[config.theme] || 'Epic Adventure';
    return { name: word, difficulty };
  }

  function goToStep5() {
    const config = Board.designer.getBoardConfig();
    const { name, difficulty } = generateBoardName(config);

    const display = document.getElementById('board-name-display');
    if (display) display.textContent = name;

    const badge = document.getElementById('board-diff-badge');
    if (badge) {
      badge.textContent = difficulty;
      badge.className = 'board-diff-badge diff-' + difficulty.toLowerCase();
    }

    const stats = document.getElementById('board-ready-stats');
    if (stats) {
      const preset = GRID_PRESETS[config.preset] || {};
      stats.innerHTML = `
        <div class="ready-stat">
          <div class="ready-stat-val">${config.cols}×${config.rows}</div>
          <div class="ready-stat-lbl">Grid</div>
        </div>
        <div class="ready-stat">
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 13 Q2 8 6 6 Q10 4 9 2" fill="none" stroke="#4CD964" stroke-width="2.5" stroke-linecap="round"/><circle cx="9" cy="1.5" r="2" fill="#4CD964"/></svg>
          <div class="ready-stat-val">${config.snakes.length}</div>
          <div class="ready-stat-lbl">Snakes</div>
        </div>
        <div class="ready-stat">
          <svg viewBox="0 0 16 16" width="14" height="14"><line x1="5" y1="2" x2="5" y2="14" stroke="#FFB700" stroke-width="2" stroke-linecap="round"/><line x1="11" y1="2" x2="11" y2="14" stroke="#FFB700" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="5" x2="11" y2="5" stroke="#FFE066" stroke-width="1.8" stroke-linecap="round"/><line x1="5" y1="9" x2="11" y2="9" stroke="#FFE066" stroke-width="1.8" stroke-linecap="round"/><line x1="5" y1="13" x2="11" y2="13" stroke="#FFE066" stroke-width="1.8" stroke-linecap="round"/></svg>
          <div class="ready-stat-val">${config.ladders.length}</div>
          <div class="ready-stat-lbl">Ladders</div>
        </div>
      `;
    }
  }

  function getSelectedPreset() {
    const el = document.querySelector('.size-card.selected');
    return el ? el.dataset.size : 'classic';
  }

  function getSelectedTheme() {
    const el = document.querySelector('.theme-card.selected');
    return el ? el.dataset.theme : 'cartoon';
  }

  function saveBoard() {
    const config = Board.designer.getBoardConfig();
    const { name, difficulty } = generateBoardName(config);
    const fullName = `${name} (${difficulty})`;

    if (config.snakes.length === 0 && config.ladders.length === 0) {
      showToast('Add at least one snake and ladder first!');
      return null;
    }

    const board = {
      ...config,
      id: Storage.generateId(),
      name: fullName,
      createdAt: Date.now(),
    };
    Storage.saveBoard(board);
    showToast(`"${fullName}" saved!`);
    return board;
  }

  // ============================================================
  // PLAYER SETUP
  // ============================================================

  let playerCount = 2;
  let playerSetups = [];

  const PLAYER_NAME_SETS = [
    ['Star', 'Ace', 'Hero', 'Blaze', 'Dash', 'Zippy'],
    ['Luna', 'Nova', 'Flash', 'Sunny', 'Sparky', 'Bolt'],
    ['Rex', 'Robo', 'Buzz', 'Dino', 'Turbo', 'Zap'],
    ['Poppy', 'Rocky', 'Pixie', 'Breezy', 'Fizz', 'Glow'],
  ];

  function getThemeCharacters() {
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    return THEME_CHARACTERS[theme] || THEME_CHARACTERS.cartoon;
  }

  // Names are stored directly in playerSetups — no DOM sync needed
  function syncNamesFromDOM() {}

  function selectPlayerName(playerIndex, name) {
    if (!playerSetups[playerIndex] || playerSetups[playerIndex].isBot) return;
    playerSetups[playerIndex].name = name;
    Sounds.button();
    const chips = document.querySelectorAll(`#pname-chips-${playerIndex} .player-name-chip`);
    chips.forEach(c => c.classList.toggle('selected', c.textContent.trim() === name));
  }

  function showPlayerSetup() {
    playerCount = 2;
    playerSetups = [];
    renderPlayerCountBtns();
    renderPlayerCards();
    showScreen('screen-player-setup');
    applyTheme(currentBoard?.theme || 'cartoon');
  }

  function renderPlayerCountBtns() {
    const container = document.querySelector('.player-count-btns');
    if (!container) return;
    container.innerHTML = [1, 2, 3, 4].map(n => `
      <button class="pcount-btn ${n === playerCount ? 'active' : ''}" data-count="${n}">${n}</button>
    `).join('');
    container.querySelectorAll('.pcount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        syncNamesFromDOM(); // preserve typed names before re-render
        playerCount = parseInt(btn.dataset.count);
        Sounds.button();
        renderPlayerCountBtns();
        renderPlayerCards();
      });
    });
  }

  function renderPlayerCards() {
    const grid = document.getElementById('players-setup-grid');
    if (!grid) return;

    const themeChars = getThemeCharacters();
    const displayCount = playerCount === 1 ? 2 : playerCount;

    playerSetups = Array.from({ length: displayCount }, (_, i) => {
      const existing = playerSetups[i];
      const forceBot = (playerCount === 1 && i === 1);
      const defaultChar = themeChars[i % themeChars.length];
      const defaultName = forceBot ? `Bot ${i}` : (PLAYER_NAME_SETS[i] || PLAYER_NAME_SETS[0])[0];
      return existing ? {
        ...existing,
        isBot: forceBot ? true : (existing.isBot || false),
        sound: existing.sound || defaultChar.sound,
      } : {
        name: defaultName,
        character: defaultChar.emoji,
        color: PLAYER_COLORS[i],
        sound: defaultChar.sound,
        isBot: forceBot || (i > 0 && playerCount === 1),
      };
    });

    grid.innerHTML = playerSetups.map((p, i) => {
      const isPlayer1 = i === 0;
      const forceBot = (playerCount === 1 && i === 1);
      const isBot = p.isBot;
      const nameSet = PLAYER_NAME_SETS[i] || PLAYER_NAME_SETS[0];

      return `
      <div class="player-card" style="animation-delay: ${i * 0.1}s">
        <div class="player-card-header">
          <div class="player-num-badge" style="background:${PLAYER_COLORS[i]}">${i + 1}</div>
          <div class="player-card-title">Player ${i + 1}</div>
          ${!isPlayer1 ? `
            <div class="player-type-toggle">
              <button class="ptype-btn ${!isBot ? 'active' : ''}"
                      onclick="App.setPlayerType(${i}, false)" ${forceBot ? 'disabled' : ''}>👤 Player</button>
              <button class="ptype-btn ${isBot ? 'active' : ''}"
                      onclick="App.setPlayerType(${i}, true)" ${forceBot ? 'disabled' : ''}>🤖 Bot</button>
            </div>
          ` : '<span class="ptype-static">👤 Player</span>'}
        </div>
        ${isBot ? '' : `
          <div class="player-name-chips" id="pname-chips-${i}">
            ${nameSet.map(name => `
              <button class="player-name-chip ${p.name === name ? 'selected' : ''}"
                      onclick="App.selectPlayerName(${i}, '${escHtml(name)}')">${escHtml(name)}</button>
            `).join('')}
          </div>
        `}
        ${Components.AvatarSelector(themeChars, p.character, i)}
      </div>
    `;
    }).join('');

    // Sync count button active state
    document.querySelectorAll('.pcount-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.count) === playerCount);
    });
  }

  function setPlayerType(playerIndex, isBot) {
    if (!playerSetups[playerIndex]) return;
    if (playerCount === 1 && playerIndex === 1) return;
    syncNamesFromDOM();
    Sounds.button();
    playerSetups[playerIndex].isBot = isBot;
    playerSetups[playerIndex].name = isBot
      ? `Bot ${playerIndex}`
      : (PLAYER_NAME_SETS[playerIndex] || PLAYER_NAME_SETS[0])[0];
    renderPlayerCards();
  }

  function toggleBot(playerIndex) {
    if (!playerSetups[playerIndex]) return;
    if (playerCount === 1 && playerIndex === 1) return;
    setPlayerType(playerIndex, !playerSetups[playerIndex].isBot);
    renderPlayerCards();
  }

  function selectChar(playerIndex, emoji, sound) {
    playerSetups[playerIndex].character = emoji;
    if (sound) playerSetups[playerIndex].sound = sound;
    // Play the character's sound as a preview
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    if (sound) Sounds.playThemedSound(theme, sound);
    const card = document.querySelectorAll('#players-setup-grid .player-card')[playerIndex];
    if (card) {
      card.querySelectorAll('.char-btn').forEach(b => {
        b.classList.toggle('selected', b.textContent.trim() === emoji);
      });
    }
  }

  function selectColor(playerIndex, color) {
    Sounds.button();
    playerSetups[playerIndex].color = color;
    const card = document.querySelectorAll('#players-setup-grid .player-card')[playerIndex];
    if (card) {
      card.querySelectorAll('.color-btn').forEach(b => {
        b.classList.toggle('selected', b.style.background === color || b.style.backgroundColor === color);
      });
    }
  }

  function startGame() {
    if (!currentBoard) {
      showToast('No board selected!');
      return;
    }
    Sounds.button();
    syncNamesFromDOM(); // capture any final edits

    const displayCount = playerCount === 1 ? 2 : playerCount;

    // Collect player data
    const players = playerSetups.slice(0, displayCount).map((p, i) => ({
      name: p.name || (p.isBot ? `Bot ${i}` : `Player ${i+1}`),
      character: p.character,
      color: p.color,
      sound: p.sound,
      isBot: p.isBot || false,
    }));

    applyTheme(currentBoard.theme);
    showScreen('screen-game');

    // Update theme background art
    updateThemeBgArt(currentBoard.theme);

    setTimeout(() => {
      Game.init(currentBoard, players);
    }, 100);
  }

  function updateThemeBgArt(theme) {
    const el = document.getElementById('theme-bg-art');
    if (!el) return;
    el.className = 'theme-bg-art theme-bg-' + theme;
  }

  // ============================================================
  // MUSIC MUTE BUTTON
  // ============================================================

  let lastTheme = 'cartoon';

  function toggleMusicMute() {
    const muted = Sounds.toggleMute();
    const btn = document.getElementById('btn-music-toggle');
    if (btn) btn.innerHTML = muted ? Icons.get('sound', 26).replace(/#FFD93D/g, '#888') : Icons.get('sound', 26);
    if (!muted && currentBoard) {
      Sounds.startMusic(currentBoard.theme || 'cartoon');
    }
  }

  // ============================================================
  // WINNER SCREEN
  // ============================================================

  function showWinner(gameState) {
    const winner = gameState.winner;
    const players = gameState.players;

    // Sort by finish turn
    const sorted = [...players].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) return a.finishTurn - b.finishTurn;
      return b.position - a.position;
    });

    document.getElementById('winner-avatar').textContent = winner.character;
    document.getElementById('winner-name').textContent = winner.name;

    document.getElementById('winner-stats').innerHTML = `
      <div class="stat-box">
        <div class="stat-value">${winner.snakeBites}</div>
        <div class="stat-label">Snake Bites</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${winner.laddersClimbed}</div>
        <div class="stat-label">Ladders Climbed</div>
      </div>
    `;

    const medals = ['🥇','🥈','🥉','4️⃣'];
    document.getElementById('final-scoreboard').innerHTML = sorted.map((p, i) => `
      <div class="score-row">
        <div class="score-rank ${i===0?'gold':''}">${medals[i]||i+1}</div>
        <div class="score-avatar">${p.character}</div>
        <div class="score-name">${escHtml(p.name)}${p.isBot ? ' (Bot)' : ''}</div>
        <div class="score-moves">${p.finished ? 'Finished!' : `Sq. ${p.position}`}</div>
      </div>
    `).join('');

    showScreen('screen-winner');
    Particles.start(document.getElementById('confetti-canvas'));
  }

  // ============================================================
  // SCORES
  // ============================================================

  function showScores() {
    Sounds.button();
    const scores = Storage.loadScores();
    const list = document.getElementById('scores-list');
    const medals = ['🥇','🥈','🥉'];

    if (scores.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:white;padding:40px;font-size:1.2rem;font-weight:700;opacity:0.8">No scores yet! Play first 🎮</div>';
    } else {
      list.innerHTML = scores.map((s, i) => `
        <div class="score-entry">
          <div class="score-entry-rank">${medals[i] || (i+1)}</div>
          <div class="score-entry-avatar">${s.character || '🎮'}</div>
          <div class="score-entry-info">
            <div class="score-entry-name">${escHtml(s.playerName)}</div>
            <div class="score-entry-meta">${s.boardName || 'Unknown Board'} · ${new Date(s.date).toLocaleDateString()}</div>
          </div>
          <div class="score-entry-turns">${s.turns}<span style="font-size:0.7rem;opacity:0.7"> turns</span></div>
        </div>
      `).join('');
    }

    showScreen('screen-scores');
  }

  // ============================================================
  // THEME
  // ============================================================

  function applyTheme(theme) {
    const T = THEMES[theme] || THEMES.cartoon;
    document.body.className = T.bodyClass;
  }

  // ============================================================
  // INIT — Wire up all event listeners
  // ============================================================

  function init() {
    // Inject SVG icons
    const iconPlay = document.querySelector('#btn-home-play .home-btn-icon');
    if (iconPlay) iconPlay.innerHTML = Icons.get('play', 36);
    const iconPalette = document.querySelector('#btn-home-design .home-btn-icon');
    if (iconPalette) iconPalette.innerHTML = Icons.get('palette', 28);
    const iconBoards = document.querySelector('#btn-home-scores .home-btn-icon');
    if (iconBoards) iconBoards.innerHTML = Icons.get('ladder', 28);
    const iconMenuBtn = document.getElementById('icon-menu-btn');
    if (iconMenuBtn) iconMenuBtn.innerHTML = Icons.get('menu', 26);
    // Dice is tappable directly — no roll button
    // Music button — icon injected here, listener wired below
    const _musicBtnInit = document.getElementById('btn-music-toggle');
    if (_musicBtnInit) _musicBtnInit.innerHTML = Icons.get('sound', 26);

    // Home buttons
    document.getElementById('btn-home-play').addEventListener('click', () => showBoardSelect());
    document.getElementById('btn-home-design').addEventListener('click', () => showDesigner());
    document.getElementById('btn-home-scores')?.addEventListener('click', () => showBoardSelect());

    // Saved boards
    document.getElementById('btn-saved-back').addEventListener('click', () => { Sounds.button(); showHome(); });
    document.getElementById('btn-go-design').addEventListener('click', () => showDesigner());

    // Board designer navigation
    document.getElementById('btn-designer-back').addEventListener('click', () => {
      Sounds.button();
      if (designerStep === 1) showHome();
      else updateDesignerStep(designerStep - 1);
    });
    document.getElementById('btn-step1-next').addEventListener('click', () => { Sounds.button(); updateDesignerStep(2); });
    document.getElementById('btn-step2-back').addEventListener('click', () => { Sounds.button(); updateDesignerStep(1); });
    document.getElementById('btn-step2-next').addEventListener('click', () => { Sounds.button(); updateDesignerStep(3); });

    document.getElementById('btn-step3-back').addEventListener('click', () => { Sounds.button(); updateDesignerStep(2); });
    document.getElementById('btn-step3-next').addEventListener('click', () => {
      if (Board.designer.getBoardConfig().snakes.length === 0) {
        showToast('Add at least one snake first!');
        return;
      }
      Sounds.button();
      updateDesignerStep(4);
    });
    document.getElementById('btn-undo-snake').addEventListener('click', () => {
      const snakes = Board.designer.getBoardConfig().snakes;
      if (snakes.length === 0) { showToast('No snakes to undo'); return; }
      Sounds.button();
      Board.designer.removeSnake(snakes.length - 1);
      Board.designer.setMode('snake-head');
      setSnakeGuideStep(1);
    });
    document.getElementById('btn-auto-snakes').addEventListener('click', () => {
      Sounds.button();
      Board.designer.autoPlaceSnakes();
      Board.designer.setMode('idle');
      setSnakeGuideStep(1);
    });

    document.getElementById('btn-step4-back').addEventListener('click', () => { Sounds.button(); updateDesignerStep(3); });
    document.getElementById('btn-step4-next').addEventListener('click', () => {
      if (Board.designer.getBoardConfig().ladders.length === 0) {
        showToast('Add at least one ladder first!');
        return;
      }
      Sounds.button();
      updateDesignerStep(5);
    });
    document.getElementById('btn-undo-ladder').addEventListener('click', () => {
      const ladders = Board.designer.getBoardConfig().ladders;
      if (ladders.length === 0) { showToast('No ladders to undo'); return; }
      Sounds.button();
      Board.designer.removeLadder(ladders.length - 1);
      Board.designer.setMode('ladder-bottom');
      setLadderGuideStep(1);
    });
    document.getElementById('btn-auto-ladders').addEventListener('click', () => {
      Sounds.button();
      Board.designer.autoPlaceLadders();
      Board.designer.setMode('idle');
      setLadderGuideStep(1);
    });

    document.getElementById('btn-step5-back').addEventListener('click', () => { Sounds.button(); updateDesignerStep(4); });

    document.getElementById('btn-save-board').addEventListener('click', () => {
      Sounds.button();
      saveBoard();
    });
    document.getElementById('btn-play-now').addEventListener('click', () => {
      Sounds.button();
      const board = saveBoard() || Board.designer.getBoardConfig();
      if (!board) return;
      currentBoard = board;
      if (!currentBoard.id) currentBoard.id = Storage.generateId();
      applyTheme(currentBoard.theme);
      showPlayerSetup();
    });

    // Grid size picker
    const sizeNextBtn = document.getElementById('btn-step1-next');
    document.querySelectorAll('.size-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.size-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (sizeNextBtn) sizeNextBtn.classList.add('size-next-visible');
        Sounds.button();
      });
    });

    // Theme picker
    const themeContinueBtn = document.getElementById('btn-step2-next');
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        applyTheme(card.dataset.theme);
        if (themeContinueBtn) themeContinueBtn.disabled = false;
        Sounds.button();
      });
    });


    // Player setup
    document.getElementById('btn-setup-back').addEventListener('click', () => showBoardSelect());
    // Player count buttons are rendered dynamically in renderPlayerCountBtns()
    document.getElementById('btn-lets-play').addEventListener('click', () => startGame());

    // Tappable dice
    document.getElementById('dice').addEventListener('click', () => {
      Game.rollDice();
    });

    document.getElementById('btn-game-menu').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.remove('hidden');
    });

    // Music mute button
    const musicBtn = document.getElementById('btn-music-toggle');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => toggleMusicMute());
    }

    document.getElementById('btn-resume').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
      Game.cleanup();
      showPlayerSetup();
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
      Game.cleanup();
      Particles.stop();
      showHome();
    });

    // Winner screen
    document.getElementById('btn-play-again').addEventListener('click', () => {
      Sounds.button();
      Particles.stop();
      Game.cleanup();
      showPlayerSetup();
    });
    document.getElementById('btn-home-from-win').addEventListener('click', () => {
      Sounds.button();
      Particles.stop();
      Game.cleanup();
      showHome();
    });

    // Scores
    document.getElementById('btn-scores-back').addEventListener('click', () => { Sounds.button(); showHome(); });
    document.getElementById('btn-clear-scores').addEventListener('click', () => {
      Sounds.button();
      Storage.clearScores();
      showScores();
    });

    // Init default saved boards with a demo board
    if (Storage.loadBoards().length === 0) {
      createDemoBoards();
    }

    // Create one demo board for first run
    function createDemoBoards() {
      const demo = {
        id: Storage.generateId(),
        name: 'Classic Adventure',
        preset: 'classic', cols: 10, rows: 10, total: 100,
        theme: 'cartoon',
        snakes: [
          {head:99,tail:41},{head:87,tail:24},{head:54,tail:34},
          {head:62,tail:19},{head:17,tail:7},{head:46,tail:25},
        ],
        ladders: [
          {bottom:4,top:14},{bottom:9,top:31},{bottom:20,top:38},
          {bottom:28,top:84},{bottom:40,top:59},{bottom:51,top:67},
          {bottom:63,top:81},{bottom:71,top:91},
        ],
        createdAt: Date.now(),
      };
      demo.ladders = demo.ladders.map(l => ({ bottom: l.bottom, top: l.top || l.tail }));
      Storage.saveBoard(demo);
    }

    // Draw mini board previews on size selection cards
    drawMiniBoards();

    // Show home
    showHome();
  }

  // ============================================================
  // MINI BOARD PREVIEWS (size picker)
  // ============================================================

  function drawMiniBoards() {
    const configs = {
      small: {
        cols: 5, rows: 5, bgColor: '#E65100',
        cellA: '#FFFDE7', cellB: '#FFE0B2',
        snake:  { hc: 3, hr: 0, tc: 0, tr: 3 },
        ladder: { bc: 4, br: 4, tc: 4, tr: 1 },
      },
      medium: {
        cols: 8, rows: 8, bgColor: '#01579B',
        cellA: '#E1F5FE', cellB: '#B3E5FC',
        snake:  { hc: 6, hr: 1, tc: 2, tr: 5 },
        ladder: { bc: 0, br: 7, tc: 0, tr: 2 },
      },
      classic: {
        cols: 10, rows: 10, bgColor: '#4A148C',
        cellA: '#F3E5F5', cellB: '#E1BEE7',
        snake:  { hc: 8, hr: 1, tc: 3, tr: 6 },
        ladder: { bc: 1, br: 9, tc: 1, tr: 4 },
      },
    };

    document.querySelectorAll('.size-card').forEach(card => {
      const key = card.dataset.size;
      const cfg = configs[key];
      if (!cfg) return;
      const container = card.querySelector('.size-mini-svg');
      if (!container) return;
      container.innerHTML = buildMiniBoardSVG(key, cfg);
    });
  }

  // Builds a resolution-independent SVG mini-board matching the game's art style.
  function buildMiniBoardSVG(id, cfg) {
    const { cols, rows, bgColor, cellA, cellB, snake, ladder } = cfg;
    // Square viewBox — CSS sets different physical sizes per board,
    // so the board naturally appears small/medium/large without any tricks.
    const W = 200, H = 200;
    const r1 = n => Math.round(n * 10) / 10;  // 1-decimal precision

    // All boards use the same cell size — what differs is the number of cells,
    // which gives each board a naturally different area inside the square viewBox.
    const cellSize = 16;
    const gap      = 2;
    const stride   = cellSize + gap;
    const gridW    = cols * stride - gap;
    const gridH    = rows * stride - gap;
    const x0 = Math.round((W - gridW) / 2);
    const y0 = Math.round((H - gridH) / 2);

    const el = [];

    // ── Background ───────────────────────────────────────────────────
    el.push(`<rect width="${W}" height="${H}" fill="${bgColor}"/>`);

    // ── White board panel (drop-shadow via filter) ───────────────────
    const pp = 10;
    el.push(
      `<rect x="${x0-pp}" y="${y0-pp}" width="${gridW+pp*2}" height="${gridH+pp*2}" ` +
      `rx="10" fill="white" filter="url(#sh-${id})"/>`
    );

    // ── Grid cells ───────────────────────────────────────────────────
    const cr = r1(Math.max(1.5, cellSize * 0.13));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const fill = (row + col) % 2 === 0 ? cellA : cellB;
        const cx = x0 + col * stride;
        const cy = y0 + row * stride;
        el.push(
          `<rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" ` +
          `rx="${cr}" fill="${fill}"/>`
        );
      }
    }

    // ── Cell-centre helper ───────────────────────────────────────────
    const cc = (col, row) => ({
      x: r1(x0 + col * stride + cellSize / 2),
      y: r1(y0 + row * stride + cellSize / 2),
    });

    // ── Ladder (jungle-style: brown rails + lighter rungs) ───────────
    if (ladder) {
      const { bc, br, tc, tr } = ladder;
      const b = cc(bc, br), t = cc(tc, tr);
      const dx = t.x - b.x, dy = t.y - b.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) {
        const nx = -dy / len, ny = dx / len;
        const ro  = r1(Math.max(3, cellSize * 0.26));
        const rlw = r1(Math.max(1.5, cellSize * 0.12));
        const gw  = r1(Math.max(1,   cellSize * 0.09));

        // Rails
        for (const s of [-1, 1]) {
          el.push(
            `<line x1="${r1(b.x+nx*ro*s)}" y1="${r1(b.y+ny*ro*s)}" ` +
            `x2="${r1(t.x+nx*ro*s)}" y2="${r1(t.y+ny*ro*s)}" ` +
            `stroke="#8d6e63" stroke-width="${rlw}" stroke-linecap="round"/>`
          );
        }

        // Rungs
        const numRungs = Math.max(2, Math.abs(br - tr) - 1);
        for (let i = 1; i <= numRungs; i++) {
          const tf = i / (numRungs + 1);
          const rx = r1(b.x + tf * dx), ry = r1(b.y + tf * dy);
          el.push(
            `<line x1="${r1(rx-nx*ro)}" y1="${r1(ry-ny*ro)}" ` +
            `x2="${r1(rx+nx*ro)}" y2="${r1(ry+ny*ro)}" ` +
            `stroke="#bcaaa4" stroke-width="${gw}" stroke-linecap="round"/>`
          );
        }
      }
    }

    // ── Snake (matches board.js art: bezier body, white eyes, forked tongue) ──
    if (snake) {
      const { hc, hr, tc, tr } = snake;
      const head = cc(hc, hr), tail = cc(tc, tr);
      const hx = head.x, hy = head.y;
      const tx = tail.x, ty = tail.y;

      // Same bezier control-point formula as board.js drawSnake()
      const dx = hx - tx, dy = hy - ty;
      const cp1x = r1(tx + dx * 0.25 + dy * 0.3);
      const cp1y = r1(ty + dy * 0.25 - dx * 0.3);
      const cp2x = r1(hx - dx * 0.25 + dy * 0.2);
      const cp2y = r1(hy - dy * 0.25 - dx * 0.2);

      const lineW  = r1(Math.min(cellSize * 0.44, 8));
      const headR  = r1(lineW * 0.9);
      const bodyD  = `M ${tx} ${ty} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${hx} ${hy}`;

      // Body shadow
      el.push(
        `<path d="${bodyD}" fill="none" stroke="rgba(0,0,0,0.18)" ` +
        `stroke-width="${r1(lineW+2)}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
      // Body
      el.push(
        `<path d="${bodyD}" fill="none" stroke="#388e3c" ` +
        `stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
      // Tail tip
      el.push(`<circle cx="${tx}" cy="${ty}" r="${r1(lineW*0.4)}" fill="#1b5e20"/>`);
      // Head
      el.push(`<circle cx="${hx}" cy="${hy}" r="${headR}" fill="#2e7d32"/>`);

      // Two white eyes + black pupils (identical to board.js standard eyes)
      const eyeOff = r1(headR * 0.45);
      const eyeR   = r1(headR * 0.28);
      const eyeY   = r1(hy - eyeOff * 0.3);
      el.push(`<circle cx="${r1(hx-eyeOff)}" cy="${eyeY}" r="${eyeR}" fill="white"/>`);
      el.push(`<circle cx="${r1(hx+eyeOff)}" cy="${eyeY}" r="${eyeR}" fill="white"/>`);
      el.push(`<circle cx="${r1(hx-eyeOff+eyeR*0.2)}" cy="${eyeY}" r="${r1(eyeR*0.55)}" fill="#1a1a1a"/>`);
      el.push(`<circle cx="${r1(hx+eyeOff+eyeR*0.2)}" cy="${eyeY}" r="${r1(eyeR*0.55)}" fill="#1a1a1a"/>`);

      // Forked tongue — Y-shape, identical to board.js
      const tDir   = Math.atan2(hy - ty, hx - tx);
      const tLen   = headR * 0.9;
      const tSx    = r1(hx + Math.cos(tDir) * headR);
      const tSy    = r1(hy + Math.sin(tDir) * headR);
      const tMx    = r1(hx + Math.cos(tDir) * (headR + tLen * 0.5));
      const tMy    = r1(hy + Math.sin(tDir) * (headR + tLen * 0.5));
      const tTx    = r1(hx + Math.cos(tDir) * (headR + tLen));
      const tTy    = r1(hy + Math.sin(tDir) * (headR + tLen));
      const fSprd  = headR * 0.25;
      const fx1    = r1(tTx + Math.cos(tDir + Math.PI/2) * fSprd);
      const fy1    = r1(tTy + Math.sin(tDir + Math.PI/2) * fSprd);
      const fx2    = r1(tTx + Math.cos(tDir - Math.PI/2) * fSprd);
      const fy2    = r1(tTy + Math.sin(tDir - Math.PI/2) * fSprd);
      const tw     = r1(Math.max(0.8, lineW * 0.15));
      el.push(`<line x1="${tSx}" y1="${tSy}" x2="${tMx}" y2="${tMy}" stroke="#ff1744" stroke-width="${tw}" stroke-linecap="round"/>`);
      el.push(`<line x1="${tMx}" y1="${tMy}" x2="${fx1}" y2="${fy1}" stroke="#ff1744" stroke-width="${tw}" stroke-linecap="round"/>`);
      el.push(`<line x1="${tMx}" y1="${tMy}" x2="${fx2}" y2="${fy2}" stroke="#ff1744" stroke-width="${tw}" stroke-linecap="round"/>`);
    }

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
      `preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;">` +
      `<defs>` +
      `<filter id="sh-${id}" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="rgba(0,0,0,0.3)"/>` +
      `</filter>` +
      `</defs>` +
      el.join('') +
      `</svg>`
    );
  }

  return {
    init, showHome, showBoardSelect, showDesigner,
    showPlayerSetup, showWinner, showScores,
    selectBoard, deleteBoard,
    selectChar, selectColor,
    toggleBot, setPlayerType, toggleMusicMute,
    selectPlayerName,
  };
})();

// ---- Guide step helpers (global so board.js can call them) ----
function setSnakeGuideStep(step) {
  const s1 = document.getElementById('sg-step-1');
  const s2 = document.getElementById('sg-step-2');
  if (s1) s1.classList.toggle('sg-active', step === 1);
  if (s2) s2.classList.toggle('sg-active', step === 2);
}

function setLadderGuideStep(step) {
  const l1 = document.getElementById('lg-step-1');
  const l2 = document.getElementById('lg-step-2');
  if (l1) l1.classList.toggle('sg-active', step === 1);
  if (l2) l2.classList.toggle('sg-active', step === 2);
}

// ---- updateDesignerUI (called from board.js on each placement) ----
let _prevSnakeCount = 0;
let _prevLadderCount = 0;

function updateDesignerUI() {
  const config = Board.designer.getBoardConfig();

  const snakeAdded  = config.snakes.length  > _prevSnakeCount;
  const ladderAdded = config.ladders.length > _prevLadderCount;

  _prevSnakeCount  = config.snakes.length;
  _prevLadderCount = config.ladders.length;

  updateSnakeList();
  updateLadderList();

  // After a successful placement, auto-restart the same mode
  if (snakeAdded) {
    Board.designer.setMode('snake-head');
    setSnakeGuideStep(1);
  }
  if (ladderAdded) {
    Board.designer.setMode('ladder-bottom');
    setLadderGuideStep(1);
  }
}

function updateSnakeList() {
  const list  = document.getElementById('snake-list');
  const count = document.getElementById('snake-count');
  const snakes = Board.designer.getBoardConfig().snakes;
  if (count) count.textContent = snakes.length;
  if (!list) return;
  if (snakes.length === 0) {
    list.innerHTML = '<p class="guided-list-empty">No snakes yet</p>';
    return;
  }
  list.innerHTML = snakes.map((s, i) => Components.SnakeListItem(s, i)).join('');
}

function updateLadderList() {
  const list  = document.getElementById('ladder-list');
  const count = document.getElementById('ladder-count');
  const ladders = Board.designer.getBoardConfig().ladders;
  if (count) count.textContent = ladders.length;
  if (!list) return;
  if (ladders.length === 0) {
    list.innerHTML = '<p class="guided-list-empty">No ladders yet</p>';
    return;
  }
  list.innerHTML = ladders.map((l, i) => Components.LadderListItem(l, i)).join('');
}

// ---- showToast ----
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---- escHtml ----
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => App.init());
