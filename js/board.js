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
      // ── SKY + GROUND ──
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#64B5F6');
      sky.addColorStop(0.4, '#A5D6A7');
      sky.addColorStop(0.72, '#388E3C');
      sky.addColorStop(1, '#1B5E20');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // Canopy layer at top
      ctx.fillStyle = '#1B5E20';
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(w*0.15,h*0.22, w*0.35,h*0.08, w*0.5,h*0.18);
      ctx.bezierCurveTo(w*0.65,h*0.28, w*0.8,h*0.06, w,h*0.15);
      ctx.lineTo(w,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(w*0.1,h*0.12, w*0.3,h*0.04, w*0.5,h*0.1);
      ctx.bezierCurveTo(w*0.7,h*0.16, w*0.88,h*0.02, w,h*0.08);
      ctx.lineTo(w,0); ctx.closePath(); ctx.fill();
      // Ground
      ctx.fillStyle = '#2E7D32'; ctx.fillRect(0, h*0.82, w, h*0.18);
      ctx.fillStyle = '#1B5E20'; ctx.fillRect(0, h*0.88, w, h*0.12);

      // ── PALM TREES ──
      const drawPalm = (px, groundY, trunkH) => {
        // Trunk
        ctx.save(); ctx.translate(px, groundY);
        const trunk = ctx.createLinearGradient(-5,0,5,0);
        trunk.addColorStop(0,'#5D4037'); trunk.addColorStop(0.5,'#795548'); trunk.addColorStop(1,'#5D4037');
        ctx.fillStyle = trunk;
        ctx.beginPath(); ctx.moveTo(-6,0); ctx.bezierCurveTo(-8,-trunkH*0.5,-3,-trunkH*0.8,0,-trunkH);
        ctx.bezierCurveTo(3,-trunkH*0.8,8,-trunkH*0.5,6,0); ctx.closePath(); ctx.fill();
        // Fronds
        const frondAngles = [-0.9,-0.5,-0.1,0.3,0.7,1.1,1.5,-1.3];
        frondAngles.forEach(a => {
          ctx.save(); ctx.translate(0,-trunkH); ctx.rotate(a);
          const fg = ctx.createLinearGradient(0,0,trunkH*0.5,0);
          fg.addColorStop(0,'#2E7D32'); fg.addColorStop(1,'#81C784');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.moveTo(0,-4);
          ctx.bezierCurveTo(trunkH*0.2,-8,trunkH*0.45,-6,trunkH*0.5,0);
          ctx.bezierCurveTo(trunkH*0.45,4,trunkH*0.2,6,0,4); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
        ctx.restore();
      };
      drawPalm(w*0.08, h*0.84, h*0.38);
      drawPalm(w*0.92, h*0.84, h*0.34);
      drawPalm(w*0.5, h*1.02, h*0.22);

      // ── EMOJI CHARACTERS ──
      em(ctx,'🦜',w*0.14,h*0.44,w*0.10);
      em(ctx,'🦜',w*0.88,h*0.38,w*0.09,-0.3);
      em(ctx,'🐆',w*0.78,h*0.76,w*0.11);
      em(ctx,'🐸',w*0.22,h*0.82,w*0.09);
      em(ctx,'🦋',w*0.5,h*0.3,w*0.10);
      em(ctx,'🌺',w*0.35,h*0.87,w*0.09);
      em(ctx,'🌸',w*0.65,h*0.89,w*0.08);
      em(ctx,'🍌',w*0.6,h*0.2,w*0.08,0.2);
      em(ctx,'🌿',w*0.2,h*0.6,w*0.13,0.4);
      em(ctx,'🌿',w*0.78,h*0.58,w*0.11,-0.4);

    } else if (theme === 'space') {
      // ── DEEP SPACE ──
      const space = ctx.createRadialGradient(w*0.5,h*0.3,0, w*0.5,h*0.5, w*0.9);
      space.addColorStop(0,'#1A0040'); space.addColorStop(0.5,'#0A001A'); space.addColorStop(1,'#000008');
      ctx.fillStyle = space; ctx.fillRect(0,0,w,h);

      // Nebula clouds
      [[w*0.2,h*0.25,w*0.38,'rgba(140,60,220,0.35)'],[w*0.75,h*0.55,w*0.32,'rgba(40,100,220,0.30)'],[w*0.5,h*0.8,w*0.25,'rgba(220,60,160,0.28)'],[w*0.85,h*0.12,w*0.22,'rgba(60,180,220,0.22)']].forEach(([nx,ny,nr,nc]) => {
        const ng = ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
        ng.addColorStop(0,nc); ng.addColorStop(1,'transparent');
        ctx.fillStyle=ng; ctx.fillRect(0,0,w,h);
      });
      // Milky Way band
      const mw = ctx.createLinearGradient(0,h*0.1,w,h*0.9);
      mw.addColorStop(0,'transparent'); mw.addColorStop(0.4,'rgba(200,190,255,0.06)'); mw.addColorStop(0.6,'rgba(220,210,255,0.09)'); mw.addColorStop(1,'transparent');
      ctx.fillStyle=mw; ctx.fillRect(0,0,w,h);

      // Star field — many deterministic stars
      for (let i=0;i<80;i++) {
        const sx=((i*67+13)%100)/100, sy=((i*83+47)%100)/100, sr=((i*31+7)%4)*0.4+0.3;
        ctx.fillStyle=`rgba(255,255,255,${0.4+((i*17)%10)*0.05})`;
        ctx.beginPath(); ctx.arc(sx*w,sy*h,sr,0,Math.PI*2); ctx.fill();
      }
      // Bright star glints
      [[0.1,0.06],[0.88,0.22],[0.44,0.92],[0.7,0.08],[0.22,0.78],[0.6,0.5]].forEach(([sx,sy]) => {
        ctx.fillStyle='rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.arc(sx*w,sy*h,2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=0.8;
        [[6,0],[-6,0],[0,6],[0,-6]].forEach(([dx,dy]) => { ctx.beginPath(); ctx.moveTo(sx*w,sy*h); ctx.lineTo(sx*w+dx,sy*h+dy); ctx.stroke(); });
      });

      // ── EMOJI CHARACTERS ──
      em(ctx,'🪐',w*0.82,h*0.14,w*0.18);
      em(ctx,'🌍',w*0.12,h*0.78,w*0.13);
      em(ctx,'🌙',w*0.88,h*0.72,w*0.11);
      em(ctx,'🚀',w*0.3,h*0.1,w*0.13,0.35);
      em(ctx,'👾',w*0.55,h*0.68,w*0.10);
      em(ctx,'☄️',w*0.18,h*0.38,w*0.11,-0.5);
      em(ctx,'⭐',w*0.6,h*0.88,w*0.09);
      em(ctx,'💫',w*0.72,h*0.35,w*0.09);

    } else if (theme === 'ocean') {
      // ── UNDERWATER SCENE ──
      const water = ctx.createLinearGradient(0,0,0,h);
      water.addColorStop(0,'#B3E5FC'); water.addColorStop(0.08,'#039BE5');
      water.addColorStop(0.35,'#0277BD'); water.addColorStop(0.7,'#01579B'); water.addColorStop(1,'#002147');
      ctx.fillStyle=water; ctx.fillRect(0,0,w,h);
      // Surface shimmer
      ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(0,0,w,h*0.06);
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(0,h*0.04,w,h*0.03);

      // Light rays
      ctx.save(); ctx.globalAlpha=0.07;
      [-0.25,-0.1,0.05,0.2,0.35].forEach((angle,i) => {
        ctx.fillStyle='rgba(180,240,255,1)';
        ctx.save(); ctx.translate(w*(0.12+i*0.18),0);
        ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(22,0);
        ctx.lineTo(22+angle*h*0.9,h); ctx.lineTo(-22+angle*h*0.9,h); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha=1; ctx.restore();

      // Seabed
      ctx.fillStyle='#1A3A5C'; ctx.fillRect(0,h*0.87,w,h*0.13);
      ctx.fillStyle='#0D2644'; ctx.fillRect(0,h*0.92,w,h*0.08);
      // Sandy spots
      [[0.15,0.9],[0.4,0.91],[0.72,0.9],[0.88,0.91]].forEach(([sx,sy]) => {
        ctx.fillStyle='rgba(194,154,108,0.4)';
        ctx.beginPath(); ctx.ellipse(sx*w,sy*h,w*0.08,h*0.02,0,0,Math.PI*2); ctx.fill();
      });
      // Seaweed
      [0.07,0.22,0.38,0.55,0.7,0.85].forEach((sx,i) => {
        const sg = ctx.createLinearGradient(0,h,0,h*0.65);
        sg.addColorStop(0,'#1B5E20'); sg.addColorStop(1,'#43A047');
        ctx.strokeStyle=sg; ctx.lineWidth=3+i%2; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(sx*w,h);
        for (let j=1;j<=5;j++) {
          const bend=(i%2===0?12:-12);
          ctx.quadraticCurveTo(sx*w+bend,h-j*h*0.055, sx*w+(j%2===0?4:-4),h-j*h*0.06);
        }
        ctx.stroke();
      });
      // Bubbles
      [[0.1,0.78,4],[0.28,0.65,3],[0.55,0.72,5],[0.72,0.6,3],[0.9,0.75,4],
       [0.18,0.48,2.5],[0.62,0.42,3.5],[0.45,0.55,2]].forEach(([bx,by,br]) => {
        ctx.strokeStyle='rgba(180,230,255,0.55)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(bx*w,by*h,br,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle='rgba(220,240,255,0.15)';
        ctx.beginPath(); ctx.arc(bx*w-br*0.3,by*h-br*0.3,br*0.4,0,Math.PI*2); ctx.fill();
      });

      // ── EMOJI CHARACTERS ──
      em(ctx,'🐋',w*0.25,h*0.22,w*0.16);
      em(ctx,'🦈',w*0.7,h*0.15,w*0.14);
      em(ctx,'🐠',w*0.8,h*0.42,w*0.11);
      em(ctx,'🐙',w*0.14,h*0.55,w*0.13);
      em(ctx,'🐡',w*0.48,h*0.62,w*0.10);
      em(ctx,'🦑',w*0.85,h*0.65,w*0.10);
      em(ctx,'🪸',w*0.08,h*0.91,w*0.12);
      em(ctx,'🪸',w*0.35,h*0.92,w*0.10);
      em(ctx,'🪸',w*0.65,h*0.91,w*0.11);
      em(ctx,'🪸',w*0.9,h*0.92,w*0.10);

    } else if (theme === 'fantasy') {
      // ── MAGICAL SKY ──
      const magic = ctx.createLinearGradient(0,0,0,h);
      magic.addColorStop(0,'#0D0020'); magic.addColorStop(0.3,'#3A0D6E');
      magic.addColorStop(0.6,'#5C1A8A'); magic.addColorStop(0.85,'#2E1A00'); magic.addColorStop(1,'#1A0800');
      ctx.fillStyle=magic; ctx.fillRect(0,0,w,h);

      // Aurora bands
      [['rgba(0,240,140,0.12)',0.05],['rgba(100,180,255,0.10)',0.12],['rgba(255,80,220,0.10)',0.2],['rgba(255,220,0,0.07)',0.28]].forEach(([c,fy]) => {
        const g=ctx.createLinearGradient(0,0,w,0);
        g.addColorStop(0,'transparent'); g.addColorStop(0.2,c); g.addColorStop(0.8,c); g.addColorStop(1,'transparent');
        ctx.fillStyle=g; ctx.fillRect(0,fy*h,w,h*0.18);
      });
      // Stars
      for (let i=0;i<50;i++) {
        const sx=((i*53+9)%100)/100, sy=((i*71+23)%50)/100;
        const sr=((i*17+3)%3)*0.4+0.4;
        ctx.fillStyle=`rgba(255,240,200,${0.5+((i*13)%5)*0.1})`;
        ctx.beginPath(); ctx.arc(sx*w,sy*h,sr,0,Math.PI*2); ctx.fill();
      }
      // Mountain silhouettes
      ctx.fillStyle='rgba(20,0,50,0.7)';
      ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(0,h*0.68);
      ctx.bezierCurveTo(w*0.08,h*0.48, w*0.14,h*0.42, w*0.2,h*0.52);
      ctx.bezierCurveTo(w*0.26,h*0.62, w*0.3,h*0.55, w*0.38,h*0.38);
      ctx.bezierCurveTo(w*0.45,h*0.22, w*0.48,h*0.3, w*0.55,h*0.44);
      ctx.bezierCurveTo(w*0.62,h*0.58, w*0.66,h*0.5, w*0.74,h*0.35);
      ctx.bezierCurveTo(w*0.82,h*0.2, w*0.86,h*0.32, w*0.92,h*0.5);
      ctx.bezierCurveTo(w*0.96,h*0.62, w,h*0.65, w,h*0.72);
      ctx.lineTo(w,h); ctx.closePath(); ctx.fill();
      // Glowing tree silhouettes
      [[0.06,0.72],[0.93,0.7]].forEach(([tx,ty]) => {
        ctx.fillStyle='rgba(40,0,80,0.6)';
        ctx.fillRect(tx*w-4,ty*h,8,h*(1-ty));
        const tg=ctx.createRadialGradient(tx*w,ty*h,0,tx*w,ty*h,w*0.08);
        tg.addColorStop(0,'rgba(180,100,255,0.5)'); tg.addColorStop(1,'transparent');
        ctx.fillStyle=tg; ctx.beginPath(); ctx.arc(tx*w,ty*h,w*0.08,0,Math.PI*2); ctx.fill();
      });

      // ── EMOJI CHARACTERS ──
      em(ctx,'🏰',w*0.5,h*0.68,w*0.18);
      em(ctx,'🌈',w*0.18,h*0.38,w*0.20);
      em(ctx,'🦄',w*0.14,h*0.76,w*0.12);
      em(ctx,'🐉',w*0.82,h*0.44,w*0.15);
      em(ctx,'🧚',w*0.38,h*0.28,w*0.10);
      em(ctx,'💎',w*0.78,h*0.14,w*0.09);
      em(ctx,'⭐',w*0.28,h*0.10,w*0.09);
      em(ctx,'✨',w*0.68,h*0.22,w*0.09);
      em(ctx,'🌟',w*0.88,h*0.84,w*0.09);
      em(ctx,'🔮',w*0.62,h*0.82,w*0.09);

    } else {
      // ── CARTOON — cheerful outdoor scene ──
      const sky = ctx.createLinearGradient(0,0,0,h);
      sky.addColorStop(0,'#64B5F6'); sky.addColorStop(0.55,'#B0E0FF');
      sky.addColorStop(0.68,'#81C784'); sky.addColorStop(1,'#2E7D32');
      ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);
      // Hills
      ctx.fillStyle='#4CAF50';
      ctx.beginPath(); ctx.moveTo(0,h);
      ctx.bezierCurveTo(w*0.2,h*0.68, w*0.45,h*0.82, w*0.65,h*0.72);
      ctx.bezierCurveTo(w*0.8,h*0.65, w,h*0.78, w,h); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#2E7D32';
      ctx.beginPath(); ctx.moveTo(0,h);
      ctx.bezierCurveTo(w*0.3,h*0.8, w*0.6,h*0.9, w,h*0.82); ctx.lineTo(w,h); ctx.closePath(); ctx.fill();

      // Clouds
      const drawCloud = (cx,cy,cs) => {
        ctx.fillStyle='rgba(255,255,255,0.92)';
        [[0,0,1],[0.7,-0.3,0.85],[1.4,0,0.9],[0.7,0.2,0.82]].forEach(([ox,oy,r]) => {
          ctx.beginPath(); ctx.arc(cx+ox*cs,cy+oy*cs,cs*r,0,Math.PI*2); ctx.fill();
        });
      };
      drawCloud(w*0.1,h*0.1,w*0.07);
      drawCloud(w*0.62,h*0.06,w*0.09);
      drawCloud(w*0.35,h*0.18,w*0.06);
      drawCloud(w*0.82,h*0.15,w*0.065);

      // Rainbow
      ['#FF4500','#FF8C00','#FFD700','#32CD32','#1E90FF','#8A2BE2'].forEach((c,i) => {
        ctx.strokeStyle=c; ctx.lineWidth=7; ctx.globalAlpha=0.55;
        ctx.beginPath(); ctx.arc(w*0.5,h*0.42,w*(0.32+i*0.05),Math.PI,0); ctx.stroke();
      });
      ctx.globalAlpha=1;

      // House
      ctx.fillStyle='#EF5350';
      ctx.beginPath(); ctx.moveTo(w*0.42,h*0.58); ctx.lineTo(w*0.5,h*0.48); ctx.lineTo(w*0.58,h*0.58); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#FFCDD2'; ctx.fillRect(w*0.44,h*0.58,w*0.12,h*0.1);
      ctx.fillStyle='#795548'; ctx.fillRect(w*0.473,h*0.62,w*0.054,h*0.06);

      // ── EMOJI CHARACTERS ──
      em(ctx,'☀️',w*0.88,h*0.09,w*0.14);
      em(ctx,'🌈',w*0.08,h*0.24,w*0.14);
      em(ctx,'🎈',w*0.1,h*0.5,w*0.10);
      em(ctx,'🎈',w*0.9,h*0.42,w*0.09);
      em(ctx,'🌸',w*0.28,h*0.84,w*0.09);
      em(ctx,'🌻',w*0.72,h*0.82,w*0.09);
      em(ctx,'🐦',w*0.62,h*0.14,w*0.08,-0.2);
      em(ctx,'⭐',w*0.5,h*0.07,w*0.08);
      em(ctx,'🎉',w*0.78,h*0.68,w*0.08);
    }
    ctx.restore();
  }

  // Minimal post-cell overlay (cells are semi-transparent now, bg shows through)
  function drawBoardOverlay(ctx, theme, cols, rows, w, h, T) {
    // Nothing needed — illustrated background shows through transparent cells
  }

  function drawCell(ctx, r, cellNum, isEven, T, cellW, cellH, theme, total) {
    const pad = 2;
    const cx = r.x + pad, cy = r.y + pad, cw = r.w - pad*2, ch = r.h - pad*2;
    const rr = Math.min(cw, ch) * 0.14; // rounded corners radius

    // Rounded rect path helper (reused throughout)
    function rRect(x, y, w, h, rv) {
      ctx.beginPath();
      ctx.moveTo(x+rv, y);
      ctx.lineTo(x+w-rv, y); ctx.quadraticCurveTo(x+w, y, x+w, y+rv);
      ctx.lineTo(x+w, y+h-rv); ctx.quadraticCurveTo(x+w, y+h, x+w-rv, y+h);
      ctx.lineTo(x+rv, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-rv);
      ctx.lineTo(x, y+rv); ctx.quadraticCurveTo(x, y, x+rv, y);
      ctx.closePath();
    }

    // Semi-transparent rounded cell fill
    const base = isEven ? T.cellEven : T.cellOdd;
    const cellGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
    cellGrad.addColorStop(0, base);
    cellGrad.addColorStop(1, shadeColor(base, theme === 'space' ? -10 : -6));
    ctx.save();
    ctx.globalAlpha = 0.72;
    rRect(cx, cy, cw, ch, rr);
    ctx.fillStyle = cellGrad;
    ctx.fill();
    ctx.restore();

    // Themed border stroke — colored, not grey
    ctx.save();
    ctx.globalAlpha = 0.45;
    rRect(cx, cy, cw, ch, rr);
    ctx.strokeStyle = T.cellBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Special: start cell (1) — green glow + play icon
    if (cellNum === 1) {
      ctx.save(); ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#2ED573'; rRect(cx, cy, cw, ch, rr); ctx.fill();
      ctx.restore();
      const iSize = Math.min(cw, ch) * 0.3;
      ctx.font = `${iSize}px sans-serif`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#27ae60';
      ctx.fillText('▶', cx + cw - 1, cy + ch - 1); ctx.globalAlpha = 1;
    // Special: finish cell — gold glow + star
    } else if (cellNum === total) {
      ctx.save(); ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#FFD700'; rRect(cx, cy, cw, ch, rr); ctx.fill();
      ctx.restore();
      const iSize = Math.min(cw, ch) * 0.32;
      ctx.font = `${iSize}px sans-serif`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#f59e0b';
      ctx.fillText('★', cx + cw - 1, cy + ch - 1); ctx.globalAlpha = 1;
    }

    // ── Number — Baloo 2, centered, vibrant theme color with white halo ──
    const fontSize = Math.min(cellW * 0.30, cellH * 0.34, 17);
    ctx.font = `800 ${fontSize}px 'Baloo 2', 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Theme-specific vibrant palette for numbers
    let numColor, haloColor;
    if (theme === 'space') {
      numColor  = '#d4b8ff';
      haloColor = 'rgba(10,0,30,0.95)';
    } else if (theme === 'jungle') {
      numColor  = '#1b5e20';
      haloColor = 'rgba(255,255,255,0.95)';
    } else if (theme === 'ocean') {
      numColor  = '#0d47a1';
      haloColor = 'rgba(255,255,255,0.95)';
    } else if (theme === 'fantasy') {
      numColor  = '#6a1b9a';
      haloColor = 'rgba(255,255,255,0.9)';
    } else { // cartoon — cycling vivid colors
      const palette = ['#FF4D6D','#7C3AED','#0EA5E9','#F59E0B','#10B981'];
      numColor  = palette[cellNum % palette.length];
      haloColor = 'rgba(255,255,255,0.95)';
    }

    // White halo for crisp legibility over illustrated background
    ctx.shadowColor = haloColor;
    ctx.shadowBlur = 5;
    ctx.fillStyle = numColor;
    ctx.fillText(cellNum, r.cx, r.cy);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
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

    const lineW = Math.min(head.w * 0.13, 8);

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
      // Bamboo poles: tan/olive with leaf-decorated rungs
      const railColor = '#8d6e63';
      const rungColor = '#a5d6a7';
      const railLW = Math.max(3, rungW * 0.28);

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
        // Bamboo segments
        ctx.strokeStyle = lightenColor(railColor, -20);
        ctx.lineWidth = 1;
        for (let i = 1; i < numRungs; i++) {
          const t = i / numRungs;
          const sx = rx1 + (rx2 - rx1) * t;
          const sy = ry1 + (ry2 - ry1) * t;
          ctx.beginPath();
          ctx.arc(sx, sy, railLW * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Leaf rungs
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
      // Coral columns (pink/orange) with seaweed rungs
      const railColor = '#f48fb1';
      const rungColor = '#a5d6a7';
      const railLW = Math.max(3, rungW * 0.28);

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
        // Coral texture dots
        ctx.fillStyle = lightenColor(railColor, 20);
        for (let i = 1; i < numRungs * 2; i++) {
          const t = i / (numRungs * 2);
          const sx = rx1 + (rx2 - rx1) * t;
          const sy = ry1 + (ry2 - ry1) * t;
          ctx.beginPath();
          ctx.arc(sx + (i % 2 === 0 ? 1.5 : -1.5), sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Seaweed rungs (wavy)
      for (let i = 0; i <= numRungs; i++) {
        const t = i / numRungs;
        const rx = bx + (tx - bx) * t;
        const ry = by + (ty - by) * t;
        const r1x = rx + Math.cos(angle) * railOffset;
        const r1y = ry + Math.sin(angle) * railOffset;
        const r2x = rx - Math.cos(angle) * railOffset;
        const r2y = ry - Math.sin(angle) * railOffset;
        ctx.strokeStyle = rungColor;
        ctx.lineWidth = Math.max(2, rungW * 0.2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1x, r1y);
        ctx.lineTo(r2x, r2y);
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
    targetSnakeCount: 3,
    targetLadderCount: 3,

    _clickHandler: null,
    _resizeHandler: null,
    initialized: false,

    init(canvasEl) {
      // Remove previous listeners if re-initializing
      if (this._clickHandler) canvasEl.removeEventListener('click', this._clickHandler);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);

      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
      this.mode = 'idle';
      this.pending = null;

      this._clickHandler = e => this.handleClick(e);
      this._resizeHandler = () => { this.resize(); this.draw(); };
      canvasEl.addEventListener('click', this._clickHandler);
      window.addEventListener('resize', this._resizeHandler);

      this.initialized = true;
      // Use setTimeout to allow layout to complete
      setTimeout(() => { this.resize(); this.draw(); }, 50);
    },

    resize() {
      const wrap = this.canvas.parentElement;
      if (!wrap) return;
      const pad = 16;
      const availW = wrap.clientWidth  - pad;
      const availH = wrap.clientHeight - pad;
      if (availW <= 0 || availH <= 0) return;

      const cols   = this.config.cols;
      const rows   = this.config.rows;
      const aspect = cols / rows;

      let cw, ch;
      if (availW / availH > aspect) {
        ch = availH; cw = ch * aspect;
      } else {
        cw = availW; ch = cw / aspect;
      }

      // Enforce 48px minimum cell size (squares are tappable in designer)
      const MIN_CELL = 48;
      if (cw / cols < MIN_CELL) { cw = cols * MIN_CELL; ch = cw / aspect; }
      if (ch / rows < MIN_CELL) { ch = rows * MIN_CELL; cw = ch * aspect; }

      // Never exceed wrap width
      if (cw > availW) { cw = availW; ch = cw / aspect; }

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
        this.pending = cell;
        this.mode = 'snake-tail';
        this.draw();
        updatePlacementHint('Tap end square');
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
            showToast('That square is already used! Try another.');
          }
        } else {
          showToast('End square must be lower! Try again.');
        }
      } else if (this.mode === 'ladder-bottom') {
        this.pending = cell;
        this.mode = 'ladder-top';
        this.draw();
        updatePlacementHint('Tap top square');
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
            showToast('That square is already used! Try another.');
          }
        } else {
          showToast('Top square must be higher! Try again.');
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

      // Highlight pending cell
      if (this.pending !== null) {
        const r = getCellRect(this.pending, cols, rows, w, h);
        this.ctx.fillStyle = 'rgba(255, 200, 0, 0.45)';
        this.ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        this.ctx.strokeStyle = '#ffa502';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
      }

      // Hover effect — just show mode cursor indicator
      if (this.mode !== 'idle') {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255,200,0,0.12)';
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.restore();
      }
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

    const topBar    = document.querySelector('.game-top-bar');
    const bottomBar = document.querySelector('.game-bottom-bar');
    const topH    = topBar    ? topBar.offsetHeight    : 72;
    const bottomH = bottomBar ? bottomBar.offsetHeight : 80;
    const pad = 16;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Board must occupy 60–75% of screen height
    const naturalH = vh - topH - bottomH - pad * 2;
    const clampedH = Math.min(Math.max(naturalH, vh * 0.60), vh * 0.75);
    const availW   = vw - pad * 2;

    if (availW <= 0 || clampedH <= 0) return;

    const cols = boardConfig.cols;
    const rows = boardConfig.rows;
    const aspect = cols / rows;

    let cw, ch;
    if (availW / clampedH > aspect) {
      ch = clampedH;
      cw = ch * aspect;
    } else {
      cw = availW;
      ch = cw / aspect;
    }

    // Enforce 48px minimum cell size
    const MIN_CELL = 48;
    if (cw / cols < MIN_CELL) { cw = cols * MIN_CELL; ch = cw / aspect; }
    if (ch / rows < MIN_CELL) { ch = rows * MIN_CELL; cw = ch * aspect; }

    // Never exceed device width
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
  const isLadderMode = mode === 'ladder-bottom' || mode === 'ladder-top';
  const id = isLadderMode ? 'ladder-hint' : 'placement-hint';
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
