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
    if (typeof I18n !== 'undefined') I18n.translateDOM();
  }

  // ============================================================
  // HOME
  // ============================================================

  function showHome() {
    showScreen('screen-home');
    applyTheme('cartoon');
    Sounds.stopMusic();
    checkResumeGame();
  }

  let _resumePrompted = false;

  function checkResumeGame() {
    if (_resumePrompted) return;
    const saved = Storage.loadGameState();
    if (!saved) return;
    const age = Date.now() - (saved.savedAt || 0);
    if (age > 7 * 24 * 60 * 60 * 1000) { Storage.clearGameState(); return; }
    _resumePrompted = true;
    showResumeModal(saved);
  }

  function showResumeModal(saved) {
    const theme = saved.board.theme || 'cartoon';
    const themeEmoji = { cartoon:'🎨', jungle:'🌴', space:'🚀', ocean:'🌊', fantasy:'✨' }[theme] || '🎲';
    const current = saved.players[saved.currentIndex];
    const avatarsHtml = saved.players.map(p =>
      `<div class="resume-player ${p.id === current.id ? 'resume-player-active' : ''}">
         <span class="resume-avatar">${p.character}</span>
         <span class="resume-pname">${escHtml(p.name)}</span>
       </div>`
    ).join('');

    let modal = document.getElementById('resume-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'resume-modal';
      modal.className = 'popup-modal';
      modal.setAttribute('role', 'dialog');
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="popup-modal-card resume-modal-card">
        <div class="resume-header">
          <div class="resume-icon">🎮</div>
          <div class="resume-title">${t('resume.title')}</div>
          <div class="resume-board-name">${themeEmoji} ${escHtml(saved.board.name || t('misc.unnamed_board'))}</div>
        </div>
        <div class="resume-players">${avatarsHtml}</div>
        <div class="resume-whose-turn">
          <span class="resume-turn-avatar">${current.character}</span>
          <span class="resume-turn-text">${t('resume.whose_turn', { name: escHtml(current.name) })}</span>
        </div>
        <div class="popup-modal-buttons" style="margin-top:24px">
          <button class="btn btn-md btn-green btn-full" id="resume-btn-resume">${t('resume.btn_resume')}</button>
          <button class="btn btn-md btn-neutral btn-full" id="resume-btn-new">${t('resume.btn_new')}</button>
          <button class="btn btn-md btn-ghost-dk btn-full" id="resume-btn-later">${t('resume.btn_later')}</button>
        </div>
      </div>`;

    const close = () => modal.classList.add('hidden');
    modal.querySelector('#resume-btn-resume').addEventListener('click', () => {
      close();
      applyTheme(theme);
      showScreen('screen-game');
      Game.restoreGame(saved);
    }, { once: true });
    modal.querySelector('#resume-btn-new').addEventListener('click', () => {
      close();
      Storage.clearGameState();
    }, { once: true });
    modal.querySelector('#resume-btn-later').addEventListener('click', () => close(), { once: true });

    modal.classList.remove('hidden');
  }

  // ============================================================
  // SAVED BOARDS
  // ============================================================

  function getAllBoards() {
    // Default boards always come first; user-created boards follow
    const userBoards = Storage.loadBoards();
    return [...DEFAULT_BOARDS, ...userBoards];
  }

  function showBoardSelect() {
    Sounds.button();
    const boards = getAllBoards();
    const list = document.getElementById('saved-boards-list');
    const empty = document.getElementById('saved-boards-empty');

    // Empty state only when no user-created boards AND no defaults (shouldn't happen)
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
        const deleteBtn = b.isDefault
          ? `<span class="card-default-badge">${t('designer.builtin_badge')}</span>`
          : `<button class="btn-card-delete" onclick="event.stopPropagation();App.deleteBoard('${b.id}')">✕</button>`;
        return `
          <div class="saved-board-card">
            <div class="card-hero" style="background:${heroGrad}">
              <span class="card-hero-emoji">${T.emoji}</span>
              ${deleteBtn}
            </div>
            <div class="card-content">
              <div class="card-name">${b.isDefault ? t(`designer.default_${b.preset}_name`) : escHtml(b.name || t('misc.unnamed_board'))}</div>
              <div class="card-stats">
                <span class="stat-chip">🐍 ${b.snakes.length} ${t('designer.snakes_stat').toLowerCase()}</span>
                <span class="stat-chip">🪜 ${b.ladders.length} ${t('designer.ladders_stat').toLowerCase()}</span>
                <span class="stat-chip">🎯 ${squares} ${t('misc.squares_abbr')}</span>
              </div>
              <button class="btn-board-play" style="background:${playStyle}" onclick="App.selectBoard('${b.id}')">${t('designer.btn_play')}</button>
            </div>
          </div>`;
      }).join('');
    }

    showScreen('screen-saved-boards');
  }

  function selectBoard(id) {
    const board = getAllBoards().find(b => b.id === id);
    if (!board) return;
    Sounds.button();
    currentBoard = board;
    applyTheme(board.theme);
    showPlayerSetup();
  }

  function deleteBoard(id) {
    Sounds.button();
    showConfirm(t('misc.confirm_delete'), () => {
      Storage.deleteBoard(id);
      showToast(t('misc.board_deleted'));
      showBoardSelect();
    }, { confirmLabel: t('misc.confirm_delete_label'), cancelLabel: t('misc.confirm_keep_label') });
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
    const nameKeys = {
      jungle:  'designer.board_name_jungle',
      space:   'designer.board_name_space',
      ocean:   'designer.board_name_ocean',
      fantasy: 'designer.board_name_fantasy',
      cartoon: 'designer.board_name_cartoon',
    };
    const score = (config.snakes || []).length - (config.ladders || []).length;
    const diffKey = score <= 0 ? 'designer.difficulty_easy' : score <= 2 ? 'designer.difficulty_normal' : score <= 4 ? 'designer.difficulty_tricky' : 'designer.difficulty_hard';
    const name = t(nameKeys[config.theme] || 'designer.board_name_cartoon');
    const difficulty = t(diffKey);
    return { name, difficulty };
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
          <svg viewBox="0 0 16 16" width="14" height="14"><rect x="1" y="1" width="6" height="6" rx="1" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/><rect x="9" y="1" width="6" height="6" rx="1" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/><rect x="1" y="9" width="6" height="6" rx="1" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/><rect x="9" y="9" width="6" height="6" rx="1" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/></svg>
          <div class="ready-stat-val">${config.cols}×${config.rows}</div>
          <div class="ready-stat-lbl">${t('designer.grid_label')}</div>
        </div>
        <div class="ready-stat">
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 13 Q2 8 6 6 Q10 4 9 2" fill="none" stroke="#4CD964" stroke-width="2.5" stroke-linecap="round"/><circle cx="9" cy="1.5" r="2" fill="#4CD964"/></svg>
          <div class="ready-stat-val">${config.snakes.length}</div>
          <div class="ready-stat-lbl">${t('designer.snakes_stat')}</div>
        </div>
        <div class="ready-stat">
          <svg viewBox="0 0 16 16" width="14" height="14"><line x1="5" y1="2" x2="5" y2="14" stroke="#FFB700" stroke-width="2" stroke-linecap="round"/><line x1="11" y1="2" x2="11" y2="14" stroke="#FFB700" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="5" x2="11" y2="5" stroke="#FFE066" stroke-width="1.8" stroke-linecap="round"/><line x1="5" y1="9" x2="11" y2="9" stroke="#FFE066" stroke-width="1.8" stroke-linecap="round"/><line x1="5" y1="13" x2="11" y2="13" stroke="#FFE066" stroke-width="1.8" stroke-linecap="round"/></svg>
          <div class="ready-stat-val">${config.ladders.length}</div>
          <div class="ready-stat-lbl">${t('designer.ladders_stat')}</div>
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
      showToast(t('misc.need_snake_ladder'));
      return null;
    }

    const board = {
      ...config,
      id: Storage.generateId(),
      name: fullName,
      createdAt: Date.now(),
    };
    Storage.saveBoard(board);
    showToast(t('misc.board_saved', { name: fullName }));
    return board;
  }

  // ============================================================
  // PLAYER SETUP
  // ============================================================

  let playerCount = 2;
  let playerSetups = [];

  const THEME_NAME_SETS = {
    cartoon: [
      ['Zap',     'Boing',   'Zippy',   'Dash',    'Pop',     'Fizz'],
      ['Wobble',  'Giggles', 'Tumble',  'Noodle',  'Kazoo',   'Blip'],
      ['Wacky',   'Squish',  'Pudding', 'Doodle',  'Loopy',   'Bonkers'],
      ['Bubbles', 'Whizz',   'Splat',   'Zigzag',  'Boop',    'Twirl'],
    ],
    jungle: [
      ['Mango',   'Koba',    'Tikki',   'Riki',    'Bongo',   'Tuco'],
      ['Zara',    'Nala',    'Kiki',    'Mimi',    'Pika',    'Bindu'],
      ['Rumble',  'Thorn',   'Mossy',   'Fern',    'Bramble', 'Vine'],
      ['Ziggy',   'Pumba',   'Suki',    'Tano',    'Ranga',   'Simba'],
    ],
    space: [
      ['Nova',    'Star',    'Blaze',   'Cosmo',   'Orbit',   'Zap'],
      ['Luna',    'Comet',   'Lyra',    'Nebula',  'Vega',    'Aurora'],
      ['Bolt',    'Pulsar',  'Helix',   'Radar',   'Photon',  'Ion'],
      ['Buzz',    'Eclipse', 'Pixel',   'Cipher',  'Quasar',  'Zenith'],
    ],
    ocean: [
      ['Coral',    'Finn',   'Pearl',   'Splash',  'Crest',   'Ripple'],
      ['Marina',   'Sandy',  'Bubbles', 'Wave',    'Shelby',  'Nemo'],
      ['Tide',     'Orca',   'Brine',   'Trident', 'Kelp',    'Drift'],
      ['Starfish', 'Aqua',   'Pebble',  'Flo',     'Surge',   'Cozy'],
    ],
    fantasy: [
      ['Ember',   'Rune',    'Fable',   'Zira',    'Myth',    'Blaze'],
      ['Pixie',   'Willow',  'Sage',    'Crysta',  'Lyric',   'Dawn'],
      ['Thorin',  'Griffin', 'Arrow',   'Flint',   'Shadow',  'Drake'],
      ['Glimmer', 'Prism',   'Echo',    'Talon',   'Wren',    'Spark'],
    ],
  };

  function getNameSets() {
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    return THEME_NAME_SETS[theme] || THEME_NAME_SETS.cartoon;
  }

  function getThemeCharacters() {
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    const chars = THEME_CHARACTERS[theme] || THEME_CHARACTERS.cartoon;
    return chars.map(c => {
      const key = `characters.${theme}_${c.id}`;
      const translated = I18n.t(key);
      return { ...c, name: translated !== key ? translated : c.name };
    });
  }

  function syncNamesFromDOM() {
    playerSetups.forEach((p, i) => {
      if (p.isBot) return;
      const input = document.getElementById(`pname-input-${i}`);
      if (input && input.value.trim()) p.name = input.value.trim();
    });
  }

  function selectPlayerName(playerIndex, name) {
    if (!playerSetups[playerIndex] || playerSetups[playerIndex].isBot) return;
    playerSetups[playerIndex].name = name;
    Sounds.button();
    const chips = document.querySelectorAll(`#pname-chips-${playerIndex} .player-name-chip`);
    chips.forEach(c => c.classList.toggle('selected', c.textContent.trim() === name));
    const input = document.getElementById(`pname-input-${playerIndex}`);
    if (input) { input.value = name; input.focus(); }
  }

  function handleNameInput(playerIndex, value) {
    if (!playerSetups[playerIndex] || playerSetups[playerIndex].isBot) return;
    const trimmed = value.trim();
    playerSetups[playerIndex].name = trimmed || (getNameSets()[playerIndex] || getNameSets()[0])[0];
    // Deselect all chips when user types manually
    const chips = document.querySelectorAll(`#pname-chips-${playerIndex} .player-name-chip`);
    chips.forEach(c => c.classList.toggle('selected', c.textContent.trim() === trimmed));
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
      <button class="pcount-btn ${n === playerCount ? 'active' : ''}" data-count="${n}">
        ${n}${n === 1 ? `<span class="pcount-vs-bot">${t('setup.vs_bot')}</span>` : ''}
      </button>
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
      const defaultName = (getNameSets()[i] || getNameSets()[0])[0];
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
      const nameSet = getNameSets()[i] || getNameSets()[0];
      // Characters claimed by the *other* players
      const takenEmojis = playerSetups.filter((_, j) => j !== i).map(o => o.character);

      return `
      <div class="player-card" style="animation-delay: ${i * 0.1}s">
        <div class="player-card-header">
          <div class="player-num-badge" style="background:${PLAYER_COLORS[i]}">${i + 1}</div>
          <div class="player-card-title">${t('setup.player_n', { n: i + 1 })}</div>
          ${!isPlayer1 ? `
            <div class="player-type-toggle">
              <button class="ptype-btn ${!isBot ? 'active' : ''}"
                      onclick="App.setPlayerType(${i}, false)" ${forceBot ? 'disabled' : ''}>${t('setup.human')}</button>
              <button class="ptype-btn ${isBot ? 'active' : ''}"
                      onclick="App.setPlayerType(${i}, true)" ${forceBot ? 'disabled' : ''}>${t('setup.cpu')}</button>
            </div>
          ` : `<span class="ptype-static">${t('setup.human')}</span>`}
        </div>
        ${isBot ? '' : `
          <div class="setup-section-label">${t('setup.pick_name')}</div>
          <div class="player-name-input-row">
            <input class="player-name-input"
                   id="pname-input-${i}"
                   type="text"
                   inputmode="text"
                   autocomplete="off"
                   autocorrect="off"
                   spellcheck="false"
                   maxlength="12"
                   placeholder="${t('setup.name_placeholder')}"
                   value="${escHtml(p.name)}"
                   oninput="App.handleNameInput(${i}, this.value)">
            <button class="btn-name-done" onclick="document.getElementById('pname-input-${i}').blur()" aria-label="Done">✓</button>
          </div>
          <div class="player-name-chips" id="pname-chips-${i}">
            ${nameSet.map(name => `
              <button class="player-name-chip ${p.name === name ? 'selected' : ''}"
                      onclick="App.selectPlayerName(${i}, '${escHtml(name)}')">${escHtml(name)}</button>
            `).join('')}
          </div>
          <div class="setup-section-label">${t('setup.pick_character')}</div>
        `}
        ${Components.AvatarSelector(themeChars, p.character, i, takenEmojis)}
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
    // Block all-bot: require at least 1 human
    if (isBot) {
      const otherHumans = playerSetups.slice(0, playerCount).filter((p, i) => i !== playerIndex && !p.isBot);
      if (otherHumans.length === 0) {
        showToast(t('misc.at_least_one_human'));
        return;
      }
    }
    syncNamesFromDOM();
    Sounds.button();
    playerSetups[playerIndex].isBot = isBot;
    playerSetups[playerIndex].name = isBot
      ? t('misc.bot_name', { n: playerIndex + 1 })
      : (getNameSets()[playerIndex] || getNameSets()[0])[0];
    renderPlayerCards();
  }

  function toggleBot(playerIndex) {
    if (!playerSetups[playerIndex]) return;
    if (playerCount === 1 && playerIndex === 1) return;
    setPlayerType(playerIndex, !playerSetups[playerIndex].isBot);
    renderPlayerCards();
  }

  function selectChar(playerIndex, emoji, sound) {
    syncNamesFromDOM();
    playerSetups[playerIndex].character = emoji;
    if (sound) playerSetups[playerIndex].sound = sound;
    // Play the character's sound as a preview
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    if (sound) Sounds.playThemedSound(theme, sound);
    // Re-render all cards so taken characters update across all pickers
    renderPlayerCards();
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
      showToast(t('misc.no_board_selected'));
      return;
    }
    syncNamesFromDOM(); // capture any final edits

    // M2: validate human player names
    const displayCount = playerCount === 1 ? 2 : playerCount;
    for (let i = 0; i < displayCount; i++) {
      const p = playerSetups[i];
      if (!p || p.isBot) continue;
      if (!p.name || !p.name.trim()) {
        showToast(t('misc.player_needs_name', { n: i + 1 }));
        const input = document.getElementById(`pname-input-${i}`);
        if (input) { input.focus(); input.classList.add('input-error'); setTimeout(() => input.classList.remove('input-error'), 1200); }
        return;
      }
    }

    Sounds.button();

    // Collect player data
    const players = playerSetups.slice(0, displayCount).map((p, i) => ({
      name: p.name || (p.isBot ? (getNameSets()[i] || getNameSets()[0])[0] : t('misc.player_fallback', { n: i + 1 })),
      character: p.character,
      color: p.color,
      sound: p.sound,
      isBot: p.isBot || false,
    }));

    _lastGamePlayers = players;
    _lastGameBoard   = currentBoard;

    applyTheme(currentBoard.theme);
    showScreen('screen-game');

    // Update theme background art
    updateThemeBgArt(currentBoard.theme);

    setTimeout(() => {
      Game.init(currentBoard, players);
    }, 100);
  }

  let _lastGamePlayers = null;
  let _lastGameBoard   = null;

  function startGameWithCurrentSetup() {
    if (!_lastGamePlayers || !_lastGameBoard) { showPlayerSetup(); return; }
    applyTheme(_lastGameBoard.theme);
    showScreen('screen-game');
    updateThemeBgArt(_lastGameBoard.theme);
    setTimeout(() => {
      Game.init(_lastGameBoard, _lastGamePlayers);
    }, 100);
  }

  function updateThemeBgArt(theme) {
    const el = document.getElementById('theme-bg-art');
    if (!el) return;
    el.className = 'theme-bg-art theme-bg-' + theme;
  }

  // ============================================================
  // SOUND TOGGLE BUTTONS
  // ============================================================

  let lastTheme = 'cartoon';

  function updateSoundBtnIcons() {
    const sfxBtn   = document.getElementById('btn-sfx-toggle');
    const musicBtn = document.getElementById('btn-music-toggle');
    const sfxOff   = Sounds.isMuted();
    const musicOff = Sounds.isMusicMuted();
    if (sfxBtn)   sfxBtn.innerHTML   = sfxOff   ? Icons.get('sound', 24).replace(/#FFD93D/g, '#888') : Icons.get('sound', 24);
    if (musicBtn) musicBtn.innerHTML = musicOff ? Icons.get('music', 24).replace(/#A78BFA/g, '#888') : Icons.get('music', 24);
  }

  function toggleMusicMute() {
    Sounds.toggleMusic();
    updateSoundBtnIcons();
  }

  function toggleSfxMute() {
    Sounds.toggleSfx();
    updateSoundBtnIcons();
  }

  // ============================================================
  // WINNER SCREEN
  // ============================================================

  function showWinner(gameState, canContinue = false) {
    const winner = gameState.winner || gameState.rankings[gameState.rankings.length - 1];
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
        <div class="stat-value">${winner.turns}</div>
        <div class="stat-label">${t('winner.turns_taken')}</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${winner.snakeBites}</div>
        <div class="stat-label">${t('winner.snake_bites')}</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${winner.laddersClimbed}</div>
        <div class="stat-label">${t('winner.ladders_climbed')}</div>
      </div>
    `;

    const medals = ['🥇','🥈','🥉','4️⃣'];
    document.getElementById('final-scoreboard').innerHTML = sorted.map((p, i) => `
      <div class="score-row">
        <div class="score-rank ${i===0?'gold':''}">${medals[i]||i+1}</div>
        <div class="score-avatar">${p.character}</div>
        <div class="score-name">${escHtml(p.name)}${p.isBot ? ' 🤖' : ''}</div>
        <div class="score-moves">${p.finished ? `${p.turns} ${t('scores.turns_unit')} · 🐍${p.snakeBites} · 🪜${p.laddersClimbed}` : t('game.position_sq', { n: p.position })}</div>
      </div>
    `).join('');

    // Subtitle and continue button
    const place = gameState.rankings.length;
    const subtitle = document.getElementById('winner-subtitle');
    const subtitleKeys = { 1: 'winner.wins', 2: 'winner.second', 3: 'winner.third', 4: 'winner.fourth' };
    if (subtitle) subtitle.textContent = t(subtitleKeys[place] || 'winner.wins');

    const continueBtn = document.getElementById('btn-continue-place');
    if (continueBtn) {
      if (canContinue) {
        const contKeys = { 2: 'winner.btn_continue_2nd', 3: 'winner.btn_continue_3rd', 4: 'winner.btn_continue_4th' };
        continueBtn.textContent = t(contKeys[place + 1] || 'winner.btn_continue_2nd');
        continueBtn.classList.remove('hidden');
      } else {
        continueBtn.classList.add('hidden');
      }
    }

    applyTheme(gameState.board.theme || 'cartoon');
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
      list.innerHTML = `<div style="text-align:center;color:white;padding:40px;font-size:1.2rem;font-weight:700;opacity:0.8">${t('scores.empty')}</div>`;
    } else {
      list.innerHTML = scores.map((s, i) => `
        <div class="score-entry">
          <div class="score-entry-rank">${medals[i] || (i+1)}</div>
          <div class="score-entry-avatar">${s.character || '🎮'}</div>
          <div class="score-entry-info">
            <div class="score-entry-name">${escHtml(s.playerName)}</div>
            <div class="score-entry-meta">${s.boardName || t('misc.unknown_board')} · ${new Date(s.date).toLocaleDateString()}</div>
          </div>
          <div class="score-entry-turns">${s.turns}<span style="font-size:0.7rem;opacity:0.7"> ${t('scores.turns_unit')}</span></div>
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
    // Sound buttons — icons injected here, listeners wired below
    updateSoundBtnIcons();

    // Home buttons
    document.getElementById('btn-home-play').addEventListener('click', () => showBoardSelect());
    document.getElementById('btn-home-design').addEventListener('click', () => showDesigner());
    document.getElementById('btn-home-scores')?.addEventListener('click', () => { Sounds.button(); showScores(); });
    document.getElementById('btn-home-howto')?.addEventListener('click', () => { Sounds.button(); showScreen('screen-how-to-play'); });
    document.getElementById('btn-howto-back')?.addEventListener('click', () => { Sounds.button(); showHome(); });
    document.getElementById('btn-howto-play')?.addEventListener('click', () => { Sounds.button(); showBoardSelect(); });

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
      const snakes = Board.designer.getBoardConfig().snakes;
      const target = Board.designer.targetSnakeCount;
      if (snakes.length < target) {
        showToast(t('misc.add_snakes_first', { n: target }));
        return;
      }
      Sounds.button();
      updateDesignerStep(4);
    });
    document.getElementById('btn-undo-snake').addEventListener('click', () => {
      const snakes = Board.designer.getBoardConfig().snakes;
      if (snakes.length === 0) { showToast(t('misc.no_snakes_undo')); return; }
      Sounds.button();
      Board.designer.selectedSnakeIndex = -1;
      Board.designer.removeSnake(snakes.length - 1);
      Board.designer.setMode('snake-head');
      setSnakeGuideStep(1);
    });

    document.getElementById('snake-del-btn').addEventListener('click', () => {
      const si = Board.designer.selectedSnakeIndex;
      if (si < 0) return;
      Sounds.button();
      Board.designer.selectedSnakeIndex = -1;
      Board.designer.removeSnake(si);
      Board.designer.setMode('snake-head');
      setSnakeGuideStep(1);
      updateSnakeSelection(-1);
      showToast(t('misc.snake_removed'));
    });
    document.getElementById('btn-auto-snakes').addEventListener('click', () => {
      Sounds.button();
      Board.designer.autoPlaceSnakes();
      Board.designer.setMode('idle');
      setSnakeGuideStep(1);
    });

    document.getElementById('btn-step4-back').addEventListener('click', () => { Sounds.button(); updateDesignerStep(3); });
    document.getElementById('btn-step4-next').addEventListener('click', () => {
      const ladders = Board.designer.getBoardConfig().ladders;
      const target = Board.designer.targetLadderCount;
      if (ladders.length < target) {
        showToast(t('misc.add_ladders_first', { n: target }));
        return;
      }
      Sounds.button();
      updateDesignerStep(5);
    });
    document.getElementById('btn-undo-ladder').addEventListener('click', () => {
      const ladders = Board.designer.getBoardConfig().ladders;
      if (ladders.length === 0) { showToast(t('misc.no_ladders_undo')); return; }
      Sounds.button();
      Board.designer.selectedLadderIndex = -1;
      Board.designer.removeLadder(ladders.length - 1);
      Board.designer.setMode('ladder-bottom');
      setLadderGuideStep(1);
    });

    document.getElementById('ladder-del-btn').addEventListener('click', () => {
      const li = Board.designer.selectedLadderIndex;
      if (li < 0) return;
      Sounds.button();
      Board.designer.selectedLadderIndex = -1;
      Board.designer.removeLadder(li);
      Board.designer.setMode('ladder-bottom');
      setLadderGuideStep(1);
      updateLadderSelection(-1);
      showToast(t('misc.ladder_removed'));
    });

    document.getElementById('btn-auto-ladders').addEventListener('click', () => {
      Sounds.button();
      Board.designer.autoPlaceLadders();
      Board.designer.setMode('idle');
      setLadderGuideStep(1);
    });

    document.getElementById('btn-clear-snakes').addEventListener('click', () => {
      const snakes = Board.designer.getBoardConfig().snakes;
      if (snakes.length === 0) { showToast(t('misc.no_snakes_clear')); return; }
      showConfirm(t('misc.remove_all_snakes'), () => {
        while (Board.designer.getBoardConfig().snakes.length > 0) {
          Board.designer.removeSnake(0);
        }
        Board.designer.setMode('snake-head');
        setSnakeGuideStep(1);
        showToast(t('misc.all_snakes_cleared'));
      }, { confirmLabel: t('misc.confirm_yes_clear'), cancelLabel: t('misc.keep_them'), danger: false });
    });

    document.getElementById('btn-clear-ladders').addEventListener('click', () => {
      const ladders = Board.designer.getBoardConfig().ladders;
      if (ladders.length === 0) { showToast(t('misc.no_ladders_clear')); return; }
      showConfirm(t('misc.remove_all_ladders'), () => {
        while (Board.designer.getBoardConfig().ladders.length > 0) {
          Board.designer.removeLadder(0);
        }
        Board.designer.setMode('ladder-bottom');
        setLadderGuideStep(1);
        showToast(t('misc.all_ladders_cleared'));
      }, { confirmLabel: t('misc.confirm_yes_clear'), cancelLabel: t('misc.keep_them'), danger: false });
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

    // Sound toggle buttons
    document.getElementById('btn-sfx-toggle')?.addEventListener('click', () => toggleSfxMute());
    document.getElementById('btn-music-toggle')?.addEventListener('click', () => toggleMusicMute());

    document.getElementById('btn-resume').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
      Storage.clearGameState();
      Game.cleanup();
      showPlayerSetup();
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
      showConfirm(t('misc.confirm_leave_game'), () => {
        Storage.clearGameState();
        Game.cleanup();
        Particles.stop();
        showHome();
      }, { confirmLabel: t('misc.confirm_quit_label'), cancelLabel: t('misc.confirm_stay_label'), danger: true });
    });

    // Winner screen
    document.getElementById('btn-continue-place').addEventListener('click', () => {
      Sounds.button();
      Particles.stop();
      showScreen('screen-game');
      Game.continueForNextPlace();
    });
    document.getElementById('btn-play-again-same').addEventListener('click', () => {
      Sounds.button();
      Particles.stop();
      Game.cleanup();
      startGameWithCurrentSetup();
    });
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
      showConfirm(t('misc.confirm_clear_scores'), () => {
        Storage.clearScores();
        showScores();
      }, { confirmLabel: t('misc.confirm_yes_clear'), cancelLabel: t('misc.confirm_cancel') });
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
        preset: 'large', isDefault: true, cols: 10, rows: 10, total: 100,
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
    selectPlayerName, handleNameInput,
  };
})();

// ---- Guide step helpers (global so board.js can call them) ----
function setSnakeGuideStep(step) {
  const s1 = document.getElementById('sg-step-1');
  const s2 = document.getElementById('sg-step-2');
  if (s1) s1.classList.toggle('sg-active', step === 1);
  if (s2) s2.classList.toggle('sg-active', step === 2);
  // Reset label when returning to step 1
  if (step === 1) {
    const lbl = s1 && s1.querySelector('.sh-label');
    if (lbl) lbl.textContent = t('designer.tap_head');
  }
}

function confirmPlacementCell(type, cellNum) {
  if (type === 'snake-head') {
    const s1 = document.getElementById('sg-step-1');
    if (s1) {
      const lbl = s1.querySelector('.sh-label');
      if (lbl) lbl.textContent = `${t('designer.head')} ✓ (${cellNum})`;
      s1.classList.add('sh-confirmed');
    }
  } else if (type === 'ladder-bottom') {
    const l1 = document.getElementById('lg-step-1');
    if (l1) {
      const lbl = l1.querySelector('.sh-label');
      if (lbl) lbl.textContent = `${t('designer.bottom')} ✓ (${cellNum})`;
      l1.classList.add('sh-confirmed');
    }
  }
}

// ---- Snake selection overlay (global so board.js can call it) ----
function updateSnakeSelection(si) {
  const btn = document.getElementById('snake-del-btn');
  if (!btn) return;
  if (si < 0) { btn.classList.add('hidden'); return; }
  const config = Board.designer.getBoardConfig();
  const snake = config.snakes[si];
  if (!snake) { btn.classList.add('hidden'); return; }
  const canvas = document.getElementById('designer-canvas');
  if (!canvas) { btn.classList.add('hidden'); return; }
  const r = getCellRect(snake.head, config.cols, config.rows, canvas.width, canvas.height);
  const scaleX = canvas.offsetWidth / canvas.width;
  const scaleY = canvas.offsetHeight / canvas.height;
  btn.style.left = (r.cx * scaleX) + 'px';
  btn.style.top  = (r.cy * scaleY) + 'px';
  btn.classList.remove('hidden');
}

function setLadderGuideStep(step) {
  const l1 = document.getElementById('lg-step-1');
  const l2 = document.getElementById('lg-step-2');
  if (l1) l1.classList.toggle('sg-active', step === 1);
  if (l2) l2.classList.toggle('sg-active', step === 2);
  if (step === 1) {
    const lbl = l1 && l1.querySelector('.sh-label');
    if (lbl) lbl.textContent = t('designer.tap_bottom');
    if (l1) l1.classList.remove('sh-confirmed');
  }
}

// ---- Ladder selection overlay (global so board.js can call it) ----
function updateLadderSelection(li) {
  const btn = document.getElementById('ladder-del-btn');
  if (!btn) return;
  if (li < 0) { btn.classList.add('hidden'); return; }
  const config = Board.designer.getBoardConfig();
  const ladder = config.ladders[li];
  if (!ladder) { btn.classList.add('hidden'); return; }
  const canvas = document.getElementById('designer-canvas');
  if (!canvas) { btn.classList.add('hidden'); return; }
  // Position near bottom rung (more accessible, won't overlap with top cells)
  const r = getCellRect(ladder.bottom, config.cols, config.rows, canvas.width, canvas.height);
  const scaleX = canvas.offsetWidth / canvas.width;
  const scaleY = canvas.offsetHeight / canvas.height;
  btn.style.left = (r.cx * scaleX) + 'px';
  btn.style.top  = (r.cy * scaleY) + 'px';
  btn.classList.remove('hidden');
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
  const count = document.getElementById('snake-count');
  const countTarget = document.getElementById('snake-count-target');
  const continueBtn = document.getElementById('btn-step3-next');
  const continueHint = document.getElementById('step3-continue-hint');
  const snakes = Board.designer.getBoardConfig().snakes;
  const target = Board.designer.targetSnakeCount;
  if (count) count.textContent = snakes.length;
  if (countTarget) countTarget.textContent = target;
  const met = snakes.length >= target;
  if (continueBtn) continueBtn.disabled = !met;
  if (continueHint) continueHint.classList.toggle('hidden', met);
  // Update snake delete overlay position if a snake was removed
  updateSnakeSelection(Board.designer.selectedSnakeIndex);
}

function updateLadderList() {
  const count = document.getElementById('ladder-count');
  const countTarget = document.getElementById('ladder-count-target');
  const continueBtn = document.getElementById('btn-step4-next');
  const continueHint = document.getElementById('step4-continue-hint');
  const ladders = Board.designer.getBoardConfig().ladders;
  const target = Board.designer.targetLadderCount;
  if (count) count.textContent = ladders.length;
  if (countTarget) countTarget.textContent = target;
  const met = ladders.length >= target;
  if (continueBtn) continueBtn.disabled = !met;
  if (continueHint) continueHint.classList.toggle('hidden', met);
  updateLadderSelection(Board.designer.selectedLadderIndex);
}

// ---- showConfirm ----
function showConfirm(message, onConfirm, opts = {}) {
  const {
    confirmLabel = 'Yes, delete', cancelLabel = 'Cancel', danger = true,
    thirdLabel = null, onThird = null, onCancel = null,
  } = (typeof opts === 'object' && opts !== null && !Array.isArray(opts)) ? opts : {};
  let modal = document.getElementById('confirm-modal');
  if (!modal) {
    const div = document.createElement('div');
    div.className = 'popup-modal hidden';
    div.id = 'confirm-modal';
    div.setAttribute('role', 'dialog');
    div.innerHTML = '<div class="popup-modal-card"></div>';
    document.body.appendChild(div);
    modal = div;
  }
  const card = modal.querySelector('.popup-modal-card');
  card.innerHTML = `
    <div class="popup-modal-body" id="confirm-modal-msg"></div>
    <div class="popup-modal-buttons">
      <button class="btn btn-md ${danger ? 'btn-red' : 'btn-blue'} btn-full" id="confirm-modal-ok">${escHtml(confirmLabel)}</button>
      ${thirdLabel ? `<button class="btn btn-md btn-neutral btn-full" id="confirm-modal-third">${escHtml(thirdLabel)}</button>` : ''}
      <button class="btn btn-md btn-ghost-dk btn-full" id="confirm-modal-cancel">${escHtml(cancelLabel)}</button>
    </div>`;
  card.querySelector('#confirm-modal-msg').textContent = message;
  modal.classList.remove('hidden');
  const close = () => modal.classList.add('hidden');
  card.querySelector('#confirm-modal-ok').addEventListener('click', () => { close(); onConfirm(); }, { once: true });
  card.querySelector('#confirm-modal-cancel').addEventListener('click', () => { close(); if (onCancel) onCancel(); }, { once: true });
  if (thirdLabel) card.querySelector('#confirm-modal-third').addEventListener('click', () => { close(); if (onThird) onThird(); }, { once: true });
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

// Pause music when the app is backgrounded (Android home button, task switcher, etc.)
// Resume when the player comes back, but only if music wasn't manually muted.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Sounds.stopMusic();
  } else {
    Sounds.resumeMusic();
  }
});
