/* ============================================================
   APP — Screen management, navigation, designer & setup UI
   ============================================================ */

const App = (() => {

  let currentBoard = null; // board config selected for play
  const VALID_THEMES = ['jungle', 'space', 'ocean', 'fantasy', 'cartoon'];
  let _setupReturnTo = 'boards'; // 'boards' | 'home' | 'designer'

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
         <span class="resume-avatar">${escHtml(p.character)}</span>
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
          <span class="resume-turn-avatar">${escHtml(current.character)}</span>
          <span class="resume-turn-text">${t('resume.whose_turn', { name: escHtml(current.name) })}</span>
        </div>
        <div class="popup-modal-buttons" style="margin-top:24px">
          <button class="btn btn-md btn-green btn-full" id="resume-btn-resume">${t('resume.btn_resume')}</button>
          <button class="btn btn-md btn-neutral btn-full" id="resume-btn-new">${t('resume.btn_new')}</button>
          <button class="btn btn-md btn-ghost-dk btn-full" id="resume-btn-later">${t('resume.btn_later')}</button>
        </div>
      </div>`;

    const close = () => { modal.classList.add('hidden'); _releaseFocusTrap(); };
    modal.querySelector('#resume-btn-resume').addEventListener('click', () => {
      close();
      applyTheme(theme);
      showScreen('screen-game');
      Board.startBoardAnim(theme);
      Game.restoreGame(saved);
    }, { once: true });
    modal.querySelector('#resume-btn-new').addEventListener('click', () => {
      close();
      Storage.clearGameState();
    }, { once: true });
    modal.querySelector('#resume-btn-later').addEventListener('click', () => close(), { once: true });

    modal.classList.remove('hidden');
    _trapFocus(modal);
  }

  // ============================================================
  // SAVED BOARDS
  // ============================================================

  function getAllBoards() {
    // Default boards always come first; user-created boards follow
    const userBoards = Storage.loadBoards();
    return [...DEFAULT_BOARDS, ...userBoards];
  }

  function startQuickPlay() {
    Sounds.button();
    const sizes = ['default-small', 'default-medium', 'default-large'];
    const themes = ['jungle', 'space', 'ocean', 'fantasy', 'cartoon'];
    const baseId = sizes[Math.floor(Math.random() * sizes.length)];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const base = DEFAULT_BOARDS.find(b => b.id === baseId);
    currentBoard = { ...base, theme, id: 'quick-' + Storage.generateId(), name: '' };
    applyTheme(theme);
    showPlayerSetup(undefined, 'home');
  }

  function showBoardSelect(silent = false) {
    if (!silent) Sounds.button();
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
      const playGrads = {
        jungle:  'linear-gradient(135deg,#22c55e,#15803d); box-shadow:0 5px 0 #14532d',
        space:   'linear-gradient(135deg,#818cf8,#4338ca); box-shadow:0 5px 0 #312e81',
        ocean:   'linear-gradient(135deg,#38bdf8,#0284c7); box-shadow:0 5px 0 #0369a1',
        fantasy: 'linear-gradient(135deg,#c084fc,#9333ea); box-shadow:0 5px 0 #6b21a8',
        cartoon: 'linear-gradient(135deg,#fb7185,#e11d48); box-shadow:0 5px 0 #9f1239',
      };
      list.innerHTML = boards.map(b => {
        const theme = VALID_THEMES.includes(b.theme) ? b.theme : 'cartoon';
        const name = b.isDefault
          ? t('designer.default_' + (b.preset || 'large') + '_name')
          : escHtml(b.name || t('misc.unnamed_board'));
        const cols = b.cols || 10;
        const rows = b.rows || 10;
        const cornerEl = b.isDefault
          ? `<span class="card-star-badge" aria-label="${t('designer.builtin_badge')}">⭐</span>`
          : `<button class="btn-card-delete" data-action="delete" data-board-id="${escHtml(b.id)}" aria-label="Delete board">✕</button>`;
        return `
          <div class="saved-board-card" data-action="select" data-board-id="${escHtml(b.id)}">
            <div class="card-thumb" style="background-image:url('img/theme-${theme}.png')"></div>
            <div class="card-info">
              <div class="card-name">${name}</div>
              <div class="card-details">
                <span class="card-size">${cols}×${rows}</span>
                <span class="card-count">🐍 ${b.snakes.length}</span>
                <span class="card-count">🪜 ${b.ladders.length}</span>
              </div>
            </div>
            ${cornerEl}
          </div>`;
      }).join('');
      list.onclick = (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.boardId;
        if (btn.dataset.action === 'delete') {
          e.stopPropagation();
          deleteBoard(id);
        } else if (btn.dataset.action === 'select') {
          selectBoard(id);
        }
      };
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
    const board = getAllBoards().find(b => b.id === id);
    if (!board) return;
    const boardName = board.isDefault
      ? t('designer.default_' + (board.preset || 'large') + '_name')
      : escHtml(board.name || t('misc.unnamed_board'));
    const theme = VALID_THEMES.includes(board.theme) ? board.theme : 'cartoon';
    showConfirm('', () => {
      Storage.deleteBoard(id);
      showToast(t('misc.board_deleted'));
      showBoardSelect();
    }, {
      bodyHtml: `
        <div class="delete-confirm-thumb" style="background-image:url('img/theme-${theme}.png')"></div>
        <div class="delete-confirm-name">${boardName}</div>
        <p class="delete-confirm-msg">${t('misc.confirm_delete')}</p>`,
      confirmLabel: t('misc.confirm_delete_label'),
      cancelLabel: t('misc.confirm_keep_label'),
    });
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
    updateSnakeHintIcon(theme);
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
    return { name, difficulty, diffKey };
  }

  function goToStep5() {
    const config = Board.designer.getBoardConfig();
    const { name, difficulty, diffKey } = generateBoardName(config);

    const display = document.getElementById('board-name-display');
    if (display) display.textContent = name;

    const badge = document.getElementById('board-diff-badge');
    if (badge) {
      const diffSlug = diffKey.replace('designer.difficulty_', ''); // e.g. 'easy', 'normal', 'tricky', 'hard'
      badge.textContent = difficulty;
      badge.className = 'board-diff-badge diff-' + diffSlug;
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

    const userBoards = Storage.loadBoards();
    if (userBoards.length >= Storage.MAX_USER_BOARDS) {
      showToast(t('misc.board_limit_toast', { max: Storage.MAX_USER_BOARDS }));
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

  function showPlayerSetup(prefillPlayers, returnTo = 'boards') {
    _setupReturnTo = returnTo;
    if (prefillPlayers) {
      playerCount = prefillPlayers.length;
      playerSetups = prefillPlayers.map(p => ({ ...p }));
    } else {
      playerCount = 2;
      playerSetups = [];
    }
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
                   enterkeyhint="done"
                   autocomplete="off"
                   autocorrect="off"
                   spellcheck="false"
                   maxlength="12"
                   placeholder="${t('setup.name_placeholder')}"
                   value="${escHtml(p.name)}"
                   oninput="App.handleNameInput(${i}, this.value)"
                   onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault();}"
                   aria-label="${t('setup.player_n', { n: i + 1 })} name">
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
    Board.startBoardAnim(currentBoard.theme);

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
    Board.startBoardAnim(_lastGameBoard.theme);
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
    if (sfxBtn)   sfxBtn.innerHTML   = (sfxOff   ? Icons.get('sound', 22).replace(/#FFD93D/g, '#aaa') : Icons.get('sound', 22)) + `<span>${sfxOff ? t('misc.sfx_off') : t('misc.sfx_on')}</span>`;
    if (musicBtn) musicBtn.innerHTML = (musicOff ? Icons.get('music', 22).replace(/#A78BFA/g, '#aaa') : Icons.get('music', 22)) + `<span>${musicOff ? t('misc.music_off_short') : t('misc.music_on_short')}</span>`;
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
    Board.stopBoardAnim();
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
        <div class="score-avatar">${escHtml(p.character)}</div>
        <div class="score-name">${escHtml(p.name)}${p.isBot ? ' 🤖' : ''}</div>
        <div class="score-moves">${p.finished ? `${p.turns} ${p.turns === 1 ? t('scores.turns_unit_singular') : t('scores.turns_unit')} · 🐍${p.snakeBites} · 🪜${p.laddersClimbed}` : t('game.position_sq', { n: p.position })}</div>
      </div>
    `).join('');

    // Subtitle and continue button
    const place = gameState.rankings.length;
    const subtitle = document.getElementById('winner-subtitle');
    const subtitleKeys = { 1: 'winner.wins', 2: 'winner.second', 3: 'winner.third', 4: 'winner.fourth' };
    if (subtitle) subtitle.textContent = t(subtitleKeys[place] || 'winner.wins');

    const continueBtn = document.getElementById('btn-continue-place');
    if (continueBtn) {
      const shouldShow = canContinue;
      if (shouldShow) {
        const contKeys = { 2: 'winner.btn_continue_2nd', 3: 'winner.btn_continue_3rd', 4: 'winner.btn_continue_4th' };
        continueBtn.textContent = t(contKeys[place + 1] || 'winner.btn_continue_2nd');
        continueBtn.classList.remove('hidden');
      } else {
        continueBtn.classList.add('hidden');
      }
    }

    _lastGamePlayers = gameState.players.map(p => ({ name: p.name, character: p.character, color: p.color, sound: p.sound, isBot: p.isBot || false }));
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
          <div class="score-entry-avatar">${escHtml(s.character || '🎮')}</div>
          <div class="score-entry-info">
            <div class="score-entry-name">${escHtml(s.playerName)}</div>
            <div class="score-entry-meta">${escHtml(s.boardName || '') || t('misc.unknown_board')} · ${new Date(s.date).toLocaleDateString(I18n.getLanguage())}</div>
          </div>
          <div class="score-entry-turns">${s.turns}<span style="font-size:0.7rem;opacity:0.7"> ${s.turns === 1 ? t('scores.turns_unit_singular') : t('scores.turns_unit')}</span></div>
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
    // Sync iOS status bar color and text style with theme
    const SB = window.Capacitor?.Plugins?.StatusBar;
    if (SB) {
      const bgColors = {
        cartoon: '#FF4D6D', jungle: '#22C55E', space: '#1e1b4b',
        ocean: '#0284C7',   fantasy: '#9333EA'
      };
      const darkBg = ['space', 'fantasy'];
      SB.setBackgroundColor({ color: bgColors[theme] || bgColors.cartoon }).catch(() => {});
      SB.setStyle({ style: darkBg.includes(theme) ? 'LIGHT' : 'DARK' }).catch(() => {});
    }
  }

  // ============================================================
  // INIT — Wire up all event listeners
  // ============================================================

  function init() {
    // Inject SVG icons
    const iconQuickPlay = document.querySelector('#btn-home-quick-play .home-btn-icon');
    if (iconQuickPlay) iconQuickPlay.innerHTML = Icons.get('dice', 36);
    const iconPlay = document.querySelector('#btn-home-play .home-btn-icon');
    if (iconPlay) iconPlay.innerHTML = Icons.get('play', 36);
    const iconPalette = document.querySelector('#btn-home-design .home-btn-icon');
    if (iconPalette) iconPalette.innerHTML = Icons.get('palette', 36);
    const iconBoards = document.querySelector('#btn-home-scores .home-btn-icon');
    if (iconBoards) iconBoards.innerHTML = Icons.get('ladder', 28);
    const iconMenuBtn = document.getElementById('icon-menu-btn');
    if (iconMenuBtn) iconMenuBtn.innerHTML = Icons.get('menu', 26);
    // Dice is tappable directly — no roll button
    // Sound buttons — icons injected here, listeners wired below
    updateSoundBtnIcons();

    // Home buttons
    document.getElementById('btn-home-quick-play').addEventListener('click', () => startQuickPlay());
    document.getElementById('btn-home-play').addEventListener('click', () => { Sounds.button(); showBoardSelect(); });
    document.getElementById('btn-home-design').addEventListener('click', () => showDesigner());
    document.getElementById('btn-home-scores')?.addEventListener('click', () => { Sounds.button(); showScores(); });
    document.getElementById('btn-home-howto')?.addEventListener('click', () => { Sounds.button(); showScreen('screen-how-to-play'); });
    document.getElementById('btn-howto-back')?.addEventListener('click', () => { Sounds.button(); showHome(); });
    document.getElementById('btn-home-privacy')?.addEventListener('click', () => showScreen('screen-privacy'));
    document.getElementById('btn-privacy-back')?.addEventListener('click', () => showHome());
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

    document.getElementById('btn-save-board').addEventListener('click', (e) => {
      Sounds.button();
      e.currentTarget.disabled = true;
      saveBoard();
      // Re-enable after a tick so a new board name can be saved if the user edits and retries
      setTimeout(() => { e.currentTarget.disabled = false; }, 1500);
    });
    document.getElementById('btn-play-now').addEventListener('click', () => {
      Sounds.button();
      const board = saveBoard() || Board.designer.getBoardConfig();
      if (!board) return;
      currentBoard = board;
      if (!currentBoard.id) currentBoard.id = Storage.generateId();
      applyTheme(currentBoard.theme);
      showPlayerSetup(undefined, 'designer');
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
    // Pre-select first theme if none selected
    const firstCard = document.querySelector('.theme-card');
    if (firstCard && !document.querySelector('.theme-card.selected')) {
      firstCard.classList.add('selected');
      applyTheme(firstCard.dataset.theme);
      if (themeContinueBtn) themeContinueBtn.disabled = false;
    }


    // Player setup
    document.getElementById('btn-setup-back').addEventListener('click', () => {
      const returnTo = _setupReturnTo;
      _setupReturnTo = 'boards';
      if (returnTo === 'designer') {
        showScreen('screen-designer');
      } else if (returnTo === 'home') {
        showHome();
      } else {
        showBoardSelect();
      }
    });
    // Player count buttons are rendered dynamically in renderPlayerCountBtns()
    document.getElementById('btn-lets-play').addEventListener('click', () => startGame());

    // Tappable dice
    document.getElementById('dice').addEventListener('click', () => {
      Game.rollDice();
    });

    document.getElementById('btn-game-menu').addEventListener('click', () => {
      Sounds.button();
      const overlay = document.getElementById('game-menu-overlay');
      overlay.classList.remove('hidden');
      _trapFocus(overlay);
    });

    // Sound toggle buttons
    document.getElementById('btn-sfx-toggle')?.addEventListener('click', () => toggleSfxMute());
    document.getElementById('btn-music-toggle')?.addEventListener('click', () => toggleMusicMute());

    document.getElementById('btn-resume').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
      _releaseFocusTrap();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
      _releaseFocusTrap();
      Storage.clearGameState();
      Game.cleanup();
      showPlayerSetup();
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      Sounds.button();
      document.getElementById('game-menu-overlay').classList.add('hidden');
      _releaseFocusTrap();
      showConfirm(t('misc.confirm_leave_game'), () => {
        Storage.clearGameState();
        Game.cleanup();
        Particles.stop();
        Board.stopBoardAnim();
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
      showPlayerSetup(_lastGamePlayers || undefined);
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
        name: t('designer.default_large_name'),
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

    // Capacitor hardware back button (Android) / swipe-back support
    window.Capacitor?.Plugins?.App?.addListener('backButton', () => {
      // Close any open overlay first
      const overlay = document.querySelector('.popup-modal:not(.hidden), #game-menu-overlay:not(.hidden)');
      if (overlay) { overlay.classList.add('hidden'); return; }
      // Navigate back based on active screen
      const active = document.querySelector('.screen.active');
      if (!active) return;
      const id = active.id;
      if (id === 'screen-game') {
        document.getElementById('game-menu-overlay')?.classList.remove('hidden');
      } else if (id === 'screen-player-setup') {
        showBoardSelect();
      } else if (id === 'screen-designer') {
        if (designerStep > 1) updateDesignerStep(designerStep - 1);
        else showHome();
      } else if (id !== 'screen-home') {
        showHome();
      }
    });

    // Re-render active JS-rendered screen on language change
    document.addEventListener('applanguagechange', () => {
      const active = document.querySelector('.screen.active');
      if (!active) return;
      const id = active.id;
      if (id === 'screen-saved-boards') showBoardSelect(true);
      else if (id === 'screen-player-setup') renderPlayerCards();
      else if (id === 'screen-scores') showScores();
      // winner screen uses textContent (set via t()), so translateDOM() already handles it
    });

    // Show home
    showHome();
  }

  // ============================================================
  // MINI BOARD PREVIEWS (size picker)
  // ============================================================

  function drawMiniBoards() {
    const images = { small: 'img/board-small.png', medium: 'img/board-medium.png', classic: 'img/board-classic.png' };
    document.querySelectorAll('.size-card').forEach(card => {
      const container = card.querySelector('.size-mini-svg');
      if (!container || !images[card.dataset.size]) return;
      container.innerHTML = `<img src="${images[card.dataset.size]}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    });
  }

  return {
    init, showHome, startQuickPlay, showBoardSelect, showDesigner,
    showPlayerSetup, showWinner, showScores,
    selectBoard, deleteBoard,
    selectChar, selectColor,
    toggleBot, setPlayerType, toggleMusicMute,
    selectPlayerName, handleNameInput,
  };
})();

// ---- Guide step helpers (global so board.js can call them) ----
function updateSnakeHintIcon(theme) {
  const iconEl = document.querySelector('#sg-step-1 .sh-icon');
  if (!iconEl) return;
  const spriteSrc = `img/snake-head-${theme}.png`;
  // Check if sprite file exists by trying to load it
  const testImg = new Image();
  testImg.onload = () => {
    iconEl.innerHTML = `<img src="${spriteSrc}" style="width:40px;height:40px;object-fit:contain;display:block;">`;
  };
  testImg.onerror = () => {
    // No sprite for this theme — keep the default SVG (already in HTML)
    iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <ellipse cx="16" cy="15" rx="13" ry="12" fill="#1e6b2a"/>
      <ellipse cx="16" cy="14" rx="12" ry="11" fill="#4CD964"/>
      <circle cx="11" cy="11.5" r="3.2" fill="white"/>
      <circle cx="21" cy="11.5" r="3.2" fill="white"/>
      <circle cx="11.7" cy="11.8" r="1.7" fill="#111"/>
      <circle cx="21.7" cy="11.8" r="1.7" fill="#111"/>
      <path d="M13 18.5 Q16 21 19 18.5" fill="none" stroke="#1e6b2a" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="16" y1="24.5" x2="16" y2="29" stroke="#FF4444" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="16" y1="29" x2="13.2" y2="32" stroke="#FF4444" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="16" y1="29" x2="18.8" y2="32" stroke="#FF4444" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  };
  testImg.src = spriteSrc;
}

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

// ---- Focus trap for modals ----
let _focusTrapListener = null;
let _focusTrapReturnEl = null;

function _trapFocus(container) {
  _focusTrapReturnEl = document.activeElement;
  const focusable = () => Array.from(container.querySelectorAll(
    'button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
  ));
  const first = focusable()[0];
  if (first) first.focus();
  if (_focusTrapListener) document.removeEventListener('keydown', _focusTrapListener);
  _focusTrapListener = (e) => {
    if (e.key !== 'Tab') return;
    const els = focusable();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', _focusTrapListener);
}

function _releaseFocusTrap() {
  if (_focusTrapListener) { document.removeEventListener('keydown', _focusTrapListener); _focusTrapListener = null; }
  if (_focusTrapReturnEl) { _focusTrapReturnEl.focus(); _focusTrapReturnEl = null; }
}

// ---- showConfirm ----
function showConfirm(message, onConfirm, opts = {}) {
  const {
    confirmLabel = t('misc.confirm_delete_label'), cancelLabel = t('misc.confirm_cancel'), danger = true,
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
  const msgEl = card.querySelector('#confirm-modal-msg');
  if (opts.bodyHtml) {
    msgEl.innerHTML = opts.bodyHtml;
  } else {
    msgEl.textContent = message;
  }
  modal.classList.remove('hidden');
  _trapFocus(modal);
  const close = () => { modal.classList.add('hidden'); _releaseFocusTrap(); };
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
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
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
