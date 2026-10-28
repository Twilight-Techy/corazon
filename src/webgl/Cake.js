import * as THREE from 'three'
import { snoise } from './noise.js'

const flameVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const flameFrag = /* glsl */ `
  uniform float uTime, uSeed, uLife, uWind;
  varying vec2 vUv;
  ${snoise}
  void main() {
    vec2 uv = vUv - vec2(0.5, 0.22);
    float n = snoise(vec3(uv.y * 4.0 - uTime * 5.0, uSeed, uTime * 0.7));
    float lean = uWind * 0.35 + (n * 0.08 + sin(uTime * 13.0 + uSeed) * 0.015) * (1.0 + uWind * 3.0);
    uv.x -= lean * max(uv.y, 0.0) * 1.6;
    float h = clamp(uv.y / (0.72 - uWind * 0.3), 0.0, 1.0);
    float w = mix(0.2, 0.015, pow(h, 0.8));
    if (uv.y < 0.0) w *= sqrt(max(0.0, 1.0 - pow(uv.y / 0.17, 2.0)));
    float d = abs(uv.x) / max(w, 1e-3);
    float body = smoothstep(1.0, 0.25, d) * smoothstep(0.78, 0.35, uv.y) * smoothstep(-0.2, -0.04, uv.y);
    float core = smoothstep(0.6, 0.0, d) * smoothstep(0.4, 0.04, uv.y) * smoothstep(-0.13, 0.02, uv.y);
    vec3 col = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.93, 0.72), core);
    col += vec3(0.25, 0.35, 1.0) * smoothstep(0.04, -0.12, uv.y) * body * 0.8;
    float a = clamp(body + core, 0.0, 1.0) * uLife;
    gl_FragColor = vec4(col * 2.6, a);
  }
`
const haloFrag = /* glsl */ `
  uniform float uLife, uTime, uSeed;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 2.5) * uLife * (0.85 + 0.15 * sin(uTime * 17.0 + uSeed));
    gl_FragColor = vec4(vec3(1.0, 0.6, 0.3) * 0.45, a);
  }
`

