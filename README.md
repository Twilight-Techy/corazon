# corazón ♥

A birthday gift you step *into*. It's an immersive WebGL world in seven chapters, built for one person.

| Chapter | What happens |
| --- | --- |
| **01 · Arrival** | A heartbeat loader, then a big bang. 34,000 particles explode out of a single point and gather into her name. Click anywhere to send shockwaves through it. |
| **02 · Origin** | As you scroll, the particles become a spiral galaxy, then a beating heart, then her age. |
| **03 · Memories** | The camera flies through the age number into a tunnel of floating photos. The photos bend, chromatic-split and streak with your scroll speed. |
| **04 · Reasons** | A horizontal gallery of cards that tilt with scroll velocity and react to the cursor, with kinetic marquee type behind them. |
| **05 · In numbers / A moment** | Live counters (days, hours, heartbeats since she was born), then a heart-shaped window that grows until the video fills the screen. |
| **06 · The wish** | A 3D cake with shader flames. She blows into the mic (or holds the button / space bar) and the candles go out in puffs of smoke. Then come fireworks (the last one is heart-shaped), confetti and a music-box *Happy Birthday*. |
| **07 · The letter** | A letter whose words light up as you read, a handwritten signature, and a button to replay the whole universe. |

All the sound is synthesised live with WebAudio: an ambient pad, music-box twinkles, whooshes, firework pops and the birthday song. There are no audio files.

## Make it hers

Everything personal is in **`src/config.js`**: name, age, birthdate (for the live counters), your name, captions, the six reasons, the video and the letter.

All images and the video are **placeholders** (picsum.photos and a CC0 clip from MDN). To use real ones, drop files into `/public` (e.g. `public/photos/01.jpg`) and point the config at them (`src: './photos/01.jpg'`). Portrait photos (4:5) look best in the tunnel.

## Run it

```bash
npm install
npm run dev
```

```bash
npm run build   # → dist/, fully static, deploy anywhere (Netlify, Vercel, GitHub Pages…)
```

Stack: Three.js (custom GLSL shaders, bloom and a chromatic-aberration/grain post pass), GSAP + ScrollTrigger + SplitText, Lenis smooth scroll and Vite.

Tips: open it on a laptop with sound on. The mic only works over `https://` or `localhost`. Hold the button if she'd rather not grant mic access.
