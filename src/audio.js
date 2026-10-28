// Everything you hear is synthesised live — no audio files.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12)
const M = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, C3: 48, F3: 53, G3: 55, A3: 57, E3: 52, D3: 50 }

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.muted = false
  }

  init() {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = (this.ctx = new AC())
    this.master = ctx.createGain()
    this.master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3
    this.master.connect(comp).connect(ctx.destination)
    this.master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2)

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.#impulse(4.2, 2.4)
    this.wet = ctx.createGain()
    this.wet.gain.value = 0.55
    this.reverb.connect(this.wet).connect(this.master)

    this.bus = ctx.createGain() // dry bus feeding both
    this.bus.connect(this.master)
    this.bus.connect(this.reverb)
  }

  #impulse(seconds, decay) {
    const ctx = this.ctx
    const len = ctx.sampleRate * seconds
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return buf
  }

  #noise(seconds = 2) {
    const ctx = this.ctx
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  setMuted(m) {
    this.muted = m
    if (!this.ctx) return
    const g = this.master.gain
    g.cancelScheduledValues(this.ctx.currentTime)
    g.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.25)
  }

  // ── ambient pad: slow, warm chords in C ──
  startAmbient() {
    if (!this.ctx || this.ambientOn) return
    this.ambientOn = true
    // Cmaj7 – Am9 – Fmaj7 – G6 (midi numbers)
    const chords = [
      [48, 64, 67, 71],
      [57, 64, 67, 72],
      [53, 64, 69, 72],
      [55, 62, 71, 74],
    ]
    this.padGain = this.ctx.createGain()
    this.padGain.gain.value = 0.11
    this.lp = this.ctx.createBiquadFilter()
    this.lp.type = 'lowpass'
    this.lp.frequency.value = 900
    this.lp.Q.value = 0.6
    const lfo = this.ctx.createOscillator()
    const lfoG = this.ctx.createGain()
    lfo.frequency.value = 0.07
    lfoG.gain.value = 500
    lfo.connect(lfoG).connect(this.lp.frequency)
    lfo.start()
    this.padGain.connect(this.lp).connect(this.bus)

    let i = 0
    const dur = 9
    const play = () => {
      if (!this.ambientOn) return
      const t = this.ctx.currentTime + 0.05
      chords[i % chords.length].forEach((n, k) => this.#padNote(NOTE(n), t, dur + 3, k === 0 ? 0.7 : 0.45))
      i++
      this.padTimer = setTimeout(play, dur * 1000)
    }
    play()

    // a music-box twinkle every now and then
    const scale = [M.C5, M.D5, M.E5, M.G5, M.A5, M.C5 + 12, M.E5 + 12]
    const twinkle = () => {
      if (!this.ambientOn) return
      const n = scale[(Math.random() * scale.length) | 0]
      this.bell(NOTE(n), this.ctx.currentTime, 0.035, 2.5)
      this.twTimer = setTimeout(twinkle, 1400 + Math.random() * 3200)
    }
    this.twTimer = setTimeout(twinkle, 2500)
  }

  #padNote(freq, t, dur, vol) {
    const ctx = this.ctx
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 3)
    g.gain.setValueAtTime(vol, t + dur - 4)
    g.gain.linearRampToValueAtTime(0, t + dur)
    g.connect(this.padGain)
    ;[-7, 7, 0].forEach((cents, k) => {
      const o = ctx.createOscillator()
      o.type = k === 2 ? 'sine' : 'sawtooth'
      o.frequency.value = freq * (k === 2 ? 0.5 : 1)
      o.detune.value = cents
      const og = ctx.createGain()
      og.gain.value = k === 2 ? 0.8 : 0.22
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + dur + 0.1)
    })
  }

  // ── one-shots ──
  bell(freq, t = this.ctx?.currentTime, vol = 0.08, decay = 1.8) {
    if (!this.ctx) return
    const ctx = this.ctx
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    g.connect(this.bus)
    ;[1, 2.01, 3.98, 5.4].forEach((h, k) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * h
      const og = ctx.createGain()
      og.gain.value = [1, 0.35, 0.12, 0.05][k]
      og.gain.setValueAtTime([1, 0.35, 0.12, 0.05][k], t)
      og.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + k))
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + decay + 0.05)
    })
  }

  hover() {
    if (!this.ctx) return
    const n = [M.E5, M.G5, M.A5, M.C5 + 12][(Math.random() * 4) | 0]
    this.bell(NOTE(n), this.ctx.currentTime, 0.03, 0.9)
  }

  chime() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    ;[M.C5, M.E5, M.G5, M.C5 + 12].forEach((n, i) => this.bell(NOTE(n), t + i * 0.06, 0.05, 2.2))
  }

  whoosh(dur = 1.6, vol = 0.25) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.#noise(dur + 0.2)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(200, t)
    bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.6)
    bp.frequency.exponentialRampToValueAtTime(400, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.5)
    g.gain.linearRampToValueAtTime(0, t + dur)
    src.connect(bp).connect(g).connect(this.bus)
    src.start(t)
  }

  boom() {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(110, t)
    o.frequency.exponentialRampToValueAtTime(28, t + 2.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
    o.connect(g).connect(this.bus)
    o.start(t)
    o.stop(t + 2.7)
    this.whoosh(2.4, 0.35)
    this.chime()
  }

  pop(delay = 0) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource()
    src.buffer = this.#noise(1.6)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(2200, t)
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.6)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0)
    src.connect(lp).connect(g).connect(this.bus)
    src.start(t)
    // crackle tail
    for (let i = 0; i < 14; i++) {
      const ct = t + 0.25 + Math.random() * 1.2
      const c = ctx.createBufferSource()
      c.buffer = this.#noise(0.05)
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3000
      const cg = ctx.createGain()
      cg.gain.setValueAtTime(0.08 * Math.random(), ct)
      cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.04)
      c.connect(hp).connect(cg).connect(this.bus)
      c.start(ct)
    }
  }

  // ── the song (public domain melody), as a music box ──
  happyBirthday() {
    if (!this.ctx) return 0
    const beat = 0.42
    const mel = [
      ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
      ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
      ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 1],
      ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3],
    ]
    // one bass note per bar (3/4, after a one-beat pickup)
    const bass = ['C3', 'G3', 'G3', 'C3', 'C3', 'F3', 'G3', 'C3']
    let t = this.ctx.currentTime + 0.3
    const start = t
    mel.forEach(([n, d]) => { this.bell(NOTE(M[n] + 12), t, 0.075, 2.2); t += d * beat })
    bass.forEach((n, i) => {
      const bt = start + (1 + i * 3) * beat
      this.bell(NOTE(M[n] + 12), bt, 0.05, 2.8)
      this.bell(NOTE(M[n] + 19), bt + beat, 0.02, 1.2)
    })
    return t - start
  }

  // ── microphone: returns a function giving 0..1 blow strength ──
  async listen() {
    this.init()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    const src = this.ctx.createMediaStreamSource(stream)
    const an = this.ctx.createAnalyser()
    an.fftSize = 1024
    src.connect(an)
    const buf = new Uint8Array(an.frequencyBinCount)
    this.stream = stream
    return () => {
      an.getByteFrequencyData(buf)
      // breath is loud broadband noise concentrated in the low/mid bins
      let low = 0
      const n = 40
      for (let i = 1; i < n; i++) low += buf[i]
      low /= n * 255
      return Math.max(0, Math.min(1, (low - 0.32) / 0.3))
    }
  }

  stopListening() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }
}
