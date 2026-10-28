import './style.css'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import Lenis from 'lenis'
import config from './config.js'
import { World } from './webgl/World.js'
import { AudioEngine } from './audio.js'
import { initCursor } from './ui/cursor.js'
import { Confetti } from './ui/confetti.js'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin)
history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const mobile = matchMedia('(max-width: 800px), (hover: none)').matches
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/* ───────────────────────── content from config ───────────────────────── */
$$('.js-name').forEach((el) => (el.textContent = config.name))
$$('.js-from').forEach((el) => (el.textContent = config.from))
$$('.js-year').forEach((el) => (el.textContent = new Date().getFullYear()))
$('#heroDate').textContent = config.dateLabel
$$('.origin__line p').forEach((p, i) => {
  p.innerHTML = i === 2 ? `<b>${config.age}</b> ${config.origin[2]}` : config.origin[i]
})
$('#memTotal').textContent = String(config.memories.length).padStart(2, '0')
$('#reasonsTrack').innerHTML = config.reasons
  .map((r, i) => `
    <article class="card">
      <div class="card__media"><img src="${r.img}" alt="" loading="eager" /><div class="card__glare"></div></div>
      <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
      <div class="card__body"><h3>${r.title}</h3><p>${r.text}</p></div>
    </article>`)
  .join('')
$('#letterBody').innerHTML = config.letter.map((p) => `<p>${p}</p>`).join('')
const video = $('#momentVideo')
video.poster = config.video.poster
video.innerHTML = `<source src="${config.video.webm}" type="video/webm" /><source src="${config.video.src}" type="video/mp4" />`

/* ───────────────────────── core systems ───────────────────────── */
const audio = new AudioEngine()
const confetti = new Confetti($('#confetti'))
const cursor = initCursor({ onHover: () => audio.hover() })

const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4 })
lenis.stop()
window.__lenis = lenis
lenis.on('scroll', ScrollTrigger.update)

const loadState = { real: 0, shown: 0 }
const manager = new THREE.LoadingManager()
manager.onProgress = (_, loaded, total) => (loadState.real = loaded / total)

let world
const countEl = $('#loadCount')

async function boot() {
  // particles sample the name from the real font, so it must be ready first
  await Promise.race([
    Promise.all([
      document.fonts.load('italic 300 100px "Fraunces"'),
      document.fonts.load('italic 200 100px "Fraunces"'),
      document.fonts.load('300 100px "Fraunces"'),
    ]),
    new Promise((r) => setTimeout(r, 3500)),
  ])
  world = new World($('#webgl'), { config, manager, mobile })
  window.__world = world

  gsap.ticker.add((time, delta) => {
    lenis.raf(time * 1000)
    world.state.vel = clamp(lenis.velocity / 45, -1.5, 1.5)
    world.update(delta / 1000)
    frame(delta / 1000)
  })
  gsap.ticker.lagSmoothing(0)

  // loader counter: never faster than ~2.4s, never stuck longer than ~9s
  const t0 = performance.now()
  await new Promise((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - t0) / 1000
      const target = Math.min(loadState.real, elapsed / 2.4, 1)
      const forced = elapsed > 9 ? 1 : target
      loadState.shown += (forced - loadState.shown) * 0.08
      if (forced >= 1 && loadState.shown > 0.995) loadState.shown = 1
      countEl.textContent = String(Math.round(loadState.shown * 100)).padStart(3, '0')
      if (loadState.shown >= 1) return resolve()
      requestAnimationFrame(tick)
    }
    tick()
  })

  $('.loader__status').textContent = 'the universe is ready'
  const enter = $('#enter')
  gsap.to(enter, { opacity: 1, scale: 1, duration: 1.4, ease: 'elastic.out(1, 0.5)', onComplete: () => enter.classList.add('is-ready') })
  gsap.to('.loader__count', { opacity: 0.12, duration: 1 })
  enter.addEventListener('click', start, { once: true })
  buildScroll()
}

