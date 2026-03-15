/* ============================================================
   BOARD — Canvas rendering + Board Designer logic
   ============================================================ */

const Board = (() => {

  // ============================================================
  // CANVAS RENDERING
  // ============================================================

  /**
   * Draw the full board on a canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} boardConfig  { cols, rows, total, theme, snakes, ladders }
   * @param {number} w  canvas width
   * @param {number} h  canvas height
   */
  function render(ctx, boardConfig, w, h, players, animState) {
    const { cols, rows, theme, snakes = [], ladders = [] } = boardConfig;
    const T = THEMES[theme] || THEMES.cartoon;
    const cellW = w / cols;
    const cellH = h / rows;

    // Background — rich themed gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, T.boardPatternColors[0]);
    bgGrad.addColorStop(1, T.boardPatternColors[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Theme canvas background art (drawn before cells)
    drawBoardBackground(ctx, theme, cols, rows, w, h, T);

    // Draw cells (inset 1px so themed background shows as grid lines)
    const total = cols * rows;
    for (let cell = 1; cell <= total; cell++) {
      const r = getCellRect(cell, cols, rows, w, h);
      const isEven = (Math.floor((cell-1) / cols) + ((cell-1) % cols)) % 2 === 0;
      drawCell(ctx, r, cell, isEven, T, cellW, cellH, theme, total);
    }

    // Theme overlay art (drawn after cells, semi-transparent)
    drawBoardOverlay(ctx, theme, cols, rows, w, h, T);

    // Draw ladders (behind snakes)
    for (const ladder of ladders) {
      drawLadder(ctx, ladder.bottom, ladder.top, cols, rows, w, h, T, theme);
    }

    // Draw snakes
    for (const snake of snakes) {
      drawSnake(ctx, snake.head, snake.tail, cols, rows, w, h, T, theme);
    }

    // Draw player tokens
    if (players) {
      drawPlayers(ctx, players, cols, rows, w, h, cellW, cellH, animState);
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
    ctx.save();
    if (theme === 'jungle') {
      // ── JUNGLE: match SVG — dark green bg, palm trees, sun glow, vines, fireflies ──
      ctx.fillStyle = '#052e16'; ctx.fillRect(0, 0, w, h);

      // Ground layer
      ctx.fillStyle = '#14532d'; ctx.fillRect(0, h*0.78, w, h*0.22);
      ctx.fillStyle = '#166534'; ctx.fillRect(0, h*0.85, w, h*0.15);

      // Sun glow top-right
      const sunG = ctx.createRadialGradient(w*0.88, h*0.06, 0, w*0.88, h*0.06, w*0.32);
      sunG.addColorStop(0, 'rgba(255,251,180,0.28)');
      sunG.addColorStop(0.5, 'rgba(255,220,80,0.10)');
      sunG.addColorStop(1, 'transparent');
      ctx.fillStyle = sunG; ctx.fillRect(0, 0, w, h);

      // Vines — left side
      ctx.strokeStyle = '#15803d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(w*0.06, h*0.18, -w*0.02, h*0.35, w*0.05, h*0.52);
      ctx.bezierCurveTo(w*0.12, h*0.68, w*0.01, h*0.82, w*0.04, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w*0.02, 0);
      ctx.bezierCurveTo(w*0.10, h*0.12, w*0.00, h*0.28, w*0.08, h*0.44);
      ctx.bezierCurveTo(w*0.14, h*0.60, w*0.02, h*0.74, w*0.06, h*0.9); ctx.stroke();

      // Vines — right side
      ctx.beginPath(); ctx.moveTo(w, 0);
      ctx.bezierCurveTo(w*0.94, h*0.18, w*1.02, h*0.35, w*0.95, h*0.52);
      ctx.bezierCurveTo(w*0.88, h*0.68, w*0.99, h*0.82, w*0.96, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w*0.98, 0);
      ctx.bezierCurveTo(w*0.90, h*0.12, w*1.00, h*0.28, w*0.92, h*0.44);
      ctx.bezierCurveTo(w*0.86, h*0.60, w*0.98, h*0.74, w*0.94, h*0.9); ctx.stroke();

      // Palm trees (silhouette style) — left, center, right
      const drawPalmSil = (px, baseY, trunkH) => {
        ctx.save(); ctx.translate(px, baseY);
        // Trunk
        ctx.fillStyle = '#14532d';
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.bezierCurveTo(-7, -trunkH*0.5, -2, -trunkH*0.85, 0, -trunkH);
        ctx.bezierCurveTo(2, -trunkH*0.85, 7, -trunkH*0.5, 5, 0); ctx.closePath(); ctx.fill();
        // Fronds as ellipses
        const frondData = [[-0.9, trunkH*0.45], [-0.5, trunkH*0.42], [-0.05, trunkH*0.38], [0.4, trunkH*0.42], [0.85, trunkH*0.45], [1.3, trunkH*0.5], [-1.3, trunkH*0.5]];
        frondData.forEach(([a, len]) => {
          ctx.save(); ctx.translate(0, -trunkH); ctx.rotate(a);
          ctx.fillStyle = '#166534';
          ctx.beginPath(); ctx.ellipse(len*0.5, 0, len*0.52, len*0.13, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        });
        ctx.restore();
      };
      drawPalmSil(w*0.08, h*0.82, h*0.36);
      drawPalmSil(w*0.92, h*0.82, h*0.32);
      drawPalmSil(w*0.50, h*0.98, h*0.24);

      // Flower circles on ground
      [[0.18, 0.88, '#86efac'], [0.36, 0.90, '#4ade80'], [0.62, 0.89, '#86efac'], [0.80, 0.88, '#4ade80']].forEach(([fx, fy, fc]) => {
        ctx.fillStyle = fc; ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(fx*w, fy*h, w*0.025, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Firefly dots
      [[0.22, 0.38], [0.45, 0.22], [0.68, 0.45], [0.78, 0.28], [0.33, 0.60], [0.57, 0.55]].forEach(([fx, fy]) => {
        ctx.fillStyle = 'rgba(220,252,120,0.7)';
        ctx.beginPath(); ctx.arc(fx*w, fy*h, 2, 0, Math.PI*2); ctx.fill();
      });

    } else if (theme === 'space') {
      // ── SPACE: match SVG — dark bg, stars, planet with ring+craters, grey moon, nebula, shooting star ──
      ctx.fillStyle = '#020010'; ctx.fillRect(0, 0, w, h);

      // Nebula glow (subtle)
      const neb1 = ctx.createRadialGradient(w*0.65, h*0.35, 0, w*0.65, h*0.35, w*0.4);
      neb1.addColorStop(0, 'rgba(99,60,180,0.18)'); neb1.addColorStop(1, 'transparent');
      ctx.fillStyle = neb1; ctx.fillRect(0, 0, w, h);
      const neb2 = ctx.createRadialGradient(w*0.2, h*0.6, 0, w*0.2, h*0.6, w*0.35);
      neb2.addColorStop(0, 'rgba(30,80,180,0.14)'); neb2.addColorStop(1, 'transparent');
      ctx.fillStyle = neb2; ctx.fillRect(0, 0, w, h);

      // ~15 small white stars
      [[0.08,0.05],[0.18,0.12],[0.32,0.04],[0.45,0.09],[0.55,0.03],[0.70,0.08],[0.82,0.14],
       [0.92,0.06],[0.12,0.28],[0.28,0.35],[0.48,0.22],[0.62,0.30],[0.78,0.25],[0.90,0.40],[0.38,0.48]].forEach(([sx,sy]) => {
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(sx*w, sy*h, 1.2, 0, Math.PI*2); ctx.fill();
      });

      // Large planet center-right — indigo radialGradient
      ctx.save(); ctx.translate(w*0.72, h*0.28);
      const pr = w*0.13;
      // Ring back half
      ctx.strokeStyle = 'rgba(167,139,250,0.55)'; ctx.lineWidth = pr*0.18;
      ctx.beginPath(); ctx.ellipse(0, pr*0.12, pr*1.7, pr*0.36, -0.2, Math.PI*0.55, Math.PI*1.45); ctx.stroke();
      // Planet body
      const pg = ctx.createRadialGradient(-pr*0.28, -pr*0.28, pr*0.08, 0, 0, pr);
      pg.addColorStop(0, '#a78bfa'); pg.addColorStop(0.5, '#6d28d9'); pg.addColorStop(1, '#3b0764');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI*2); ctx.fill();
      // Craters
      [[pr*0.28, -pr*0.22, pr*0.11], [-pr*0.18, pr*0.2, pr*0.08], [pr*0.08, pr*0.32, pr*0.07]].forEach(([cx2,cy2,cr]) => {
        ctx.fillStyle = 'rgba(0,0,0,0.20)'; ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, Math.PI*2); ctx.fill();
      });
      // Ring front half
      ctx.strokeStyle = 'rgba(167,139,250,0.80)'; ctx.lineWidth = pr*0.18;
      ctx.beginPath(); ctx.ellipse(0, pr*0.12, pr*1.7, pr*0.36, -0.2, Math.PI*1.45, Math.PI*2.55); ctx.stroke();
      ctx.restore();

      // Grey moon — left with craters
      ctx.save(); ctx.translate(w*0.18, h*0.55);
      const mr = w*0.072;
      const moonG = ctx.createRadialGradient(-mr*0.3, -mr*0.3, mr*0.1, 0, 0, mr);
      moonG.addColorStop(0, '#94a3b8'); moonG.addColorStop(1, '#475569');
      ctx.fillStyle = moonG; ctx.beginPath(); ctx.arc(0, 0, mr, 0, Math.PI*2); ctx.fill();
      [[mr*0.3, -mr*0.2, mr*0.12], [-mr*0.25, mr*0.28, mr*0.09], [mr*0.1, mr*0.38, mr*0.07]].forEach(([cx2,cy2,cr]) => {
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();

      // Shooting star line
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(w*0.38, h*0.08); ctx.lineTo(w*0.55, h*0.18); ctx.stroke();
      ctx.restore();

    } else if (theme === 'ocean') {
      // ── OCEAN: match SVG — sky, sun, deep water, sea floor, coral, seaweed, fish silhouettes, bubbles, light rays ──
      // Sky (~top 29%)
      ctx.fillStyle = '#0ea5e9'; ctx.fillRect(0, 0, w, h*0.29);
      // Sun circle
      ctx.save();
      const sunOcG = ctx.createRadialGradient(w*0.78, h*0.10, 0, w*0.78, h*0.10, w*0.09);
      sunOcG.addColorStop(0, 'rgba(255,250,160,0.95)'); sunOcG.addColorStop(1, 'rgba(255,220,60,0)');
      ctx.fillStyle = sunOcG; ctx.fillRect(0, 0, w, h*0.29); ctx.restore();
      // Deep water
      ctx.fillStyle = '#0c4a6e'; ctx.fillRect(0, h*0.29, w, h*0.71);
      // Surface wave path
      ctx.fillStyle = '#0369a1';
      ctx.beginPath(); ctx.moveTo(0, h*0.29);
      ctx.bezierCurveTo(w*0.15, h*0.27, w*0.30, h*0.32, w*0.50, h*0.29);
      ctx.bezierCurveTo(w*0.70, h*0.26, w*0.85, h*0.31, w, h*0.29);
      ctx.lineTo(w, h*0.38); ctx.lineTo(0, h*0.38); ctx.closePath(); ctx.fill();
      // Mid-water overlay
      const midW = ctx.createLinearGradient(0, h*0.38, 0, h*0.72);
      midW.addColorStop(0, 'rgba(3,105,161,0.22)'); midW.addColorStop(1, 'transparent');
      ctx.fillStyle = midW; ctx.fillRect(0, h*0.38, w, h*0.34);
      // Sea floor
      ctx.fillStyle = '#042f3e'; ctx.fillRect(0, h*0.86, w, h*0.14);
      ctx.fillStyle = '#0c4a6e'; ctx.fillRect(0, h*0.82, w, h*0.06);

      // Light rays
      ctx.save(); ctx.globalAlpha = 0.08;
      [0.12, 0.28, 0.45, 0.62, 0.78].forEach((sx, i) => {
        ctx.fillStyle = 'rgba(186,230,253,1)';
        ctx.save(); ctx.translate(sx*w, h*0.29);
        const angle = (i-2)*0.12;
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0);
        ctx.lineTo(18 + angle*h*0.6, h*0.58); ctx.lineTo(-18 + angle*h*0.6, h*0.58); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1; ctx.restore();

      // Coral clusters (no eyes) — left: pink/orange, right: cyan
      const drawCoralCluster = (px, py, csz, cc) => {
        ctx.save(); ctx.translate(px, py);
        [[0,-csz],[csz*0.45,-csz*0.72],[-csz*0.45,-csz*0.72],[csz*0.22,-csz*0.38],[-csz*0.22,-csz*0.38]].forEach(([bx, by]) => {
          ctx.strokeStyle = cc; ctx.lineWidth = csz*0.20; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, by); ctx.stroke();
          ctx.fillStyle = cc; ctx.beginPath(); ctx.arc(bx, by, csz*0.15, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
      };
      drawCoralCluster(w*0.10, h*0.90, w*0.055, '#f9a8d4');
      drawCoralCluster(w*0.22, h*0.91, w*0.042, '#fb923c');
      drawCoralCluster(w*0.78, h*0.90, w*0.050, '#67e8f9');
      drawCoralCluster(w*0.90, h*0.91, w*0.044, '#22d3ee');

      // 3 seaweed paths
      [[0.35, '#4ade80'], [0.50, '#22c55e'], [0.65, '#86efac']].forEach(([sx, sc], i) => {
        ctx.strokeStyle = sc; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx*w, h);
        for (let j = 1; j <= 5; j++) {
          const bend = (i%2===0 ? 10 : -10);
          ctx.quadraticCurveTo(sx*w+bend, h - j*h*0.05, sx*w + (j%2===0?3:-3), h - j*h*0.055);
        }
        ctx.stroke();
      });

      // 2 simple fish — ellipse + triangle tail (no eyes)
      [[w*0.68, h*0.42, w*0.055, '#7dd3fc', 1], [w*0.30, h*0.60, w*0.044, '#bae6fd', -1]].forEach(([fx, fy, fsz, fc, dir]) => {
        ctx.save(); ctx.translate(fx, fy); ctx.scale(dir, 1);
        ctx.fillStyle = fc;
        ctx.beginPath(); ctx.ellipse(0, 0, fsz*0.55, fsz*0.30, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-fsz*0.55, 0); ctx.lineTo(-fsz*0.90, -fsz*0.32); ctx.lineTo(-fsz*0.90, fsz*0.32); ctx.closePath(); ctx.fill();
        ctx.restore();
      });

      // Bubbles
      [[0.12,0.75,4],[0.32,0.62,3],[0.55,0.68,5],[0.74,0.58,3],[0.88,0.72,4],
       [0.20,0.46,2.5],[0.60,0.40,3.5],[0.44,0.52,2]].forEach(([bx,by,br]) => {
        ctx.strokeStyle = 'rgba(186,230,253,0.60)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(bx*w, by*h, br, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(224,242,254,0.15)';
        ctx.beginPath(); ctx.arc(bx*w - br*0.3, by*h - br*0.3, br*0.4, 0, Math.PI*2); ctx.fill();
      });

    } else if (theme === 'fantasy') {
      // ── FANTASY: match SVG — dark bg, aurora ellipses, moon halo+moon, stars, ground, castle, sparkles, crystals ──
      ctx.fillStyle = '#150530'; ctx.fillRect(0, 0, w, h);

      // Aurora ellipses (purple)
      [['rgba(168,85,247,0.18)', w*0.5, h*0.18, w*0.65, h*0.12],
       ['rgba(126,34,206,0.12)', w*0.3, h*0.28, w*0.55, h*0.10],
       ['rgba(192,132,252,0.10)', w*0.7, h*0.22, w*0.50, h*0.08]].forEach(([c,ex,ey,erx,ery]) => {
        const ag = ctx.createRadialGradient(ex,ey,0,ex,ey,erx);
        ag.addColorStop(0, c); ag.addColorStop(1, 'transparent');
        ctx.fillStyle = ag; ctx.fillRect(0, 0, w, h);
      });

      // Stars (top half only)
      for (let i = 0; i < 28; i++) {
        const sx = ((i*61+7)%100)/100, sy = ((i*79+11)%50)/100;
        const sr = ((i*19+3)%3)*0.3+0.4;
        ctx.fillStyle = `rgba(240,220,255,${0.55+((i*11)%5)*0.08})`;
        ctx.beginPath(); ctx.arc(sx*w, sy*h, sr, 0, Math.PI*2); ctx.fill();
      }

      // Moon halo (top-right)
      ctx.save(); ctx.translate(w*0.82, h*0.12);
      const mhR = w*0.09;
      const mhG = ctx.createRadialGradient(0,0,mhR*0.7,0,0,mhR*1.5);
      mhG.addColorStop(0,'rgba(216,180,254,0.22)'); mhG.addColorStop(1,'transparent');
      ctx.fillStyle = mhG; ctx.fillRect(-mhR*1.6,-mhR*1.6,mhR*3.2,mhR*3.2);
      // Moon body
      const moonFG = ctx.createRadialGradient(-mhR*0.25,-mhR*0.25,mhR*0.1,0,0,mhR);
      moonFG.addColorStop(0,'#e9d5ff'); moonFG.addColorStop(1,'#a855f7');
      ctx.fillStyle = moonFG; ctx.beginPath(); ctx.arc(0, 0, mhR, 0, Math.PI*2); ctx.fill();
      // Crescent shadow
      ctx.fillStyle = 'rgba(21,5,48,0.62)';
      ctx.beginPath(); ctx.arc(mhR*0.38, -mhR*0.18, mhR*0.82, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Ground
      ctx.fillStyle = '#1e0550'; ctx.fillRect(0, h*0.78, w, h*0.22);
      ctx.fillStyle = '#150530'; ctx.fillRect(0, h*0.88, w, h*0.12);

      // Castle silhouette (center)
      ctx.save(); ctx.translate(w*0.5, h*0.78);
      const csz = w*0.10;
      ctx.fillStyle = 'rgba(30,5,80,0.92)';
      // Body
      ctx.fillRect(-csz*0.32, -csz, csz*0.64, csz);
      // Gate arch
      ctx.fillStyle = 'rgba(168,85,247,0.30)';
      ctx.beginPath(); ctx.arc(0, -csz*0.12, csz*0.18, Math.PI, 0); ctx.lineTo(csz*0.18,-csz*0.0); ctx.lineTo(-csz*0.18,-csz*0.0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(30,5,80,0.92)';
      // Battlements on body
      [-csz*0.28, -csz*0.10, csz*0.08].forEach(bx => { ctx.fillRect(bx, -csz*1.18, csz*0.14, csz*0.20); });
      // Left tower
      ctx.fillRect(-csz*0.72, -csz*0.82, csz*0.40, csz*0.82);
      [-csz*0.70, -csz*0.52].forEach(bx => { ctx.fillRect(bx, -csz*0.98, csz*0.14, csz*0.18); });
      // Left spire
      ctx.beginPath(); ctx.moveTo(-csz*0.52, -csz*0.98); ctx.lineTo(-csz*0.61, -csz*1.32); ctx.lineTo(-csz*0.70, -csz*0.98); ctx.closePath(); ctx.fill();
      // Right tower
      ctx.fillRect(csz*0.32, -csz*0.82, csz*0.40, csz*0.82);
      [csz*0.32, csz*0.50].forEach(bx => { ctx.fillRect(bx, -csz*0.98, csz*0.14, csz*0.18); });
      // Right spire
      ctx.beginPath(); ctx.moveTo(csz*0.32, -csz*0.98); ctx.lineTo(csz*0.41, -csz*1.32); ctx.lineTo(csz*0.50, -csz*0.98); ctx.closePath(); ctx.fill();
      // Center spire
      ctx.beginPath(); ctx.moveTo(-csz*0.10, -csz*1.18); ctx.lineTo(0, -csz*1.55); ctx.lineTo(csz*0.10, -csz*1.18); ctx.closePath(); ctx.fill();
      // Window glow
      ctx.fillStyle = 'rgba(192,132,252,0.50)';
      ctx.beginPath(); ctx.arc(0, -csz*0.58, csz*0.12, 0, Math.PI*2); ctx.fill();
      // Flag
      ctx.fillStyle = '#a855f7'; ctx.fillRect(-csz*0.01, -csz*1.56, csz*0.01, csz*0.20);
      ctx.beginPath(); ctx.moveTo(0, -csz*1.56); ctx.lineTo(csz*0.14, -csz*1.48); ctx.lineTo(0, -csz*1.40); ctx.closePath(); ctx.fill();
      ctx.restore();

      // 5 sparkle stars (8-pointed)
      const drawSparkle = (px, py, sz, sc) => {
        ctx.save(); ctx.translate(px, py); ctx.fillStyle = sc;
        [0, Math.PI/4].forEach(ba => {
          ctx.save(); ctx.rotate(ba);
          ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(sz*0.25,-sz*0.25); ctx.lineTo(sz,0); ctx.lineTo(sz*0.25,sz*0.25); ctx.lineTo(0,sz); ctx.lineTo(-sz*0.25,sz*0.25); ctx.lineTo(-sz,0); ctx.lineTo(-sz*0.25,-sz*0.25); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
        ctx.restore();
      };
      drawSparkle(w*0.14, h*0.10, w*0.022, 'rgba(216,180,254,0.72)');
      drawSparkle(w*0.32, h*0.06, w*0.018, 'rgba(255,217,61,0.65)');
      drawSparkle(w*0.60, h*0.14, w*0.020, 'rgba(216,180,254,0.60)');
      drawSparkle(w*0.76, h*0.38, w*0.016, 'rgba(255,217,61,0.55)');
      drawSparkle(w*0.22, h*0.44, w*0.014, 'rgba(192,132,252,0.60)');

      // 3 crystal gem triangles on ground
      [[w*0.20, h*0.84, w*0.030, '#a855f7'], [w*0.50, h*0.83, w*0.024, '#c084fc'], [w*0.78, h*0.84, w*0.028, '#7c3aed']].forEach(([gx,gy,gs,gc]) => {
        ctx.save(); ctx.translate(gx, gy);
        ctx.fillStyle = gc; ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.moveTo(0, -gs*2); ctx.lineTo(gs, 0); ctx.lineTo(-gs, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.beginPath(); ctx.moveTo(0, -gs*2); ctx.lineTo(0, 0); ctx.lineTo(-gs, 0); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      });

    } else {
      // ── CARTOON: match SVG — pale sky, rainbow arcs, rolling hills, clouds, happy sun, 8-pt stars, flower ──
      ctx.fillStyle = '#fef9c3'; ctx.fillRect(0, 0, w, h);

      // 5 rainbow arcs (low opacity)
      ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6'].forEach((c,i) => {
        ctx.strokeStyle = c; ctx.lineWidth = w*0.022; ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(w*0.50, h*0.60, w*(0.28+i*0.055), Math.PI, 0); ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // 2 rolling hill ellipses
      ctx.fillStyle = '#86efac'; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.ellipse(w*0.25, h*0.92, w*0.42, h*0.18, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4ade80'; ctx.globalAlpha = 0.70;
      ctx.beginPath(); ctx.ellipse(w*0.75, h*0.94, w*0.38, h*0.16, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      // Ground strip
      ctx.fillStyle = '#bbf7d0'; ctx.fillRect(0, h*0.88, w, h*0.12);

      // 2 clouds (ellipse clusters)
      const drawCldEl = (cx, cy, cs) => {
        ctx.fillStyle = 'rgba(255,255,255,0.90)';
        [[0,0,1],[cs*0.65,-cs*0.28,0.82],[cs*1.32,0,0.88],[cs*0.65,cs*0.18,0.78]].forEach(([ox,oy,r]) => {
          ctx.beginPath(); ctx.arc(cx+ox,cy+oy,cs*r,0,Math.PI*2); ctx.fill();
        });
      };
      drawCldEl(w*0.14, h*0.14, w*0.068);
      drawCldEl(w*0.58, h*0.09, w*0.085);

      // Happy sun (top-right) — circle + rays + simple face marks
      ctx.save(); ctx.translate(w*0.88, h*0.10);
      const ssz = w*0.065;
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = ssz*0.16; ctx.lineCap = 'round';
      for (let ri = 0; ri < 8; ri++) {
        const ra = (ri/8)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(Math.cos(ra)*ssz*0.78, Math.sin(ra)*ssz*0.78);
        ctx.lineTo(Math.cos(ra)*ssz*1.28, Math.sin(ra)*ssz*1.28); ctx.stroke();
      }
      const sunRG = ctx.createRadialGradient(0,0,0,0,0,ssz*0.68);
      sunRG.addColorStop(0,'#fef08a'); sunRG.addColorStop(1,'#facc15');
      ctx.fillStyle = sunRG; ctx.beginPath(); ctx.arc(0, 0, ssz*0.68, 0, Math.PI*2); ctx.fill();
      // Face marks
      ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = ssz*0.10;
      ctx.beginPath(); ctx.arc(0, ssz*0.12, ssz*0.28, 0.22, Math.PI-0.22); ctx.stroke();
      [-ssz*0.22, ssz*0.22].forEach(ex => {
        ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.arc(ex, -ssz*0.08, ssz*0.08, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();

      // 3 colored 8-pointed stars
      const drawStar8 = (px, py, sz, sc) => {
        ctx.save(); ctx.translate(px, py); ctx.fillStyle = sc;
        [0, Math.PI/4].forEach(ba => {
          ctx.save(); ctx.rotate(ba);
          ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(sz*0.24,-sz*0.24); ctx.lineTo(sz,0); ctx.lineTo(sz*0.24,sz*0.24); ctx.lineTo(0,sz); ctx.lineTo(-sz*0.24,sz*0.24); ctx.lineTo(-sz,0); ctx.lineTo(-sz*0.24,-sz*0.24); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
        ctx.restore();
      };
      drawStar8(w*0.20, h*0.08, w*0.022, 'rgba(251,146,60,0.70)');
      drawStar8(w*0.50, h*0.05, w*0.018, 'rgba(167,139,250,0.65)');
      drawStar8(w*0.72, h*0.22, w*0.016, 'rgba(251,191,36,0.68)');

      // 1 flower (circles + stem)
      ctx.save(); ctx.translate(w*0.32, h*0.86);
      const flsz = w*0.038;
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = flsz*0.22; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, flsz*1.6); ctx.stroke();
      for (let fp = 0; fp < 6; fp++) {
        const fa = (fp/6)*Math.PI*2;
        ctx.fillStyle = '#fb7185'; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(Math.cos(fa)*flsz*0.48, Math.sin(fa)*flsz*0.48 - flsz*0.1, flsz*0.22, flsz*0.32, fa, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0, -flsz*0.1, flsz*0.28, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Doodle dots
      [[0.08,0.30],[0.94,0.44],[0.18,0.60],[0.84,0.68],[0.46,0.78]].forEach(([dx,dy]) => {
        ctx.fillStyle = 'rgba(251,191,36,0.45)';
        ctx.beginPath(); ctx.arc(dx*w, dy*h, w*0.012, 0, Math.PI*2); ctx.fill();
      });

      // Ground wave line
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(0, h*0.88);
      ctx.bezierCurveTo(w*0.18, h*0.85, w*0.35, h*0.91, w*0.52, h*0.87);
      ctx.bezierCurveTo(w*0.68, h*0.83, w*0.84, h*0.90, w, h*0.88); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
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
    const gap = 2;
    const cx = r.x + gap, cy = r.y + gap;
    const cw = r.w - gap * 2, ch = r.h - gap * 2;
    const rr = Math.min(cw, ch) * 0.22;
    const edgeH = Math.min(ch * 0.13, 5); // 3D bottom-edge height
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

    // Rotating colour palette — cycles through 5 vivid theme colours
    const palette = T.tilePalette || [T.cellEven, T.cellOdd];
    const baseColor = palette[(cellNum - 1) % palette.length];
    const darkColor = shadeColor(baseColor, -38);

    // ── 3D bottom edge (toy-block depth) ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    rRect(cx, cy + edgeH, cw, ch - edgeH);
    ctx.fillStyle = darkColor;
    ctx.fill();
    ctx.restore();

    // ── Main tile face ──
    ctx.save();
    const fg = ctx.createLinearGradient(cx, cy, cx + cw * 0.55, cy + faceH);
    fg.addColorStop(0, lightenColor(baseColor, 50));
    fg.addColorStop(0.4, lightenColor(baseColor, 20));
    fg.addColorStop(1, baseColor);
    rRect(cx, cy, cw, faceH);
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();

    // ── Glossy candy-shine highlight ──
    ctx.save();
    ctx.globalAlpha = 0.42;
    const sg = ctx.createLinearGradient(cx, cy, cx, cy + faceH * 0.44);
    sg.addColorStop(0, 'rgba(255,255,255,0.75)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    rRect(cx + 1, cy + 1, cw - 2, faceH * 0.52, rr * 0.7);
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.restore();

    // ── Tile border ──
    ctx.save();
    rRect(cx, cy, cw, faceH);
    ctx.strokeStyle = shadeColor(baseColor, -24);
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();

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

    // ── Number — big, bold, easy for kids to read ──
    const fontSize = Math.max(Math.min(cellW * 0.44, cellH * 0.48, 24), 10);
    ctx.font = `900 ${fontSize}px 'Baloo 2', 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const numY = cy + faceH * 0.47;

    let numFill, numShadow;
    if (theme === 'space') {
      numFill = '#e0d4ff'; numShadow = 'rgba(5,0,20,0.98)';
    } else if (theme === 'ocean') {
      numFill = '#ffffff'; numShadow = 'rgba(0,40,80,0.96)';
    } else if (theme === 'fantasy') {
      numFill = '#ffffff'; numShadow = 'rgba(60,0,100,0.92)';
    } else if (theme === 'jungle') {
      numFill = '#ffffff'; numShadow = 'rgba(20,50,20,0.96)';
    } else {
      numFill = '#ffffff'; numShadow = 'rgba(20,20,40,0.96)';
    }

    ctx.shadowColor = numShadow;
    ctx.shadowBlur = 6;
    ctx.fillStyle = numFill;
    ctx.fillText(cellNum, r.cx, numY);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  function drawTileDecoration(ctx, cx, cy, cw, faceH, cellNum, theme) {
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

    const lineW = Math.min(head.w * 0.18, 12);

    ctx.save();

    // Theme-specific snake rendering
    if (theme === 'jungle') {
      // Green python with brown diamond patterns
      ctx.shadowColor = '#1b5e20';
      ctx.shadowBlur = 8;
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, '#2e7d32');
      grad.addColorStop(0.5, '#388e3c');
      grad.addColorStop(1, '#1b5e20');
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW + 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
      ctx.stroke();

      // Brown diamond pattern overlay
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = lineW * 0.3;
      ctx.globalAlpha = 0.5;
      for (let t = 0.1; t < 0.9; t += 0.18) {
        const bx = cubicBezierPoint(tx, cp1x, cp2x, hx, t);
        const by = cubicBezierPoint(ty, cp1y, cp2y, hy, t);
        ctx.beginPath();
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(t * Math.PI);
        ctx.rect(-lineW * 0.2, -lineW * 0.35, lineW * 0.4, lineW * 0.7);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

    } else if (theme === 'space') {
      // Metallic silver/grey body
      ctx.shadowColor = '#9e9e9e';
      ctx.shadowBlur = 10;
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, '#757575');
      grad.addColorStop(0.5, '#bdbdbd');
      grad.addColorStop(1, '#9e9e9e');
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW + 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
      ctx.stroke();

      // Metallic shine stripe
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = lineW * 0.25;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (theme === 'ocean') {
      // Teal/blue sea serpent with scale hints
      ctx.shadowColor = '#006064';
      ctx.shadowBlur = 8;
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, '#00838f');
      grad.addColorStop(0.5, '#26c6da');
      grad.addColorStop(1, '#006064');
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW + 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
      ctx.stroke();

      // Scale dots — blue tinted
      for (let t = 0.1; t < 0.9; t += 0.15) {
        const bx = cubicBezierPoint(tx, cp1x, cp2x, hx, t);
        const by = cubicBezierPoint(ty, cp1y, cp2y, hy, t);
        ctx.fillStyle = 'rgba(0,100,120,0.4)';
        ctx.beginPath();
        ctx.arc(bx, by, lineW * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dorsal fin hint
      ctx.strokeStyle = 'rgba(0,188,212,0.6)';
      ctx.lineWidth = lineW * 0.4;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      const fmx = cubicBezierPoint(tx, cp1x, cp2x, hx, 0.5);
      const fmy = cubicBezierPoint(ty, cp1y, cp2y, hy, 0.5);
      ctx.moveTo(fmx, fmy);
      ctx.lineTo(fmx + 6, fmy - lineW);
      ctx.lineTo(fmx + lineW * 0.5, fmy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

    } else if (theme === 'fantasy') {
      // Purple dragon-like with gold spine dots
      ctx.shadowColor = '#4a148c';
      ctx.shadowBlur = 12;
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, '#7b1fa2');
      grad.addColorStop(0.5, '#9c27b0');
      grad.addColorStop(1, '#4a148c');
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW + 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
      ctx.stroke();

      // Gold spine dots
      for (let t = 0.08; t < 0.92; t += 0.12) {
        const bx = cubicBezierPoint(tx, cp1x, cp2x, hx, t);
        const by = cubicBezierPoint(ty, cp1y, cp2y, hy, t);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(bx, by, lineW * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.shadowBlur = 0;

    } else {
      // Cartoon: bright red/orange with thick outline
      ctx.shadowColor = '#c0392b';
      ctx.shadowBlur = 6;
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, '#ff4757');
      grad.addColorStop(0.5, '#ff7675');
      grad.addColorStop(1, '#c0392b');
      // Outline first
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = lineW + 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
      ctx.stroke();
      // Coloured body
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW + 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Inner lighter stripe (all themes)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = lineW * 0.35;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Head circle
    const headR = lineW * 0.9;
    const headColor = T.snakeHead;
    ctx.fillStyle = headColor;
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();

    // Cartoon: big white cartoon eyes
    if (theme === 'cartoon') {
      const eyeOffset = headR * 0.5;
      const eyeR = headR * 0.38;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = Math.max(1, eyeR * 0.3);
      ctx.beginPath(); ctx.arc(hx - eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx + eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(hx - eyeOffset + eyeR * 0.2, hy - eyeOffset * 0.3, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset + eyeR * 0.2, hy - eyeOffset * 0.3, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (theme === 'space') {
      // Astronaut helmet: white circle with dark visor
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = Math.max(1, headR * 0.12);
      ctx.beginPath();
      ctx.arc(hx, hy, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Dark visor rectangle inside helmet
      ctx.fillStyle = '#212121';
      const visorW = headR * 1.1;
      const visorH = headR * 0.6;
      ctx.beginPath();
      ctx.roundRect(hx - visorW * 0.5, hy - visorH * 0.5, visorW, visorH, visorH * 0.4);
      ctx.fill();
      // Visor shine
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.roundRect(hx - visorW * 0.35, hy - visorH * 0.35, visorW * 0.4, visorH * 0.3, 3);
      ctx.fill();
    } else {
      // Standard eyes
      ctx.shadowBlur = 0;
      const eyeOffset = headR * 0.45;
      const eyeR = headR * 0.28;
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(hx - eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset, hy - eyeOffset * 0.3, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(hx - eyeOffset + eyeR*0.2, hy - eyeOffset * 0.3, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + eyeOffset + eyeR*0.2, hy - eyeOffset * 0.3, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    }

    // Tongue (not on space snake which has helmet)
    if (theme !== 'space') {
      const tongueColor = theme === 'jungle' ? '#ff8f00' : '#ff1744';
      ctx.strokeStyle = tongueColor;
      ctx.lineWidth = Math.max(1, lineW * 0.15);
      ctx.lineCap = 'round';
      const tongueDir = Math.atan2(hy - ty, hx - tx);
      const tLen = headR * 0.9;
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
      ctx.lineTo(tTipX + Math.cos(tongueDir + Math.PI/2) * headR*0.25,
                 tTipY + Math.sin(tongueDir + Math.PI/2) * headR*0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tMidX, tMidY);
      ctx.lineTo(tTipX + Math.cos(tongueDir - Math.PI/2) * headR*0.25,
                 tTipY + Math.sin(tongueDir - Math.PI/2) * headR*0.25);
      ctx.stroke();
    }

    ctx.restore();

    // Tail tip
    ctx.save();
    ctx.fillStyle = T.snakeBody;
    ctx.beginPath();
    ctx.arc(tx, ty, lineW * 0.4, 0, Math.PI * 2);
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

    ctx.font = `${radius * 1.1}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.character, x, y + radius * 0.05);

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

  function drawPlayers(ctx, players, cols, rows, w, h, cellW, cellH, animState) {
    // Group players by position (for those not animating along bezier)
    const byPos = {};
    for (const p of players) {
      // Skip if this player is bezier-animating
      if (animState && animState.playerId === p.id && animState.bezierPath) {
        continue;
      }
      if (p.position > 0) {
        if (!byPos[p.position]) byPos[p.position] = [];
        byPos[p.position].push(p);
      }
    }

    for (const [pos, group] of Object.entries(byPos)) {
      const r = getCellRect(parseInt(pos), cols, rows, w, h);
      const n = group.length;
      group.forEach((p, i) => {
        const offX = n > 1 ? (i - (n-1)/2) * (cellW * 0.28) : 0;
        const px = r.cx + offX;
        const py = r.cy;

        // Old step-by-step animated position
        let drawX = px, drawY = py;
        if (animState && animState.playerId === p.id && !animState.bezierPath && animState.progress < 1) {
          const fromR = getCellRect(animState.fromCell, cols, rows, w, h);
          drawX = fromR.cx + (px - fromR.cx) * animState.progress + offX;
          drawY = fromR.cy + (py - fromR.cy) * animState.progress;
        }

        const tokenR = Math.min(cellW, cellH) * 0.32;
        drawToken(ctx, drawX, drawY, p, tokenR);
      });
    }

    // Draw bezier-animated player
    if (animState && animState.bezierPath) {
      const p = players.find(pl => pl.id === animState.playerId);
      if (p) {
        const bp = animState.bezierPath;
        const t = animState.progress;
        const bx = cubicBezierPoint(bp.x0, bp.cx1, bp.cx2, bp.x1, t);
        const by = cubicBezierPoint(bp.y0, bp.cy1, bp.cy2, bp.y1, t);
        const tokenR = Math.min(cellW, cellH) * 0.32;
        drawToken(ctx, bx, by, p, tokenR);
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
      // Board wrap is square (aspect-ratio: 1/1), so base sizing on width only
      const availW = wrap.clientWidth;
      if (availW <= 0) return;

      const cols   = this.config.cols;
      const rows   = this.config.rows;
      const aspect = cols / rows;

      let cw = availW;
      let ch = cw / aspect;

      // Enforce 48px minimum cell size (squares are tappable in designer)
      const MIN_CELL = 48;
      if (cw / cols < MIN_CELL) { cw = cols * MIN_CELL; ch = cw / aspect; }
      if (ch / rows < MIN_CELL) { ch = rows * MIN_CELL; cw = ch * aspect; }

      cw = Math.round(cw);
      ch = Math.round(ch);

      this.canvas.width        = cw;
      this.canvas.height       = ch;
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

      const target = Math.max(3, Math.round(total / 20));
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

      const target = Math.max(3, Math.round(total / 20));
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

    gameCanvas.width        = cw;
    gameCanvas.height       = ch;
    gameCanvas.style.width  = cw + 'px';
    gameCanvas.style.height = ch + 'px';
  }

  function redrawGame(boardConfig, players, animState) {
    if (!gameCanvas || !gameCtx) return;
    render(gameCtx, boardConfig, gameCanvas.width, gameCanvas.height, players, animState);
  }

  return {
    render, drawSnake, drawLadder, drawPlayers, drawToken,
    cubicBezierPoint,
    getSnakeBezierPath, getLadderBezierPath,
    designer,
    initGameCanvas, resizeGameCanvas, redrawGame,
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
