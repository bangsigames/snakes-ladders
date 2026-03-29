/* ============================================================
   STORAGE — localStorage management
   ============================================================ */

const Storage = (() => {
  const BOARDS_KEY  = 'snl_boards';
  const SCORES_KEY  = 'snl_scores';
  const GAME_KEY    = 'snl_saved_game';

  function loadBoards() {
    try {
      return JSON.parse(localStorage.getItem(BOARDS_KEY) || '[]');
    } catch { return []; }
  }

  const MAX_USER_BOARDS = 20;

  function uniqueBoardName(name, excludeId, boards) {
    const others = boards.filter(b => b.id !== excludeId);
    const taken = new Set(others.map(b => b.name));
    if (!taken.has(name)) return name;
    let n = 2;
    while (taken.has(`${name} ${n}`)) n++;
    return `${name} ${n}`;
  }

  function saveBoard(board) {
    try {
      const boards = loadBoards();
      board = { ...board, name: uniqueBoardName(board.name, board.id, boards) };
      const existing = boards.findIndex(b => b.id === board.id);
      if (existing >= 0) {
        boards[existing] = board;
      } else {
        boards.unshift(board);
      }
      localStorage.setItem(BOARDS_KEY, JSON.stringify(boards.slice(0, MAX_USER_BOARDS)));
      return true;
    } catch { return false; }
  }

  function deleteBoard(id) {
    const boards = loadBoards().filter(b => b.id !== id);
    localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
  }

  function loadScores() {
    try {
      return JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    } catch { return []; }
  }

  function saveScore(score) {
    try {
      const scores = loadScores();
      scores.unshift({ ...score, date: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 50)));
      return true;
    } catch { return false; }
  }

  function clearScores() {
    localStorage.removeItem(SCORES_KEY);
  }

  function saveGameState(state) {
    try {
      // Only persist the serialisable parts (no DOM refs, no animation state)
      const snapshot = {
        board:        state.board,
        players:      state.players,
        currentIndex: state.currentIndex,
        turn:         state.turn,
        phase:        'rolling', // always resume at rolling phase
        rankings:     state.rankings,
        savedAt:      Date.now(),
      };
      localStorage.setItem(GAME_KEY, JSON.stringify(snapshot));
      return true;
    } catch { return false; }
  }

  function loadGameState() {
    try {
      return JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
    } catch { return null; }
  }

  function clearGameState() {
    localStorage.removeItem(GAME_KEY);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return { loadBoards, saveBoard, deleteBoard, loadScores, saveScore, clearScores,
           saveGameState, loadGameState, clearGameState, generateId, MAX_USER_BOARDS };
})();