/* ───────────────────────── the big bang ───────────────────────── */
function start() {
  audio.init()
  audio.startAmbient()
  audio.boom()
  document.body.classList.remove('is-loading')
  $('.cursor').classList.remove('is-hover')
  const s = world.state
  const tl = gsap.timeline()
  tl.to('#enter', { scale: 0.2, opacity: 0, duration: 0.6, ease: 'back.in(2)' })
    .to('.loader', { opacity: 0, duration: 1.2, ease: 'power2.out', onComplete: () => $('.loader').remove() }, '<0.3')
    .to('.flash', { opacity: 1, duration: 0.08, ease: 'none' }, '<')
    .to('.flash', { opacity: 0, duration: 1.4, ease: 'power3.out' })
    .to(s, { flash: 0.35, duration: 0.08 }, '<-0.08')
    .to(s, { flash: 0, duration: 1.2, ease: 'power2.out' })
    .to(s, { bang: 1, duration: 3.2, ease: 'power3.out' }, 0.55)
    .to(s, { bloom: 2.2, duration: 0.3 }, 0.55)
    .to(s, { bloom: 1.1, duration: 2.5, ease: 'power2.out' }, 0.9)
    .to(s, { introZ: 0, duration: 5.5, ease: 'power3.inOut' }, 0.55)
    .to(s, { introMorph: 0, duration: 3.4, ease: 'power3.inOut' }, 2.4)
    .add(heroIn(), 3.6)
    .add(() => {
      lenis.start()
      gsap.to('.hud', { opacity: 1, duration: 1.2 })
    }, 4.6)
}

