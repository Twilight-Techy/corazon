// Lightweight 2D confetti with flutter + gravity.
const COLORS = ['#ff3d7f', '#ff8fb1', '#f6d6b0', '#ffd166', '#9b7bff', '#ffffff', '#7be0ff']

export class Confetti {
  constructor(canvas) {
    this.c = canvas
    this.g = canvas.getContext('2d')
    this.pieces = []
    this.running = false
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  resize() {
    this.dpr = Math.min(devicePixelRatio, 2)
    this.c.width = innerWidth * this.dpr
    this.c.height = innerHeight * this.dpr
  }

  fire(count = 260) {
    const w = innerWidth, h = innerHeight
    for (let i = 0; i < count; i++) {
      const left = i % 2 === 0
      const ang = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7
      const sp = 12 + Math.random() * 14
      this.pieces.push({
        x: left ? -10 : w + 10, y: h * 0.85,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        flip: Math.random() * Math.PI, vf: 0.08 + Math.random() * 0.15,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        heart: Math.random() < 0.18,
        life: 0,
      })
    }
    if (!this.running) { this.running = true; this.#loop() }
  }

  #loop = () => {
    const { g, dpr } = this
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, this.c.width, this.c.height)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const h = innerHeight
    this.pieces = this.pieces.filter((p) => p.y < h + 40 && p.life < 600)
    for (const p of this.pieces) {
      p.life++
      p.vx *= 0.985
      p.vy = p.vy * 0.985 + 0.28
      p.x += p.vx + Math.sin(p.life * 0.05 + p.flip) * 0.6
      p.y += p.vy
      p.rot += p.vr
      p.flip += p.vf
      g.save()
      g.translate(p.x, p.y)
      g.rotate(p.rot)
      g.scale(1, Math.cos(p.flip))
      g.fillStyle = p.color
      if (p.heart) {
        const s = p.w * 0.12
        g.beginPath()
        g.moveTo(0, 3 * s)
        g.bezierCurveTo(-6 * s, -1 * s, -3 * s, -6 * s, 0, -3 * s)
        g.bezierCurveTo(3 * s, -6 * s, 6 * s, -1 * s, 0, 3 * s)
        g.fill()
      } else {
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      }
      g.restore()
    }
    if (this.pieces.length) requestAnimationFrame(this.#loop)
    else { this.running = false; g.clearRect(0, 0, this.c.width, this.c.height) }
  }
}
