// ─────────────────────────────────────────────────────────────
//  Personalise everything here. Every image / video is a
//  placeholder — swap the URLs for real ones (or drop files in
//  /public and reference them as '/my-photo.jpg').
// ─────────────────────────────────────────────────────────────

const ph = (seed, w = 800, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`

export default {
  name: 'Amara',
  age: 25,
  birthdate: '2001-10-28', // YYYY-MM-DD, drives the live counters
  from: 'Alex',
  dateLabel: '28 · 10 · 2026',

  origin: [
    'Before you, the universe was mostly <em>empty space.</em>',
    'Then you happened — and it finally learned <em>how to glow.</em>',
    'trips around the sun. <em>Each one brighter than the last.</em>',
  ],

  memories: [
    { src: ph('corazon-01'), caption: 'The night we got lost on purpose', meta: 'Lisbon — 2019' },
    { src: ph('corazon-02'), caption: 'The laugh that started everything', meta: 'Somewhere — 2018' },
    { src: ph('corazon-03'), caption: '3am, the best conversations', meta: 'Your kitchen — 2020' },
    { src: ph('corazon-04'), caption: 'Our most beautiful bad idea', meta: 'Road trip — 2021' },
    { src: ph('corazon-05'), caption: 'You, pretending not to cry at the film', meta: 'Cinema — 2021' },
    { src: ph('corazon-06'), caption: 'Golden hour, golden you', meta: 'The coast — 2022' },
    { src: ph('corazon-07'), caption: 'The dance floor was ours', meta: 'That wedding — 2022' },
    { src: ph('corazon-08'), caption: 'Sunday, doing absolutely nothing', meta: 'Home — 2023' },
    { src: ph('corazon-09'), caption: 'When you finally said yes to the adventure', meta: 'Mountains — 2024' },
    { src: ph('corazon-10'), caption: 'Still the brightest thing in every room', meta: 'Last year — 2025' },
    { src: ph('corazon-11'), caption: 'And this is only the beginning', meta: 'Today — 2026' },
  ],

  reasons: [
    { title: 'Your laugh', text: 'Loud, contagious and scientifically proven to fix bad days.', img: ph('reason-1', 700, 900) },
    { title: 'The little things', text: 'You remember how everyone takes their coffee. And their fears.', img: ph('reason-2', 700, 900) },
    { title: 'Fearless kindness', text: 'You are gentle in a world that rarely is, and you never flinch.', img: ph('reason-3', 700, 900) },
    { title: 'Terrible puns', text: 'Truly awful. Delivered with total confidence. Iconic.', img: ph('reason-4', 700, 900) },
    { title: 'Home, anywhere', text: 'A train station, a tent, a tiny flat — with you it is home.', img: ph('reason-5', 700, 900) },
    { title: 'Exactly you', text: 'Not a single thing about you needs to change. Not one.', img: ph('reason-6', 700, 900) },
  ],

  video: {
    // Placeholder CC0 clip from MDN — replace with your own.
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    webm: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
    poster: ph('corazon-video', 1600, 900),
  },

  letter: [
    'I wanted to give you something you couldn’t hold — so I built you a small universe instead.',
    'Every star in here is a moment I’m grateful for. Every particle is a little piece of how much you mean to me.',
    'You make ordinary days feel like a celebration, and I hope this year gives back even a fraction of the light you give away so freely.',
    'Happy birthday. Here’s to the next trip around the sun.',
  ],
}
