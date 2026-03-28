/* ============================================================
   PARTICLES — Confetti & celebration effects
   ============================================================ */

const Particles = (() => {
  let canvas = null;
  let ctx = null;
  let particles = [];
  let animId = null;
  let running = false;
  let _w = 0;
  let _h = 0;

  const COLORS = ['#ff4757','#ffa502','#2ed573','#1e90ff','#ff6b81',
                  '#eccc68','#a29bfe','#fd79a8','#fdcb6e','#00cec9'];

  class Particle {
    constructor() { this.reset(true); }
    reset(initial = false) {
      this.x = Math.random() * _w;
      this.y = initial ? Math.random() * _h - _h : -20;
      this.size = randomInt(8, 18);
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.speedX = (Math.random() - 0.5) * 6;
      this.speedY = Math.random() * 4 + 2;
      this.rotation = Math.random() * 360;
      this.rotSpeed = (Math.random() - 0.5) * 8;
      this.shape = Math.random() < 0.5 ? 'rect' : 'circle';
      this.opacity = 1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.rotation += this.rotSpeed;
      this.speedY += 0.06; // gravity
      this.speedX *= 0.99;
      if (this.y > _h + 20) this.reset();
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      if (this.shape === 'rect') {
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function start(canvasEl, count = 120) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    _w = window.innerWidth;
    _h = window.innerHeight;
    canvas.width = Math.round(_w * dpr);
    canvas.height = Math.round(_h * dpr);
    canvas.style.width = _w + 'px';
    canvas.style.height = _h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: count }, () => new Particle());
    running = true;
    loop();
  }

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.update();
      p.draw();
    }
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];
  }

  return { start, stop };
})();
