// Point-cloud generators. Each returns a Float32Array of xyz * count.

const rand = (a = 0, b = 1) => a + Math.random() * (b - a)
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5

export function galaxy(count) {
  const out = new Float32Array(count * 3)
  const arms = 3
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 1.7) * 7 + 0.15
    const branch = ((i % arms) / arms) * Math.PI * 2
    const spin = r * 0.85
    const spread = 0.55 * r * 0.35 + 0.1
    const ox = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread * 2.2
    const oy = gauss() * spread * 0.35
    const oz = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread * 2.2
    out[i * 3] = Math.cos(branch + spin) * r + ox
    out[i * 3 + 1] = oy
    out[i * 3 + 2] = Math.sin(branch + spin) * r + oz
  }
  return out
}

export function heart(count, size = 3.6) {
  // outline polyline, sampled by arc length so the tips don't clump
  const N = 180
  const poly = []
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2
    poly.push([16 * Math.pow(Math.sin(t), 3), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)])
  }
  const cum = [0]
  for (let i = 1; i <= N; i++) {
    const a = poly[i - 1], b = poly[i % N]
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const total = cum[N]
  const inside = (x, y) => {
    let c = false
    for (let i = 0, j = N - 1; i < N; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
    }
    return c
  }
  // rasterise the inside test once so interior sampling is O(1)
  const G = 128
  const mask = new Uint8Array(G * G)
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) mask[gy * G + gx] = inside(-16 + ((gx + 0.5) / G) * 32, -17 + ((gy + 0.5) / G) * 29)
  const isIn = (x, y) => mask[Math.min(G - 1, ((y + 17) / 29) * G | 0) * G + Math.min(G - 1, ((x + 16) / 32) * G | 0)]
  const out = new Float32Array(count * 3)
  const s = size / 32
  for (let i = 0; i < count; i++) {
    let x, y, edge
    if (Math.random() < 0.5) {
      const d = Math.random() * total
      let lo = 0, hi = N
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; cum[mid] <= d ? (lo = mid) : (hi = mid) }
      const a = poly[lo], b = poly[(lo + 1) % N]
      const f = (d - cum[lo]) / (cum[lo + 1] - cum[lo] || 1)
      x = a[0] + (b[0] - a[0]) * f + gauss() * 0.25
      y = a[1] + (b[1] - a[1]) * f + gauss() * 0.25
      edge = 1
    } else {
      do { x = rand(-16, 16); y = rand(-17, 12) } while (!isIn(x, y))
      edge = 0
    }
    // puffy: thicker in the middle of the heart
    const r = Math.min(1, Math.hypot(x / 16, (y + 2) / 15))
    out[i * 3] = x * s
    out[i * 3 + 1] = (y + 2.5) * s
    out[i * 3 + 2] = gauss() * (edge ? 0.08 : 0.08 + Math.sqrt(1 - r * r) * 0.8)
  }
  return out
}

// Rasterise text to a canvas and scatter `count` points over its pixels.
// Returns { points, width } where width is the world width at the given height.
export function textPoints(text, count, { height = 3, font = 'Fraunces', weight = 300, italic = true, offsetY = 0 } = {}) {
  const fontPx = 260
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d', { willReadFrequently: true })
  const fontStr = `${italic ? 'italic ' : ''}${weight} ${fontPx}px "${font}", serif`
  ctx.font = fontStr
  const m = ctx.measureText(text)
  const pad = 40
  c.width = Math.ceil(m.width + pad * 2)
  c.height = Math.ceil(fontPx * 1.35)
  ctx.font = fontStr
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, c.width / 2, c.height / 2)

  const { data } = ctx.getImageData(0, 0, c.width, c.height)
  const pix = []
  const step = 2
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      if (data[(y * c.width + x) * 4 + 3] > 128) pix.push(x, y)
    }
  }
  const scale = height / c.height
  const out = new Float32Array(count * 3)
  const n = pix.length / 2
  for (let i = 0; i < count; i++) {
    const j = n ? (Math.random() * n) | 0 : 0
    const px = n ? pix[j * 2] + rand(-step, step) * 0.5 : 0
    const py = n ? pix[j * 2 + 1] + rand(-step, step) * 0.5 : 0
    out[i * 3] = (px - c.width / 2) * scale
    out[i * 3 + 1] = -(py - c.height / 2) * scale + offsetY
    out[i * 3 + 2] = gauss() * 0.12
  }
  return { points: out, width: c.width * scale }
}
