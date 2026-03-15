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

      // ── CANVAS CHARACTERS (jungle) ──
      // Parrot
      const drawParrot = (px, py, sz) => {
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = '#4CD964'; ctx.beginPath(); ctx.ellipse(0, 0, sz*0.4, sz*0.6, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3CB4FF'; ctx.beginPath(); ctx.ellipse(-sz*0.3, sz*0.1, sz*0.25, sz*0.4, -0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(sz*0.1, -sz*0.55, sz*0.28, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(sz*0.18, -sz*0.6, sz*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(sz*0.2, -sz*0.6, sz*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FF6B6B'; ctx.beginPath(); ctx.moveTo(sz*0.28, -sz*0.55); ctx.lineTo(sz*0.45, -sz*0.5); ctx.lineTo(sz*0.28, -sz*0.45); ctx.closePath(); ctx.fill();
        ctx.restore();
      };
      drawParrot(w*0.12, h*0.42, w*0.09);
      drawParrot(w*0.87, h*0.36, w*0.08);

      // Frog
      const drawFrog = (px, py, sz) => {
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = '#4CD964';
        ctx.beginPath(); ctx.ellipse(0, 0, sz*0.5, sz*0.4, 0, 0, Math.PI*2); ctx.fill();
        [-sz*0.3, sz*0.3].forEach(ex => {
          ctx.fillStyle = '#4CD964'; ctx.beginPath(); ctx.arc(ex, -sz*0.35, sz*0.22, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex, -sz*0.35, sz*0.15, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex+sz*0.03, -sz*0.35, sz*0.09, 0, Math.PI*2); ctx.fill();
        });
        ctx.strokeStyle = '#2A8A3A'; ctx.lineWidth = sz*0.08; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, sz*0.05, sz*0.25, 0.2, Math.PI-0.2); ctx.stroke();
        ctx.restore();
      };
      drawFrog(w*0.2, h*0.82, w*0.075);

      // Flower
      const drawFlower = (px, py, sz, petColor) => {
        ctx.save(); ctx.translate(px, py);
        for (let a = 0; a < Math.PI*2; a += Math.PI/3) {
          ctx.fillStyle = petColor;
          ctx.beginPath(); ctx.ellipse(Math.cos(a)*sz*0.4, Math.sin(a)*sz*0.4, sz*0.22, sz*0.32, a, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(0, 0, sz*0.28, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      };
      drawFlower(w*0.33, h*0.87, w*0.055, '#FF6B6B');
      drawFlower(w*0.66, h*0.88, w*0.05, '#FF6B6B');

      // Butterfly
      ctx.save(); ctx.translate(w*0.5, h*0.3);
      const bsz = w*0.07;
      ctx.fillStyle = '#8E6CFF'; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(-bsz*0.7, -bsz*0.3, bsz*0.7, bsz*0.5, -0.4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bsz*0.7, -bsz*0.3, bsz*0.7, bsz*0.5, 0.4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath(); ctx.ellipse(-bsz*0.5, bsz*0.2, bsz*0.45, bsz*0.35, 0.4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bsz*0.5, bsz*0.2, bsz*0.45, bsz*0.35, -0.4, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(0, 0, bsz*0.1, bsz*0.55, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();

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

      // ── CANVAS CHARACTERS (space) ──
      // Planet with rings
      const drawPlanet = (px, py, pr, pc, rc) => {
        ctx.save(); ctx.translate(px, py);
        ctx.strokeStyle = rc; ctx.lineWidth = pr*0.22; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(0, pr*0.1, pr*1.6, pr*0.38, -0.3, Math.PI*0.6, Math.PI*1.4); ctx.stroke();
        ctx.globalAlpha = 1;
        const pg = ctx.createRadialGradient(-pr*0.3, -pr*0.3, pr*0.1, 0, 0, pr);
        pg.addColorStop(0, lightenColor(pc, 40)); pg.addColorStop(1, pc);
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = rc; ctx.lineWidth = pr*0.22; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(0, pr*0.1, pr*1.6, pr*0.38, -0.3, Math.PI*1.4, Math.PI*2.6); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      };
      drawPlanet(w*0.82, h*0.14, w*0.09, '#8E6CFF', '#C4B0FF');

      // Moon crescent
      ctx.save(); ctx.translate(w*0.88, h*0.72);
      const mr = w*0.055;
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath(); ctx.arc(0, 0, mr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0A001A';
      ctx.beginPath(); ctx.arc(mr*0.4, -mr*0.2, mr*0.8, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Rocket
      ctx.save(); ctx.translate(w*0.3, h*0.1); ctx.rotate(0.35);
      const rsz = w*0.065;
      ctx.fillStyle = '#3CB4FF';
      ctx.beginPath(); ctx.moveTo(0, -rsz*2); ctx.bezierCurveTo(rsz*0.6, -rsz*0.8, rsz*0.6, rsz*0.6, rsz*0.5, rsz); ctx.lineTo(-rsz*0.5, rsz); ctx.bezierCurveTo(-rsz*0.6, rsz*0.6, -rsz*0.6, -rsz*0.8, 0, -rsz*2); ctx.fill();
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(0, -rsz*0.3, rsz*0.32, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath(); ctx.moveTo(rsz*0.5, rsz*0.3); ctx.lineTo(rsz*1.1, rsz*1.1); ctx.lineTo(rsz*0.5, rsz); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-rsz*0.5, rsz*0.3); ctx.lineTo(-rsz*1.1, rsz*1.1); ctx.lineTo(-rsz*0.5, rsz); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFD93D'; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(-rsz*0.3, rsz); ctx.bezierCurveTo(-rsz*0.1, rsz*1.8, rsz*0.1, rsz*1.8, rsz*0.3, rsz); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Alien creature
      ctx.save(); ctx.translate(w*0.55, h*0.68);
      const asz = w*0.05;
      ctx.fillStyle = '#4CD964';
      ctx.beginPath(); ctx.ellipse(0, asz*0.3, asz*0.55, asz*0.7, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -asz*0.6, asz*0.65, asz*0.6, 0, 0, Math.PI*2); ctx.fill();
      [-asz*0.3, asz*0.3].forEach(ex => {
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.ellipse(ex, -asz*0.65, asz*0.28, asz*0.35, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex+asz*0.05, -asz*0.65, asz*0.18, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex+asz*0.1, -asz*0.73, asz*0.07, 0, Math.PI*2); ctx.fill();
      });
      ctx.strokeStyle = '#4CD964'; ctx.lineWidth = asz*0.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-asz*0.3, -asz*1.2); ctx.lineTo(-asz*0.55, -asz*1.75); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(asz*0.3, -asz*1.2); ctx.lineTo(asz*0.55, -asz*1.75); ctx.stroke();
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath(); ctx.arc(-asz*0.55, -asz*1.75, asz*0.18, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(asz*0.55, -asz*1.75, asz*0.18, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Comet/meteor
      ctx.save(); ctx.translate(w*0.18, h*0.38); ctx.rotate(-0.5);
      const cometsz = w*0.055;
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath(); ctx.arc(0, 0, cometsz*0.5, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.4;
      const cometGrad = ctx.createLinearGradient(-cometsz*2.5, 0, 0, 0);
      cometGrad.addColorStop(0, 'transparent'); cometGrad.addColorStop(1, '#FF6B6B');
      ctx.fillStyle = cometGrad;
      ctx.beginPath(); ctx.moveTo(0, cometsz*0.4); ctx.lineTo(-cometsz*2.5, 0); ctx.lineTo(0, -cometsz*0.4); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

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

      // ── CANVAS CHARACTERS (ocean) ──
      // Whale
      const drawWhale = (px, py, wsz) => {
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = '#3CB4FF';
        ctx.beginPath(); ctx.ellipse(0, 0, wsz, wsz*0.55, 0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(wsz*0.1, wsz*0.15, wsz*0.6, wsz*0.28, 0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3CB4FF';
        ctx.beginPath(); ctx.moveTo(-wsz, -wsz*0.05); ctx.bezierCurveTo(-wsz*1.3, -wsz*0.4, -wsz*1.5, -wsz*0.25, -wsz*1.4, wsz*0.05); ctx.bezierCurveTo(-wsz*1.5, wsz*0.3, -wsz*1.3, wsz*0.4, -wsz, wsz*0.1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(wsz*0.5, -wsz*0.15, wsz*0.12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(wsz*0.52, -wsz*0.15, wsz*0.07, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(180,230,255,0.8)'; ctx.lineWidth = wsz*0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(wsz*0.3, -wsz*0.5); ctx.bezierCurveTo(wsz*0.25, -wsz*0.9, wsz*0.35, -wsz*1.1, wsz*0.2, -wsz*1.3); ctx.stroke();
        ctx.restore();
      };
      drawWhale(w*0.25, h*0.22, w*0.08);

      // Shark
      ctx.save(); ctx.translate(w*0.7, h*0.15); ctx.scale(-1, 1);
      const shsz = w*0.07;
      ctx.fillStyle = '#607D8B';
      ctx.beginPath(); ctx.moveTo(shsz, 0); ctx.bezierCurveTo(shsz*0.5, -shsz*0.35, -shsz*0.8, -shsz*0.35, -shsz, 0); ctx.bezierCurveTo(-shsz*0.8, shsz*0.25, shsz*0.5, shsz*0.3, shsz, 0); ctx.fill();
      ctx.fillStyle = '#546E7A';
      ctx.beginPath(); ctx.moveTo(shsz*0.2, -shsz*0.3); ctx.lineTo(shsz*0.1, -shsz*0.95); ctx.lineTo(-shsz*0.25, -shsz*0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(0, shsz*0.1, shsz*0.5, shsz*0.18, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(shsz*0.6, -shsz*0.06, shsz*0.1, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(shsz*0.62, -shsz*0.06, shsz*0.06, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Tropical fish
      const drawFish = (px, py, fsz, fc) => {
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = fc;
        ctx.beginPath(); ctx.ellipse(0, 0, fsz*0.55, fsz*0.35, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = fsz*0.08;
        ctx.beginPath(); ctx.moveTo(-fsz*0.1, -fsz*0.35); ctx.lineTo(-fsz*0.1, fsz*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fsz*0.15, -fsz*0.35); ctx.lineTo(fsz*0.15, fsz*0.35); ctx.stroke();
        ctx.fillStyle = fc;
        ctx.beginPath(); ctx.moveTo(-fsz*0.55, 0); ctx.lineTo(-fsz*0.9, -fsz*0.4); ctx.lineTo(-fsz*0.95, fsz*0.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(fsz*0.3, -fsz*0.05, fsz*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(fsz*0.32, -fsz*0.05, fsz*0.06, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      };
      drawFish(w*0.8, h*0.42, w*0.055, '#FF6B6B');
      drawFish(w*0.48, h*0.62, w*0.05, '#FFD93D');

      // Octopus
      ctx.save(); ctx.translate(w*0.14, h*0.55);
      const osz = w*0.065;
      for (let ti = 0; ti < 8; ti++) {
        const ta = (ti / 8) * Math.PI * 2;
        const tx2 = Math.cos(ta) * osz * 1.5;
        const ty2 = Math.sin(ta) * osz * 1.5 + osz * 0.6;
        ctx.strokeStyle = '#8E6CFF'; ctx.lineWidth = osz * 0.28; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(ta)*osz*0.4, Math.sin(ta)*osz*0.4 + osz*0.3);
        ctx.quadraticCurveTo(tx2*0.7, ty2*0.7, tx2, ty2); ctx.stroke();
      }
      ctx.fillStyle = '#8E6CFF';
      ctx.beginPath(); ctx.arc(0, 0, osz, 0, Math.PI*2); ctx.fill();
      [-osz*0.35, osz*0.35].forEach(ex => {
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex, -osz*0.1, osz*0.28, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex+osz*0.05, -osz*0.1, osz*0.16, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex+osz*0.08, -osz*0.17, osz*0.06, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();

      // Coral shapes
      const drawCoral = (px, py, csz, cc) => {
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = cc;
        const branches = [[0,-csz],[csz*0.5,-csz*0.7],[-csz*0.5,-csz*0.7],[csz*0.3,-csz*0.4],[-csz*0.3,-csz*0.4]];
        branches.forEach(([bx, by]) => {
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, by); ctx.lineWidth = csz*0.22; ctx.strokeStyle = cc; ctx.lineCap = 'round'; ctx.stroke();
          ctx.beginPath(); ctx.arc(bx, by, csz*0.18, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
      };
      drawCoral(w*0.08, h*0.92, w*0.06, '#FF6B6B');
      drawCoral(w*0.35, h*0.93, w*0.05, '#FF8E8E');
      drawCoral(w*0.65, h*0.92, w*0.055, '#FFB3B3');
      drawCoral(w*0.9, h*0.93, w*0.05, '#FF6B6B');

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

      // ── CANVAS CHARACTERS (fantasy) ──
      // Castle
      const drawCastle = (px, py, csz) => {
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = 'rgba(60,20,120,0.85)';
        ctx.fillRect(-csz*0.3, -csz, csz*0.6, csz);
        [-csz*0.3, -csz*0.1, csz*0.1].forEach(bx => {
          ctx.fillRect(bx, -csz*1.18, csz*0.16, csz*0.2);
        });
        ctx.fillRect(-csz*0.65, -csz*0.75, csz*0.38, csz*0.75);
        [-csz*0.65, -csz*0.48].forEach(bx => { ctx.fillRect(bx, -csz*0.9, csz*0.15, csz*0.17); });
        ctx.fillRect(csz*0.27, -csz*0.75, csz*0.38, csz*0.75);
        [csz*0.27, csz*0.44].forEach(bx => { ctx.fillRect(bx, -csz*0.9, csz*0.15, csz*0.17); });
        ctx.fillStyle = '#FFD93D';
        ctx.beginPath(); ctx.arc(0, -csz*0.15, csz*0.18, Math.PI, 0); ctx.lineTo(csz*0.18, 0); ctx.lineTo(-csz*0.18, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFD93D';
        [[-csz*0.5, -csz*0.45], [csz*0.5, -csz*0.45], [0, -csz*0.55]].forEach(([wx,wy]) => {
          ctx.beginPath(); ctx.arc(wx, wy, csz*0.1, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
      };
      drawCastle(w*0.5, h*0.72, w*0.09);

      // Rainbow arc
      ['#FF6B6B','#FF8C00','#FFD93D','#4CD964','#3CB4FF','#8E6CFF'].forEach((c,i) => {
        ctx.strokeStyle=c; ctx.lineWidth=w*0.018; ctx.globalAlpha=0.45;
        ctx.beginPath(); ctx.arc(w*0.18, h*0.38, w*(0.12+i*0.028), Math.PI*1.1, Math.PI*0.1, false); ctx.stroke();
      });
      ctx.globalAlpha=1;

      // Dragon
      ctx.save(); ctx.translate(w*0.82, h*0.44);
      const dsz = w*0.075;
      ctx.fillStyle = '#4CD964';
      ctx.beginPath(); ctx.ellipse(0, 0, dsz*0.55, dsz*0.4, 0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(dsz*0.6, -dsz*0.2, dsz*0.42, dsz*0.35, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8E6CFF'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(0, -dsz*0.3); ctx.bezierCurveTo(-dsz*0.5, -dsz*1.2, -dsz*1.2, -dsz*0.8, -dsz*1.0, -dsz*0.1); ctx.bezierCurveTo(-dsz*0.6, dsz*0.2, -dsz*0.1, dsz*0.1, 0, -dsz*0.3); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(dsz*0.75, -dsz*0.25, dsz*0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(dsz*0.77, -dsz*0.25, dsz*0.08, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(dsz*0.77, -dsz*0.25, dsz*0.05, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF6B6B'; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(dsz*0.9, -dsz*0.15); ctx.bezierCurveTo(dsz*1.3, -dsz*0.5, dsz*1.6, -dsz*0.1, dsz*1.4, dsz*0.2); ctx.bezierCurveTo(dsz*1.2, dsz*0.1, dsz*1.1, -dsz*0.05, dsz*0.9, dsz*0.1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Fairy
      ctx.save(); ctx.translate(w*0.38, h*0.28);
      const fsz2 = w*0.05;
      ctx.fillStyle = 'rgba(200,180,255,0.6)';
      ctx.beginPath(); ctx.ellipse(-fsz2*1.0, -fsz2*0.3, fsz2*0.9, fsz2*0.55, -0.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(fsz2*1.0, -fsz2*0.3, fsz2*0.9, fsz2*0.55, 0.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-fsz2*0.6, fsz2*0.4, fsz2*0.55, fsz2*0.35, 0.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(fsz2*0.6, fsz2*0.4, fsz2*0.55, fsz2*0.35, -0.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath(); ctx.ellipse(0, fsz2*0.5, fsz2*0.28, fsz2*0.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath(); ctx.arc(0, -fsz2*0.3, fsz2*0.38, 0, Math.PI*2); ctx.fill();
      [-fsz2*0.13, fsz2*0.13].forEach(ex => {
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex, -fsz2*0.32, fsz2*0.08, 0, Math.PI*2); ctx.fill();
      });
      ctx.strokeStyle = '#FFD93D'; ctx.lineWidth = fsz2*0.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fsz2*0.5, 0); ctx.lineTo(fsz2*1.3, -fsz2*0.8); ctx.stroke();
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(fsz2*1.3, -fsz2*0.8, fsz2*0.2, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Sparkle stars
      const drawSparkle = (px, py, sz, sc) => {
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = sc;
        [0, Math.PI/4].forEach(baseAngle => {
          ctx.save(); ctx.rotate(baseAngle);
          ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(sz*0.25,-sz*0.25); ctx.lineTo(sz,0); ctx.lineTo(sz*0.25,sz*0.25); ctx.lineTo(0,sz); ctx.lineTo(-sz*0.25,sz*0.25); ctx.lineTo(-sz,0); ctx.lineTo(-sz*0.25,-sz*0.25); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
        ctx.restore();
      };
      drawSparkle(w*0.28, h*0.10, w*0.025, 'rgba(255,217,61,0.7)');
      drawSparkle(w*0.68, h*0.22, w*0.022, 'rgba(200,180,255,0.65)');
      drawSparkle(w*0.88, h*0.84, w*0.02, 'rgba(255,217,61,0.6)');

      // Crystal ball
      ctx.save(); ctx.translate(w*0.62, h*0.82);
      const crr = w*0.045;
      const cg = ctx.createRadialGradient(-crr*0.3, -crr*0.3, crr*0.1, 0, 0, crr);
      cg.addColorStop(0, 'rgba(200,180,255,0.9)'); cg.addColorStop(0.6, 'rgba(130,80,255,0.7)'); cg.addColorStop(1, 'rgba(60,0,150,0.5)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, crr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-crr*0.25, -crr*0.25, crr*0.28, 0, Math.PI*2); ctx.fill();
      ctx.restore();

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

      // ── CANVAS CHARACTERS (cartoon) ──
      // Sun
      ctx.save(); ctx.translate(w*0.88, h*0.09);
      const sunsz = w*0.07;
      ctx.strokeStyle = '#FFD93D'; ctx.lineWidth = sunsz*0.18; ctx.lineCap = 'round';
      for (let ri = 0; ri < 8; ri++) {
        const ra = (ri/8)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(Math.cos(ra)*sunsz*0.7, Math.sin(ra)*sunsz*0.7); ctx.lineTo(Math.cos(ra)*sunsz*1.3, Math.sin(ra)*sunsz*1.3); ctx.stroke();
      }
      const sungrd = ctx.createRadialGradient(0,0,0,0,0,sunsz*0.65);
      sungrd.addColorStop(0,'#FFF176'); sungrd.addColorStop(1,'#FFD93D');
      ctx.fillStyle=sungrd; ctx.beginPath(); ctx.arc(0,0,sunsz*0.65,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#F59E0B'; ctx.lineWidth=sunsz*0.1; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(0, sunsz*0.1, sunsz*0.28, 0.2, Math.PI-0.2); ctx.stroke();
      [-sunsz*0.2, sunsz*0.2].forEach(ex => {
        ctx.fillStyle='#F59E0B'; ctx.beginPath(); ctx.arc(ex, -sunsz*0.1, sunsz*0.08, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();

      // Balloons
      const drawBalloon = (px, py, bsz, bc) => {
        ctx.save(); ctx.translate(px, py);
        const bg = ctx.createRadialGradient(-bsz*0.25, -bsz*0.3, bsz*0.05, 0, 0, bsz);
        bg.addColorStop(0, lightenColor(bc, 50)); bg.addColorStop(1, bc);
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, bsz*0.6, bsz*0.75, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = lightenColor(bc, -30);
        ctx.beginPath(); ctx.arc(0, bsz*0.78, bsz*0.1, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1; ctx.beginPath();
        ctx.moveTo(0, bsz*0.9); ctx.bezierCurveTo(bsz*0.15, bsz*1.3, -bsz*0.1, bsz*1.6, 0, bsz*2); ctx.stroke();
        ctx.restore();
      };
      drawBalloon(w*0.1, h*0.5, w*0.055, '#FF6B6B');
      drawBalloon(w*0.9, h*0.42, w*0.05, '#8E6CFF');

      // Flowers
      const drawFlower2 = (px, py, sz, petColor, ctrColor) => {
        ctx.save(); ctx.translate(px, py);
        for (let a = 0; a < Math.PI*2; a += Math.PI/4) {
          ctx.fillStyle = petColor;
          ctx.beginPath(); ctx.ellipse(Math.cos(a)*sz*0.38, Math.sin(a)*sz*0.38, sz*0.2, sz*0.3, a, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = ctrColor; ctx.beginPath(); ctx.arc(0, 0, sz*0.26, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      };
      drawFlower2(w*0.28, h*0.84, w*0.055, '#FF6B6B', '#FFD93D');
      drawFlower2(w*0.72, h*0.82, w*0.05, '#FFD93D', '#FF6B6B');

      // Bird
      ctx.save(); ctx.translate(w*0.62, h*0.14); ctx.rotate(-0.2);
      const birdsz = w*0.04;
      ctx.fillStyle = '#3CB4FF';
      ctx.beginPath(); ctx.ellipse(0, 0, birdsz*0.8, birdsz*0.45, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0090D9';
      ctx.beginPath(); ctx.moveTo(birdsz*0.1, -birdsz*0.1); ctx.bezierCurveTo(birdsz*0.3, -birdsz*0.7, -birdsz*0.5, -birdsz*0.7, -birdsz*0.4, -birdsz*0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3CB4FF';
      ctx.beginPath(); ctx.arc(birdsz*0.65, -birdsz*0.15, birdsz*0.35, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath(); ctx.moveTo(birdsz*0.95, -birdsz*0.15); ctx.lineTo(birdsz*1.3, -birdsz*0.08); ctx.lineTo(birdsz*0.95, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(birdsz*0.72, -birdsz*0.22, birdsz*0.1, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Star sparkle
      ctx.save(); ctx.translate(w*0.5, h*0.07);
      const ssz = w*0.025;
      ctx.fillStyle = 'rgba(255,217,61,0.75)';
      [0, Math.PI/4].forEach(baseAngle => {
        ctx.save(); ctx.rotate(baseAngle);
        ctx.beginPath(); ctx.moveTo(0,-ssz); ctx.lineTo(ssz*0.25,-ssz*0.25); ctx.lineTo(ssz,0); ctx.lineTo(ssz*0.25,ssz*0.25); ctx.lineTo(0,ssz); ctx.lineTo(-ssz*0.25,ssz*0.25); ctx.lineTo(-ssz,0); ctx.lineTo(-ssz*0.25,-ssz*0.25); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      // Party confetti burst
      ctx.save(); ctx.translate(w*0.78, h*0.68);
      const confColors = ['#FF6B6B','#FFD93D','#4CD964','#3CB4FF','#8E6CFF'];
      for (let ci = 0; ci < 12; ci++) {
        const ca = (ci/12)*Math.PI*2;
        const cd = w*0.04 + (ci%3)*w*0.015;
        ctx.fillStyle = confColors[ci%confColors.length];
        ctx.save();
        ctx.translate(Math.cos(ca)*cd, Math.sin(ca)*cd);
        ctx.rotate(ca);
        ctx.fillRect(-w*0.008, -w*0.004, w*0.016, w*0.008);
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // Minimal post-cell overlay (cells are semi-transparent now, bg shows through)
  function drawBoardOverlay(ctx, theme, cols, rows, w, h, T) {
  ctx.save();
  ctx.globalAlpha = 0.62;

  if (theme === 'ocean') {
    // ── Large fish — top right ──
    const drawOverlayFish = (px, py, fsz, fc, stripeColor) => {
      ctx.save(); ctx.translate(px, py);
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.ellipse(0, 0, fsz, fsz*0.62, 0, 0, Math.PI*2); ctx.fill();
      // Stripes
      ctx.strokeStyle = stripeColor; ctx.lineWidth = fsz*0.13; ctx.lineCap = 'round';
      [-fsz*0.22, fsz*0.22].forEach(sx => {
        ctx.beginPath(); ctx.moveTo(sx, -fsz*0.55); ctx.lineTo(sx, fsz*0.55); ctx.stroke();
      });
      // Tail
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.moveTo(-fsz*0.92, 0); ctx.lineTo(-fsz*1.5, -fsz*0.55); ctx.lineTo(-fsz*1.5, fsz*0.55); ctx.closePath(); ctx.fill();
      // Tail fin top
      ctx.beginPath(); ctx.moveTo(-fsz*0.2, -fsz*0.6); ctx.lineTo(-fsz*0.1, -fsz*0.95); ctx.lineTo(fsz*0.1, -fsz*0.6); ctx.closePath(); ctx.fill();
      // Eye
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(fsz*0.48, -fsz*0.14, fsz*0.16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(fsz*0.5, -fsz*0.14, fsz*0.09, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(fsz*0.53, -fsz*0.18, fsz*0.04, 0, Math.PI*2); ctx.fill();
      // Smile
      ctx.strokeStyle = '#111'; ctx.lineWidth = fsz*0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(fsz*0.5, fsz*0.05, fsz*0.14, 0.2, Math.PI-0.2); ctx.stroke();
      ctx.restore();
    };
    drawOverlayFish(w*0.82, h*0.12, w*0.13, '#FF6B35', 'rgba(255,255,255,0.55)');
    drawOverlayFish(w*0.2, h*0.45, w*0.11, '#FFD93D', 'rgba(255,140,0,0.5)');
    drawOverlayFish(w*0.78, h*0.72, w*0.10, '#4CD964', 'rgba(0,180,80,0.5)');

    // ── Starfish — top left ──
    ctx.save(); ctx.translate(w*0.1, h*0.08);
    const sfsz = w*0.1;
    ctx.fillStyle = '#FF69B4';
    for (let arm = 0; arm < 5; arm++) {
      const a = (arm/5)*Math.PI*2 - Math.PI/2;
      const a2 = a + Math.PI/5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a)*sfsz, Math.sin(a)*sfsz);
      ctx.lineTo(Math.cos(a2)*sfsz*0.38, Math.sin(a2)*sfsz*0.38);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#FF1493';
    ctx.beginPath(); ctx.arc(0, 0, sfsz*0.28, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // ── Crab — bottom right ──
    ctx.save(); ctx.translate(w*0.88, h*0.9);
    const crsz = w*0.09;
    ctx.fillStyle = '#FF4500';
    ctx.beginPath(); ctx.ellipse(0, 0, crsz*0.9, crsz*0.65, 0, 0, Math.PI*2); ctx.fill();
    // Claws
    [[-crsz*1.1, -crsz*0.3], [crsz*1.1, -crsz*0.3]].forEach(([cx2, cy2], side) => {
      const flip = side === 0 ? -1 : 1;
      ctx.fillStyle = '#FF4500';
      ctx.beginPath(); ctx.ellipse(cx2, cy2, crsz*0.45, crsz*0.3, side===0?0.5:-0.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#CC2200';
      ctx.beginPath(); ctx.arc(cx2 + flip*crsz*0.25, cy2 - crsz*0.1, crsz*0.22, 0, Math.PI*2); ctx.fill();
    });
    // Eyes
    [-crsz*0.3, crsz*0.3].forEach(ex => {
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex, -crsz*0.5, crsz*0.16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex, -crsz*0.5, crsz*0.09, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // ── Octopus — bottom left ──
    ctx.save(); ctx.translate(w*0.12, h*0.88);
    const ovsz = w*0.1;
    const octColors = ['#9B59B6', '#8E44AD'];
    for (let ti = 0; ti < 8; ti++) {
      const ta = (ti/8)*Math.PI*2 - Math.PI*0.15;
      const bendX = Math.cos(ta + (ti%2===0?0.4:-0.4)) * ovsz*2.0;
      const bendY = Math.sin(ta + (ti%2===0?0.4:-0.4)) * ovsz*2.0 + ovsz*0.8;
      ctx.strokeStyle = octColors[0]; ctx.lineWidth = ovsz*0.3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(ta)*ovsz*0.5, Math.sin(ta)*ovsz*0.5 + ovsz*0.4);
      ctx.quadraticCurveTo(bendX*0.6, bendY*0.6, bendX, bendY);
      ctx.stroke();
    }
    const headGrad = ctx.createRadialGradient(-ovsz*0.2, -ovsz*0.2, ovsz*0.1, 0, 0, ovsz);
    headGrad.addColorStop(0, '#C39BD3'); headGrad.addColorStop(1, '#9B59B6');
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(0, 0, ovsz, 0, Math.PI*2); ctx.fill();
    [-ovsz*0.35, ovsz*0.35].forEach(ex => {
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex, -ovsz*0.15, ovsz*0.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2C3E50'; ctx.beginPath(); ctx.arc(ex+ovsz*0.06, -ovsz*0.15, ovsz*0.18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex+ovsz*0.1, -ovsz*0.22, ovsz*0.07, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // ── Bubbles scattered ──
    [[0.45, 0.05, 8], [0.55, 0.18, 5], [0.35, 0.25, 6], [0.65, 0.35, 7],
     [0.88, 0.45, 5], [0.12, 0.62, 6], [0.5, 0.82, 7], [0.75, 0.55, 4]].forEach(([bx, by, br]) => {
      ctx.strokeStyle = 'rgba(150,220,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx*w, by*h, br, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(200,240,255,0.2)';
      ctx.beginPath(); ctx.arc(bx*w - br*0.3, by*h - br*0.3, br*0.42, 0, Math.PI*2); ctx.fill();
    });

  } else if (theme === 'jungle') {
    // ── Parrot — top right ──
    ctx.save(); ctx.translate(w*0.86, h*0.1);
    const prSz = w*0.12;
    // Body
    const bodyGrad = ctx.createRadialGradient(-prSz*0.1, -prSz*0.1, prSz*0.1, 0, 0, prSz*0.75);
    bodyGrad.addColorStop(0, '#5EDF6E'); bodyGrad.addColorStop(1, '#27AE60');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, prSz*0.1, prSz*0.45, prSz*0.72, 0, 0, Math.PI*2); ctx.fill();
    // Wing
    ctx.fillStyle = '#3498DB';
    ctx.beginPath(); ctx.ellipse(-prSz*0.38, prSz*0.15, prSz*0.3, prSz*0.48, -0.4, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#FFD93D';
    ctx.beginPath(); ctx.arc(0, -prSz*0.62, prSz*0.34, 0, Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(prSz*0.12, -prSz*0.68, prSz*0.12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(prSz*0.14, -prSz*0.68, prSz*0.07, 0, Math.PI*2); ctx.fill();
    // Beak
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath(); ctx.moveTo(prSz*0.3, -prSz*0.62); ctx.lineTo(prSz*0.58, -prSz*0.5); ctx.lineTo(prSz*0.3, -prSz*0.42); ctx.closePath(); ctx.fill();
    ctx.restore();

    // ── Big frog — bottom right ──
    ctx.save(); ctx.translate(w*0.88, h*0.88);
    const frSz = w*0.11;
    ctx.fillStyle = '#27AE60';
    ctx.beginPath(); ctx.ellipse(0, 0, frSz*0.7, frSz*0.55, 0, 0, Math.PI*2); ctx.fill();
    // Eyes on top
    [-frSz*0.35, frSz*0.35].forEach(ex => {
      ctx.fillStyle = '#27AE60'; ctx.beginPath(); ctx.arc(ex, -frSz*0.52, frSz*0.28, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex, -frSz*0.52, frSz*0.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex+frSz*0.04, -frSz*0.52, frSz*0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex+frSz*0.07, -frSz*0.57, frSz*0.05, 0, Math.PI*2); ctx.fill();
    });
    // Smile
    ctx.strokeStyle = '#1A6B30'; ctx.lineWidth = frSz*0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, frSz*0.05, frSz*0.32, 0.25, Math.PI-0.25); ctx.stroke();
    // Spots
    ctx.fillStyle = '#1A6B30';
    [[frSz*0.2, -frSz*0.15, frSz*0.08], [-frSz*0.25, frSz*0.1, frSz*0.07]].forEach(([sx,sy,sr]) => {
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // ── Monkey — bottom left ──
    ctx.save(); ctx.translate(w*0.14, h*0.88);
    const mkSz = w*0.1;
    ctx.fillStyle = '#8B4513';
    ctx.beginPath(); ctx.arc(0, 0, mkSz*0.75, 0, Math.PI*2); ctx.fill();
    // Face
    ctx.fillStyle = '#D2691E';
    ctx.beginPath(); ctx.ellipse(0, mkSz*0.18, mkSz*0.52, mkSz*0.42, 0, 0, Math.PI*2); ctx.fill();
    // Eyes
    [-mkSz*0.28, mkSz*0.28].forEach(ex => {
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex, -mkSz*0.15, mkSz*0.18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex+mkSz*0.04, -mkSz*0.15, mkSz*0.1, 0, Math.PI*2); ctx.fill();
    });
    // Smile
    ctx.strokeStyle = '#5C2A00'; ctx.lineWidth = mkSz*0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, mkSz*0.25, mkSz*0.28, 0.2, Math.PI-0.2); ctx.stroke();
    // Ears
    [-mkSz*0.8, mkSz*0.8].forEach(ex => {
      ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.arc(ex, -mkSz*0.1, mkSz*0.22, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#D2691E'; ctx.beginPath(); ctx.arc(ex, -mkSz*0.1, mkSz*0.14, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // ── Butterfly — top left ──
    ctx.save(); ctx.translate(w*0.12, h*0.15);
    const bfSz = w*0.1;
    [['#FF6B6B', '#FF4444'], ['#FF8C00', '#FFA500']].forEach(([c1, c2], wi) => {
      const flip = wi === 0 ? -1 : 1;
      const wingGrad = ctx.createRadialGradient(flip*bfSz*0.5, -bfSz*0.3, bfSz*0.1, flip*bfSz*0.7, -bfSz*0.3, bfSz*0.75);
      wingGrad.addColorStop(0, c1); wingGrad.addColorStop(1, c2);
      ctx.fillStyle = wingGrad;
      ctx.beginPath(); ctx.ellipse(flip*bfSz*0.72, -bfSz*0.35, bfSz*0.75, bfSz*0.52, flip*0.45, 0, Math.PI*2); ctx.fill();
    });
    [['#FFD93D', '#FFAA00'], ['#9B59B6', '#7D3C98']].forEach(([c1, c2], wi) => {
      const flip = wi === 0 ? -1 : 1;
      const wingGrad = ctx.createRadialGradient(flip*bfSz*0.4, bfSz*0.3, bfSz*0.05, flip*bfSz*0.5, bfSz*0.35, bfSz*0.48);
      wingGrad.addColorStop(0, c1); wingGrad.addColorStop(1, c2);
      ctx.fillStyle = wingGrad;
      ctx.beginPath(); ctx.ellipse(flip*bfSz*0.5, bfSz*0.38, bfSz*0.5, bfSz*0.35, flip*-0.45, 0, Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(0, 0, bfSz*0.1, bfSz*0.65, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

  } else if (theme === 'space') {
    // ── Big alien — top left ──
    ctx.save(); ctx.translate(w*0.12, h*0.12);
    const alSz = w*0.12;
    ctx.fillStyle = '#00E676';
    ctx.beginPath(); ctx.ellipse(0, alSz*0.3, alSz*0.58, alSz*0.72, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -alSz*0.55, alSz*0.68, alSz*0.58, 0, 0, Math.PI*2); ctx.fill();
    // Head dome
    ctx.fillStyle = '#69F0AE';
    ctx.beginPath(); ctx.ellipse(0, -alSz*0.72, alSz*0.52, alSz*0.38, 0, Math.PI, 0); ctx.fill();
    // Eyes
    [-alSz*0.28, alSz*0.28].forEach(ex => {
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.ellipse(ex, -alSz*0.6, alSz*0.26, alSz*0.34, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex+alSz*0.06, -alSz*0.6, alSz*0.18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex+alSz*0.1, -alSz*0.68, alSz*0.07, 0, Math.PI*2); ctx.fill();
    });
    // Antennae
    ctx.strokeStyle = '#00E676'; ctx.lineWidth = alSz*0.1; ctx.lineCap = 'round';
    [[-alSz*0.35, -alSz*1.1, -alSz*0.55, -alSz*1.68], [alSz*0.35, -alSz*1.1, alSz*0.55, -alSz*1.68]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(x2, y2, alSz*0.17, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // ── Rocket — top right ──
    ctx.save(); ctx.translate(w*0.88, h*0.1); ctx.rotate(0.25);
    const rkSz = w*0.12;
    // Body
    const rktGrad = ctx.createLinearGradient(-rkSz*0.5, 0, rkSz*0.5, 0);
    rktGrad.addColorStop(0, '#1565C0'); rktGrad.addColorStop(0.5, '#42A5F5'); rktGrad.addColorStop(1, '#1565C0');
    ctx.fillStyle = rktGrad;
    ctx.beginPath(); ctx.moveTo(0, -rkSz*2.2); ctx.bezierCurveTo(rkSz*0.65, -rkSz*0.8, rkSz*0.65, rkSz*0.7, rkSz*0.52, rkSz); ctx.lineTo(-rkSz*0.52, rkSz); ctx.bezierCurveTo(-rkSz*0.65, rkSz*0.7, -rkSz*0.65, -rkSz*0.8, 0, -rkSz*2.2); ctx.fill();
    // Nose
    ctx.fillStyle = '#FF5722';
    ctx.beginPath(); ctx.moveTo(0, -rkSz*2.2); ctx.bezierCurveTo(rkSz*0.4, -rkSz*1.5, -rkSz*0.4, -rkSz*1.5, 0, -rkSz*2.2); ctx.fill();
    // Window
    const winGrad = ctx.createRadialGradient(-rkSz*0.08, -rkSz*0.38, rkSz*0.05, 0, -rkSz*0.3, rkSz*0.34);
    winGrad.addColorStop(0, '#B3E5FC'); winGrad.addColorStop(1, '#0288D1');
    ctx.fillStyle = winGrad; ctx.beginPath(); ctx.arc(0, -rkSz*0.3, rkSz*0.34, 0, Math.PI*2); ctx.fill();
    // Fins
    [[rkSz*0.52, rkSz*0.3], [-rkSz*0.52, rkSz*0.3]].forEach(([fx, fy], fi) => {
      ctx.fillStyle = '#FF7043';
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (fi===0?1:-1)*rkSz*0.65, rkSz*1.1); ctx.lineTo(fi===0?rkSz*0.52:-rkSz*0.52, rkSz); ctx.closePath(); ctx.fill();
    });
    // Flame
    ctx.fillStyle = '#FFD93D'; ctx.globalAlpha *= 0.9;
    ctx.beginPath(); ctx.moveTo(-rkSz*0.3, rkSz); ctx.bezierCurveTo(-rkSz*0.15, rkSz*1.9, rkSz*0.15, rkSz*1.9, rkSz*0.3, rkSz); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF5722';
    ctx.beginPath(); ctx.moveTo(-rkSz*0.18, rkSz); ctx.bezierCurveTo(-rkSz*0.08, rkSz*1.5, rkSz*0.08, rkSz*1.5, rkSz*0.18, rkSz); ctx.closePath(); ctx.fill();
    ctx.restore();

    // ── Planet — bottom left ──
    ctx.save(); ctx.translate(w*0.12, h*0.88);
    const plSz = w*0.11;
    // Ring back
    ctx.strokeStyle = '#CE93D8'; ctx.lineWidth = plSz*0.22; ctx.globalAlpha *= 0.55;
    ctx.beginPath(); ctx.ellipse(0, plSz*0.1, plSz*1.7, plSz*0.4, -0.3, Math.PI*0.58, Math.PI*1.42); ctx.stroke();
    ctx.globalAlpha *= (1/0.55);
    // Planet body
    const plGrad = ctx.createRadialGradient(-plSz*0.3, -plSz*0.3, plSz*0.1, 0, 0, plSz);
    plGrad.addColorStop(0, '#CE93D8'); plGrad.addColorStop(0.5, '#9C27B0'); plGrad.addColorStop(1, '#6A1B9A');
    ctx.fillStyle = plGrad; ctx.beginPath(); ctx.arc(0, 0, plSz, 0, Math.PI*2); ctx.fill();
    // Bands
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = plSz*0.15;
    [-plSz*0.25, plSz*0.2].forEach(by => {
      ctx.beginPath(); ctx.ellipse(0, by, plSz*0.9, plSz*0.12, 0, 0, Math.PI*2); ctx.stroke();
    });
    // Ring front
    ctx.strokeStyle = '#CE93D8'; ctx.lineWidth = plSz*0.22; ctx.globalAlpha *= 0.85;
    ctx.beginPath(); ctx.ellipse(0, plSz*0.1, plSz*1.7, plSz*0.4, -0.3, Math.PI*1.42, Math.PI*2.58); ctx.stroke();
    ctx.restore();

    // ── UFO — bottom right ──
    ctx.save(); ctx.translate(w*0.88, h*0.9);
    const ufSz = w*0.1;
    // Beam
    ctx.fillStyle = 'rgba(255,255,150,0.35)';
    ctx.beginPath(); ctx.moveTo(-ufSz*0.45, ufSz*0.15); ctx.lineTo(-ufSz*0.9, ufSz*1.1); ctx.lineTo(ufSz*0.9, ufSz*1.1); ctx.lineTo(ufSz*0.45, ufSz*0.15); ctx.closePath(); ctx.fill();
    // Saucer bottom
    const saucerGrad = ctx.createLinearGradient(0, 0, 0, ufSz*0.35);
    saucerGrad.addColorStop(0, '#78909C'); saucerGrad.addColorStop(1, '#546E7A');
    ctx.fillStyle = saucerGrad;
    ctx.beginPath(); ctx.ellipse(0, ufSz*0.1, ufSz, ufSz*0.3, 0, 0, Math.PI*2); ctx.fill();
    // Dome
    const domeGrad = ctx.createRadialGradient(-ufSz*0.2, -ufSz*0.25, ufSz*0.05, 0, -ufSz*0.15, ufSz*0.6);
    domeGrad.addColorStop(0, '#B2EBF2'); domeGrad.addColorStop(1, '#00ACC1');
    ctx.fillStyle = domeGrad;
    ctx.beginPath(); ctx.ellipse(0, -ufSz*0.05, ufSz*0.6, ufSz*0.45, 0, Math.PI, 0); ctx.fill();
    // Lights
    ['#FFD93D','#FF6B6B','#4CD964','#3CB4FF'].forEach((lc, li) => {
      const la = (li/4)*Math.PI*2 - Math.PI*0.3;
      ctx.fillStyle = lc; ctx.beginPath(); ctx.arc(Math.cos(la)*ufSz*0.72, ufSz*0.1 + Math.sin(la)*ufSz*0.15, ufSz*0.1, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

  } else if (theme === 'fantasy') {
    // ── Unicorn — bottom left ──
    ctx.save(); ctx.translate(w*0.14, h*0.88);
    const unSz = w*0.13;
    // Body
    ctx.fillStyle = '#FCE4EC';
    ctx.beginPath(); ctx.ellipse(0, 0, unSz*0.75, unSz*0.52, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.ellipse(unSz*0.72, -unSz*0.35, unSz*0.42, unSz*0.35, -0.3, 0, Math.PI*2); ctx.fill();
    // Mane
    ['#FF69B4','#FFD93D','#B44FFF','#FF6B6B'].forEach((mc, mi) => {
      ctx.fillStyle = mc;
      ctx.beginPath(); ctx.ellipse(-unSz*0.1 + mi*unSz*0.15, -unSz*0.42, unSz*0.12, unSz*0.32, -0.5+mi*0.2, 0, Math.PI*2); ctx.fill();
    });
    // Horn
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.moveTo(unSz*0.95, -unSz*0.7); ctx.lineTo(unSz*1.05, -unSz*1.25); ctx.lineTo(unSz*1.15, -unSz*0.7); ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(unSz*0.88, -unSz*0.38, unSz*0.09, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(unSz*0.9, -unSz*0.41, unSz*0.04, 0, Math.PI*2); ctx.fill();
    // Tail
    ['#FF69B4','#B44FFF','#FFD93D'].forEach((tc, ti) => {
      ctx.fillStyle = tc;
      ctx.beginPath(); ctx.moveTo(-unSz*0.72, unSz*0.1); ctx.bezierCurveTo(-unSz*1.1 - ti*unSz*0.08, -unSz*0.4, -unSz*1.3 - ti*unSz*0.08, unSz*0.4, -unSz*0.9, unSz*0.4); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-unSz*(0.95+ti*0.1), unSz*0.05, unSz*0.08, unSz*0.35, -0.3+ti*0.2, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // ── Dragon — top right ──
    ctx.save(); ctx.translate(w*0.88, h*0.12);
    const drSz = w*0.11;
    // Wings
    ctx.fillStyle = '#7B1FA2'; ctx.globalAlpha *= 0.75;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-drSz*0.5, -drSz*1.2, -drSz*1.4, -drSz*0.8, -drSz*1.3, drSz*0.1); ctx.bezierCurveTo(-drSz*0.7, drSz*0.25, -drSz*0.1, drSz*0.1, 0, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(drSz*0.6, -drSz*0.2); ctx.bezierCurveTo(drSz*1.0, -drSz*1.2, drSz*1.8, -drSz*0.9, drSz*1.6, drSz*0.1); ctx.bezierCurveTo(drSz*1.2, drSz*0.3, drSz*0.7, drSz*0.2, drSz*0.6, -drSz*0.2); ctx.fill();
    ctx.globalAlpha *= (1/0.75);
    // Body
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath(); ctx.ellipse(0, drSz*0.2, drSz*0.6, drSz*0.42, 0.2, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.ellipse(drSz*0.65, -drSz*0.28, drSz*0.48, drSz*0.38, -0.3, 0, Math.PI*2); ctx.fill();
    // Spines
    ctx.fillStyle = '#FF5722';
    [[-drSz*0.3, -drSz*0.15], [drSz*0.05, -drSz*0.22], [drSz*0.35, -drSz*0.55]].forEach(([sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx+drSz*0.08, sy-drSz*0.25); ctx.lineTo(sx+drSz*0.16, sy); ctx.closePath(); ctx.fill();
    });
    // Eye
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(drSz*0.82, -drSz*0.34, drSz*0.13, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(drSz*0.82, -drSz*0.34, drSz*0.08, 0, Math.PI*2); ctx.fill();
    // Fire breath
    ctx.fillStyle = '#FF6B35'; ctx.globalAlpha *= 0.8;
    ctx.beginPath(); ctx.moveTo(drSz, -drSz*0.2); ctx.bezierCurveTo(drSz*1.4, -drSz*0.4, drSz*1.6, drSz*0.1, drSz*1.3, drSz*0.2); ctx.bezierCurveTo(drSz*1.1, drSz*0.1, drSz*1.05, -drSz*0.05, drSz, drSz*0.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFD93D';
    ctx.beginPath(); ctx.moveTo(drSz, -drSz*0.1); ctx.bezierCurveTo(drSz*1.2, -drSz*0.25, drSz*1.4, drSz*0.05, drSz*1.15, drSz*0.15); ctx.bezierCurveTo(drSz*1.0, drSz*0.05, drSz*1.0, -drSz*0.02, drSz, drSz*0.05); ctx.closePath(); ctx.fill();
    ctx.restore();

    // ── Sparkle stars ──
    const drawBigSparkle = (px, py, sz, sc) => {
      ctx.save(); ctx.translate(px, py);
      ctx.fillStyle = sc;
      [0, Math.PI/4].forEach(ba => {
        ctx.save(); ctx.rotate(ba);
        ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(sz*0.28,-sz*0.28); ctx.lineTo(sz,0); ctx.lineTo(sz*0.28,sz*0.28); ctx.lineTo(0,sz); ctx.lineTo(-sz*0.28,sz*0.28); ctx.lineTo(-sz,0); ctx.lineTo(-sz*0.28,-sz*0.28); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    };
    drawBigSparkle(w*0.42, h*0.08, w*0.04, '#FFD93D');
    drawBigSparkle(w*0.65, h*0.35, w*0.03, '#FF69B4');
    drawBigSparkle(w*0.25, h*0.65, w*0.035, '#B44FFF');

    // ── Fairy — top left ──
    ctx.save(); ctx.translate(w*0.1, h*0.18);
    const fySz = w*0.09;
    // Wings
    ctx.fillStyle = 'rgba(200,180,255,0.8)';
    ctx.beginPath(); ctx.ellipse(-fySz, -fySz*0.3, fySz*0.95, fySz*0.62, -0.45, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fySz, -fySz*0.3, fySz*0.95, fySz*0.62, 0.45, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-fySz*0.65, fySz*0.42, fySz*0.58, fySz*0.38, 0.45, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fySz*0.65, fySz*0.42, fySz*0.58, fySz*0.38, -0.45, 0, Math.PI*2); ctx.fill();
    // Dress
    ctx.fillStyle = '#E91E63';
    ctx.beginPath(); ctx.ellipse(0, fySz*0.55, fySz*0.32, fySz*0.55, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#FFD180';
    ctx.beginPath(); ctx.arc(0, -fySz*0.28, fySz*0.4, 0, Math.PI*2); ctx.fill();
    // Hair
    ctx.fillStyle = '#FFD93D';
    ctx.beginPath(); ctx.arc(0, -fySz*0.55, fySz*0.32, Math.PI, 0); ctx.fill();
    // Eyes
    [-fySz*0.13, fySz*0.13].forEach(ex => {
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex, -fySz*0.3, fySz*0.08, 0, Math.PI*2); ctx.fill();
    });
    // Wand
    ctx.strokeStyle = '#FFD93D'; ctx.lineWidth = fySz*0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fySz*0.55, fySz*0.05); ctx.lineTo(fySz*1.25, -fySz*0.82); ctx.stroke();
    ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(fySz*1.25, -fySz*0.82, fySz*0.22, 0, Math.PI*2); ctx.fill();
    ctx.restore();

  } else {
    // ── CARTOON overlay ──
    // Big balloon — top left
    ctx.save(); ctx.translate(w*0.1, h*0.12);
    const blSz = w*0.12;
    const blGrad = ctx.createRadialGradient(-blSz*0.25, -blSz*0.3, blSz*0.05, 0, 0, blSz);
    blGrad.addColorStop(0, '#FF9898'); blGrad.addColorStop(1, '#FF4D4D');
    ctx.fillStyle = blGrad;
    ctx.beginPath(); ctx.ellipse(0, 0, blSz*0.65, blSz*0.82, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#CC0000';
    ctx.beginPath(); ctx.arc(0, blSz*0.85, blSz*0.1, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, blSz*0.96); ctx.bezierCurveTo(blSz*0.22, blSz*1.4, -blSz*0.18, blSz*1.8, 0, blSz*2.3); ctx.stroke();
    ctx.restore();

    // Second balloon — top right
    ctx.save(); ctx.translate(w*0.9, h*0.1);
    const b2Sz = w*0.11;
    const b2Grad = ctx.createRadialGradient(-b2Sz*0.25, -b2Sz*0.3, b2Sz*0.05, 0, 0, b2Sz);
    b2Grad.addColorStop(0, '#9BE8FF'); b2Grad.addColorStop(1, '#00BCD4');
    ctx.fillStyle = b2Grad;
    ctx.beginPath(); ctx.ellipse(0, 0, b2Sz*0.65, b2Sz*0.82, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#007D8F';
    ctx.beginPath(); ctx.arc(0, b2Sz*0.85, b2Sz*0.1, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, b2Sz*0.96); ctx.bezierCurveTo(b2Sz*0.22, b2Sz*1.4, -b2Sz*0.18, b2Sz*1.8, 0, b2Sz*2.3); ctx.stroke();
    ctx.restore();

    // Big flower — bottom left
    ctx.save(); ctx.translate(w*0.1, h*0.9);
    const flSz = w*0.11;
    for (let fp = 0; fp < 8; fp++) {
      const fa = (fp/8)*Math.PI*2;
      const petGrad = ctx.createRadialGradient(Math.cos(fa)*flSz*0.42, Math.sin(fa)*flSz*0.42, flSz*0.05, Math.cos(fa)*flSz*0.42, Math.sin(fa)*flSz*0.42, flSz*0.42);
      petGrad.addColorStop(0, '#FF9CCB'); petGrad.addColorStop(1, '#FF4D94');
      ctx.fillStyle = petGrad;
      ctx.beginPath(); ctx.ellipse(Math.cos(fa)*flSz*0.42, Math.sin(fa)*flSz*0.42, flSz*0.22, flSz*0.34, fa, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(0, 0, flSz*0.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Smiling sun — bottom right
    ctx.save(); ctx.translate(w*0.9, h*0.88);
    const suSz = w*0.1;
    ctx.strokeStyle = '#FFB300'; ctx.lineWidth = suSz*0.18; ctx.lineCap = 'round';
    for (let ri = 0; ri < 8; ri++) {
      const ra = (ri/8)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(Math.cos(ra)*suSz*0.72, Math.sin(ra)*suSz*0.72); ctx.lineTo(Math.cos(ra)*suSz*1.28, Math.sin(ra)*suSz*1.28); ctx.stroke();
    }
    const sunGrd = ctx.createRadialGradient(0, 0, 0, 0, 0, suSz*0.68);
    sunGrd.addColorStop(0, '#FFF59D'); sunGrd.addColorStop(1, '#FFD600');
    ctx.fillStyle = sunGrd; ctx.beginPath(); ctx.arc(0, 0, suSz*0.68, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#E65100'; ctx.lineWidth = suSz*0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, suSz*0.12, suSz*0.3, 0.25, Math.PI-0.25); ctx.stroke();
    [-suSz*0.22, suSz*0.22].forEach(ex => {
      ctx.fillStyle = '#5D4037'; ctx.beginPath(); ctx.arc(ex, -suSz*0.1, suSz*0.09, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

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
      const fg2 = ctx.createRadialGradient(cx + cw*0.5, cy + faceH*0.5, 0, cx + cw*0.5, cy + faceH*0.5, Math.max(cw, faceH) * 0.7);
      fg2.addColorStop(0, 'rgba(255,215,0,0.55)');
      fg2.addColorStop(1, 'rgba(255,215,0,0)');
      rRect(cx, cy, cw, faceH);
      ctx.fillStyle = fg2;
      ctx.fill();
      // Gold star in corner
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#b87a08';
      const starSz = Math.min(cw, faceH) * 0.27;
      ctx.font = `${starSz}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('★', cx + cw - 2, cy + faceH - 2);
      ctx.restore();
    }

    // ── Number — big, bold, easy for kids to read ──
    const fontSize = Math.min(cellW * 0.42, cellH * 0.46, 24);
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
    ctx.globalAlpha = 0.24;
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
    _hoverCell: null,
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
        // Tap existing snake to delete it
        const si = this.config.snakes.findIndex(s => s.head === cell || s.tail === cell);
        if (si !== -1) {
          this.config.snakes.splice(si, 1);
          this.draw();
          updateDesignerUI();
          showToast('Snake removed');
          Sounds.button();
          return;
        }
        if (this.cellOccupied(cell)) { showToast('Square taken! Try another ↩'); return; }
        this.pending = cell;
        this.mode = 'snake-tail';
        this.draw();
        updatePlacementHint('Now tap the end square');
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
            showToast('Square taken! Try another ↩');
          }
        } else if (cell === this.pending) {
          // Cancel placement by tapping the head again
          this.pending = null;
          this.mode = 'snake-head';
          this.draw();
          updatePlacementHint('');
        } else {
          showToast('End must be lower!');
        }
      } else if (this.mode === 'ladder-bottom') {
        // Tap existing ladder to delete it
        const li = this.config.ladders.findIndex(l => l.bottom === cell || l.top === cell);
        if (li !== -1) {
          this.config.ladders.splice(li, 1);
          this.draw();
          updateDesignerUI();
          showToast('Ladder removed');
          Sounds.button();
          return;
        }
        if (this.cellOccupied(cell)) { showToast('Square taken! Try another ↩'); return; }
        this.pending = cell;
        this.mode = 'ladder-top';
        this.draw();
        updatePlacementHint('Now tap the top square');
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
            showToast('Square taken! Try another ↩');
          }
        } else if (cell === this.pending) {
          // Cancel placement by tapping the bottom again
          this.pending = null;
          this.mode = 'ladder-bottom';
          this.draw();
          updatePlacementHint('');
        } else {
          showToast('Top must be higher!');
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
        const label = (this.mode === 'ladder-top') ? 'BOT' : 'HEAD';
        const cw = r.w, ch = r.h;
        const fontSize = Math.min(cw * 0.32, ch * 0.32, 16);
        this.ctx.font = `900 ${fontSize}px sans-serif`;
        this.ctx.fillStyle = '#7a3c00';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, r.x + cw / 2, r.y + ch / 2);
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
