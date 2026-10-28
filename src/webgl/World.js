import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Particles } from './Particles.js'
import { Space } from './Space.js'
import { Gallery } from './Gallery.js'
import { Cake } from './Cake.js'
import { Fireworks } from './Fireworks.js'
import { FinalShader } from './FinalPass.js'
import { pathAt, TUNNEL_START, TUNNEL_END, CAKE_POS } from './path.js'

const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export class World {
  constructor(canvas, { config, manager, mobile }) {
    this.mobile = mobile
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false })
    this.renderer.setClearColor('#060309', 1)
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.dpr = Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75)

    this.scene = new THREE.Scene()
    this.scene.fog = null
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.3

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 400)
    this.camera.position.set(0, 0, 4)

    // ── public state, driven by scroll / timeline ──
    this.state = {
      bang: 0, introMorph: 1, scrollMorph: 0, alpha: 1,
      introZ: -6, tunnel: 0, cake: 0, vel: 0,
      bloom: 1.1, flash: 0, heroFade: 1,
    }
    this.mouse = new THREE.Vector2()
    this.mouseSmooth = new THREE.Vector2()
    this.mouseActive = 0
    this.drag = 0

    this.particles = new Particles({ count: mobile ? 16000 : 34000, name: config.name, age: config.age })
    this.scene.add(this.particles.points)

    this.space = new Space({ stars: mobile ? 2500 : 5000, streaks: mobile ? 350 : 700 })
    this.scene.add(this.space.group)

    this.gallery = new Gallery(config.memories, manager)
    this.scene.add(this.gallery.group)

    this.cake = new Cake({ candles: 7 })
    this.cake.group.position.copy(CAKE_POS)
    this.scene.add(this.cake.group)

    this.fireworks = new Fireworks(mobile ? 8000 : 16000)
    this.scene.add(this.fireworks.points)

    // ── post ──
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.6, 0.55)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.final = new ShaderPass(FinalShader)
    this.composer.addPass(this.final)

    this._look = new THREE.Vector3()
    this._lookSmooth = new THREE.Vector3(0, 0, 0)
    this._pos = new THREE.Vector3()
    this._tmp = new THREE.Vector3()
    this._ray = new THREE.Vector3()
    this.time = 0

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  get camZ() { return this.camera.position.z }

  resize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(w, h, false)
    this.composer.setPixelRatio(this.dpr)
    this.composer.setSize(w, h)
    this.final.uniforms.uRes.value.set(w * this.dpr, h * this.dpr)
    const visH = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
    this.particles.resize(visH * this.camera.aspect)
    for (const u of [this.particles.uniforms, this.space.uniforms, this.fireworks.uniforms, this.cake.smokeUni, this.cake.dustUni]) {
      u.uPixelRatio.value = this.dpr * (h / 900)
    }
    this.cakeDist = this.camera.aspect < 0.8 ? 7.6 / Math.max(this.camera.aspect, 0.45) * 0.62 : 7.6
  }

  setMouse(x, y) {
    this.mouse.set(x, y)
    this.mouseActive = Math.min(1, this.mouseActive + 0.08)
  }

  shock() {
    const p = this.mouseWorld()
    this.particles.uniforms.uShock.value.set(p.x, p.y, 0, 0)
  }

  mouseWorld() {
    this._ray.set(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize()
    const t = -this.camera.position.z / (this._ray.z || -1)
    return this._tmp.copy(this.camera.position).addScaledVector(this._ray, t)
  }

  celebrate() {
    const c = CAKE_POS
    const spots = []
    for (let i = 0; i < 9; i++) {
      spots.push(new THREE.Vector3(c.x + (Math.random() - 0.5) * 13, c.y + 2.2 + Math.random() * 3.6, c.z - 5 - Math.random() * 6))
    }
    spots.forEach((p, i) => this.fireworks.burst(p, { delay: i * 0.28 + Math.random() * 0.15, count: this.mobile ? 500 : 900, speed: 2.6 + Math.random() * 1.6, shape: i % 3 === 2 ? 'ring' : 'sphere' }))
    this.fireworks.burst(new THREE.Vector3(c.x, c.y + 5.0, c.z - 7), { delay: 2.9, count: this.mobile ? 1200 : 2400, speed: 4.2, shape: 'heart', palette: [new THREE.Color('#ff3d7f'), new THREE.Color('#ff8fb1'), new THREE.Color('#ffffff')] })
    return spots.map((_, i) => i * 0.28).concat([2.9])
  }

  randomFirework() {
    const c = CAKE_POS
    this.fireworks.burst(new THREE.Vector3(c.x + (Math.random() - 0.5) * 14, c.y + 2.5 + Math.random() * 3.5, c.z - 5 - Math.random() * 6), { count: this.mobile ? 400 : 700, speed: 2.4 + Math.random() * 1.5 })
  }

  update(dt) {
    dt = Math.min(dt, 1 / 20)
    this.time += dt
    const s = this.state
    const t = this.time

    this.mouseSmooth.x = damp(this.mouseSmooth.x, this.mouse.x, 4, dt)
    this.mouseSmooth.y = damp(this.mouseSmooth.y, this.mouse.y, 4, dt)

    // ── camera rig ──
    const tp = THREE.MathUtils.clamp(s.tunnel, 0, 1)
    const tunnel = THREE.MathUtils.lerp(tp, ease(tp), 0.35)
    const z = THREE.MathUtils.lerp(TUNNEL_START, TUNNEL_END, tunnel)
    pathAt(z, this._pos)
    pathAt(z - 7, this._look)
    this._pos.z += s.introZ * (1 - tunnel)
    const par = 1 - s.cake
    this._pos.x += this.mouseSmooth.x * 0.5 * par
    this._pos.y += this.mouseSmooth.y * 0.3 * par
    const ck = ease(THREE.MathUtils.clamp(s.cake, 0, 1))
    if (ck > 0) {
      const camCake = this._tmp.set(CAKE_POS.x + this.mouseSmooth.x * 0.6, CAKE_POS.y + 2.9 + this.mouseSmooth.y * 0.3, CAKE_POS.z + this.cakeDist)
      this._pos.lerp(camCake, ck)
      this._look.lerp(new THREE.Vector3(CAKE_POS.x, CAKE_POS.y + 1.75, CAKE_POS.z), ck)
    }
    this.camera.position.x = damp(this.camera.position.x, this._pos.x, 5, dt)
    this.camera.position.y = damp(this.camera.position.y, this._pos.y, 5, dt)
    this.camera.position.z = damp(this.camera.position.z, this._pos.z, 5, dt)
    this._lookSmooth.x = damp(this._lookSmooth.x, this._look.x, 5, dt)
    this._lookSmooth.y = damp(this._lookSmooth.y, this._look.y, 5, dt)
    this._lookSmooth.z = damp(this._lookSmooth.z, this._look.z, 5, dt)
    this.camera.lookAt(this._lookSmooth)
    this.camera.rotation.z += Math.sin(t * 0.3) * 0.01 + s.vel * 0.02 * (1 - ck)

    const camZ = this.camera.position.z
    const velAbs = Math.min(Math.abs(s.vel), 1)

    // ── particles ──
    const pu = this.particles.uniforms
    pu.uTime.value = t
    pu.uBang.value = s.bang
    pu.uMorph.value = s.introMorph + s.scrollMorph
    const ph = (t * 1.05) % 1
    pu.uBeat.value = Math.exp(-Math.pow((ph - 0.08) * 16, 2)) + 0.65 * Math.exp(-Math.pow((ph - 0.27) * 16, 2))
    pu.uAlpha.value = s.alpha
    this.mouseActive = damp(this.mouseActive, 0, 0.5, dt)
    pu.uMouseForce.value = damp(pu.uMouseForce.value, camZ > 4 && s.bang > 0.9 ? Math.min(1, this.mouseActive * 1.6) : 0, 3, dt)
    pu.uMouse.value.copy(this.mouseWorld())
    pu.uShock.value.w += dt
    if (s.bang < 1) pu.uSize.value = 26 * (1 + pu.uBeat.value * 0.6 * (1 - s.bang))
    else pu.uSize.value = 26
    this.particles.points.visible = camZ > -24

    // ── space ──
    this.space.uniforms.uTime.value = t
    this.space.uniforms.uVel.value = s.vel
    this.space.uniforms.uStreak.value = damp(this.space.uniforms.uStreak.value, velAbs * (camZ < 6 ? 1 : 0.15), 6, dt)

    // ── gallery ──
    this.gallery.shared.uTime.value = t
    this.gallery.shared.uVel.value = damp(this.gallery.shared.uVel.value, s.vel, 6, dt)
    this.gallery.group.visible = s.tunnel > 0.001 && camZ > -100
    if (this.gallery.group.visible) this.gallery.update(t, this.mouseSmooth)

    // ── cake ──
    this.cake.group.visible = s.cake > 0.001
    if (this.cake.group.visible) {
      this.drag *= Math.exp(-dt * 3)
      this.cake.update(dt, this.camera, this.drag * dt)
    }
    this.fireworks.update(dt)
    this.fireworks.points.visible = s.cake > 0.001

    // ── post ──
    this.bloom.strength = s.bloom
    this.final.uniforms.uTime.value = t
    this.final.uniforms.uAberration.value = damp(this.final.uniforms.uAberration.value, 0.0015 + velAbs * 0.012, 6, dt)
    this.final.uniforms.uFlash.value = s.flash

    this.composer.render(dt)
  }
}
