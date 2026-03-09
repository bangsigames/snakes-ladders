/* ============================================================
   STORAGE — localStorage management
   ============================================================ */

const Storage = (() => {
  const BOARDS_KEY = 'snl_boards';
  const SCORES_KEY = 'snl_scores';

  function loadBoards() {
    try {
      return JSON.parse(localStorage.getItem(BOARDS_KEY) || '[]');
    } catch { return []; }
  }

  function saveBoard(board) {
    const boards = loadBoards();
    const existing = boards.findIndex(b => b.id === board.id);
    if (existing >= 0) {
      boards[existing] = board;
    } else {
      boards.unshift(board);
    }
    localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
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
    // score: { playerName, character, turns, boardName, date }
    const scores = loadScores();
    scores.unshift({ ...score, date: Date.now() });
    // Keep top 50
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 50)));
  }

  function clearScores() {
    localStorage.removeItem(SCORES_KEY);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return { loadBoards, saveBoard, deleteBoard, loadScores, saveScore, clearScores, generateId };
})();