function heroIn() {
  const tl = gsap.timeline()
  gsap.set('.s-hero > *', { opacity: 1 })
  const split = SplitText.create('.hero__line', { type: 'chars' })
  tl.from(split.chars, { yPercent: 110, rotateX: -90, opacity: 0, filter: 'blur(12px)', transformOrigin: '50% 100% -40px', stagger: 0.045, duration: 1.6, ease: 'expo.out' })
    .from('.hero__kicker', { y: 20, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.2)
    .from('.hero__sub', { y: 20, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.6)
    .from(['.hero__scroll', '.hero__hint'], { opacity: 0, duration: 1.5 }, 1)
  return tl
}

/* ───────────────────────── scroll choreography ───────────────────────── */
function buildScroll() {
  const s = world.state

  // HUD chapter + progress
  const chapNum = $('#chapNum'), chapName = $('#chapName')
  $$('[data-chapter]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        if (!self.isActive || chapName.dataset.t === sec.dataset.title) return
        chapName.dataset.t = sec.dataset.title
        gsap.to(chapNum, { duration: 0.6, scrambleText: { text: sec.dataset.chapter, chars: '0123456789', speed: 0.5 } })
        gsap.to(chapName, { duration: 0.9, scrambleText: { text: sec.dataset.title, chars: 'lowerCase', speed: 0.5 } })
      },
    })
  })
  const bar = $('#progressBar')
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => gsap.set(bar, { scaleY: self.progress }) })

  // 01 hero fades as you leave
  gsap.timeline({ scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__title', { yPercent: -60, opacity: 0, ease: 'none' }, 0)
    .to(['.hero__kicker', '.hero__sub', '.hero__scroll', '.hero__hint'], { opacity: 0, y: -40, ease: 'none' }, 0)

  // 02 origin — the particles morph: name → galaxy → heart → age
  const lines = $$('.origin__line')
  const splits = lines.map((l) => SplitText.create(l.querySelector('p'), { type: 'words', mask: 'words' }))
  const otl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.s-origin', start: 'top bottom', end: 'bottom bottom', scrub: true } })
  otl.to(s, { scrollMorph: 1, duration: 3 }, 0.6)
  const lineIn = (i, at) => {
    otl.set(lines[i], { opacity: 1 }, at)
    otl.fromTo(splits[i].words, { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.7, ease: 'power2.out' }, at)
  }
  const lineOut = (i, at) => otl.to(splits[i].words, { yPercent: -110, stagger: 0.03, duration: 0.5, ease: 'power2.in' }, at)
  lineIn(0, 2.7); lineOut(0, 4.4)
  otl.to(s, { scrollMorph: 2, duration: 2.2 }, 4.6)
  otl.to(s, { bloom: 1.6, duration: 1 }, 5.6)
  lineIn(1, 6.0); lineOut(1, 7.8)
  otl.to(s, { bloom: 1.1, duration: 1 }, 7.6)
  otl.to(s, { scrollMorph: 3, duration: 2.2 }, 8.0)
  lineIn(2, 9.4)
  otl.to({}, { duration: 1 }, 11)

  // 03 memories — fly the camera through the tunnel
  ScrollTrigger.create({
    trigger: '.s-memories', start: 'top bottom', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => (s.tunnel = self.progress),
  })
  gsap.timeline({ scrollTrigger: { trigger: '.s-memories', start: 'top bottom', end: 'top 40%', scrub: true } })
    .to(splits[2].words, { yPercent: -110, stagger: 0.03, ease: 'none' })
  const memSplit = SplitText.create('.mem__intro .big > span', { type: 'chars', mask: 'chars' })
  gsap.timeline({ scrollTrigger: { trigger: '.s-memories', start: 'top top', end: '16% top', scrub: true } })
    .from(memSplit.chars, { yPercent: 100, stagger: 0.02, ease: 'power2.out' })
    .from('.mem__intro .mono', { opacity: 0 }, 0)
    .to('.mem__intro', { scale: 2.4, opacity: 0, filter: 'blur(10px)', ease: 'power2.in', duration: 0.8 }, '+=0.3')
  ScrollTrigger.create({
    trigger: '.s-memories', start: '14% top', end: 'bottom bottom',
    onToggle: (self) => gsap.to(['.mem__caption', '.mem__speed'], { opacity: self.isActive ? 1 : 0, duration: 0.6 }),
  })

  // 04 reasons — horizontal gallery with velocity tilt
  const track = $('#reasonsTrack')
  const section = $('.s-reasons')
  const setH = () => (section.style.height = `${track.scrollWidth - innerWidth + innerHeight * 1.6}px`)
  setH()
  ScrollTrigger.addEventListener('refreshInit', setH)
  const cards = $$('.card', track)
  const rtl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: true } })
  rtl.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none' })
  gsap.to('.marquee__row:not(.marquee__row--rev) span', { xPercent: -50, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true } })
  gsap.fromTo('.marquee__row--rev span', { xPercent: -50 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true } })
  const headSplit = SplitText.create('.reasons__head .big > span', { type: 'chars', mask: 'chars' })
  gsap.from(headSplit.chars, { yPercent: 100, stagger: 0.02, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: section, start: 'top 40%' } })
  gsap.from(cards, { y: 220, opacity: 0, stagger: 0.08, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: section, start: 'top 30%' } })
  const tilt = cards.map((c) => ({ c, img: c.querySelector('img'), skew: gsap.quickTo(c, 'skewX', { duration: 0.8, ease: 'power3.out' }) }))
  ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: (self) => (inReasons = self.isActive) })
  // runs every frame (from frame()) so the skew relaxes once scrolling stops
  updateReasons = () => {
    const v = clamp(world.state.vel, -1, 1)
    tilt.forEach(({ skew, img, c }) => {
      skew(v * -7)
      const r = c.getBoundingClientRect()
      const k = (r.left + r.width / 2) / innerWidth - 0.5
      gsap.set(img, { xPercent: k * -12 })
    })
  }
  cards.forEach((c) => {
    const glare = c.querySelector('.card__glare')
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
      gsap.to(c, { rotateX: (0.5 - y) * 14, rotateY: (x - 0.5) * 14, duration: 0.6, ease: 'power3.out' })
      glare.style.setProperty('--gx', `${x * 100}%`)
      glare.style.setProperty('--gy', `${y * 100}%`)
    })
    c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, 0.5)' }))
    c.addEventListener('pointerenter', () => audio.hover())
  })

  // 05 numbers — live counters
  const birth = new Date(config.birthdate + 'T00:00:00')
  const counters = $$('[data-count]')
  const counterState = { p: 0 }
  const fmt = (n) => Math.floor(n).toLocaleString('en-US')
  liveCounters = () => {
    const ms = Date.now() - birth.getTime()
    const vals = { days: ms / 864e5, hours: ms / 36e5, beats: (ms / 6e4) * 72 }
    counters.forEach((el) => (el.textContent = fmt(vals[el.dataset.count] * counterState.p)))
  }
  gsap.to(counterState, { p: 1, duration: 3, ease: 'expo.out', scrollTrigger: { trigger: '.s-numbers', start: 'top 60%' } })
  gsap.from('.num', { y: 80, opacity: 0, stagger: 0.12, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.s-numbers', start: 'top 60%' } })

  // 05b moment — a heart-shaped window that swallows the screen
  const mask = $('.moment__mask')
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.s-moment', start: 'top top', end: 'bottom bottom', scrub: true } })
    .fromTo(mask, { '--s': 0.1, '--r': '-14deg' }, { '--s': 4.2, '--r': '0deg', ease: 'power2.in', duration: 1 })
    .to('.moment__text--a', { yPercent: -160, opacity: 0, duration: 0.6 }, 0.15)
    .to('.moment__text--b', { yPercent: 160, opacity: 0, duration: 0.6 }, 0.15)
    .to('.moment__cap', { opacity: 1, duration: 0.2 }, 0.75)
    .to({}, { duration: 0.4 })
  gsap.from(['.moment__text--a span', '.moment__text--b span'], { yPercent: 100, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.15, scrollTrigger: { trigger: '.s-moment', start: 'top 70%' } })
  ScrollTrigger.create({
    trigger: '.s-moment', start: 'top bottom', end: 'bottom top',
    onToggle: (self) => (self.isActive ? video.play().catch(() => {}) : video.pause()),
  })

  // 06 approach the cake
  ScrollTrigger.create({
    trigger: '.s-approach', start: 'top bottom', endTrigger: '.s-wish', end: 'top top', scrub: true,
    onUpdate: (self) => (s.cake = self.progress),
  })
  const wishSplit = SplitText.create('.wish__title > span', { type: 'chars', mask: 'chars' })
  gsap.from(wishSplit.chars, { yPercent: 100, stagger: 0.025, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.s-wish', start: 'top 30%' } })
  gsap.from(['.wish__sub', '.wish__controls', '.wish__meter'], { y: 30, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.s-wish', start: 'top 20%' } })
  ScrollTrigger.create({ trigger: '.s-wish', start: 'top 40%', end: 'bottom top', onToggle: (self) => (inWish = self.isActive) })

  // 07 letter
  const letterSplit = SplitText.create('.letter__body p', { type: 'words', wordsClass: 'w' })
  gsap.to(letterSplit.words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.letter__body', start: 'top 75%', end: 'bottom 45%', scrub: true } })
  const dearSplit = SplitText.create('.letter__dear', { type: 'chars', mask: 'chars' })
  gsap.from(dearSplit.chars, { yPercent: 100, stagger: 0.03, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.letter__dear', start: 'top 80%' } })
  gsap.to('.signature', { clipPath: 'inset(0 0% 0 0)', duration: 2.4, ease: 'power2.inOut', scrollTrigger: { trigger: '.letter__sign', start: 'top 80%' } })
  gsap.from('.replay', { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 85%' } })

  ScrollTrigger.refresh()
}

/* ───────────────────────── per-frame UI ───────────────────────── */
let liveCounters = null
let updateReasons = null
let inReasons = false
let memIdx = -2
const memText = $('#memText'), memMeta = $('#memMeta'), memIdxEl = $('#memIdx'), memSpeed = $('#memSpeed')

function setCaption(i) {
  const item = config.memories[i]
  const els = [memText, memMeta]
  gsap.killTweensOf(els)
  gsap.to(els, {
    opacity: 0, y: -14, duration: 0.25, ease: 'power2.in',
    onComplete: () => {
      if (!item) return
      memText.textContent = item.caption
      memMeta.textContent = item.meta
      memIdxEl.textContent = String(i + 1).padStart(2, '0')
      gsap.fromTo(els, { opacity: 0, y: 24, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.08, ease: 'expo.out' })
    },
  })
}

let inWish = false
let wished = false
let holding = false
let micLevel = null
let blowAcc = 0
let fwTimer = 0

function frame(dt) {
  if (!world) return
  const i = world.gallery.focusIndex(world.camZ)
  if (i !== memIdx && world.state.tunnel > 0.02) {
    memIdx = i
    if (i >= 0) setCaption(i)
  }
  memSpeed.style.setProperty('--v', Math.min(Math.abs(world.state.vel), 1).toFixed(3))
  liveCounters?.()
  if (inReasons) updateReasons?.()

  // ── the wish ──
  if (inWish && !wished) {
    let wind = 0
    if (holding) { blowAcc += dt * 0.42; wind = 1 }
    if (micLevel) {
      const l = micLevel()
      if (l > 0.08) { blowAcc += dt * l * 0.9; wind = Math.max(wind, l) }
    }
    world.cake.wind += (wind - world.cake.wind) * Math.min(1, dt * 8)
    blowAcc = Math.min(blowAcc, 1)
    const out = world.cake.blow(blowAcc)
    if (out) audio.whoosh(0.5, 0.12)
    gsap.set('#blowMeter', { scaleX: blowAcc })
    gsap.set('.btn__fill', { scaleX: blowAcc })
    if (world.cake.litCount === 0) wish()
  } else {
    world.cake.wind *= 0.9
  }
  if (wished && inWish) {
    fwTimer -= dt
    if (fwTimer < 0) {
      fwTimer = 1.4 + Math.random() * 1.6
      world.randomFirework()
      audio.pop(0.05)
    }
  }
}

function wish() {
  wished = true
  holding = false
  audio.stopListening()
  micLevel = null
  $('.s-wish').classList.add('is-wished')
  const delays = world.celebrate()
  delays.forEach((d) => audio.pop(d + 0.05))
  const songLen = audio.happyBirthday()
  confetti.fire(mobile ? 160 : 280)
  setTimeout(() => confetti.fire(mobile ? 120 : 200), 900)
  fwTimer = 4
  const s = world.state
  gsap.timeline()
    .to(s, { flash: 0.25, bloom: 1.7, duration: 0.15 })
    .to(s, { flash: 0, duration: 1.5, ease: 'power2.out' })
    .to(s, { bloom: 1.15, duration: 3 }, '<')
  const done = SplitText.create('.wish__done .huge > span', { type: 'chars' })
  gsap.set('.wish__done > *', { opacity: 1 })
  gsap.from(done.chars, { yPercent: 120, rotate: () => gsap.utils.random(-30, 30), opacity: 0, scale: 0.4, stagger: { each: 0.05, from: 'center' }, duration: 1.8, ease: 'elastic.out(1, 0.55)', delay: 0.4 })
  gsap.from('.wish__done .mono', { opacity: 0, y: 20, duration: 1.2, delay: Math.min(songLen, 3) })
}

/* ───────────────────────── input ───────────────────────── */
let dragging = false
let lastX = 0
window.addEventListener('pointermove', (e) => {
  world?.setMouse((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  if (dragging && world) {
    world.drag += (e.clientX - lastX) * 0.6
    lastX = e.clientX
  }
})
window.addEventListener('pointerdown', (e) => {
  if (!world || e.target.closest('button, a')) return
  if (world.camZ > 4 && world.state.bang > 0.95) {
    world.setMouse((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
    world.shock()
    audio.chime()
  }
  if (inWish) { dragging = true; lastX = e.clientX }
})
window.addEventListener('pointerup', () => (dragging = false))

const holdBtn = $('#holdBtn')
const startHold = (e) => { e.preventDefault(); holding = true; audio.init() }
const endHold = () => (holding = false)
holdBtn.addEventListener('pointerdown', startHold)
holdBtn.addEventListener('pointerup', endHold)
holdBtn.addEventListener('pointerleave', endHold)
holdBtn.addEventListener('pointercancel', endHold)
holdBtn.addEventListener('contextmenu', (e) => e.preventDefault())
window.addEventListener('keydown', (e) => { if (e.code === 'Space' && inWish) { e.preventDefault(); holding = true } })
window.addEventListener('keyup', (e) => { if (e.code === 'Space') holding = false })

const micBtn = $('#micBtn')
micBtn.addEventListener('click', async () => {
  const label = micBtn.querySelector('.btn__label')
  if (micLevel) {
    audio.stopListening(); micLevel = null
    micBtn.classList.remove('is-on'); label.textContent = '🎙 use my breath'
    return
  }
  try {
    label.textContent = 'listening…'
    micLevel = await audio.listen()
    micBtn.classList.add('is-on'); label.textContent = 'blow now ✦'
  } catch {
    label.textContent = 'mic blocked — hold instead'
  }
})

const soundBtn = $('#sound')
soundBtn.addEventListener('click', () => {
  audio.setMuted(!audio.muted)
  soundBtn.classList.toggle('is-muted', audio.muted)
  $('#soundLabel').textContent = audio.muted ? 'sound off' : 'sound on'
})
document.addEventListener('visibilitychange', () => {
  if (!audio.ctx) return
  document.hidden ? audio.ctx.suspend() : audio.ctx.resume()
})

$('.hud__logo').addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(0, { duration: 4, easing: (t) => 1 - Math.pow(1 - t, 4) }) })
$('#replay').addEventListener('click', () => {
  audio.whoosh(3, 0.3)
  lenis.scrollTo(0, {
    duration: 5,
    easing: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
    onComplete: () => {
      wished = false
      blowAcc = 0
      world.cake.relight()
      $('.s-wish').classList.remove('is-wished')
      gsap.set('.wish__done > *', { opacity: 0 })
      const s = world.state
      s.bang = 0; s.introMorph = 1
      audio.boom()
      gsap.timeline()
        .to(s, { bang: 1, duration: 3.2, ease: 'power3.out' })
        .to(s, { introMorph: 0, duration: 3.4, ease: 'power3.inOut' }, 1.8)
    },
  })
})

boot()
