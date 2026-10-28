import gsap from 'gsap'

const LABELS = { enter: 'enter', top: 'top', sound: 'sound', hold: 'hold', mic: 'breathe', again: 'again', drag: 'drag' }

export function initCursor({ onHover } = {}) {
  const root = document.querySelector('.cursor')
  if (!root || matchMedia('(hover: none)').matches) return { setLabel() {} }
  const dot = root.querySelector('.cursor__dot')
  const ring = root.querySelector('.cursor__ring')
  const label = root.querySelector('.cursor__label')
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }
  const ringPos = { ...pos }
  const dotX = gsap.quickSetter(dot, 'x', 'px'), dotY = gsap.quickSetter(dot, 'y', 'px')
  const ringX = gsap.quickSetter(ring, 'x', 'px'), ringY = gsap.quickSetter(ring, 'y', 'px')
  let last = 0
  const glyphs = ['✦', '✧', '♥', '·', '✶']

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY
    const now = performance.now()
    if (now - last > 45) { last = now; spark(e.clientX, e.clientY) }
  })
  window.addEventListener('pointerdown', () => root.classList.add('is-down'))
  window.addEventListener('pointerup', () => root.classList.remove('is-down'))

  gsap.ticker.add(() => {
    ringPos.x += (pos.x - ringPos.x) * 0.16
    ringPos.y += (pos.y - ringPos.y) * 0.16
    dotX(pos.x); dotY(pos.y)
    ringX(ringPos.x); ringY(ringPos.y)
  })

  const pool = []
  function spark(x, y) {
    let el = pool.pop()
    if (!el) { el = document.createElement('span'); el.className = 'spark'; document.body.appendChild(el) }
    el.textContent = glyphs[(Math.random() * glyphs.length) | 0]
    const hue = Math.random() < 0.5 ? '#ff8fb1' : '#f6d6b0'
    gsap.fromTo(el, { x, y, opacity: 1, scale: 0.4 + Math.random() * 0.8, rotate: 0, color: hue },
      { x: x + (Math.random() - 0.5) * 60, y: y + 20 + Math.random() * 50, opacity: 0, rotate: (Math.random() - 0.5) * 180, scale: 0, duration: 0.9 + Math.random() * 0.6, ease: 'power2.out', onComplete: () => pool.push(el) })
  }

  function bind() {
    document.querySelectorAll('[data-cursor]').forEach((el) => {
      if (el.__cursor) return
      el.__cursor = true
      el.addEventListener('pointerenter', () => {
        root.classList.add('is-hover')
        label.textContent = LABELS[el.dataset.cursor] || el.dataset.cursor
        onHover?.()
      })
      el.addEventListener('pointerleave', () => root.classList.remove('is-hover'))
    })
    // magnetic elements
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      if (el.__mag) return
      el.__mag = true
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect()
        xTo((e.clientX - (r.left + r.width / 2)) * 0.35)
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35)
      })
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0) })
    })
  }
  bind()
  return { bind, spark }
}
