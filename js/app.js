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
    if (age > GAME_RESUME_MAX_AGE_MS) { Storage.clearGameState(); return; }
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
                <span class="card-count" data-preview="snake" data-theme="${theme}"> ${b.snakes.length}</span>
                <span class="card-count" data-preview="ladder" data-theme="${theme}"> ${b.ladders.length}</span>
              </div>
            </div>
            ${cornerEl}
          </div>`;
      }).join('');

      // Inject themed canvas snake/ladder icons (can't do this via innerHTML)
      list.querySelectorAll('.card-count[data-preview]').forEach(el => {
        const canvas = el.dataset.preview === 'snake'
          ? Board.snakePreviewCanvas(el.dataset.theme, 40)
          : Board.ladderPreviewCanvas(el.dataset.theme, 40);
        canvas.style.cssText = 'width:20px;height:20px;vertical-align:middle;margin-right:2px;';
        el.prepend(canvas);
      });

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
    Game.haptic('light');
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
    maybeShowSnakeDemo();
  }

  function goToStep4() {
    const canvas = document.getElementById('designer-canvas');
    const wrap = document.getElementById('guided-board-wrap-4');
    if (wrap && canvas.parentElement !== wrap) wrap.appendChild(canvas);
    Board.designer.setMode('ladder-bottom');
    setLadderGuideStep(1);
    updateLadderList();
    maybeShowLadderDemo();
  }

  function generateBoardName(config) {
    const theme = config.theme || 'cartoon';
    const names = t('designer.board_names_' + theme) || t('designer.board_names_cartoon');
    const idx = ((config.snakes || []).length + (config.ladders || []).length) % names.length;
    return { name: names[idx] };
  }

  let _autoSavedBoard = null;
  let _autoSavedSig   = '';

  function goToStep5() {
    const config = Board.designer.getBoardConfig();
    const { name } = generateBoardName(config);

    // Board name display
    const display = document.getElementById('board-name-display');
    if (display) display.textContent = name;
    // Reset inline edit state
    const nameInput = document.getElementById('board-name-input');
    if (nameInput) { nameInput.classList.add('hidden'); nameInput.value = name; }
    const editBtn = document.getElementById('btn-name-edit');
    if (editBtn) editBtn.style.display = '';

    // Theme hero image
    const heroImg = document.getElementById('board-ready-hero-img');
    if (heroImg) heroImg.src = `img/theme-${config.theme}.png`;

    // Stats
    const stats = document.getElementById('board-ready-stats');
    if (stats) {
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

    // Auto-save (once per unique config)
    const sig = `${config.preset}-${config.theme}-${config.snakes.length}-${config.ladders.length}`;
    if (!_autoSavedBoard || _autoSavedSig !== sig) {
      const userBoards = Storage.loadBoards();
      if (userBoards.length < Storage.MAX_USER_BOARDS) {
        _autoSavedBoard = { ...config, id: Storage.generateId(), name, createdAt: Date.now() };
        Storage.saveBoard(_autoSavedBoard);
        _autoSavedSig = sig;
        showToast('✅ ' + t('misc.board_saved', { name }));
      } else {
        _autoSavedBoard = null;
        _autoSavedSig = '';
        showToast(t('misc.board_limit_toast', { max: Storage.MAX_USER_BOARDS }));
      }
    }

    // Confetti burst
    requestAnimationFrame(() => launchBoardReadyConfetti());
  }

  function launchBoardReadyConfetti() {
    const canvas = document.getElementById('board-ready-confetti');
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || canvas.clientWidth  || 300;
    canvas.height = canvas.offsetHeight || canvas.clientHeight || 100;
    const ctx = canvas.getContext('2d');
    const COLORS = ['#FFD700','#4CD964','#FF6B6B','#4FC3F7','#FF8C42','#A855F7','#FFBE0B','#fff'];
    const pieces = Array.from({ length: 72 }, () => ({
      x:  Math.random() * canvas.width,
      y:  -8 - Math.random() * 40,
      w:  5 + Math.random() * 7,
      h:  3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 360,
      vx: (Math.random() - 0.5) * 3.5,
      vy: 1.8 + Math.random() * 3,
      vr: (Math.random() - 0.5) * 9,
    }));
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of pieces) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.rot += p.vr;
        if (p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, 1 - (p.y / (canvas.height * 1.2)));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
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
    const { name } = generateBoardName(config);
    const fullName = name;

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
  // PLAYER SETUP WIZARD
  // ============================================================

  let playerCount = 2;
  let playerSetups = [];
  let setupWizardPhase = 'count';  // 'count' | 'player' | 'summary'
  let setupCurrentPlayer = 0;
  let _currentVVHandler = null;

  function getThemeCharacters() {
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    const chars = THEME_CHARACTERS[theme] || THEME_CHARACTERS.cartoon;
    return chars.map(c => {
      const key = `characters.${theme}_${c.id}`;
      const translated = I18n.t(key);
      return { ...c, name: translated !== key ? translated : c.name };
    });
  }

  function getWizardNameSet() {
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    return t('setup.names_' + theme) || ['Player'];
  }

  function syncCurrentPlayerName(idx) {
    const input = document.getElementById(`swiz-name-input-${idx}`);
    if (input && playerSetups[idx] && !playerSetups[idx].isBot) {
      const trimmed = sanitiseName(input.value, 12);
      if (trimmed) playerSetups[idx].name = trimmed;
    }
  }

  function cleanupVVHandler() {
    if (_currentVVHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', _currentVVHandler);
      _currentVVHandler = null;
    }
    // reset any footer transform
    const footer = document.querySelector('.swiz-player-footer');
    if (footer) footer.style.transform = '';
  }

  // ---- Entry point ----
  function showPlayerSetup(prefillPlayers, returnTo = 'boards') {
    cleanupVVHandler();
    _setupReturnTo = returnTo;
    if (prefillPlayers) {
      playerCount = prefillPlayers.length;
      playerSetups = prefillPlayers.map(p => ({ ...p }));
    } else {
      playerCount = 2;
      playerSetups = [];
    }
    setupWizardPhase = 'count';
    setupCurrentPlayer = 0;
    showScreen('screen-player-setup');
    applyTheme(currentBoard?.theme || 'cartoon');
    renderSetupWizard();
  }

  function renderSetupWizard() {
    const root = document.getElementById('setup-wizard-root');
    if (!root) return;
    cleanupVVHandler();
    if (setupWizardPhase === 'count') {
      root.innerHTML = buildCountStepHTML();
      wireCountStep();
    } else if (setupWizardPhase === 'player') {
      root.innerHTML = buildPlayerStepHTML(setupCurrentPlayer);
      wirePlayerStep(setupCurrentPlayer);
    } else {
      assignBotCharacters();
      root.innerHTML = buildSummaryStepHTML();
      wireSummaryStep();
    }
  }

  // ---- Count step ----
  function buildCountStepHTML() {
    const count = playerCount || 2;
    // Slot types: index 0 = Player 1 (always human), 1-3 default bot unless existing setup says human
    const slotIsBot = [false, true, true, true];
    if (playerSetups.length >= 2) slotIsBot[1] = playerSetups[1]?.isBot !== false;
    if (playerSetups.length >= 3) slotIsBot[2] = playerSetups[2]?.isBot !== false;
    if (playerSetups.length >= 4) slotIsBot[3] = playerSetups[3]?.isBot !== false;

    const slotRows = [1, 2, 3].map(i => {
      const hidden = i >= count ? ' swiz-slot-hidden' : '';
      const isBot = slotIsBot[i];
      return `
      <div class="swiz-player-slot${hidden}" data-slot="${i}">
        <div class="swiz-slot-num" style="background:${PLAYER_COLORS[i]}">${i + 1}</div>
        <div class="swiz-slot-label">${t('setup.player_n', { n: i + 1 })}</div>
        <div class="swiz-type-toggle" id="swiz-type-toggle-${i}">
          <button class="swiz-type-btn${!isBot ? ' active' : ''}" data-slot="${i}" data-type="human">👤 ${t('setup.toggle_human')}</button>
          <button class="swiz-type-btn${isBot ? ' active' : ''}" data-slot="${i}" data-type="bot">🤖 ${t('setup.toggle_bot')}</button>
        </div>
      </div>`;
    }).join('');

    return `<div class="swiz-count">
      <div class="swiz-back-row">
        <button class="btn btn-sm btn-ghost-dk" id="btn-swiz-count-back">${t('setup.btn_back')}</button>
      </div>
      <div class="swiz-count-body">
        <h1 class="swiz-count-title">${t('setup.count_title')}</h1>
        <div class="swiz-num-tabs">
          <button class="swiz-num-tab${count === 2 ? ' active' : ''}" data-count="2">2</button>
          <button class="swiz-num-tab${count === 3 ? ' active' : ''}" data-count="3">3</button>
          <button class="swiz-num-tab${count === 4 ? ' active' : ''}" data-count="4">4</button>
        </div>
        <div class="swiz-player-slots">
          <div class="swiz-player-slot swiz-slot-you">
            <div class="swiz-slot-num" style="background:${PLAYER_COLORS[0]}">1</div>
            <div class="swiz-slot-label">${t('setup.player_n', { n: 1 })}</div>
            <div class="swiz-slot-you-badge">🔒 👤 ${t('setup.toggle_human')}</div>
          </div>
          ${slotRows}
        </div>
        <div class="swiz-count-summary" id="swiz-count-summary"></div>
      </div>
      <div class="swiz-count-footer">
        <button class="btn btn-lg btn-green btn-full" id="btn-swiz-count-next">${t('setup.btn_next')}</button>
      </div>
    </div>`;
  }

  function wireCountStep() {
    let currentCount = playerCount || 2;
    // Mirror initial bot state from HTML (derived from playerSetups above)
    const slotIsBot = [false, true, true, true];
    if (playerSetups.length >= 2) slotIsBot[1] = playerSetups[1]?.isBot !== false;
    if (playerSetups.length >= 3) slotIsBot[2] = playerSetups[2]?.isBot !== false;
    if (playerSetups.length >= 4) slotIsBot[3] = playerSetups[3]?.isBot !== false;

    function updateSummary() {
      let humans = 1; // Player 1 always human
      for (let i = 1; i < currentCount; i++) if (!slotIsBot[i]) humans++;
      const bots = currentCount - humans;
      const el = document.getElementById('swiz-count-summary');
      if (el) {
        const pWord = t(humans === 1 ? 'setup.player_singular' : 'setup.player_plural');
        if (bots === 0) {
          el.textContent = `${humans} ${pWord}`;
        } else {
          const bWord = t(bots === 1 ? 'setup.bot_singular' : 'setup.bot_plural');
          el.textContent = `${humans} ${pWord} + ${bots} ${bWord}`;
        }
      }
    }
    updateSummary();

    document.getElementById('btn-swiz-count-back')?.addEventListener('click', () => {
      Sounds.button();
      _wizardGoBackToOrigin();
    });

    document.querySelectorAll('.swiz-num-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentCount = parseInt(tab.dataset.count);
        playerCount = currentCount;
        Game.haptic('light');
        Sounds.button();
        document.querySelectorAll('.swiz-num-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('[data-slot]').forEach(slot => {
          const s = parseInt(slot.dataset.slot);
          if (s >= 1 && s <= 3) slot.classList.toggle('swiz-slot-hidden', s >= currentCount);
        });
        updateSummary();
      });
    });

    document.querySelectorAll('.swiz-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = parseInt(btn.dataset.slot);
        const isBot = btn.dataset.type === 'bot';
        slotIsBot[slot] = isBot;
        Sounds.button();
        const toggle = document.getElementById(`swiz-type-toggle-${slot}`);
        toggle?.querySelectorAll('.swiz-type-btn').forEach(b => b.classList.toggle('active', b === btn));
        updateSummary();
      });
    });

    document.getElementById('btn-swiz-count-next')?.addEventListener('click', () => {
      Sounds.button();
      _advanceFromCombinedCount(currentCount, slotIsBot);
    });
  }

  function _wizardGoBackToOrigin() {
    const returnTo = _setupReturnTo;
    _setupReturnTo = 'boards';
    if (returnTo === 'designer') showScreen('screen-designer');
    else if (returnTo === 'home') showHome();
    else showBoardSelect();
  }

  function _randomBotName(takenNames) {
    const names = getWizardNameSet();
    // Strip " (bot)" suffix before comparing so bot names don't duplicate human names
    const takenBase = takenNames.map(n => n.endsWith(' (bot)') ? n.slice(0, -6) : n);
    const available = names.filter(n => !takenBase.includes(n));
    const pick = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : names[Math.floor(Math.random() * names.length)];
    takenNames.push(pick);
    return pick + ' (bot)';
  }

  function _advanceFromCombinedCount(count, slotIsBot) {
    playerCount = count;
    const themeChars = getThemeCharacters();
    const nameSet = getWizardNameSet();
    // Only human players claim characters upfront; bots get the leftovers at game start
    const takenEmojis = [];
    // Seed bot name pool with human player names to prevent duplicates
    const humanNames = Array.from({ length: count }, (_, i) => {
      if (i === 0 ? false : slotIsBot[i]) return null;
      const existing = playerSetups[i];
      return (existing && !existing.isBot) ? existing.name : nameSet[i % nameSet.length];
    }).filter(Boolean);
    const takenBotNames = [...humanNames];
    playerSetups = Array.from({ length: count }, (_, i) => {
      const isBot = i === 0 ? false : slotIsBot[i];
      if (isBot) {
        return { name: _randomBotName(takenBotNames), character: null, color: PLAYER_COLORS[i], sound: null, isBot: true };
      }
      const defaultChar = themeChars.find(c => !takenEmojis.includes(c.emoji)) || themeChars[i % themeChars.length];
      takenEmojis.push(defaultChar.emoji);
      const existing = playerSetups[i];
      if (existing && !existing.isBot) {
        return { ...existing, isBot: false, sound: existing.sound || defaultChar.sound };
      }
      return { name: nameSet[i % nameSet.length], character: defaultChar.emoji, color: PLAYER_COLORS[i], sound: defaultChar.sound, isBot: false };
    });
    setupCurrentPlayer = 0;
    setupWizardPhase = 'player';
    renderSetupWizard();
  }

  // ---- Player step ----
  function buildPlayerStepHTML(idx) {
    const p = playerSetups[idx];
    if (!p) return '';
    const themeChars = getThemeCharacters();
    const nameSet = getWizardNameSet();
    // Only players who already completed setup (index < idx) block a character; future players & bots get leftover chars at game start
    const takenEmojis = playerSetups.filter((p2, j) => j < idx && !p2.isBot).map(o => o.character).filter(Boolean);

    // Progress: count only human players
    const humanIndices = playerSetups.slice(0, playerCount).map((pl, i) => (!pl.isBot ? i : -1)).filter(i => i >= 0);
    const humanStep = humanIndices.indexOf(idx) + 1;
    const humanTotal = humanIndices.length;
    const isLastPlayer = humanIndices[humanIndices.length - 1] === idx;

    const nextLabel = isLastPlayer
      ? t('setup.btn_play_wizard')
      : t('setup.btn_next_player', { n: humanStep + 1 });
    const progressLabel = t('setup.player_of', { n: humanStep, total: humanTotal });

    // Name section (bots are never shown in player step now)
    const nameSection = `
      <div class="setup-section-label">${t('setup.pick_name')}</div>
      <div class="swiz-chips-grid" id="swiz-chips-${idx}">
        ${nameSet.map(name => `
          <button class="player-name-chip swiz-chip ${p.name === name ? 'selected' : ''}"
            data-name="${escHtml(name)}">${escHtml(name)}</button>
        `).join('')}
      </div>
      <div class="swiz-chip-own-row">
        <button class="player-name-chip swiz-chip swiz-chip-own" id="swiz-chip-own-${idx}">${t('setup.type_own')}</button>
      </div>
      <div class="swiz-name-input-wrap hidden" id="swiz-input-wrap-${idx}">
        <input class="player-name-input" id="swiz-name-input-${idx}"
          type="text" inputmode="text" enterkeyhint="done"
          autocomplete="off" autocorrect="off" spellcheck="false" maxlength="12"
          placeholder="${t('setup.name_placeholder')}" value="${escHtml(p.name)}">
      </div>`;

    return `<div class="swiz-player">
      <div class="swiz-player-header">
        <button class="btn btn-sm btn-ghost-dk" id="btn-swiz-player-back">${t('setup.btn_back')}</button>
        <div class="swiz-player-progress">${progressLabel}</div>
        <div class="swiz-hdr-spacer"></div>
      </div>
      <div class="swiz-player-body" id="swiz-player-body">
        <div class="swiz-player-card">
          <div class="swiz-player-hdr">
            <div class="player-num-badge" style="background:${PLAYER_COLORS[idx]}">${idx + 1}</div>
            <div class="swiz-player-title">${t('setup.player_n', { n: idx + 1 })}</div>
          </div>
          ${nameSection}
          <div class="setup-section-label">${t('setup.pick_character')}</div>
          ${Components.AvatarSelector(themeChars, p.character, idx, takenEmojis)}
        </div>
      </div>
      <div class="swiz-player-footer">
        <button class="btn btn-lg btn-green btn-full" id="btn-swiz-player-next">${nextLabel}</button>
      </div>
    </div>`;
  }

  function wirePlayerStep(idx) {
    document.getElementById('btn-swiz-player-back')?.addEventListener('click', () => {
      syncCurrentPlayerName(idx);
      Sounds.button();
      let prev = idx - 1;
      while (prev >= 0 && playerSetups[prev]?.isBot) prev--;
      if (prev < 0) { setupWizardPhase = 'count'; }
      else { setupCurrentPlayer = prev; }
      renderSetupWizard();
    });
    document.getElementById('btn-swiz-player-next')?.addEventListener('click', () => {
      syncCurrentPlayerName(idx);
      Sounds.button();
      let next = idx + 1;
      while (next < playerSetups.length && playerSetups[next]?.isBot) next++;
      if (next >= playerSetups.length) { setupWizardPhase = 'summary'; }
      else { setupCurrentPlayer = next; }
      renderSetupWizard();
    });

    // Name chips
    document.getElementById(`swiz-chips-${idx}`)?.addEventListener('click', e => {
      const chip = e.target.closest('.player-name-chip[data-name]');
      if (chip) selectWizardName(idx, chip.dataset.name);
    });
    document.getElementById(`swiz-chip-own-${idx}`)?.addEventListener('click', () => openWizardNameInput(idx));

    // Name input
    const _nameInput = document.getElementById(`swiz-name-input-${idx}`);
    if (_nameInput) {
      _nameInput.addEventListener('input', e => handleWizardNameInput(idx, e.target.value));
      _nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.target.blur(); e.preventDefault(); } });
    }

    // Char picker — event delegation on body so it survives outerHTML swap in selectChar
    document.getElementById('swiz-player-body')?.addEventListener('click', e => {
      const btn = e.target.closest('.char-btn');
      if (btn) selectChar(idx, btn.dataset.emoji, btn.dataset.sound);
    });

    // Keyboard slide-up via visualViewport
    if (window.visualViewport) {
      const vvHandler = () => {
        const kbH = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
        const footer = document.querySelector('.swiz-player-footer');
        if (footer) footer.style.transform = kbH > 50 ? `translateY(-${kbH}px)` : '';
        if (kbH > 50) document.getElementById(`swiz-name-input-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      window.visualViewport.addEventListener('resize', vvHandler);
      _currentVVHandler = vvHandler;
    }
  }

  function selectWizardName(idx, name) {
    if (!playerSetups[idx] || playerSetups[idx].isBot) return;
    playerSetups[idx].name = name;
    Sounds.button();
    document.querySelectorAll(`#swiz-chips-${idx} .player-name-chip`).forEach(c =>
      c.classList.toggle('selected', c.textContent.trim() === name));
    document.getElementById(`swiz-input-wrap-${idx}`)?.classList.add('hidden');
    document.getElementById(`swiz-chip-own-${idx}`)?.classList.remove('active-own');
  }

  function openWizardNameInput(idx) {
    if (!playerSetups[idx] || playerSetups[idx].isBot) return;
    document.querySelectorAll(`#swiz-chips-${idx} .player-name-chip`).forEach(c => c.classList.remove('selected'));
    document.getElementById(`swiz-chip-own-${idx}`)?.classList.add('active-own');
    const wrap = document.getElementById(`swiz-input-wrap-${idx}`);
    const input = document.getElementById(`swiz-name-input-${idx}`);
    if (wrap) wrap.classList.remove('hidden');
    if (input) {
      input.value = ''; playerSetups[idx].name = '';
      setTimeout(() => { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
    }
  }

  function handleWizardNameInput(idx, value) {
    if (!playerSetups[idx] || playerSetups[idx].isBot) return;
    playerSetups[idx].name = value.trim();
  }

  function setWizardPlayerType(idx, isBot) {
    if (!playerSetups[idx]) return;
    syncCurrentPlayerName(idx);
    Sounds.button();
    playerSetups[idx].isBot = isBot;
    const nameSet = getWizardNameSet();
    // Collect all other players' names to prevent duplicates
    const otherNames = playerSetups.filter((_, j) => j !== idx).map(p => p.name || '');
    playerSetups[idx].name = isBot
      ? _randomBotName(otherNames)
      : (nameSet[idx % nameSet.length] || nameSet[0]);
    renderSetupWizard();
  }

  // ---- Summary step ----
  function buildSummaryStepHTML() {
    const playerRows = playerSetups.slice(0, playerCount).map((p, i) => {
      const sub = p.isBot ? t('setup.toggle_bot') : t('setup.toggle_human');
      const editable = !p.isBot;
      return `<div class="swiz-summary-player ${editable ? '' : 'swiz-summary-bot'}"
        ${editable ? `data-player-idx="${i}"` : ''}>
        <div class="swiz-summary-emoji">${p.character}</div>
        <div class="swiz-summary-info">
          <div class="swiz-summary-name">${escHtml(p.name)}</div>
          <div class="swiz-summary-sub">${sub}</div>
        </div>
        ${editable ? `<div class="swiz-summary-edit">✏️ ${t('setup.edit')}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="swiz-summary">
      <div class="swiz-summary-header">
        <button class="btn btn-sm btn-ghost-dk" id="btn-swiz-summary-back">${t('setup.btn_back')}</button>
        <div class="swiz-summary-title">${t('setup.summary_title')}</div>
        <div class="swiz-hdr-spacer"></div>
      </div>
      <div class="swiz-summary-body">${playerRows}</div>
      <div class="swiz-summary-footer">
        <button class="btn btn-lg btn-green btn-full" id="btn-swiz-summary-play">${t('setup.btn_start')}</button>
      </div>
    </div>`;
  }

  function wireSummaryStep() {
    document.getElementById('btn-swiz-summary-back')?.addEventListener('click', () => {
      Sounds.button();
      let last = playerSetups.length - 1;
      while (last >= 0 && playerSetups[last]?.isBot) last--;
      setupCurrentPlayer = Math.max(0, last);
      setupWizardPhase = 'player';
      renderSetupWizard();
    });
    document.getElementById('btn-swiz-summary-play')?.addEventListener('click', () => startGame());
    document.querySelector('.swiz-summary-body')?.addEventListener('click', e => {
      const card = e.target.closest('.swiz-summary-player[data-player-idx]');
      if (card) editSummaryPlayer(parseInt(card.dataset.playerIdx));
    });
  }

  function editSummaryPlayer(idx) {
    Sounds.button();
    setupCurrentPlayer = idx;
    setupWizardPhase = 'player';
    renderSetupWizard();
  }

  function _wizardGoBack() {
    if (setupWizardPhase === 'count') {
      _wizardGoBackToOrigin();
    } else if (setupWizardPhase === 'player') {
      syncCurrentPlayerName(setupCurrentPlayer);
      let prev = setupCurrentPlayer - 1;
      while (prev >= 0 && playerSetups[prev]?.isBot) prev--;
      if (prev < 0) { setupWizardPhase = 'count'; renderSetupWizard(); }
      else { setupCurrentPlayer = prev; renderSetupWizard(); }
    } else {
      let last = playerSetups.length - 1;
      while (last >= 0 && playerSetups[last]?.isBot) last--;
      setupCurrentPlayer = Math.max(0, last);
      setupWizardPhase = 'player';
      renderSetupWizard();
    }
  }

  function selectChar(playerIndex, emoji, sound) {
    if (!playerSetups[playerIndex]) return;
    const themeChars = getThemeCharacters();
    playerSetups[playerIndex].character = emoji;
    if (sound) playerSetups[playerIndex].sound = sound;
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    if (sound) Sounds.playThemedSound(theme, sound);
    // Update char picker in place without full re-render
    // Only players who already completed setup (index < playerIndex) block a character; future players & bots get leftover chars at game start
    const takenEmojis = playerSetups.filter((p, j) => j < playerIndex && !p.isBot).map(p => p.character).filter(Boolean);
    const picker = document.querySelector('#swiz-player-body .char-picker');
    if (picker) picker.outerHTML = Components.AvatarSelector(themeChars, emoji, playerIndex, takenEmojis);
  }

  function selectColor(playerIndex, color) {
    Sounds.button();
    if (playerSetups[playerIndex]) playerSetups[playerIndex].color = color;
  }

  // back-compat aliases (may be called from old onclick attrs)
  function setPlayerType(idx, isBot) { setWizardPlayerType(idx, isBot); }
  function toggleBot(idx) { if (playerSetups[idx]) setWizardPlayerType(idx, !playerSetups[idx].isBot); }
  function selectPlayerName(idx, name) { selectWizardName(idx, name); }
  function handleNameInput(idx, val) { handleWizardNameInput(idx, val); }

  function assignBotCharacters() {
    const themeChars = getThemeCharacters();
    const takenEmojis = playerSetups.filter(p => !p.isBot && p.character).map(p => p.character);
    const available = themeChars.filter(c => !takenEmojis.includes(c.emoji));
    const shuffled = available.slice().sort(() => Math.random() - 0.5);
    let pick = 0;
    playerSetups.forEach(p => {
      if (p.isBot) {
        const char = shuffled[pick % shuffled.length] || themeChars[pick % themeChars.length];
        p.character = char.emoji;
        p.sound = char.sound;
        pick++;
      }
    });
  }

  function startGame() {
    if (!currentBoard) {
      showToast(t('misc.no_board_selected'));
      return;
    }
    // Validate human player names
    for (let i = 0; i < playerCount; i++) {
      const p = playerSetups[i];
      if (!p || p.isBot) continue;
      if (!p.name || !p.name.trim()) {
        showToast(t('misc.player_needs_name', { n: i + 1 }));
        return;
      }
    }

    Sounds.button();

    // Assign bot characters from whatever humans didn't take
    assignBotCharacters();

    // Collect player data
    const players = playerSetups.slice(0, playerCount).map((p, i) => ({
      name: p.name || (p.isBot ? t('misc.bot_name', { n: i + 1 }) : t('misc.player_fallback', { n: i + 1 })),
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
    const sfxCheck   = document.getElementById('btn-sfx-toggle');
    const musicCheck = document.getElementById('btn-music-toggle');
    if (sfxCheck)   sfxCheck.checked   = !Sounds.isMuted();
    if (musicCheck) musicCheck.checked = !Sounds.isMusicMuted();
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

    const isMultiPlayer = players.length > 2;
    const avatarEl   = document.getElementById('winner-avatar');
    const nameEl     = document.getElementById('winner-name');
    const subtitleEl = document.getElementById('winner-subtitle');
    const podiumEl   = document.getElementById('winner-podium');

    if (isMultiPlayer) {
      // 3+ players: show podium, hide classic single-winner elements
      if (avatarEl)   avatarEl.classList.add('hidden');
      if (nameEl)     nameEl.classList.add('hidden');
      if (subtitleEl) subtitleEl.classList.add('hidden');
      if (podiumEl)   podiumEl.classList.remove('hidden');

      // Determine which players fill each podium spot
      // canContinue=true: only definitively ranked (in rankings[]) are shown; others empty
      // canContinue=false: game over, use sorted[] for all spots
      const podiumPlayers = [null, null, null];
      if (canContinue) {
        for (let i = 0; i < Math.min(3, gameState.rankings.length); i++) {
          podiumPlayers[i] = gameState.rankings[i];
        }
      } else {
        for (let i = 0; i < Math.min(3, sorted.length); i++) {
          podiumPlayers[i] = sorted[i];
        }
      }

      const placeLabels = [t('winner.wins'), t('winner.place_2nd'), t('winner.place_3rd')];
      [1, 2, 3].forEach(spot => {
        const p = podiumPlayers[spot - 1];
        const avatarSpot = document.getElementById(`podium-avatar-${spot}`);
        const labelSpot  = document.getElementById(`podium-label-${spot}`);
        if (avatarSpot) avatarSpot.textContent = p ? p.character : '';
        if (labelSpot) {
          labelSpot.innerHTML = p
            ? `<span class="podium-name">${escHtml(p.name)}${p.isBot ? ' 🤖' : ''}</span><span class="podium-place-text">${placeLabels[spot - 1]}</span>`
            : '';
        }
      });
    } else {
      // 2 players: classic display
      if (avatarEl)   avatarEl.classList.remove('hidden');
      if (nameEl)     nameEl.classList.remove('hidden');
      if (subtitleEl) subtitleEl.classList.remove('hidden');
      if (podiumEl)   podiumEl.classList.add('hidden');

      if (avatarEl) avatarEl.textContent = winner.character;
      if (nameEl)   nameEl.textContent   = winner.name;
    }

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
    document.getElementById('final-scoreboard').innerHTML = sorted.map((p, i) => {
      const turnsLabel = p.turns === 1 ? t('scores.turns_unit_singular') : t('scores.turns_unit');
      return `
      <div class="score-row">
        <div class="score-rank ${i===0?'gold':''}">${medals[i]||i+1}</div>
        <div class="score-avatar">${escHtml(p.character)}</div>
        <div class="score-name">${escHtml(p.name)}${p.isBot ? ' 🤖' : ''}</div>
        <div class="score-moves">🐍 ${p.snakeBites} · 🪜 ${p.laddersClimbed} · ${p.turns} ${turnsLabel}</div>
      </div>`;
    }).join('');

    // Subtitle (2-player only) and continue button
    const place = gameState.rankings.length;
    const subtitle = document.getElementById('winner-subtitle');
    const subtitleKeys = { 1: 'winner.wins', 2: 'winner.second', 3: 'winner.third', 4: 'winner.fourth' };
    if (subtitle && !isMultiPlayer) subtitle.textContent = t(subtitleKeys[place] || 'winner.wins');

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
    const scores = Storage.loadScores().slice().sort((a, b) => a.turns - b.turns || a.date - b.date);
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
    document.getElementById('btn-howto-play')?.addEventListener('click', () => { Sounds.button(); showHome(); });

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
    document.getElementById('btn-step2-next').addEventListener('click', () => { Sounds.button(); updateDesignerStep(3); });

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

    // Inline board name editing
    let _boardNameVV = null;
    document.getElementById('btn-name-edit').addEventListener('click', () => {
      const display = document.getElementById('board-name-display');
      const input   = document.getElementById('board-name-input');
      const editBtn = document.getElementById('btn-name-edit');
      input.value = display.textContent;
      input.classList.remove('hidden');
      display.style.display = 'none';
      editBtn.style.display = 'none';
      input.focus();
      input.select();
      if (window.visualViewport && !_boardNameVV) {
        _boardNameVV = () => {
          const kbH = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
          const cta = document.querySelector('.board-ready-cta');
          if (cta) cta.style.transform = kbH > 50 ? `translateY(-${kbH}px)` : '';
        };
        window.visualViewport.addEventListener('resize', _boardNameVV);
      }
    });
    function commitBoardName() {
      const display = document.getElementById('board-name-display');
      const input   = document.getElementById('board-name-input');
      const editBtn = document.getElementById('btn-name-edit');
      const newName = sanitiseName(input.value) || sanitiseName(display.textContent);
      display.textContent = newName;
      display.style.display = '';
      editBtn.style.display = '';
      input.classList.add('hidden');
      if (_boardNameVV && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', _boardNameVV);
        _boardNameVV = null;
        const cta = document.querySelector('.board-ready-cta');
        if (cta) cta.style.transform = '';
      }
    }
    document.getElementById('board-name-input').addEventListener('blur', commitBoardName);
    document.getElementById('board-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commitBoardName(); }
    });

    document.getElementById('btn-play-now').addEventListener('click', () => {
      Sounds.button();
      commitBoardName();
      const displayName = document.getElementById('board-name-display')?.textContent || '';
      let board;
      if (_autoSavedBoard) {
        // Update stored name if user edited it
        const storedBaseName = _autoSavedBoard.name.replace(/ \([^)]+\)$/, '');
        if (displayName && displayName !== storedBaseName) {
          _autoSavedBoard.name = `${displayName} (${_step5Difficulty})`;
          Storage.saveBoard(_autoSavedBoard);
        }
        board = _autoSavedBoard;
      } else {
        board = Board.designer.getBoardConfig();
        if (!board.id) board.id = Storage.generateId();
      }
      currentBoard = board;
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
        Game.haptic('light');
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
        Game.haptic('light');
      });
    });
    // Pre-select first theme if none selected
    const firstCard = document.querySelector('.theme-card');
    if (firstCard && !document.querySelector('.theme-card.selected')) {
      firstCard.classList.add('selected');
      applyTheme(firstCard.dataset.theme);
      if (themeContinueBtn) themeContinueBtn.disabled = false;
    }


    // Player setup — back/next/play buttons are wired dynamically per wizard step

    // Tappable dice
    document.getElementById('dice').addEventListener('click', () => {
      Game.rollDice();
    });

    document.getElementById('btn-game-menu').addEventListener('click', () => {
      Sounds.button();
      const overlay = document.getElementById('game-menu-overlay');
      overlay.classList.remove('hidden');
      updateSoundBtnIcons();
      _trapFocus(overlay);
    });

    // Sound toggle switches
    document.getElementById('btn-sfx-toggle')?.addEventListener('change', () => toggleSfxMute());
    document.getElementById('btn-music-toggle')?.addEventListener('change', () => toggleMusicMute());

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
    document.getElementById('btn-scores-info').addEventListener('click', (e) => {
      e.stopPropagation();
      const tip = document.getElementById('scores-info-tip');
      const open = tip.classList.toggle('hidden');
      e.currentTarget.setAttribute('aria-expanded', String(!open));
    });
    document.getElementById('screen-scores').addEventListener('click', () => {
      const tip = document.getElementById('scores-info-tip');
      if (!tip.classList.contains('hidden')) {
        tip.classList.add('hidden');
        document.getElementById('btn-scores-info')?.setAttribute('aria-expanded', 'false');
      }
    });
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
        _wizardGoBack();
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
      else if (id === 'screen-player-setup') renderSetupWizard();
      else if (id === 'screen-scores') showScores();
      // winner screen uses textContent (set via t()), so translateDOM() already handles it
    });

    // Globe language button
    const globeBtn  = document.getElementById('btn-home-lang');
    const langPanel = document.getElementById('home-lang-panel');
    if (globeBtn && langPanel) {
      globeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langPanel.classList.toggle('hidden');
        globeBtn.setAttribute('aria-expanded', String(!langPanel.classList.contains('hidden')));
      });
      document.addEventListener('click', (e) => {
        if (!globeBtn.contains(e.target) && !langPanel.contains(e.target)) {
          langPanel.classList.add('hidden');
          globeBtn.setAttribute('aria-expanded', 'false');
        }
      });
      document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === I18n.getLanguage()) btn.classList.add('active');
        btn.addEventListener('click', () => {
          document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          I18n.setLanguage(btn.dataset.lang);
          langPanel.classList.add('hidden');
          globeBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

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
    toggleBot, setPlayerType, setWizardPlayerType,
    selectPlayerName, handleNameInput,
    selectWizardName, openWizardNameInput, handleWizardNameInput,
    editSummaryPlayer, toggleMusicMute,
  };
})();

// Expose App on window for Android WebView (const does not auto-assign to window)
window.App = App;

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
  const counterEl   = document.getElementById('snake-counter-text');
  const continueBtn = document.getElementById('btn-step3-next');
  const continueHint = document.getElementById('step3-continue-hint');
  const autoBtn     = document.getElementById('btn-auto-snakes');
  const warningEl   = document.getElementById('snake-space-warning');
  const config  = Board.designer.getBoardConfig();
  const snakes  = config.snakes;
  const n       = snakes.length;
  const target  = Board.designer.targetSnakeCount;
  const met     = n >= target;

  if (counterEl) {
    if (!met) {
      counterEl.textContent = t('designer.snakes_counter_below', { n, target });
      counterEl.className = 'snake-counter-text';
    } else {
      counterEl.textContent = n === target
        ? t('designer.snakes_counter_min', { n })
        : t('designer.snakes_counter_above', { n });
      counterEl.className = 'snake-counter-text snake-counter-met';
    }
  }

  if (continueBtn)  continueBtn.disabled  = !met;
  if (continueHint) continueHint.classList.toggle('hidden', met);

  // Space conflict: free cells = total - 2 (start/end) - occupied snake+ladder cells
  const freeCells = (config.total - 2) - (n + (config.ladders ? config.ladders.length : 0)) * 2;
  const crowded   = freeCells < 6;
  if (warningEl) warningEl.classList.toggle('hidden', !crowded);
  if (autoBtn)   autoBtn.disabled = crowded;

  updateSnakeSelection(Board.designer.selectedSnakeIndex);
}

function maybeShowSnakeDemo() {
  if (localStorage.getItem('snakeDemoSeen')) return;
  const overlay = document.getElementById('snake-demo-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  function dismiss() {
    overlay.classList.add('hidden');
    localStorage.setItem('snakeDemoSeen', '1');
    overlay.removeEventListener('click', dismiss);
  }
  overlay.addEventListener('click', dismiss);
}

function updateLadderList() {
  const counterEl   = document.getElementById('ladder-counter-text');
  const continueBtn = document.getElementById('btn-step4-next');
  const continueHint = document.getElementById('step4-continue-hint');
  const autoBtn     = document.getElementById('btn-auto-ladders');
  const config  = Board.designer.getBoardConfig();
  const ladders = config.ladders;
  const n       = ladders.length;
  const target  = Board.designer.targetLadderCount;
  const met     = n >= target;

  if (counterEl) {
    if (!met) {
      counterEl.textContent = t('designer.ladders_counter_below', { n, target });
      counterEl.className = 'snake-counter-text';
    } else {
      counterEl.textContent = n === target
        ? t('designer.ladders_counter_min', { n })
        : t('designer.ladders_counter_above', { n });
      counterEl.className = 'snake-counter-text snake-counter-met';
    }
  }

  if (continueBtn)  continueBtn.disabled  = !met;
  if (continueHint) continueHint.classList.toggle('hidden', met);

  const freeCells = (config.total - 2) - (n + (config.snakes ? config.snakes.length : 0)) * 2;
  if (autoBtn)   autoBtn.disabled = freeCells < 2;

  updateLadderSelection(Board.designer.selectedLadderIndex);
}

function maybeShowLadderDemo() {
  if (localStorage.getItem('ladderDemoSeen')) return;
  const overlay = document.getElementById('ladder-demo-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  function dismiss() {
    overlay.classList.add('hidden');
    localStorage.setItem('ladderDemoSeen', '1');
    overlay.removeEventListener('click', dismiss);
  }
  overlay.addEventListener('click', dismiss);
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
      <button class="btn btn-md ${danger ? 'btn-red' : 'btn-green'} btn-full" id="confirm-modal-ok">${escHtml(confirmLabel)}</button>
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

// ---- sanitiseName ----
// Strips HTML tags from user-supplied names before they are stored or used.
// Prevents persisting injection strings even though display always uses escHtml().
function sanitiseName(str, maxLen = 40) {
  return String(str).replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
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