function stripeTexture() {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = '#fff6f0'
  g.fillRect(0, 0, 64, 256)
  g.fillStyle = '#ff6f9b'
  for (let i = -4; i < 12; i++) {
    g.beginPath()
    g.moveTo(0, i * 32); g.lineTo(64, i * 32 - 40); g.lineTo(64, i * 32 - 26); g.lineTo(0, i * 32 + 14)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function dripGeometry(radius, seed) {
  const g = new THREE.CylinderGeometry(radius, radius, 1, 160, 14, true)
  g.translate(0, -0.5, 0) // top at y = 0
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const th = Math.atan2(z, x)
    const v = -y // 0 at top → 1 at bottom
    const len = 0.07
      + 0.36 * Math.pow(0.5 + 0.5 * Math.sin(th * 6 + seed + Math.sin(th * 3 + seed) * 1.2), 7)
      + 0.14 * Math.pow(0.5 + 0.5 * Math.sin(th * 13 + seed * 2), 10)
    const r = radius + 0.018 + v * 0.012 + Math.pow(v, 6) * 0.02
    pos.setXYZ(i, Math.cos(th) * r, -v * len, Math.sin(th) * r)
  }
  g.computeVertexNormals()
  return g
}

function heartShape() {
  const s = new THREE.Shape()
  s.moveTo(0, -0.5)
  s.bezierCurveTo(-0.15, -0.35, -0.6, -0.1, -0.6, 0.22)
  s.bezierCurveTo(-0.6, 0.5, -0.32, 0.62, -0.18, 0.62)
  s.bezierCurveTo(-0.06, 0.62, 0, 0.52, 0, 0.42)
  s.bezierCurveTo(0, 0.52, 0.06, 0.62, 0.18, 0.62)
  s.bezierCurveTo(0.32, 0.62, 0.6, 0.5, 0.6, 0.22)
  s.bezierCurveTo(0.6, -0.1, 0.15, -0.35, 0, -0.5)
  return s
}

export class Cake {
  constructor({ candles = 7 } = {}) {
    this.group = new THREE.Group()
    this.cake = new THREE.Group()
    this.group.add(this.cake)
    this.time = 0
    this.wind = 0

    const sponge = new THREE.MeshPhysicalMaterial({ color: '#f9c9d6', roughness: 0.55, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.5 })
    const sponge2 = new THREE.MeshPhysicalMaterial({ color: '#fff1e6', roughness: 0.6, sheen: 1, sheenColor: '#ffd6e3', sheenRoughness: 0.5 })
    const glaze = new THREE.MeshPhysicalMaterial({ color: '#ff3d7f', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 })
    const cream = new THREE.MeshPhysicalMaterial({ color: '#fff4ec', roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2 })
    const gold = new THREE.MeshStandardMaterial({ color: '#f1c48f', metalness: 1, roughness: 0.22 })
    const pearl = new THREE.MeshPhysicalMaterial({ color: '#fff2e0', roughness: 0.15, metalness: 0.3, iridescence: 1, iridescenceIOR: 1.6 })

    // plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.0, 0.12, 96), gold)
    plate.position.y = 0.06
    this.cake.add(plate)
    const plateRim = new THREE.Mesh(new THREE.TorusGeometry(2.24, 0.03, 12, 128), gold)
    plateRim.rotation.x = Math.PI / 2
    plateRim.position.y = 0.12
    this.cake.add(plateRim)

    const tiers = [
      { r: 1.55, h: 1.0, mat: sponge, glaze },
      { r: 1.05, h: 0.78, mat: sponge2, glaze: cream },
    ]
    let y = 0.12
    this.topY = 0
    tiers.forEach((t, idx) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r, t.h, 96), t.mat)
      body.position.y = y + t.h / 2
      this.cake.add(body)
      const top = y + t.h
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(t.r + 0.03, t.r + 0.03, 0.07, 96), t.glaze)
      cap.position.y = top + 0.015
      this.cake.add(cap)
      const drip = new THREE.Mesh(dripGeometry(t.r, idx * 2.3 + 0.7), t.glaze)
      drip.position.y = top + 0.02
      this.cake.add(drip)
      // pearls around the base
      const n = Math.floor((Math.PI * 2 * t.r) / 0.11)
      const pearls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 16, 12), pearl, n)
      const m = new THREE.Matrix4()
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        m.makeTranslation(Math.cos(a) * (t.r + 0.03), y + 0.05, Math.sin(a) * (t.r + 0.03))
        pearls.setMatrixAt(i, m)
      }
      this.cake.add(pearls)
      y = top + 0.05
    })
    this.topY = y

    // sprinkles
    const sprinkleColors = ['#ffffff', '#ffd166', '#9b7bff', '#7be0ff', '#ff8fb1', '#f6d6b0'].map((c) => new THREE.Color(c))
    const sprN = 320
    const spr = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.055, 2, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), sprN)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (let i = 0; i < sprN; i++) {
      const onTop = i < sprN * 0.45
      const r = onTop ? Math.sqrt(Math.random()) * 0.95 : 1.1 + Math.random() * 0.42
      const a = Math.random() * Math.PI * 2
      const sy = onTop ? this.topY + 0.005 : 1.12 + 0.07
      e.set(Math.PI / 2, 0, Math.random() * Math.PI)
      q.setFromEuler(e)
      m.compose(new THREE.Vector3(Math.cos(a) * r, sy, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1))
      spr.setMatrixAt(i, m)
      spr.setColorAt(i, sprinkleColors[i % sprinkleColors.length])
    }
    this.cake.add(spr)

    // gold heart topper
    const hg = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 6, curveSegments: 32 })
    hg.center()
    this.topper = new THREE.Mesh(hg, gold)
    this.topper.scale.setScalar(0.62)
    this.topper.position.set(0, this.topY + 0.62, 0)
    this.cake.add(this.topper)
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), gold)
    stick.position.set(0, this.topY + 0.2, 0)
    this.cake.add(stick)

    // candles
    const stripes = stripeTexture()
    const candleMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 })
    const candleGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.52, 20)
    const wickGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.07, 6)
    const wickMat = new THREE.MeshBasicMaterial({ color: '#1a1012' })
    const planeGeo = new THREE.PlaneGeometry(1, 1)
    this.candles = []
    for (let i = 0; i < candles; i++) {
      const a = (i / candles) * Math.PI * 2 + 0.2
      const r = 0.72
      const c = new THREE.Group()
      c.position.set(Math.cos(a) * r, this.topY, Math.sin(a) * r)
      const body = new THREE.Mesh(candleGeo, candleMat)
      body.position.y = 0.26
      c.add(body)
      const wick = new THREE.Mesh(wickGeo, wickMat)
      wick.position.y = 0.55
      c.add(wick)

      const uni = { uTime: { value: 0 }, uSeed: { value: Math.random() * 100 }, uLife: { value: 1 }, uWind: { value: 0 } }
      const flame = new THREE.Mesh(planeGeo, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: flameVert, fragmentShader: flameFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
      flame.scale.set(0.16, 0.34, 1)
      flame.position.y = 0.66
      c.add(flame)
      const halo = new THREE.Mesh(planeGeo, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: flameVert, fragmentShader: haloFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
      halo.scale.setScalar(0.7)
      halo.position.y = 0.66
      c.add(halo)
      this.cake.add(c)
      this.candles.push({ group: c, flame, halo, uni, lit: true, threshold: 0.25 + (i / candles) * 0.65 + Math.random() * 0.08 })
    }

    // lights
    this.flameLight = new THREE.PointLight('#ffb070', 6, 7, 1.6)
    this.flameLight.position.set(0, this.topY + 0.9, 0)
    this.cake.add(this.flameLight)
    const key = new THREE.SpotLight('#ffd9e6', 22, 25, 0.5, 0.6, 1.4)
    key.position.set(3, 7, 5)
    key.target = this.cake
    this.group.add(key)
    const rim = new THREE.PointLight('#9b7bff', 7, 14, 1.4)
    rim.position.set(-3.5, 2.5, -3)
    this.group.add(rim)
    const rim2 = new THREE.PointLight('#ff3d7f', 6, 14, 1.4)
    rim2.position.set(3.5, 1.5, -2.5)
    this.group.add(rim2)
    this.group.add(new THREE.HemisphereLight('#ffe3ec', '#1a0613', 0.35))

    // floor glow
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uLit: { value: 1 } },
        vertexShader: flameVert,
        fragmentShader: /* glsl */ `
          uniform float uLit; varying vec2 vUv;
          void main() { float d = length(vUv - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 2.2);
            gl_FragColor = vec4(mix(vec3(1.0, 0.24, 0.5), vec3(1.0, 0.6, 0.3), uLit * 0.5) * 0.22, a); }
        `,
      })
    )
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.0
    this.glow = glow
    this.group.add(glow)

    this.#initSmoke()
    this.#initDust()
  }

  #initSmoke() {
    const N = 900
    this.smokeN = N
    this.smokeI = 0
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aBirth', new THREE.BufferAttribute(new Float32Array(N).fill(-99), 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(new Float32Array(N).map(() => Math.random()), 1))
    this.smokeUni = { uTime: { value: 0 }, uPixelRatio: { value: 1 } }
    const mat = new THREE.ShaderMaterial({
      uniforms: this.smokeUni, transparent: true, depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uTime, uPixelRatio;
        attribute float aBirth, aRand;
        varying float vA;
        ${snoise}
        void main() {
          float age = uTime - aBirth;
          vec3 p = position;
          p.y += age * (0.35 + aRand * 0.3);
          p.x += snoise(vec3(aRand * 10.0, age * 0.8, 0.0)) * age * 0.25;
          p.z += snoise(vec3(aRand * 10.0 + 5.0, age * 0.8, 1.0)) * age * 0.25;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float life = clamp(age / 3.5, 0.0, 1.0);
          gl_PointSize = (20.0 + life * 120.0) * uPixelRatio / -mv.z;
          vA = (age < 0.0 ? 0.0 : 1.0) * smoothstep(0.0, 0.1, life) * (1.0 - life) * 0.32;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(0.78, 0.72, 0.76), a * a * vA); }
      `,
    })
    this.smoke = new THREE.Points(g, mat)
    this.smoke.frustumCulled = false
    this.cake.add(this.smoke)
  }

  #initDust() {
    const N = 500
    const p = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 1.5 + Math.random() * 6
      p.set([Math.cos(a) * r, Math.random() * 6 - 0.5, Math.sin(a) * r - 1], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    this.dustUni = { uTime: { value: 0 }, uPixelRatio: { value: 1 } }
    this.dust = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.dustUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uPixelRatio; varying float vA;
        void main() {
          vec3 p = position;
          float s = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
          p.y += sin(uTime * 0.4 + s * 20.0) * 0.3;
          p.x += cos(uTime * 0.3 + s * 10.0) * 0.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (4.0 + s * 10.0) * uPixelRatio / -mv.z * 6.0;
          vA = (0.4 + 0.6 * sin(uTime * 2.0 + s * 30.0)) * 0.8;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(1.0, 0.8, 0.55, a * a * vA); }
      `,
    }))
    this.dust.frustumCulled = false
    this.group.add(this.dust)
  }

  #puff(candle) {
    const pos = this.smoke.geometry.attributes.position
    const birth = this.smoke.geometry.attributes.aBirth
    const base = candle.group.position
    for (let i = 0; i < 70; i++) {
      const k = this.smokeI++ % this.smokeN
      pos.setXYZ(k, base.x + (Math.random() - 0.5) * 0.05, base.y + 0.62, base.z + (Math.random() - 0.5) * 0.05)
      birth.setX(k, this.time + i * 0.02)
    }
    pos.needsUpdate = true
    birth.needsUpdate = true
  }

  get litCount() { return this.candles.filter((c) => c.lit).length }

  // amount: accumulated blow 0..1 ; returns number of candles that went out this call
  blow(amount) {
    let out = 0
    this.candles.forEach((c) => {
      if (c.lit && amount >= c.threshold) {
        c.lit = false
        out++
        this.#puff(c)
      }
    })
    return out
  }

  relight() {
    this.candles.forEach((c) => { c.lit = true })
  }

  update(dt, camera, drag) {
    this.time += dt
    this.smokeUni.uTime.value = this.time
    this.dustUni.uTime.value = this.time
    this.cake.rotation.y += dt * 0.12 + drag
    this.topper.rotation.y = Math.sin(this.time * 0.8) * 0.5
    this.topper.position.y = this.topY + 0.62 + Math.sin(this.time * 1.6) * 0.03
    let lit = 0
    this.candles.forEach((c) => {
      c.uni.uTime.value = this.time
      c.uni.uWind.value = this.wind * (0.6 + Math.sin(this.time * 9 + c.uni.uSeed.value) * 0.4)
      c.uni.uLife.value += ((c.lit ? 1 : 0) - c.uni.uLife.value) * Math.min(1, dt * (c.lit ? 3 : 10))
      lit += c.uni.uLife.value
      // billboard flames toward camera (around y only)
      const wp = c.flame.getWorldPosition(_v)
      const ang = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z)
      const parentRot = this.cake.rotation.y
      c.flame.rotation.y = ang - parentRot
      c.halo.quaternion.copy(camera.quaternion)
      c.halo.quaternion.premultiply(_q.setFromEuler(_e.set(0, -parentRot, 0)))
    })
    const n = this.candles.length
    this.flameLight.intensity = (lit / n) * (2.6 + Math.sin(this.time * 20) * 0.6 + Math.sin(this.time * 7.3) * 0.8)
    this.glow.material.uniforms.uLit.value = lit / n
  }
}

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
