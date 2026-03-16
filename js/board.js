/* ============================================================
   BOARD — Canvas rendering + Board Designer logic
   ============================================================ */

const Board = (() => {

  // ============================================================
  // SPRITE CACHE
  // ============================================================
  const _sprites = {};
  function _loadSprite(key, src) {
    if (_sprites[key]) return _sprites[key];
    const img = new Image();
    img.src = src;
    _sprites[key] = img;
    return img;
  }
  // Preload all available sprites
  function preloadSprites() {
    ['cartoon', 'jungle', 'ocean', 'space', 'fantasy'].forEach(t => {
      _loadSprite('head-' + t, 'img/snake-head-' + t + '.png');
      _loadSprite('ladder-' + t, 'img/ladder-' + t + '.png');
    });
    ['space-planet','space-comet','ocean-fish','ocean-shell',
     'fantasy-crystal','fantasy-star','cartoon-star','cartoon-heart',
     'jungle-frog','jungle-butterfly'].forEach(k => _loadSprite('cell-' + k, 'img/cell-' + k + '.png'));
  }

  function _drawCellSprite(ctx, key, cx, cy, size, alpha, blendMode) {
    const img = _sprites[key];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = alpha || 0.65;
      if (blendMode) ctx.globalCompositeOperation = blendMode;
      ctx.drawImage(img, cx - size/2, cy - size/2, size, size);
      ctx.restore(); return true;
    }
    return false;
  }

  // ============================================================
  // CANVAS RENDERING
  // ============================================================

  // Offscreen cache for the static board (cells + snakes + ladders).
  // Only rebuilt when the board config or canvas dimensions change.
  let _boardCache = null; // { key, canvas, cellRects }

  function _staticCacheKey(boardConfig, w, h) {
    const { cols, rows, theme, snakes = [], ladders = [] } = boardConfig;
    return `${w}x${h}|${theme}|${cols}x${rows}|` +
      snakes.map(s => `${s.head},${s.tail}`).join(';') + '|' +
      ladders.map(l => `${l.bottom},${l.top}`).join(';');
  }

  function _buildStaticCache(boardConfig, w, h) {
    const { cols, rows, theme, snakes = [], ladders = [] } = boardConfig;
    const T = THEMES[theme] || THEMES.cartoon;
    const cellW = w / cols;
    const cellH = h / rows;

    // Pre-compute all cell rects once
    const total = cols * rows;
    const cellRects = new Array(total + 1);
    for (let cell = 1; cell <= total; cell++) {
      cellRects[cell] = getCellRect(cell, cols, rows, w, h);
    }

    // Render static content to offscreen canvas
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const oc_ctx = oc.getContext('2d');

    drawBoardBackground(oc_ctx, theme, cols, rows, w, h, T);

    for (let cell = 1; cell <= total; cell++) {
      const isEven = (Math.floor((cell-1) / cols) + ((cell-1) % cols)) % 2 === 0;
      drawCell(oc_ctx, cellRects[cell], cell, isEven, T, cellW, cellH, theme, total);
    }

    drawBoardOverlay(oc_ctx, theme, cols, rows, w, h, T);

    for (const ladder of ladders) {
      drawLadder(oc_ctx, ladder.bottom, ladder.top, cols, rows, w, h, T, theme);
    }
    for (const snake of snakes) {
      drawSnake(oc_ctx, snake.head, snake.tail, cols, rows, w, h, T, theme);
    }

    return { key: _staticCacheKey(boardConfig, w, h), canvas: oc, cellRects, cellW, cellH, cols, rows };
  }

  function invalidateBoardCache() {
    _boardCache = null;
  }

  /**
   * Draw the full board on a canvas context.
   * Static content (cells, snakes, ladders) is cached to an offscreen canvas
   * and only rebuilt when the board config or canvas size changes.
   */
  function render(ctx, boardConfig, w, h, players, animState) {
    const key = _staticCacheKey(boardConfig, w, h);
    if (!_boardCache || _boardCache.key !== key) {
      _boardCache = _buildStaticCache(boardConfig, w, h);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(_boardCache.canvas, 0, 0);

    if (players) {
      const { cellRects, cellW, cellH, cols, rows } = _boardCache;
      drawPlayers(ctx, players, cols, rows, w, h, cellW, cellH, animState, cellRects);
    }
  }

  // Draw an emoji at canvas coordinates
  function em(ctx, emoji, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    ctx.font = size + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  function drawBoardBackground(ctx, theme, cols, rows, w, h, T) {
  }

  // Subtle corner vignette overlay
  function drawBoardOverlay(ctx, theme, cols, rows, w, h, T) {
    // Subtle corner vignette to frame the board
    ctx.save();
    const vg = ctx.createRadialGradient(w*0.5, h*0.5, Math.min(w,h)*0.3, w*0.5, h*0.5, Math.min(w,h)*0.78);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }


  function drawCell(ctx, r, cellNum, isEven, T, cellW, cellH, theme, total) {
    const gap = 1;
    const cx = r.x + gap, cy = r.y + gap;
    const cw = r.w - gap * 2, ch = r.h - gap * 2;
    const rr = Math.min(cw, ch) * 0.22;
    const edgeH = (theme === 'space' || theme === 'ocean' || theme === 'fantasy' || theme === 'jungle') ? 0 : Math.min(ch * 0.13, 5);
    const faceH = ch - edgeH;

    function rRect(x, y, w, h, rv) {
      const rc = rv !== undefined ? rv : rr;
      ctx.beginPath();
      ctx.moveTo(x + rc, y);
      ctx.lineTo(x + w - rc, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rc);
      ctx.lineTo(x + w, y + h - rc); ctx.quadraticCurveTo(x + w, y + h, x + w - rc, y + h);
      ctx.lineTo(x + rc, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rc);
      ctx.lineTo(x, y + rc); ctx.quadraticCurveTo(x, y, x + rc, y);
      ctx.closePath();
    }

    const palette = T.tilePalette || [T.cellEven, T.cellOdd];
    const accentColor = palette[(cellNum - 1) % palette.length];

    if (theme === 'space') {
      // Dark flat tech panels with neon accent border
      const base = (cellNum % 2 === 0) ? '#0d1530' : '#080f20';
      const fg = ctx.createLinearGradient(cx + cw, cy, cx, cy + faceH);
      fg.addColorStop(0, '#060c1a'); fg.addColorStop(1, '#111e3a');
      rRect(cx, cy, cw, faceH); ctx.fillStyle = fg; ctx.fill();
      // Accent glow from top-left corner
      ctx.save();
      const ig = ctx.createRadialGradient(cx, cy, 0, cx + cw * 0.7, cy + faceH * 0.7, Math.max(cw, faceH) * 1.1);
      ig.addColorStop(0, accentColor + '28'); ig.addColorStop(1, 'transparent');
      rRect(cx, cy, cw, faceH); ctx.fillStyle = ig; ctx.fill(); ctx.restore();
      // Neon grid border
      ctx.save(); rRect(cx, cy, cw, faceH);
      ctx.strokeStyle = accentColor; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.restore();


    } else if (theme === 'ocean') {
      // Deep underwater panels with caustic light
      const base = (cellNum % 2 === 0) ? '#0c2a48' : '#071a30';
      const fg = ctx.createLinearGradient(cx, cy, cx, cy + faceH);
      fg.addColorStop(0, lightenColor(base, 18)); fg.addColorStop(1, base);
      rRect(cx, cy, cw, faceH); ctx.fillStyle = fg; ctx.fill();
      // Caustic: oval light ripple from top
      ctx.save();
      const og = ctx.createRadialGradient(cx + cw * 0.5, cy + faceH * 0.15, 0, cx + cw * 0.5, cy + faceH * 0.6, faceH * 0.75);
      og.addColorStop(0, 'rgba(255,255,255,0.22)'); og.addColorStop(1, 'rgba(255,255,255,0)');
      rRect(cx, cy, cw, faceH); ctx.fillStyle = og; ctx.fill(); ctx.restore();
      // Accent colour tint
      ctx.save();
      const ag = ctx.createRadialGradient(cx + cw*0.5, cy + faceH*0.5, 0, cx + cw*0.5, cy + faceH*0.5, Math.max(cw, faceH));
      ag.addColorStop(0, accentColor + '2a'); ag.addColorStop(1, 'transparent');
      rRect(cx, cy, cw, faceH); ctx.fillStyle = ag; ctx.fill(); ctx.restore();
      // Soft border
      ctx.save(); rRect(cx, cy, cw, faceH);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.restore();


    } else if (theme === 'fantasy') {
      // Dark crystal gem cells with faceted highlight
      const base = (cellNum % 2 === 0) ? '#1a0a2e' : '#100620';
      const fg = ctx.createLinearGradient(cx, cy, cx + cw * 0.9, cy + faceH * 0.9);
      fg.addColorStop(0, lightenColor(base, 24)); fg.addColorStop(0.5, base); fg.addColorStop(1, '#0a0315');
      rRect(cx, cy, cw, faceH); ctx.fillStyle = fg; ctx.fill();
      // Crystal facet: bright diagonal slice in top-left
      ctx.save(); ctx.globalAlpha = 0.18;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(cx + cw * 0.06, cy); ctx.lineTo(cx + cw * 0.42, cy);
      ctx.lineTo(cx, cy + faceH * 0.4); ctx.lineTo(cx, cy + faceH * 0.06);
      ctx.closePath(); ctx.fill(); ctx.restore();
      // Accent colour tint
      ctx.save();
      const ag = ctx.createRadialGradient(cx + cw*0.5, cy + faceH*0.5, 0, cx + cw*0.5, cy + faceH*0.5, Math.max(cw, faceH) * 0.75);
      ag.addColorStop(0, accentColor + '38'); ag.addColorStop(1, 'transparent');
      rRect(cx, cy, cw, faceH); ctx.fillStyle = ag; ctx.fill(); ctx.restore();
      // Glowing border
      ctx.save(); rRect(cx, cy, cw, faceH);
      ctx.strokeStyle = accentColor; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.restore();


    } else if (theme === 'jungle') {
      // Rich organic jungle tiles — earthy greens, leaf shapes, tiny creatures
      const baseColor = accentColor;
      const pr1 = ((cellNum * 7919) % 100) / 100;
      const pr2 = ((cellNum * 6271 + 999) % 100) / 100;
      const pr3 = ((cellNum * 4513 + 333) % 100) / 100;
      const pr4 = ((cellNum * 3179 + 777) % 100) / 100;
      // Base fill
      const fg = ctx.createLinearGradient(cx, cy, cx + cw*0.25, cy + faceH);
      fg.addColorStop(0, shadeColor(baseColor, -18)); fg.addColorStop(1, lightenColor(baseColor, 10));
      rRect(cx, cy, cw, faceH); ctx.fillStyle = fg; ctx.fill();
      // Bark grain — wavy horizontal lines
      ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = shadeColor(baseColor, -38); ctx.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) {
        const ly = cy + faceH * (0.18 + i * 0.21 + pr1 * 0.05);
        ctx.beginPath(); ctx.moveTo(cx + 2, ly + (pr2-0.5)*2);
        ctx.quadraticCurveTo(cx + cw*0.5, ly + (pr3-0.5)*3, cx + cw - 2, ly + (pr4-0.5)*2); ctx.stroke();
      }
      ctx.restore();
      // Filled leaf silhouette — semi-transparent, deterministic position
      ctx.save(); ctx.globalAlpha = 0.22;
      ctx.translate(cx + cw*(0.08 + pr3*0.38), cy + faceH*0.84);
      ctx.rotate(pr2 * 1.2 - 0.3);
      const llen = Math.min(cw, faceH) * (0.55 + pr1 * 0.25);
      ctx.fillStyle = lightenColor(baseColor, 28);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(llen*0.22, -llen*0.28, llen*0.78, -llen*0.24, llen, 0);
      ctx.bezierCurveTo(llen*0.78, llen*0.24, llen*0.22, llen*0.28, 0, 0);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.30; ctx.strokeStyle = shadeColor(baseColor, -20); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(llen, 0); ctx.stroke();
      ctx.restore();
      // Moss stipple
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = lightenColor(baseColor, 32);
      const ms = Math.min(cw, faceH) * 0.26;
      for (let i = 0; i < 6; i++) {
        const mx = cx + 3 + ((cellNum * 1327 + i * 997) % 100) / 100 * ms;
        const my = cy + faceH - 4 - ((cellNum * 2719 + i * 1451) % 100) / 100 * ms;
        const mr = ((cellNum * 3571 + i * 613) % 100) / 100 * 2 + 0.8;
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
      // Earthy border
      ctx.save(); rRect(cx, cy, cw, faceH);
      ctx.strokeStyle = shadeColor(baseColor, -40); ctx.lineWidth = 1.5; ctx.globalAlpha = 0.65; ctx.stroke(); ctx.restore();

    } else {
      // ── CARTOON: original toy-block style ──
      const baseColor = accentColor;
      const darkColor = shadeColor(baseColor, -38);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
      rRect(cx, cy + edgeH, cw, ch - edgeH); ctx.fillStyle = darkColor; ctx.fill(); ctx.restore();
      ctx.save();
      const fg = ctx.createLinearGradient(cx, cy, cx + cw * 0.55, cy + faceH);
      fg.addColorStop(0, lightenColor(baseColor, 50)); fg.addColorStop(0.4, lightenColor(baseColor, 20)); fg.addColorStop(1, baseColor);
      rRect(cx, cy, cw, faceH); ctx.fillStyle = fg; ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.42;
      const sg = ctx.createLinearGradient(cx, cy, cx, cy + faceH * 0.44);
      sg.addColorStop(0, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      rRect(cx + 1, cy + 1, cw - 2, faceH * 0.52, rr * 0.7); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
      ctx.save(); rRect(cx, cy, cw, faceH);
      ctx.strokeStyle = shadeColor(baseColor, -24); ctx.lineWidth = 1.8; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.restore();

    }

    // ── Subtle themed decoration ──
    drawTileDecoration(ctx, cx, cy, cw, faceH, cellNum, theme);

    // ── Special: start cell (1) ──
    if (cellNum === 1) {
      ctx.save();
      const sg2 = ctx.createRadialGradient(cx + cw*0.5, cy + faceH*0.5, 0, cx + cw*0.5, cy + faceH*0.5, Math.max(cw, faceH) * 0.65);
      sg2.addColorStop(0, 'rgba(46,213,115,0.5)');
      sg2.addColorStop(1, 'rgba(46,213,115,0)');
      rRect(cx, cy, cw, faceH);
      ctx.fillStyle = sg2;
      ctx.fill();
      // Play arrow
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#1a7a42';
      const arrowSz = Math.min(cw, faceH) * 0.25;
      const ax = cx + cw - arrowSz * 0.5 - 2;
      const ay = cy + faceH - arrowSz * 0.5 - 2;
      ctx.beginPath();
      ctx.moveTo(ax - arrowSz, ay - arrowSz * 0.65);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax - arrowSz, ay + arrowSz * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    // ── Special: finish cell ──
    } else if (cellNum === total) {
      ctx.save();
      // Outer warm glow
      const fg2 = ctx.createRadialGradient(cx + cw*0.5, cy + faceH*0.5, 0, cx + cw*0.5, cy + faceH*0.5, Math.max(cw, faceH) * 0.8);
      fg2.addColorStop(0, 'rgba(255,220,50,0.75)');
      fg2.addColorStop(0.55, 'rgba(255,165,0,0.35)');
      fg2.addColorStop(1, 'rgba(255,215,0,0)');
      rRect(cx, cy, cw, faceH);
      ctx.fillStyle = fg2;
      ctx.fill();
      // Gold crown emoji (center)
      const crownSz = Math.min(cw, faceH) * 0.44;
      ctx.globalAlpha = 0.82;
      ctx.font = `${crownSz}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', cx + cw * 0.5, cy + faceH * 0.5);
      // Gold star corner badge
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#b87a08';
      const starSz = Math.min(cw, faceH) * 0.30;
      ctx.font = `${starSz}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('★', cx + cw - 2, cy + faceH - 2);
      ctx.restore();
    }

    // ── Number — small, bottom-left corner ──
    const fontSize = Math.max(Math.min(cellW * 0.26, cellH * 0.28, 13), 7);
    ctx.font = `700 ${fontSize}px 'Baloo 2', 'Fredoka One', cursive`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    const numX = cx + cw * 0.10;
    const numY = cy + faceH - faceH * 0.08;

    let numFill, numShadow;
    if (theme === 'space') {
      numFill = '#c4b5fd'; numShadow = 'rgba(5,0,20,0.98)';
    } else if (theme === 'ocean') {
      numFill = '#bae6fd'; numShadow = 'rgba(0,40,80,0.96)';
    } else if (theme === 'fantasy') {
      numFill = '#e9d5ff'; numShadow = 'rgba(60,0,100,0.92)';
    } else if (theme === 'jungle') {
      numFill = '#bbf7d0'; numShadow = 'rgba(5,20,5,0.95)';
    } else {
      numFill = '#ffffff'; numShadow = 'rgba(20,20,40,0.96)';
    }

    ctx.shadowColor = numShadow;
    ctx.shadowBlur = 4;
    ctx.fillStyle = numFill;
    ctx.fillText(cellNum, numX, numY);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  function drawTileDecoration(ctx, cx, cy, cw, faceH, cellNum, theme) {
    return; // tile decorations removed
    const type = cellNum % 5;
    if (type === 0) return; // plain tile

    const sz = Math.min(cw, faceH) * 0.18;
    if (sz < 3) return;

    // Bottom-right corner position
    const px = cx + cw - sz * 0.85;
    const py = cy + faceH - sz * 0.85;

    ctx.save();
    ctx.globalAlpha = 0.38;
    const dc = { jungle: '#ffffff', space: '#c4b5fd', ocean: '#ffffff', fantasy: '#fde68a', cartoon: '#ffffff' }[theme] || '#ffffff';
    ctx.fillStyle = dc;
    ctx.strokeStyle = dc;

    if (type === 1) {
      // 3 small dots in a row
      const dr = sz * 0.27;
      for (let d = 0; d < 3; d++) {
        ctx.beginPath();
        ctx.arc(px - sz * (2 - d) * 0.42, py, dr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 2) {
      // 4-point sparkle star
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? sz * 0.5 : sz * 0.22;
        const x2 = px + Math.cos(a) * rad;
        const y2 = py + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.fill();
    } else if (type === 3) {
      // Diamond
      ctx.beginPath();
      ctx.moveTo(px, py - sz * 0.5);
      ctx.lineTo(px + sz * 0.38, py);
      ctx.lineTo(px, py + sz * 0.5);
      ctx.lineTo(px - sz * 0.38, py);
      ctx.closePath();
      ctx.fill();
    } else if (type === 4) {
      // Ring + centre dot
      ctx.lineWidth = Math.max(1, sz * 0.18);
      ctx.beginPath();
      ctx.arc(px, py, sz * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, sz * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Lighten or darken a hex/rgb color by `amount` (negative = darker)
  function shadeColor(color, amount) {
    // Works with hex (#rrggbb) or 'rgba(r,g,b,a)' strings
    if (color.startsWith('#')) {
      let r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
      r = Math.max(0,Math.min(255,r+amount)); g = Math.max(0,Math.min(255,g+amount)); b = Math.max(0,Math.min(255,b+amount));
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    }
    return color; // fallback: return unchanged for rgba strings
  }

  function drawSnake(ctx, headCell, tailCell, cols, rows, w, h, T, theme) {
    const head = getCellRect(headCell, cols, rows, w, h);
    const tail = getCellRect(tailCell, cols, rows, w, h);

    const hx = head.cx, hy = head.cy;
    const tx = tail.cx, ty = tail.cy;

    // Cubic bezier control points for organic snake shape
    const dx = hx - tx, dy = hy - ty;
    const cp1x = tx + dx * 0.25 + dy * 0.3;
    const cp1y = ty + dy * 0.25 - dx * 0.3;
    const cp2x = hx - dx * 0.25 + dy * 0.2;
    const cp2y = hy - dy * 0.25 - dx * 0.2;

    const lineW = Math.min(head.w * 0.28, 22);

    // Per-theme palette: dark outline, body mid, belly, scale overlay
    const palettes = {
      jungle:  { dark:'#1b5e20', mid:'#4caf50', light:'#a5d6a7', belly:'rgba(200,230,170,0.70)', scale:'rgba(27,94,32,0.50)'   },
      space:   { dark:'#1b5e20', mid:'#00e676', light:'#b9f6ca', belly:'rgba(200,255,210,0.65)', scale:'rgba(27,94,32,0.45)'    },
      ocean:   { dark:'#004d40', mid:'#00acc1', light:'#80deea', belly:'rgba(180,240,245,0.65)', scale:'rgba(0,77,64,0.50)'     },
      fantasy: { dark:'#00838f', mid:'#26c6da', light:'#b2ebf2', belly:'rgba(178,235,242,0.65)', scale:'rgba(0,131,143,0.48)'   },
      cartoon: { dark:'#33691e', mid:'#8bc34a', light:'#dcedc8', belly:'rgba(220,245,185,0.70)', scale:'rgba(51,105,30,0.50)'   },
    };
    const pal = palettes[theme] || palettes.cartoon;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Deep shadow outline (all themes)
    ctx.shadowColor = pal.dark;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = lineW + 6;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Body gradient
    const grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0,    pal.dark);
    grad.addColorStop(0.45, pal.mid);
    grad.addColorStop(1,    pal.dark);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineW + 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
    ctx.stroke();

    // 3. Scale arcs perpendicular to bezier tangent
    const dist = Math.hypot(dx, dy);
    const numScales = Math.max(6, Math.floor(dist / (lineW * 2.0)));
    for (let i = 1; i < numScales; i++) {
      const t = i / numScales;
      const bx  = cubicBezierPoint(tx, cp1x, cp2x, hx, t);
      const by  = cubicBezierPoint(ty, cp1y, cp2y, hy, t);
      const t2  = Math.min(t + 0.05, 1);
      const angle = Math.atan2(
        cubicBezierPoint(ty, cp1y, cp2y, hy, t2) - by,
        cubicBezierPoint(tx, cp1x, cp2x, hx, t2) - bx
      );
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angle + Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, 0, lineW * 0.54, 0, Math.PI);
      ctx.fillStyle = pal.scale;
      ctx.fill();
      ctx.restore();
    }

    // Fantasy bonus: gold spine dots on top of scales
    if (theme === 'fantasy') {
      for (let i = 1; i < numScales; i++) {
        const t = i / numScales;
        const bx = cubicBezierPoint(tx, cp1x, cp2x, hx, t);
        const by = cubicBezierPoint(ty, cp1y, cp2y, hy, t);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(bx, by, lineW * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // 4. Belly ventral stripe
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = pal.belly;
    ctx.lineWidth = lineW * 0.44;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 5. Head
    const headR = lineW * 1.35;
    const headSprite = _sprites['head-' + theme];
    if (headSprite && headSprite.complete && headSprite.naturalWidth > 0) {
      const spriteSize = head.w * 1.3;
      // Tilt head slightly toward body direction, clamped to ±30°
      const bodyAngle = Math.atan2(hy - cp2y, hx - cp2x);
      let headRot = bodyAngle + Math.PI / 2;
      while (headRot > Math.PI) headRot -= Math.PI * 2;
      while (headRot < -Math.PI) headRot += Math.PI * 2;
      headRot = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, headRot));
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(headRot);
      ctx.drawImage(headSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.restore();
    } else {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.arc(hx, hy, headR + 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = T.snakeHead;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();
    // Head gloss
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath();
    ctx.arc(hx - headR * 0.28, hy - headR * 0.32, headR * 0.50, 0, Math.PI * 2);
    ctx.fill();

    // 6. Eyes
    if (theme === 'space') {
      // Astronaut helmet: white circle with dark visor
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = Math.max(1, headR * 0.12);
      ctx.beginPath();
      ctx.arc(hx, hy, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#212121';
      const visorW = headR * 1.1;
      const visorH = headR * 0.6;
      ctx.beginPath();
      ctx.roundRect(hx - visorW * 0.5, hy - visorH * 0.5, visorW, visorH, visorH * 0.4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.roundRect(hx - visorW * 0.35, hy - visorH * 0.35, visorW * 0.4, visorH * 0.3, 3);
      ctx.fill();
    } else if (theme === 'cartoon') {
      const eyeOffset = headR * 0.50;
      const eyeR      = headR * 0.42;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = Math.max(1, eyeR * 0.28);
      ctx.beginPath(); ctx.arc(hx - eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx + eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(hx - eyeOffset + eyeR * 0.2, hy - eyeOffset * 0.3, eyeR * 0.52, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset + eyeR * 0.2, hy - eyeOffset * 0.3, eyeR * 0.52, 0, Math.PI * 2); ctx.fill();
      // Eye shine
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(hx - eyeOffset + eyeR * 0.55, hy - eyeOffset * 0.58, eyeR * 0.20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset + eyeR * 0.55, hy - eyeOffset * 0.58, eyeR * 0.20, 0, Math.PI * 2); ctx.fill();
    } else {
      const eyeOffset = headR * 0.47;
      const eyeR      = headR * 0.30;
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(hx - eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(hx - eyeOffset + eyeR * 0.2, hy - eyeOffset * 0.3, eyeR * 0.58, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset + eyeR * 0.2, hy - eyeOffset * 0.3, eyeR * 0.58, 0, Math.PI * 2); ctx.fill();
      // Eye shine
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(hx - eyeOffset + eyeR * 0.55, hy - eyeOffset * 0.58, eyeR * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset + eyeR * 0.55, hy - eyeOffset * 0.58, eyeR * 0.22, 0, Math.PI * 2); ctx.fill();
    }

    // 7. Tongue (not space — has helmet)
    if (theme !== 'space') {
      const tongueColor = theme === 'jungle' ? '#ff8f00' : '#ff1744';
      ctx.strokeStyle = tongueColor;
      ctx.lineWidth = Math.max(1.5, lineW * 0.17);
      ctx.lineCap = 'round';
      const tongueDir = Math.atan2(hy - ty, hx - tx);
      const tLen  = headR * 1.05;
      const tTipX = hx + Math.cos(tongueDir) * (headR + tLen);
      const tTipY = hy + Math.sin(tongueDir) * (headR + tLen);
      const tMidX = hx + Math.cos(tongueDir) * (headR + tLen * 0.5);
      const tMidY = hy + Math.sin(tongueDir) * (headR + tLen * 0.5);
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(tongueDir) * headR, hy + Math.sin(tongueDir) * headR);
      ctx.lineTo(tMidX, tMidY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tMidX, tMidY);
      ctx.lineTo(tTipX + Math.cos(tongueDir + Math.PI / 2) * headR * 0.28,
                 tTipY + Math.sin(tongueDir + Math.PI / 2) * headR * 0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tMidX, tMidY);
      ctx.lineTo(tTipX + Math.cos(tongueDir - Math.PI / 2) * headR * 0.28,
                 tTipY + Math.sin(tongueDir - Math.PI / 2) * headR * 0.28);
      ctx.stroke();
    }
    } // end else (no sprite)

    ctx.restore();

    // Tail tip (tapered)
    ctx.save();
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.arc(tx, ty, lineW * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = T.snakeBody;
    ctx.beginPath();
    ctx.arc(tx, ty, lineW * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLadder(ctx, bottomCell, topCell, cols, rows, w, h, T, theme) {
    const bottom = getCellRect(bottomCell, cols, rows, w, h);
    const top = getCellRect(topCell, cols, rows, w, h);

    const bx = bottom.cx, by = bottom.cy;
    const tx = top.cx, ty = top.cy;


    const angle = Math.atan2(ty - by, tx - bx) + Math.PI / 2;
    const rungW = Math.min(bottom.w * 0.28, 16);
    const railOffset = rungW * 0.5;
    const len = Math.sqrt((tx-bx)**2 + (ty-by)**2);
    const numRungs = Math.max(3, Math.floor(len / 22));

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 6;

    if (theme === 'jungle') {
      // Bamboo poles: bright green with darker node rings, rope rungs
      const bambooOuter = '#3D7A1A';
      const bambooInner = '#68B830';
      const bambooShine = '#A8D86A';
      const ropeColor   = '#C8A84B';
      const railLW = Math.max(4, rungW * 0.32);

      for (let rail = 0; rail < 2; rail++) {
        const sign = rail === 0 ? -1 : 1;
        const rx1 = bx + Math.cos(angle) * railOffset * sign;
        const ry1 = by + Math.sin(angle) * railOffset * sign;
        const rx2 = tx + Math.cos(angle) * railOffset * sign;
        const ry2 = ty + Math.sin(angle) * railOffset * sign;
        // Dark outline
        ctx.strokeStyle = bambooOuter;
        ctx.lineWidth = railLW + 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
        // Green bamboo body
        ctx.strokeStyle = bambooInner;
        ctx.lineWidth = railLW;
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
        // Shine highlight
        ctx.strokeStyle = bambooShine;
        ctx.lineWidth = Math.max(1, railLW * 0.28);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Node rings at segment boundaries
        ctx.strokeStyle = bambooOuter;
        ctx.lineWidth = Math.max(2, railLW * 0.55);
        for (let i = 1; i < numRungs + 1; i++) {
          const t = i / (numRungs + 1);
          const nx = rx1 + (rx2 - rx1) * t;
          const ny = ry1 + (ry2 - ry1) * t;
          const perp = Math.max(2, railLW * 0.7);
          ctx.beginPath();
          ctx.arc(nx, ny, perp, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Rope rungs
      for (let i = 0; i <= numRungs; i++) {
        const t = i / numRungs;
        const rx = bx + (tx - bx) * t;
        const ry = by + (ty - by) * t;
        const r1x = rx + Math.cos(angle) * railOffset;
        const r1y = ry + Math.sin(angle) * railOffset;
        const r2x = rx - Math.cos(angle) * railOffset;
        const r2y = ry - Math.sin(angle) * railOffset;
        ctx.strokeStyle = '#7A5020';
        ctx.lineWidth = Math.max(3, rungW * 0.26);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.lineTo(r2x, r2y);
        ctx.stroke();
        ctx.strokeStyle = ropeColor;
        ctx.lineWidth = Math.max(2, rungW * 0.18);
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.lineTo(r2x, r2y);
        ctx.stroke();
      }

    } else if (theme === 'space') {
      // Metallic silver pipes with circular bolt details
      const railColor = '#b0bec5';
      const rungColor = '#90a4ae';
      const railLW = Math.max(3, rungW * 0.3);

      for (let rail = 0; rail < 2; rail++) {
        const sign = rail === 0 ? -1 : 1;
        const rx1 = bx + Math.cos(angle) * railOffset * sign;
        const ry1 = by + Math.sin(angle) * railOffset * sign;
        const rx2 = tx + Math.cos(angle) * railOffset * sign;
        const ry2 = ty + Math.sin(angle) * railOffset * sign;
        // Pipe body
        const pipeGrad = ctx.createLinearGradient(rx1 - 3, ry1, rx1 + 3, ry1);
        pipeGrad.addColorStop(0, '#607d8b');
        pipeGrad.addColorStop(0.4, '#eceff1');
        pipeGrad.addColorStop(1, '#90a4ae');
        ctx.strokeStyle = pipeGrad;
        ctx.lineWidth = railLW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
        // Bolt circles at joints
        for (let i = 0; i <= numRungs; i++) {
          const t = i / numRungs;
          const jx = rx1 + (rx2 - rx1) * t;
          const jy = ry1 + (ry2 - ry1) * t;
          ctx.fillStyle = '#455a64';
          ctx.beginPath();
          ctx.arc(jx, jy, railLW * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#cfd8dc';
          ctx.beginPath();
          ctx.arc(jx, jy, railLW * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = 0; i <= numRungs; i++) {
        const t = i / numRungs;
        const rx = bx + (tx - bx) * t;
        const ry = by + (ty - by) * t;
        const r1x = rx + Math.cos(angle) * railOffset;
        const r1y = ry + Math.sin(angle) * railOffset;
        const r2x = rx - Math.cos(angle) * railOffset;
        const r2y = ry - Math.sin(angle) * railOffset;
        ctx.strokeStyle = rungColor;
        ctx.lineWidth = Math.max(2, rungW * 0.22);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.lineTo(r2x, r2y);
        ctx.stroke();
      }

    } else if (theme === 'ocean') {
      // Coral columns: rich orange-pink with branching nubs; teal rope rungs
      const coralDark  = '#C0436A';
      const coralMid   = '#F06292';
      const coralLight = '#F8BBD9';
      const railLW = Math.max(4, rungW * 0.30);

      for (let rail = 0; rail < 2; rail++) {
        const sign = rail === 0 ? -1 : 1;
        const rx1 = bx + Math.cos(angle) * railOffset * sign;
        const ry1 = by + Math.sin(angle) * railOffset * sign;
        const rx2 = tx + Math.cos(angle) * railOffset * sign;
        const ry2 = ty + Math.sin(angle) * railOffset * sign;
        // Dark base
        ctx.strokeStyle = coralDark;
        ctx.lineWidth = railLW + 2;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();
        // Main coral body
        ctx.strokeStyle = coralMid;
        ctx.lineWidth = railLW;
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();
        // Surface highlight
        ctx.strokeStyle = coralLight;
        ctx.lineWidth = Math.max(1, railLW * 0.3);
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();
        ctx.globalAlpha = 1;
        // Coral nubs (small branches at intervals)
        ctx.fillStyle = coralMid;
        for (let i = 1; i < numRungs * 2; i++) {
          const t = i / (numRungs * 2);
          const sx = rx1 + (rx2 - rx1) * t;
          const sy = ry1 + (ry2 - ry1) * t;
          const nubR = Math.max(1.5, railLW * 0.38);
          ctx.beginPath();
          ctx.arc(sx + (i % 2 === 0 ? nubR * 0.9 : -nubR * 0.9), sy, nubR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Teal rope rungs with gentle wave
      for (let i = 0; i <= numRungs; i++) {
        const t = i / numRungs;
        const rx = bx + (tx - bx) * t;
        const ry = by + (ty - by) * t;
        const r1x = rx + Math.cos(angle) * railOffset;
        const r1y = ry + Math.sin(angle) * railOffset;
        const r2x = rx - Math.cos(angle) * railOffset;
        const r2y = ry - Math.sin(angle) * railOffset;
        const midX = (r1x + r2x) / 2 + Math.cos(angle + Math.PI / 2) * rungW * 0.18 * (i % 2 === 0 ? 1 : -1);
        const midY = (r1y + r2y) / 2 + Math.sin(angle + Math.PI / 2) * rungW * 0.18 * (i % 2 === 0 ? 1 : -1);
        ctx.strokeStyle = '#006994';
        ctx.lineWidth = Math.max(2.5, rungW * 0.24);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.quadraticCurveTo(midX, midY, r2x, r2y);
        ctx.stroke();
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = Math.max(1.5, rungW * 0.15);
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.quadraticCurveTo(midX, midY, r2x, r2y);
        ctx.stroke();
      }

    } else if (theme === 'fantasy') {
      // Golden glowing beams with sparkle dots
      const railColor = '#ffd700';
      const rungColor = '#fff176';
      const railLW = Math.max(3, rungW * 0.28);

      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      for (let rail = 0; rail < 2; rail++) {
        const sign = rail === 0 ? -1 : 1;
        const rx1 = bx + Math.cos(angle) * railOffset * sign;
        const ry1 = by + Math.sin(angle) * railOffset * sign;
        const rx2 = tx + Math.cos(angle) * railOffset * sign;
        const ry2 = ty + Math.sin(angle) * railOffset * sign;
        ctx.strokeStyle = railColor;
        ctx.lineWidth = railLW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
        // Sparkle dots along rails
        ctx.fillStyle = 'rgba(255,255,200,0.8)';
        for (let j = 0; j < numRungs * 1.5; j++) {
          const t2 = j / (numRungs * 1.5);
          const sx = rx1 + (rx2 - rx1) * t2;
          const sy = ry1 + (ry2 - ry1) * t2;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = 0; i <= numRungs; i++) {
        const t = i / numRungs;
        const rx = bx + (tx - bx) * t;
        const ry = by + (ty - by) * t;
        const r1x = rx + Math.cos(angle) * railOffset;
        const r1y = ry + Math.sin(angle) * railOffset;
        const r2x = rx - Math.cos(angle) * railOffset;
        const r2y = ry - Math.sin(angle) * railOffset;
        ctx.strokeStyle = rungColor;
        ctx.lineWidth = Math.max(2, rungW * 0.22);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.lineTo(r2x, r2y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

    } else {
      // Cartoon: bright primary-coloured with thick black outline
      const railColors = [T.ladderRail, lightenColor(T.ladderRail, 20)];

      // Black outline first
      for (let rail = 0; rail < 2; rail++) {
        const sign = rail === 0 ? -1 : 1;
        const rx1 = bx + Math.cos(angle) * railOffset * sign;
        const ry1 = by + Math.sin(angle) * railOffset * sign;
        const rx2 = tx + Math.cos(angle) * railOffset * sign;
        const ry2 = ty + Math.sin(angle) * railOffset * sign;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = Math.max(5, rungW * 0.35);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
      }
      // Rungs outline
      for (let i = 0; i <= numRungs; i++) {
        const t = i / numRungs;
        const rx = bx + (tx - bx) * t;
        const ry = by + (ty - by) * t;
        const r1x = rx + Math.cos(angle) * railOffset;
        const r1y = ry + Math.sin(angle) * railOffset;
        const r2x = rx - Math.cos(angle) * railOffset;
        const r2y = ry - Math.sin(angle) * railOffset;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = Math.max(3, rungW * 0.28);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.lineTo(r2x, r2y);
        ctx.stroke();
      }
      // Coloured rails
      for (let rail = 0; rail < 2; rail++) {
        const sign = rail === 0 ? -1 : 1;
        const rx1 = bx + Math.cos(angle) * railOffset * sign;
        const ry1 = by + Math.sin(angle) * railOffset * sign;
        const rx2 = tx + Math.cos(angle) * railOffset * sign;
        const ry2 = ty + Math.sin(angle) * railOffset * sign;
        ctx.strokeStyle = rail === 0 ? T.ladderRail : '#ffa502';
        ctx.lineWidth = Math.max(3, rungW * 0.25);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
      }
      // Coloured rungs
      for (let i = 0; i <= numRungs; i++) {
        const t = i / numRungs;
        const rx = bx + (tx - bx) * t;
        const ry = by + (ty - by) * t;
        const r1x = rx + Math.cos(angle) * railOffset;
        const r1y = ry + Math.sin(angle) * railOffset;
        const r2x = rx - Math.cos(angle) * railOffset;
        const r2y = ry - Math.sin(angle) * railOffset;
        ctx.strokeStyle = T.ladderRung;
        ctx.lineWidth = Math.max(2, rungW * 0.2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.lineTo(r2x, r2y);
        ctx.stroke();
      }
    }

    // Shine on rails (shared)
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    for (let rail = 0; rail < 2; rail++) {
      const sign = rail === 0 ? -1 : 1;
      const off = railOffset * sign - 1;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(angle) * off, by + Math.sin(angle) * off);
      ctx.lineTo(tx + Math.cos(angle) * off, ty + Math.sin(angle) * off);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Arrow indicator at top
    ctx.fillStyle = T.ladderRung;
    ctx.shadowBlur = 0;
    const arrDir = Math.atan2(ty - by, tx - bx);
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(arrDir) * 8, ty + Math.sin(arrDir) * 8);
    ctx.lineTo(tx + Math.cos(arrDir + 2.4) * 8, ty + Math.sin(arrDir + 2.4) * 8);
    ctx.lineTo(tx + Math.cos(arrDir - 2.4) * 8, ty + Math.sin(arrDir - 2.4) * 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Draw a single player token at a given x, y
  function drawToken(ctx, x, y, player, radius) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'white';
    ctx.lineWidth = Math.max(1.5, radius * 0.15);
    ctx.stroke();

    // Render emoji at minimum 28px then scale down for crisp quality on small cells
    const emojiDisplay = radius * 1.1;
    const emojiRender = Math.max(emojiDisplay, 28);
    const emojiScale = emojiDisplay / emojiRender;
    ctx.save();
    ctx.translate(x, y + radius * 0.05);
    ctx.scale(emojiScale, emojiScale);
    ctx.font = `${emojiRender}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.character, 0, 0);
    ctx.restore();

    // Number badge — helps colour-blind players identify their token
    const badgeR = Math.max(5, radius * 0.38);
    const badgeX = x + radius * 0.68;
    const badgeY = y - radius * 0.68;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = player.color;
    ctx.lineWidth = Math.max(1, badgeR * 0.35);
    ctx.stroke();
    ctx.font = `900 ${Math.max(7, Math.floor(badgeR * 1.2))}px sans-serif`;
    ctx.fillStyle = player.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String((player.id ?? 0) + 1), badgeX, badgeY);

    ctx.restore();
  }

  function drawPlayers(ctx, players, cols, rows, w, h, cellW, cellH, animState, cellRects) {
    // Use pre-computed rects when available, otherwise fall back to getCellRect
    const getRect = cellRects
      ? (cell) => cellRects[cell]
      : (cell) => getCellRect(cell, cols, rows, w, h);

    const tokenR = Math.min(cellW, cellH) * 0.32;

    // Group players by position (for those not animating along bezier)
    const byPos = {};
    for (const p of players) {
      if (animState && animState.playerId === p.id && animState.bezierPath) continue;
      if (p.position > 0) {
        if (!byPos[p.position]) byPos[p.position] = [];
        byPos[p.position].push(p);
      }
    }

    for (const pos in byPos) {
      const r = getRect(+pos);
      const group = byPos[pos];
      const n = group.length;
      for (let i = 0; i < n; i++) {
        const p = group[i];
        const offX = n > 1 ? (i - (n-1)/2) * (cellW * 0.28) : 0;
        let drawX = r.cx + offX;
        let drawY = r.cy;

        if (animState && animState.playerId === p.id && !animState.bezierPath && animState.progress < 1) {
          const fromR = getRect(animState.fromCell);
          drawX = fromR.cx + (r.cx - fromR.cx) * animState.progress + offX;
          drawY = fromR.cy + (r.cy - fromR.cy) * animState.progress;
        }

        drawToken(ctx, drawX, drawY, p, tokenR);
      }
    }

    // Draw bezier-animated player
    if (animState && animState.bezierPath) {
      const p = players.find(pl => pl.id === animState.playerId);
      if (p) {
        const bp = animState.bezierPath;
        const t = animState.progress;
        drawToken(ctx,
          cubicBezierPoint(bp.x0, bp.cx1, bp.cx2, bp.x1, t),
          cubicBezierPoint(bp.y0, bp.cy1, bp.cy2, bp.y1, t),
          p, tokenR);
      }
    }
  }

  // Bezier helpers
  function cubicBezierPoint(p0, p1, p2, p3, t) {
    return (1-t)**3*p0 + 3*(1-t)**2*t*p1 + 3*(1-t)*t**2*p2 + t**3*p3;
  }

  // Keep old name as alias for backward compat
  function bezierPoint(p0, p1, p2, p3, t) {
    return cubicBezierPoint(p0, p1, p2, p3, t);
  }

  // Returns bezier control points for a snake (matching drawSnake)
  function getSnakeBezierPath(headCell, tailCell, cols, rows, w, h) {
    const head = getCellRect(headCell, cols, rows, w, h);
    const tail = getCellRect(tailCell, cols, rows, w, h);
    const hx = head.cx, hy = head.cy;
    const tx = tail.cx, ty = tail.cy;
    const dx = hx - tx, dy = hy - ty;
    const cp1x = tx + dx * 0.25 + dy * 0.3;
    const cp1y = ty + dy * 0.25 - dx * 0.3;
    const cp2x = hx - dx * 0.25 + dy * 0.2;
    const cp2y = hy - dy * 0.25 - dx * 0.2;
    return { x0: hx, y0: hy, cx1: cp2x, cy1: cp2y, cx2: cp1x, cy2: cp1y, x1: tx, y1: ty };
  }

  // Returns bezier control points for a ladder (straight line as bezier)
  function getLadderBezierPath(bottomCell, topCell, cols, rows, w, h) {
    const bottom = getCellRect(bottomCell, cols, rows, w, h);
    const top = getCellRect(topCell, cols, rows, w, h);
    const bx = bottom.cx, by = bottom.cy;
    const tx = top.cx, ty = top.cy;
    // Straight line: control points at 1/3 and 2/3 along the line
    return {
      x0: bx, y0: by,
      cx1: bx + (tx - bx) * 0.33,
      cy1: by + (ty - by) * 0.33,
      cx2: bx + (tx - bx) * 0.67,
      cy2: by + (ty - by) * 0.67,
      x1: tx, y1: ty,
    };
  }

  function lightenColor(hex, amount) {
    let r, g, b;
    if (hex.startsWith('rgb')) {
      const m = hex.match(/\d+/g);
      r = parseInt(m[0]); g = parseInt(m[1]); b = parseInt(m[2]);
    } else {
      const num = parseInt(hex.replace('#',''), 16);
      r = (num >> 16) & 0xff;
      g = (num >> 8) & 0xff;
      b = num & 0xff;
    }
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    return `rgb(${r},${g},${b})`;
  }

  // ============================================================
  // BOARD DESIGNER
  // ============================================================

  const designer = {
    canvas: null,
    ctx: null,
    config: {
      preset: 'classic',
      cols: 10, rows: 10, total: 100,
      theme: 'cartoon',
      snakes: [],
      ladders: [],
    },
    mode: 'idle', // 'snake-head' | 'snake-tail' | 'ladder-bottom' | 'ladder-top'
    pending: null, // first cell selected in a two-click placement
    _hoverCell: null,
    selectedSnakeIndex: -1,
    selectedLadderIndex: -1,
    targetSnakeCount: 3,
    targetLadderCount: 3,

    _clickHandler: null,
    _moveHandler: null,
    _resizeHandler: null,
    initialized: false,

    init(canvasEl) {
      // Remove previous listeners if re-initializing
      if (this._clickHandler)  canvasEl.removeEventListener('click', this._clickHandler);
      if (this._moveHandler)   { canvasEl.removeEventListener('mousemove', this._moveHandler); canvasEl.removeEventListener('touchmove', this._moveHandler); }
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);

      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
      this.mode = 'idle';
      this.pending = null;
      this._hoverCell = null;

      this._clickHandler = e => this.handleClick(e);
      this._moveHandler  = e => {
        if (this.mode !== 'snake-tail' && this.mode !== 'ladder-top') return;
        if (e.cancelable) e.preventDefault();
        const src = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const cell = getCellFromPoint(
          (src.clientX - rect.left) * scaleX,
          (src.clientY - rect.top)  * scaleY,
          this.config.cols, this.config.rows, this.canvas.width, this.canvas.height
        );
        if (cell !== this._hoverCell) { this._hoverCell = cell; this.draw(); }
      };
      this._resizeHandler = () => { this.resize(); this.draw(); };
      canvasEl.addEventListener('click', this._clickHandler);
      canvasEl.addEventListener('mousemove', this._moveHandler);
      canvasEl.addEventListener('touchmove', this._moveHandler, { passive: false });
      window.addEventListener('resize', this._resizeHandler);

      this.initialized = true;
      // Use setTimeout to allow layout to complete
      setTimeout(() => { this.resize(); this.draw(); }, 50);
    },

    resize() {
      const wrap = this.canvas.parentElement;
      if (!wrap) return;
      const availW = wrap.clientWidth;
      const availH = wrap.clientHeight;
      if (availW <= 0 || availH <= 0) return;

      const cols   = this.config.cols;
      const rows   = this.config.rows;
      const aspect = cols / rows;

      // Fit square canvas within available space — never expand beyond container
      let size = Math.min(availW, availH);
      let cw = (aspect >= 1) ? size : size * aspect;
      let ch = (aspect >= 1) ? size / aspect : size;

      // If wider than tall, constrain to width
      if (cw > availW) { cw = availW; ch = cw / aspect; }
      if (ch > availH) { ch = availH; cw = ch * aspect; }

      cw = Math.round(cw);
      ch = Math.round(ch);

      const dpr = window.devicePixelRatio || 1;
      this.canvas.width        = Math.round(cw * dpr);
      this.canvas.height       = Math.round(ch * dpr);
      this.canvas.style.width  = cw + 'px';
      this.canvas.style.height = ch + 'px';
    },

    setPreset(key) {
      const p = GRID_PRESETS[key];
      if (!p) return;
      this.config.preset = key;
      this.config.cols = p.cols;
      this.config.rows = p.rows;
      this.config.total = p.total;
      this.config.snakes = [];
      this.config.ladders = [];
      this.resize();
      this.draw();
    },

    setTheme(theme) {
      this.config.theme = theme;
      this.draw();
    },

    setMode(mode) {
      this.mode = mode;
      this.pending = null;
      this._hoverCell = null;
      this.selectedSnakeIndex = -1;
      this.selectedLadderIndex = -1;
      this.draw();
    },

    handleClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const cell = getCellFromPoint(x, y, this.config.cols, this.config.rows, this.canvas.width, this.canvas.height);
      if (!cell) return;

      if (this.mode === 'snake-head') {
        // Tap existing snake to select it (tap again or X button to delete)
        const si = this.config.snakes.findIndex(s => s.head === cell || s.tail === cell);
        if (si !== -1) {
          this.selectedSnakeIndex = (this.selectedSnakeIndex === si) ? -1 : si;
          this.draw();
          updateSnakeSelection(this.selectedSnakeIndex);
          Sounds.button();
          return;
        }
        // Tapping empty cell clears selection
        if (this.selectedSnakeIndex !== -1) {
          this.selectedSnakeIndex = -1;
          this.draw();
          updateSnakeSelection(-1);
        }
        if (this.cellOccupied(cell)) { Sounds.errorBuzz(); showToast('Square taken! Try another ↩'); return; }
        this.pending = cell;
        this.mode = 'snake-tail';
        this.draw();
        updatePlacementHint('Now tap the end square');
        if (typeof confirmPlacementCell === 'function') confirmPlacementCell('snake-head', cell);
        Sounds.button();
      } else if (this.mode === 'snake-tail') {
        if (this.pending !== null && cell < this.pending && cell >= 1) {
          if (!this.cellOccupied(cell) && !this.cellOccupied(this.pending)) {
            this.config.snakes.push({ head: this.pending, tail: cell });
            this.mode = 'idle';
            this.pending = null;
            this.draw();
            updateDesignerUI();
            Sounds.landLadder();
          } else {
            Sounds.errorBuzz(); showToast('Square taken! Try another ↩');
          }
        } else if (cell === this.pending) {
          // Cancel placement by tapping the head again
          this.pending = null;
          this.mode = 'snake-head';
          this.draw();
          updatePlacementHint('');
        } else {
          Sounds.errorBuzz(); showToast('End must be lower!');
        }
      } else if (this.mode === 'ladder-bottom') {
        // Tap existing ladder to select it (tap again or X button to delete)
        const li = this.config.ladders.findIndex(l => l.bottom === cell || l.top === cell);
        if (li !== -1) {
          this.selectedLadderIndex = (this.selectedLadderIndex === li) ? -1 : li;
          this.draw();
          updateLadderSelection(this.selectedLadderIndex);
          Sounds.button();
          return;
        }
        // Tapping empty cell clears selection
        if (this.selectedLadderIndex !== -1) {
          this.selectedLadderIndex = -1;
          this.draw();
          updateLadderSelection(-1);
        }
        if (this.cellOccupied(cell)) { Sounds.errorBuzz(); showToast('Square taken! Try another ↩'); return; }
        this.pending = cell;
        this.mode = 'ladder-top';
        this.draw();
        updatePlacementHint('Now tap the top square');
        if (typeof confirmPlacementCell === 'function') confirmPlacementCell('ladder-bottom', cell);
        Sounds.button();
      } else if (this.mode === 'ladder-top') {
        if (this.pending !== null && cell > this.pending && cell <= this.config.total) {
          if (!this.cellOccupied(cell) && !this.cellOccupied(this.pending)) {
            this.config.ladders.push({ bottom: this.pending, top: cell });
            this.mode = 'idle';
            this.pending = null;
            this.draw();
            updateDesignerUI();
            Sounds.landLadder();
          } else {
            Sounds.errorBuzz(); showToast('Square taken! Try another ↩');
          }
        } else if (cell === this.pending) {
          // Cancel placement by tapping the bottom again
          this.pending = null;
          this.mode = 'ladder-bottom';
          this.draw();
          updatePlacementHint('');
        } else {
          Sounds.errorBuzz(); showToast('Top must be higher!');
        }
      }
    },

    cellOccupied(cell) {
      if (cell === 1 || cell === this.config.total) return true;
      for (const s of this.config.snakes) {
        if (s.head === cell || s.tail === cell) return true;
      }
      for (const l of this.config.ladders) {
        if (l.bottom === cell || l.top === cell) return true;
      }
      return false;
    },

    autoPlace() {
      const { cols, rows, total } = this.config;
      const sCount = this.targetSnakeCount;
      const lCount = this.targetLadderCount;

      this.config.snakes = [];
      this.config.ladders = [];

      const usedCells = new Set([1, total]);
      const allCells = Array.from({ length: total - 2 }, (_, i) => i + 2);
      const shuffled = shuffle(allCells);
      let idx = 0;

      // Place snakes
      for (let i = 0; i < sCount && idx + 1 < shuffled.length; i++) {
        let head, tail, tries = 0;
        do {
          if (idx >= shuffled.length - 1) break;
          const c1 = shuffled[idx];
          const c2 = shuffled[idx + 1];
          head = Math.max(c1, c2);
          tail = Math.min(c1, c2);
          idx += 2;
          tries++;
        } while ((usedCells.has(head) || usedCells.has(tail) || head - tail < cols) && tries < 20);
        if (head && tail && head - tail >= cols && !usedCells.has(head) && !usedCells.has(tail)) {
          this.config.snakes.push({ head, tail });
          usedCells.add(head); usedCells.add(tail);
        }
      }

      // Place ladders
      const remaining = shuffle(allCells.filter(c => !usedCells.has(c)));
      idx = 0;
      for (let i = 0; i < lCount && idx + 1 < remaining.length; i++) {
        let bottom, top, tries = 0;
        do {
          if (idx >= remaining.length - 1) break;
          const c1 = remaining[idx];
          const c2 = remaining[idx + 1];
          bottom = Math.min(c1, c2);
          top = Math.max(c1, c2);
          idx += 2;
          tries++;
        } while ((usedCells.has(bottom) || usedCells.has(top) || top - bottom < cols) && tries < 20);
        if (bottom && top && top - bottom >= cols && !usedCells.has(bottom) && !usedCells.has(top)) {
          this.config.ladders.push({ bottom, top });
          usedCells.add(bottom); usedCells.add(top);
        }
      }

      this.draw();
      updateDesignerUI();
    },

    removeSnake(i) {
      this.config.snakes.splice(i, 1);
      this.draw();
      updateDesignerUI();
    },

    removeLadder(i) {
      this.config.ladders.splice(i, 1);
      this.draw();
      updateDesignerUI();
    },

    draw() {
      if (!this.canvas || !this.ctx) return;
      const { cols, rows, total, theme, snakes, ladders } = this.config;

      render(this.ctx, { cols, rows, total, theme, snakes, ladders },
             this.canvas.width, this.canvas.height, null, null);

      // Designer overlays
      const T = THEMES[theme] || THEMES.cartoon;
      const w = this.canvas.width, h = this.canvas.height;

      // Highlight selected snake with a glowing pink outline
      if (this.selectedSnakeIndex >= 0 && this.selectedSnakeIndex < snakes.length) {
        const s = snakes[this.selectedSnakeIndex];
        const sh = getCellRect(s.head, cols, rows, w, h);
        const st = getCellRect(s.tail, cols, rows, w, h);
        const hx = sh.cx, hy = sh.cy, tx = st.cx, ty = st.cy;
        const dx = hx - tx, dy = hy - ty;
        const cp1x = tx + dx * 0.25 + dy * 0.3, cp1y = ty + dy * 0.25 - dx * 0.3;
        const cp2x = hx - dx * 0.25 + dy * 0.2, cp2y = hy - dy * 0.25 - dx * 0.2;
        const lineW = Math.min(sh.w * 0.18, 12);
        this.ctx.save();
        this.ctx.strokeStyle = '#FF4D6D';
        this.ctx.lineWidth = lineW + 10;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.55;
        this.ctx.shadowColor = '#FF4D6D';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.moveTo(tx, ty);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Highlight selected ladder with a glowing gold outline
      if (this.selectedLadderIndex >= 0 && this.selectedLadderIndex < ladders.length) {
        const l = ladders[this.selectedLadderIndex];
        const lb = getCellRect(l.bottom, cols, rows, w, h);
        const lt = getCellRect(l.top, cols, rows, w, h);
        const bx = lb.cx, by = lb.cy, tx2 = lt.cx, ty2 = lt.cy;
        const lineW = Math.min(lb.w * 0.12, 8);
        this.ctx.save();
        this.ctx.strokeStyle = '#FFB700';
        this.ctx.lineWidth = lineW + 10;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.55;
        this.ctx.shadowColor = '#FFB700';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.moveTo(bx, by);
        this.ctx.lineTo(tx2, ty2);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Valid/invalid cell overlay when picking snake tail
      if (this.mode === 'snake-tail' && this.pending !== null) {
        const total = cols * rows;
        for (let cell = 1; cell <= total; cell++) {
          if (cell === this.pending) continue;
          const r = getCellRect(cell, cols, rows, w, h);
          const isValid = cell < this.pending && !this.cellOccupied(cell);
          this.ctx.fillStyle = isValid ? 'rgba(34,197,94,0.18)' : 'rgba(0,0,0,0.46)';
          this.ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        }
        // Hover preview snake
        if (this._hoverCell && this._hoverCell < this.pending && !this.cellOccupied(this._hoverCell)) {
          this.ctx.save();
          this.ctx.globalAlpha = 0.45;
          drawSnake(this.ctx, this.pending, this._hoverCell, cols, rows, w, h, T, theme);
          this.ctx.restore();
        }
      }

      // Valid/invalid cell overlay when picking ladder top
      if (this.mode === 'ladder-top' && this.pending !== null) {
        const total = cols * rows;
        for (let cell = 1; cell <= total; cell++) {
          if (cell === this.pending) continue;
          const r = getCellRect(cell, cols, rows, w, h);
          const isValid = cell > this.pending && !this.cellOccupied(cell);
          this.ctx.fillStyle = isValid ? 'rgba(255,183,0,0.18)' : 'rgba(0,0,0,0.46)';
          this.ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        }
        // Hover preview ladder
        if (this._hoverCell && this._hoverCell > this.pending && !this.cellOccupied(this._hoverCell)) {
          this.ctx.save();
          this.ctx.globalAlpha = 0.45;
          drawLadder(this.ctx, this.pending, this._hoverCell, cols, rows, w, h, T, theme);
          this.ctx.restore();
        }
      }

      // Highlight pending cell marker
      if (this.pending !== null) {
        const r = getCellRect(this.pending, cols, rows, w, h);
        this.ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
        this.ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        this.ctx.strokeStyle = '#ffa502';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
        // Draw directional arrow so user knows which cell they locked in
        const cw2 = r.w, ch2 = r.h;
        const arrowSz = Math.min(cw2, ch2) * 0.36;
        const arrow = (this.mode === 'ladder-top') ? '↑' : '↓';
        this.ctx.font = `900 ${arrowSz}px sans-serif`;
        this.ctx.fillStyle = '#7a3c00';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(arrow, r.x + cw2 / 2, r.y + ch2 / 2);
      }

      // Subtle active-mode tint (non-overlay modes only)
      if (this.mode !== 'idle' && this.mode !== 'snake-tail' && this.mode !== 'ladder-top') {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255,200,0,0.08)';
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.restore();
      }
    },

    autoPlaceSnakes() {
      const { cols, rows, total } = this.config;
      const occupied = new Set([1, total]);
      for (const l of this.config.ladders) { occupied.add(l.bottom); occupied.add(l.top); }
      for (const s of this.config.snakes) { occupied.add(s.head); occupied.add(s.tail); }

      const target = 3;
      const candidates = shuffle(Array.from({ length: total - 2 }, (_, i) => i + 2));
      let placed = 0, idx = 0;
      while (placed < target && idx + 1 < candidates.length) {
        const c1 = candidates[idx], c2 = candidates[idx + 1];
        idx += 2;
        const head = Math.max(c1, c2), tail = Math.min(c1, c2);
        if (head - tail >= cols && !occupied.has(head) && !occupied.has(tail)) {
          this.config.snakes.push({ head, tail });
          occupied.add(head); occupied.add(tail);
          placed++;
        }
      }
      this.draw();
      updateDesignerUI();
    },

    autoPlaceLadders() {
      const { cols, rows, total } = this.config;
      const occupied = new Set([1, total]);
      for (const s of this.config.snakes) { occupied.add(s.head); occupied.add(s.tail); }
      for (const l of this.config.ladders) { occupied.add(l.bottom); occupied.add(l.top); }

      const target = 3;
      const candidates = shuffle(Array.from({ length: total - 2 }, (_, i) => i + 2));
      let placed = 0, idx = 0;
      while (placed < target && idx + 1 < candidates.length) {
        const c1 = candidates[idx], c2 = candidates[idx + 1];
        idx += 2;
        const bottom = Math.min(c1, c2), top = Math.max(c1, c2);
        if (top - bottom >= cols && !occupied.has(bottom) && !occupied.has(top)) {
          this.config.ladders.push({ bottom, top });
          occupied.add(bottom); occupied.add(top);
          placed++;
        }
      }
      this.draw();
      updateDesignerUI();
    },

    getBoardConfig() {
      return { ...this.config };
    },
  };

  // ============================================================
  // GAME RENDERER (separate from designer)
  // ============================================================

  let gameCanvas = null;
  let gameCtx = null;

  let _gameBoardConfig = null;
  let _gamePlayers = null;
  let _winResizeHandler = null;

  function initGameCanvas(canvasEl, boardConfig, players) {
    gameCanvas = canvasEl;
    gameCtx = canvasEl.getContext('2d');
    _gameBoardConfig = boardConfig;
    _gamePlayers = players;

    // Remove previous resize listener
    if (_winResizeHandler) window.removeEventListener('resize', _winResizeHandler);

    resizeGameCanvas(boardConfig);
    render(gameCtx, boardConfig, gameCanvas.width, gameCanvas.height, players, null);

    _winResizeHandler = () => {
      resizeGameCanvas(boardConfig);
      render(gameCtx, boardConfig, gameCanvas.width, gameCanvas.height, _gamePlayers, null);
    };
    window.addEventListener('resize', _winResizeHandler);
  }

  function resizeGameCanvas(boardConfig) {
    if (!gameCanvas) return;

    // Use the actual wrap dimensions — flex already sized it correctly
    // on both mobile and desktop, no need to guess bar heights.
    const wrap = gameCanvas.closest('.game-board-wrap') || document.querySelector('.game-board-wrap');
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const availW = rect.width  - 24; // 12px left + 12px right padding
    const availH = rect.height - 16; // 8px top + 8px bottom padding

    if (availW <= 0 || availH <= 0) return;

    const cols   = boardConfig.cols;
    const rows   = boardConfig.rows;
    const aspect = cols / rows;

    let cw, ch;
    if (availW / availH > aspect) {
      ch = availH;
      cw = ch * aspect;
    } else {
      cw = availW;
      ch = cw / aspect;
    }

    // Enforce 48px minimum cell size
    const MIN_CELL = 48;
    if (cw / cols < MIN_CELL) { cw = cols * MIN_CELL; ch = cw / aspect; }
    if (ch / rows < MIN_CELL) { ch = rows * MIN_CELL; cw = ch * aspect; }

    // Never exceed available width
    if (cw > availW) { cw = availW; ch = cw / aspect; }

    cw = Math.round(cw);
    ch = Math.round(ch);

    const dpr = window.devicePixelRatio || 1;
    gameCanvas.width        = Math.round(cw * dpr);
    gameCanvas.height       = Math.round(ch * dpr);
    gameCanvas.style.width  = cw + 'px';
    gameCanvas.style.height = ch + 'px';
  }

  function redrawGame(boardConfig, players, animState) {
    if (!gameCanvas || !gameCtx) return;
    render(gameCtx, boardConfig, gameCanvas.width, gameCanvas.height, players, animState);
  }

  // ============================================================
  // BOARD PARTICLE ANIMATION
  // ============================================================
  let _animCanvas = null, _animCtx = null, _animRAF = null, _animTheme = null;
  let _animParticles = [], _animTime = 0, _animW = 0, _animH = 0;

  function _makeParticle(theme, w, h) {
    if (theme === 'space') return { x: Math.random()*w, y: Math.random()*h, r: Math.random()*2.5+1.0, phase: Math.random()*Math.PI*2, speed: Math.random()*0.8+0.3, color: Math.random()>0.85?'#a78bfa':'#ffffff' };
    if (theme === 'ocean') return { x: Math.random()*w, y: h+Math.random()*h, r: Math.random()*6+3, speed: Math.random()*0.6+0.3, wobble: Math.random()*0.5+0.2, wPhase: Math.random()*Math.PI*2, alpha: Math.random()*0.5+0.25 };
    if (theme === 'fantasy') return { x: Math.random()*w, y: Math.random()*h, life: Math.random(), maxLife: Math.random()*120+50, speed: Math.random()*0.4+0.15, size: Math.random()*7+3, color: ['#f9a8d4','#c4b5fd','#fde68a','#a5f3fc'][Math.floor(Math.random()*4)] };
    if (theme === 'jungle') return { x: Math.random()*w, y: Math.random()*h, angle: Math.random()*Math.PI*2, spin: (Math.random()-0.5)*0.05, speed: Math.random()*0.8+0.3, size: Math.random()*9+5, color: Math.random()>0.5?'#4ade80':'#86efac', drift: (Math.random()-0.5)*0.5 };
    if (theme === 'cartoon') return { x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.9, vy: (Math.random()-0.5)*0.9, r: Math.random()*7+4, color: ['#f43f5e','#f59e0b','#3b82f6','#22c55e','#a855f7'][Math.floor(Math.random()*5)] };
    return null;
  }

  function _initParticles(theme, w, h) {
    const counts = { space:70, ocean:35, fantasy:45, jungle:28, cartoon:28 };
    const count = counts[theme] || 20;
    _animParticles = Array.from({ length: count }, () => _makeParticle(theme, w, h));
  }

  function _runBoardAnim() {
    if (!_animCanvas || !_animCtx) return;
    const w = _animW, h = _animH;
    _animTime += 0.018;
    _animCtx.clearRect(0, 0, _animW, _animH);

    for (const p of _animParticles) {
      const theme = _animTheme;
      if (theme === 'space') {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(_animTime * p.speed + p.phase));
        _animCtx.globalAlpha = a;
        _animCtx.fillStyle = p.color;
        _animCtx.beginPath(); _animCtx.arc(p.x, p.y, p.r, 0, Math.PI*2); _animCtx.fill();
      } else if (theme === 'ocean') {
        p.y -= p.speed;
        p.x += Math.sin(_animTime * p.wobble + p.wPhase) * 0.5;
        if (p.y < -p.r*2) { p.y = h + p.r; p.x = Math.random()*w; }
        _animCtx.globalAlpha = p.alpha;
        _animCtx.strokeStyle = '#bae6fd'; _animCtx.lineWidth = 1;
        _animCtx.beginPath(); _animCtx.arc(p.x, p.y, p.r, 0, Math.PI*2); _animCtx.stroke();
      } else if (theme === 'fantasy') {
        p.life += 1 / p.maxLife;
        p.y -= p.speed;
        if (p.life >= 1) { Object.assign(p, _makeParticle('fantasy', w, h)); }
        const a = p.life < 0.2 ? p.life/0.2 : p.life > 0.8 ? (1-p.life)/0.2 : 1;
        _animCtx.globalAlpha = a * 0.90;
        _animCtx.fillStyle = p.color;
        const s = p.size;
        _animCtx.beginPath();
        _animCtx.moveTo(p.x, p.y-s); _animCtx.lineTo(p.x+s*0.22, p.y-s*0.22); _animCtx.lineTo(p.x+s, p.y);
        _animCtx.lineTo(p.x+s*0.22, p.y+s*0.22); _animCtx.lineTo(p.x, p.y+s);
        _animCtx.lineTo(p.x-s*0.22, p.y+s*0.22); _animCtx.lineTo(p.x-s, p.y);
        _animCtx.lineTo(p.x-s*0.22, p.y-s*0.22); _animCtx.closePath(); _animCtx.fill();
      } else if (theme === 'jungle') {
        p.y += p.speed; p.x += p.drift; p.angle += p.spin;
        if (p.y > h + p.size) { Object.assign(p, _makeParticle('jungle', w, h)); p.y = -p.size; }
        _animCtx.globalAlpha = 0.70;
        _animCtx.save(); _animCtx.translate(p.x, p.y); _animCtx.rotate(p.angle);
        _animCtx.fillStyle = p.color;
        _animCtx.beginPath(); _animCtx.ellipse(0, 0, p.size, p.size*0.42, 0, 0, Math.PI*2); _animCtx.fill();
        _animCtx.restore();
      } else if (theme === 'cartoon') {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        _animCtx.globalAlpha = 0.35;
        _animCtx.fillStyle = p.color;
        _animCtx.beginPath(); _animCtx.arc(p.x, p.y, p.r, 0, Math.PI*2); _animCtx.fill();
      }
      _animCtx.globalAlpha = 1;
    }
    _animRAF = requestAnimationFrame(_runBoardAnim);
  }

  function startBoardAnim(theme) {
    stopBoardAnim();
    _animCanvas = document.getElementById('board-anim-canvas');
    if (!_animCanvas) return;
    const wrap = _animCanvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    _animCanvas.width = Math.round(wrap.clientWidth * dpr);
    _animCanvas.height = Math.round(wrap.clientHeight * dpr);
    _animCanvas.style.width = wrap.clientWidth + 'px';
    _animCanvas.style.height = wrap.clientHeight + 'px';
    _animCtx = _animCanvas.getContext('2d');
    _animCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _animTheme = theme;
    _animTime = 0;
    _animW = wrap.clientWidth;
    _animH = wrap.clientHeight;
    _initParticles(theme, _animW, _animH);
    _runBoardAnim();
  }

  function stopBoardAnim() {
    if (_animRAF) { cancelAnimationFrame(_animRAF); _animRAF = null; }
    if (_animCtx && _animW) _animCtx.clearRect(0, 0, _animW, _animH);
  }

  preloadSprites();

  return {
    render, drawSnake, drawLadder, drawPlayers, drawToken,
    cubicBezierPoint,
    getSnakeBezierPath, getLadderBezierPath,
    designer,
    initGameCanvas, resizeGameCanvas, redrawGame, invalidateBoardCache,
    startBoardAnim, stopBoardAnim,
    lightenColor,
  };
})();

// Helpers needed by Board.designer (defined outside module for cleanliness)
function updatePlacementHint(text) {
  const mode = Board.designer.mode;

  if (mode === 'ladder-bottom' || mode === 'ladder-top') {
    if (typeof setLadderGuideStep === 'function') {
      setLadderGuideStep(mode === 'ladder-top' ? 2 : 1);
    }
    return;
  }

  if (typeof setSnakeGuideStep === 'function') {
    setSnakeGuideStep(mode === 'snake-tail' ? 2 : 1);
  }
}
