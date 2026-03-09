# My Snakes & Ladders

A premium, fully customisable Snakes & Ladders game for kids.

## Running
Open `index.html` in a browser. No build step needed.

## Converting to Android (Capacitor)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
npx cap add android
npx cap sync
npx cap open android
```

## Features
- 5 visual themes (Jungle, Space, Ocean, Fantasy, Cartoon)
- Board designer with manual or auto-placed snakes & ladders
- 2–4 players, pass-and-play
- Synthesized sound effects (Web Audio API, no files needed)
- Shake to roll on mobile
- LocalStorage for saved boards & high scores
