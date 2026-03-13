/* ============================================================
   ICONS — Cartoon toy-style SVG icon library
   ============================================================ */

const Icons = (() => {

  const S = {

    dice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Shadow -->
  <rect x="5" y="7" width="28" height="28" rx="6" ry="6" fill="rgba(0,0,0,0.15)"/>
  <!-- Die face -->
  <rect x="4" y="4" width="28" height="28" rx="6" ry="6" fill="white" stroke="#3CB4FF" stroke-width="2.5"/>
  <!-- Dots: standard 5-pattern -->
  <!-- top-left -->
  <circle cx="11.5" cy="11.5" r="3" fill="#FF6B6B"/>
  <!-- top-right -->
  <circle cx="24.5" cy="11.5" r="3" fill="#FF6B6B"/>
  <!-- center -->
  <circle cx="18" cy="18" r="3" fill="#3CB4FF"/>
  <!-- bottom-left -->
  <circle cx="11.5" cy="24.5" r="3" fill="#4CD964"/>
  <!-- bottom-right -->
  <circle cx="24.5" cy="24.5" r="3" fill="#4CD964"/>
</svg>`,

    snake: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Outline body -->
  <path d="M8 32 Q6 22 14 20 Q22 18 20 10 Q18 4 26 4" fill="none" stroke="#2A8A3A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Green body -->
  <path d="M8 32 Q6 22 14 20 Q22 18 20 10 Q18 4 26 4" fill="none" stroke="#4CD964" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Head outline -->
  <circle cx="29" cy="6" r="6" fill="#2A8A3A"/>
  <!-- Head fill -->
  <circle cx="29" cy="6" r="5" fill="#4CD964"/>
  <!-- Eyes -->
  <circle cx="27" cy="4.5" r="2" fill="white"/>
  <circle cx="31" cy="4.5" r="2" fill="white"/>
  <circle cx="27.5" cy="4.5" r="1.1" fill="#1a1a1a"/>
  <circle cx="31.5" cy="4.5" r="1.1" fill="#1a1a1a"/>
  <!-- Tongue -->
  <line x1="29" y1="11" x2="29" y2="14" stroke="#FF4444" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="29" y1="14" x2="27" y2="16" stroke="#FF4444" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="29" y1="14" x2="31" y2="16" stroke="#FF4444" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

    ladder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Left rail shadow -->
  <line x1="11" y1="4" x2="11" y2="37" stroke="rgba(0,0,0,0.18)" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Right rail shadow -->
  <line x1="29" y1="4" x2="29" y2="37" stroke="rgba(0,0,0,0.18)" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Left rail -->
  <line x1="10" y1="4" x2="10" y2="36" stroke="#8B5E14" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Right rail -->
  <line x1="30" y1="4" x2="30" y2="36" stroke="#8B5E14" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Wood grain shine on rails -->
  <line x1="10" y1="6" x2="10" y2="34" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-linecap="round"/>
  <line x1="30" y1="6" x2="30" y2="34" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-linecap="round"/>
  <!-- Rungs -->
  <line x1="10" y1="10" x2="30" y2="10" stroke="#C4961A" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="10" y1="18" x2="30" y2="18" stroke="#C4961A" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="10" y1="26" x2="30" y2="26" stroke="#C4961A" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="10" y1="34" x2="30" y2="34" stroke="#C4961A" stroke-width="3.5" stroke-linecap="round"/>
</svg>`,

    play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Shadow -->
  <circle cx="21" cy="22" r="16" fill="rgba(0,0,0,0.15)"/>
  <!-- Green circle -->
  <circle cx="20" cy="20" r="16" fill="#4CD964" stroke="#2A8A3A" stroke-width="2.5"/>
  <!-- Play triangle -->
  <polygon points="15,12 15,28 30,20" fill="white"/>
</svg>`,

    save: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Shadow -->
  <rect x="5" y="7" width="30" height="30" rx="5" ry="5" fill="rgba(0,0,0,0.15)"/>
  <!-- Body -->
  <rect x="4" y="4" width="32" height="32" rx="5" ry="5" fill="#3CB4FF"/>
  <!-- Label area (top white strip) -->
  <rect x="8" y="4" width="24" height="13" rx="3" ry="3" fill="white" fill-opacity="0.9"/>
  <!-- Slot in label -->
  <rect x="22" y="6" width="7" height="8" rx="2" ry="2" fill="#3CB4FF" fill-opacity="0.5"/>
  <!-- Lower storage area -->
  <rect x="8" y="20" width="24" height="14" rx="3" ry="3" fill="rgba(255,255,255,0.25)"/>
  <!-- Storage lines -->
  <line x1="12" y1="24" x2="28" y2="24" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="12" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

    back: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Shadow -->
  <circle cx="21" cy="21" r="16" fill="rgba(0,0,0,0.15)"/>
  <!-- Coral circle -->
  <circle cx="20" cy="20" r="16" fill="#FF6B6B" stroke="#D94F4F" stroke-width="2.5"/>
  <!-- Left chevron -->
  <polyline points="23,12 14,20 23,28" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

    menu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Three horizontal rounded bars -->
  <rect x="7" y="10" width="26" height="4.5" rx="2" ry="2" fill="#3CB4FF"/>
  <rect x="7" y="17.75" width="26" height="4.5" rx="2" ry="2" fill="#3CB4FF"/>
  <rect x="7" y="25.5" width="26" height="4.5" rx="2" ry="2" fill="#3CB4FF"/>
</svg>`,

    sound: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Speaker body -->
  <path d="M6 15 L6 25 L12 25 L20 32 L20 8 L12 15 Z" fill="#FFD93D"/>
  <!-- Sound waves -->
  <path d="M23 14 Q28 20 23 26" fill="none" stroke="#FFD93D" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <path d="M26 11 Q34 20 26 29" fill="none" stroke="#FFD93D" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
</svg>`,

    palette: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Palette blob shadow -->
  <path d="M21 37 Q7 37 5 25 Q3 13 14 8 Q25 3 33 11 Q40 18 36 26 Q34 31 29 30 Q25 29 25 32 Q25 37 21 37 Z" fill="rgba(0,0,0,0.15)" transform="translate(1,1)"/>
  <!-- Palette blob -->
  <path d="M21 36 Q7 36 5 24 Q3 12 14 7 Q25 2 33 10 Q40 17 36 25 Q34 30 29 29 Q25 28 25 31 Q25 36 21 36 Z" fill="#8E6CFF"/>
  <!-- Thumb hole -->
  <circle cx="23" cy="30.5" r="3.5" fill="rgba(0,0,0,0.25)"/>
  <!-- Color dots on palette -->
  <circle cx="12" cy="14" r="4" fill="#FF6B6B"/>
  <circle cx="22" cy="10" r="4" fill="#FFD93D"/>
  <circle cx="31" cy="15" r="4" fill="#4CD964"/>
  <circle cx="30" cy="23" r="4" fill="#3CB4FF"/>
</svg>`,

    robot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Antenna -->
  <line x1="20" y1="4" x2="20" y2="9" stroke="#3CB4FF" stroke-width="2" stroke-linecap="round"/>
  <circle cx="20" cy="3.5" r="2.5" fill="#FFD93D"/>
  <!-- Head shadow -->
  <rect x="6" y="11" width="28" height="22" rx="5" ry="5" fill="rgba(0,0,0,0.15)"/>
  <!-- Head -->
  <rect x="5" y="9" width="30" height="22" rx="5" ry="5" fill="#3CB4FF"/>
  <!-- Eye sockets -->
  <rect x="9" y="14" width="9" height="7" rx="2" ry="2" fill="white"/>
  <rect x="22" y="14" width="9" height="7" rx="2" ry="2" fill="white"/>
  <!-- Pupils -->
  <circle cx="13.5" cy="17.5" r="2.5" fill="#1a1a1a"/>
  <circle cx="26.5" cy="17.5" r="2.5" fill="#1a1a1a"/>
  <!-- Mouth dots -->
  <circle cx="14" cy="26" r="2" fill="#4CD964"/>
  <circle cx="20" cy="26" r="2" fill="#FFD93D"/>
  <circle cx="26" cy="26" r="2" fill="#FF6B6B"/>
</svg>`,

    player: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Head shadow -->
  <circle cx="21" cy="13" r="8" fill="rgba(0,0,0,0.15)"/>
  <!-- Head -->
  <circle cx="20" cy="12" r="8" fill="#FF6B6B"/>
  <!-- Body shadow -->
  <rect x="9" y="28" width="22" height="13" rx="7" ry="7" fill="rgba(0,0,0,0.15)"/>
  <!-- Body -->
  <rect x="8" y="26" width="24" height="14" rx="8" ry="8" fill="#FF6B6B"/>
</svg>`,

  };

  /**
   * Returns SVG string with width/height attributes injected.
   */
  function get(name, size) {
    size = size === undefined ? 28 : size;
    if (!S[name]) return '';
    return S[name].replace('viewBox="0 0 40 40"', `viewBox="0 0 40 40" width="${size}" height="${size}"`);
  }

  /**
   * Returns an <img> tag using a data URI of the SVG.
   */
  function img(name, size, alt) {
    size = size === undefined ? 28 : size;
    alt = alt === undefined ? '' : alt;
    const svg = get(name, size);
    if (!svg) return '';
    const encoded = encodeURIComponent(svg);
    return `<img src="data:image/svg+xml,${encoded}" width="${size}" height="${size}" alt="${alt}" style="display:inline-block;vertical-align:middle">`;
  }

  return { get, img };

})();
