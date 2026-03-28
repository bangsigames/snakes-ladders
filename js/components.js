/* ============================================================
   COMPONENTS — Reusable UI factory functions
   All return HTML strings for use with innerHTML, or DOM nodes
   where noted. Import order: after config.js, before app.js.
   ============================================================ */

const Components = (() => {

  // ---- Helpers ----

  function esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  // ---- PrimaryButton -----------------------------------------------
  // Blue 80px call-to-action button.
  // opts: { id, disabled, icon, extraClass, fullWidth }
  function PrimaryButton(label, opts = {}) {
    const { id = '', disabled = false, icon = '', extraClass = '', fullWidth = true } = opts;
    return `<button
      class="btn-primary-comp${fullWidth ? ' btn-full' : ''} ${extraClass}"
      ${id ? `id="${esc(id)}"` : ''}
      ${disabled ? 'disabled' : ''}
    >${icon ? `<span class="btn-comp-icon">${icon}</span>` : ''}${esc(label)}</button>`;
  }

  // ---- SecondaryButton ---------------------------------------------
  // Ghost/outline button for Back, Cancel, etc.
  // opts: { id, extraClass, fullWidth }
  function SecondaryButton(label, opts = {}) {
    const { id = '', extraClass = '', fullWidth = false } = opts;
    return `<button
      class="btn-secondary-comp${fullWidth ? ' btn-full' : ''} ${extraClass}"
      ${id ? `id="${esc(id)}"` : ''}
    >${esc(label)}</button>`;
  }

  // ---- ThemeCard ---------------------------------------------------
  // Theme selection card. themeKey = 'jungle' | 'space' | etc.
  // themeData = { emoji, name } from THEMES config.
  function ThemeCard(themeKey, themeData, selected = false) {
    return `
      <button class="theme-card${selected ? ' selected' : ''}" data-theme="${esc(themeKey)}">
        <div class="theme-illustration theme-prev-${esc(themeKey)}">
          <span class="theme-main-emoji">${themeData.emoji}</span>
          <span class="theme-checkmark">✓</span>
        </div>
        <div class="theme-label">${esc(themeData.name)}</div>
      </button>`;
  }

  // ---- AvatarSelector ----------------------------------------------
  // Character emoji picker row for a player.
  // chars: array of { emoji, name, sound }
  // selectedEmoji: currently selected emoji
  // playerIdx: player index (used in onclick callback)
  // takenEmojis: array of emojis claimed by other players (greyed out)
  function AvatarSelector(chars, selectedEmoji, playerIdx, takenEmojis = []) {
    const buttons = chars.map(c => {
      const taken = takenEmojis.includes(c.emoji);
      const cls = `char-btn${c.emoji === selectedEmoji ? ' selected' : ''}${taken ? ' taken' : ''}`;
      return `
      <button
        class="${cls}"
        onclick="App.selectChar(${playerIdx}, '${esc(c.emoji)}', '${esc(c.sound)}')"
        title="${taken ? 'Taken' : esc(c.name)}"
        ${taken ? 'aria-disabled="true"' : ''}
      ><span class="char-btn-emoji">${c.emoji}</span><span class="char-btn-name">${esc(c.name)}</span>${taken ? '<span class="char-taken-badge">✕</span>' : ''}</button>`;
    }).join('');
    return `<div class="char-picker">${buttons}</div>`;
  }

  // ---- GameBoard ---------------------------------------------------
  // Wrapper div + canvas element. canvasId defaults to 'game-canvas'.
  // Returns DOM node so the canvas reference is immediately available.
  function GameBoard(canvasId = 'game-canvas') {
    const wrap = document.createElement('div');
    wrap.className = 'game-board-wrap';
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    wrap.appendChild(canvas);
    return wrap;
  }

  // ---- DiceButton --------------------------------------------------
  // The roll-dice button. Reflects current game phase and bot state.
  // phase: 'rolling' | 'animating' | 'event' | 'done'
  // isBot: boolean
  function DiceButton(phase, isBot) {
    const rolling = phase === 'rolling';
    const disabled = !rolling || isBot;
    const label = rolling && !isBot ? '🎲 Roll Dice'
                : isBot && rolling  ? '🤖 Bot thinking…'
                : '⏳';
    return `<button class="btn-roll" id="btn-roll" ${disabled ? 'disabled' : ''}>
      <span id="roll-btn-text">${label}</span>
    </button>`;
  }

  // ---- SnakeListItem -----------------------------------------------
  // One row in the guided snake list. index is 0-based.
  function SnakeListItem(snake, index) {
    return `
      <div class="guided-list-item">
        <span class="guided-list-icon">🐍</span>
        <span class="guided-list-label">Snake ${index + 1} &nbsp; ${snake.head} → ${snake.tail}</span>
        <button class="btn-remove-item"
          onclick="Board.designer.removeSnake(${index}); updateDesignerUI()"
          aria-label="Remove snake ${index + 1}">✕</button>
      </div>`;
  }

  // ---- LadderListItem ----------------------------------------------
  // One row in the guided ladder list. index is 0-based.
  function LadderListItem(ladder, index) {
    return `
      <div class="guided-list-item">
        <span class="guided-list-icon">🪜</span>
        <span class="guided-list-label">Ladder ${index + 1} &nbsp; ${ladder.bottom} → ${ladder.top}</span>
        <button class="btn-remove-item"
          onclick="Board.designer.removeLadder(${index}); updateDesignerUI()"
          aria-label="Remove ladder ${index + 1}">✕</button>
      </div>`;
  }

  // ---- PopupModal --------------------------------------------------
  // Generic modal overlay. Returns an HTML string.
  // opts: {
  //   id, title, body (HTML string), buttons (array of HTML strings),
  //   extraClass, dismissible (click-outside closes)
  // }
  // To show: el.classList.remove('hidden')
  // To hide: el.classList.add('hidden')
  function PopupModal(opts = {}) {
    const {
      id = '',
      title = '',
      body = '',
      buttons = [],
      extraClass = '',
    } = opts;
    return `
      <div class="popup-modal hidden ${extraClass}" ${id ? `id="${esc(id)}"` : ''} role="dialog">
        <div class="popup-modal-card">
          ${title ? `<h3 class="popup-modal-title">${title}</h3>` : ''}
          ${body   ? `<div class="popup-modal-body">${body}</div>` : ''}
          ${buttons.length
            ? `<div class="popup-modal-buttons">${buttons.join('')}</div>`
            : ''}
        </div>
      </div>`;
  }

  // ---- Public API --------------------------------------------------
  return {
    PrimaryButton,
    SecondaryButton,
    ThemeCard,
    AvatarSelector,
    GameBoard,
    DiceButton,
    SnakeListItem,
    LadderListItem,
    PopupModal,
  };

})();
