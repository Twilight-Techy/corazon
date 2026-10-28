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
  const out = new Float32Array(count * 3)
  const s = size / 32
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2
    // most points hug the outline so the shape reads clearly
    const k = Math.random() < 0.55 ? 1 - Math.random() * 0.04 : Math.sqrt(Math.random())
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    const puff = Math.sqrt(Math.max(0, 1 - k * k))
    out[i * 3] = x * k * s
    out[i * 3 + 1] = (y * k + 2.5) * s
    out[i * 3 + 2] = gauss() * (0.08 + puff * 0.9)
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
